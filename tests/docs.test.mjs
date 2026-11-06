import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parse as parseYaml } from 'yaml';
import convertCommand from '../scripts/convert.mjs';
import evaluateCommand from '../scripts/eval.mjs';
import { generateDocs } from '../scripts/gen-docs.mjs';
import installCommand from '../scripts/install.mjs';
import { readRules } from '../scripts/lib/frontmatter.mjs';
import listCommand from '../scripts/list.mjs';
import newCommand from '../scripts/new.mjs';
import validateCommand from '../scripts/validate.mjs';

/**
 * The documentation site is part of the deliverable.
 *
 * Three things can silently break it: a rule with no page, a nav entry pointing
 * at a page that does not exist, and a CLI flag that changed without the
 * reference following. MkDocs strict mode catches the first two only when it
 * runs, so these tests pin them on every `mise run test`.
 */

const ROOT = join(import.meta.dirname, '..');
const DOCS = join(ROOT, 'docs');

/** Pages the generator owns; they are absent on a fresh clone until docs:gen. */
const GENERATED_PAGES = new Set([
    'rules/index.md',
    'reference/harnesses.md',
    'contributing.md',
    'security.md',
    'changelog.md',
]);

const COMMANDS = {
    new: newCommand,
    validate: validateCommand,
    eval: evaluateCommand,
    convert: convertCommand,
    install: installCommand,
    list: listCommand,
};

async function scratchDocs() {
    return mkdtemp(join(tmpdir(), 'agency-rules-docs-'));
}

async function exists(path) {
    return stat(path).then(
        () => true,
        () => false,
    );
}

/** Every committed Markdown page, excluding the generated rule library. */
async function writtenPages(dir = DOCS, prefix = '') {
    const entries = await readdir(dir, { withFileTypes: true });
    const pages = [];
    for (const entry of entries) {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            if (entry.name === 'rules') continue;
            pages.push(...(await writtenPages(join(dir, entry.name), relative)));
        } else if (entry.name.endsWith('.md') && !GENERATED_PAGES.has(relative)) {
            pages.push(relative);
        }
    }
    return pages;
}

function navLeaves(nav) {
    const leaves = [];
    const visit = (node) => {
        if (typeof node === 'string') leaves.push(node);
        else if (Array.isArray(node)) node.forEach(visit);
        else if (node && typeof node === 'object') Object.values(node).forEach(visit);
    };
    visit(nav);
    return leaves;
}

function cliSections(text) {
    const headings = [...text.matchAll(/^##\s+([a-z-]+)\s*$/gm)];
    const sections = new Map();
    headings.forEach((heading, index) => {
        const start = heading.index;
        const end = headings[index + 1]?.index ?? text.length;
        sections.set(heading[1], text.slice(start, end));
    });
    return sections;
}

function declaredFlags(command) {
    return Object.entries(command.args ?? {})
        .filter(([, spec]) => spec.type !== 'positional')
        .map(([name]) => name);
}

test('the generator writes one page per rule, linked from the library index', async () => {
    const out = await scratchDocs();
    const { rules: count, harnesses } = await generateDocs({ root: ROOT, outDir: out });
    const rules = await readRules(join(ROOT, 'rules'));

    assert.equal(count, rules.length, 'the generator must report what it wrote');
    assert.ok(harnesses >= 1, 'the harness reference needs at least one harness');

    const index = await readFile(join(out, 'rules', 'index.md'), 'utf8');
    assert.match(index, new RegExp(`\\*\\*${rules.length}\\*\\*`), 'the index shows the total');

    for (const rule of rules) {
        const page = join(out, 'rules', `${rule.slug}.md`);
        assert.ok(await exists(page), `missing page for rule ${rule.slug}`);

        const contents = await readFile(page, 'utf8');
        assert.ok(
            contents.includes(`(index.md#${rule.source.split('/')[0]})`),
            `${rule.slug} does not link back to its category`,
        );
        assert.ok(
            contents.includes(`rules/${rule.source}`),
            `${rule.slug} does not link to its source file`,
        );
        if (rule.data.description) {
            assert.ok(
                contents.includes(rule.data.description),
                `${rule.slug} does not show its description`,
            );
        }
        assert.ok(
            index.includes(`(${rule.slug}.md)`),
            `${rule.slug} has a page but the library index does not link it`,
        );
    }
});

test('the harness reference documents every field of the contract', async () => {
    const out = await scratchDocs();
    await generateDocs({ root: ROOT, outDir: out });
    const page = await readFile(join(out, 'reference', 'harnesses.md'), 'utf8');
    const tools = JSON.parse(await readFile(join(ROOT, 'tools.json'), 'utf8'));

    for (const [id, harness] of Object.entries(tools.harnesses)) {
        assert.ok(page.includes(`## \`${id}\` — ${harness.label}`), `missing heading for ${id}`);
        assert.ok(
            page.includes(`{ #${id.toLowerCase()} }`),
            `${id} has no explicit anchor, so the overview link points nowhere`,
        );
        assert.ok(page.includes(harness.format), `missing format for ${id}`);
        assert.ok(page.includes(harness.dest.project), `missing project destination for ${id}`);
        assert.ok(page.includes(harness.dest.user), `missing user destination for ${id}`);
    }
});

test('mirrored pages track their root files and rewrite repo-root links', async () => {
    const out = await scratchDocs();
    await generateDocs({ root: ROOT, outDir: out });

    const contributing = await readFile(join(out, 'contributing.md'), 'utf8');
    assert.match(contributing, /Generated from CONTRIBUTING\.md/);
    assert.match(
        contributing,
        /\[docs\/RULE-SPEC\.md\]\(RULE-SPEC\.md\)/,
        'a docs/ link must be rewritten relative to the site docs directory',
    );
    assert.match(contributing, /\[SECURITY\.md\]\(security\.md\)/);

    const security = await readFile(join(out, 'security.md'), 'utf8');
    assert.match(security, /## Reporting a vulnerability/);

    const changelog = await readFile(join(out, 'changelog.md'), 'utf8');
    assert.match(changelog, /# Changelog/);
});

test('the MkDocs navigation points at real pages and lists every written page', async () => {
    const config = parseYaml(await readFile(join(ROOT, 'mkdocs.yml'), 'utf8'));
    assert.equal(config.theme?.name, 'material', 'the site uses the Material theme');
    assert.match(config.site_url, /^https:\/\//, 'site_url is required for canonical links');

    const leaves = navLeaves(config.nav);
    const missing = [];
    for (const leaf of leaves) {
        if (GENERATED_PAGES.has(leaf)) continue;
        if (!(await exists(join(DOCS, leaf)))) missing.push(leaf);
    }
    assert.deepEqual(missing, [], 'nav entries with no page fail the strict build');

    const unlisted = (await writtenPages()).filter((page) => !leaves.includes(page));
    assert.deepEqual(unlisted, [], 'these committed pages are not reachable from the nav');
});

test('the CLI reference documents every declared flag and invents none', async () => {
    const text = await readFile(join(DOCS, 'cli.md'), 'utf8');
    const sections = cliSections(text);
    const globals = new Set(['--help', '--version']);

    for (const [name, command] of Object.entries(COMMANDS)) {
        const section = sections.get(name);
        assert.ok(section, `docs/cli.md has no "## ${name}" section`);

        const flags = declaredFlags(command);
        for (const flag of flags) {
            const spec = command.args[flag];
            const forms = [`--${flag}`];
            if (spec.type === 'boolean') forms.push(`--no-${flag}`);
            assert.ok(
                forms.some((form) => section.includes(form)),
                `the ${name} section does not document --${flag}`,
            );
        }

        const allowed = new Set([
            ...flags.map((flag) => `--${flag}`),
            ...flags
                .filter((flag) => command.args[flag].type === 'boolean')
                .map((flag) => `--no-${flag}`),
            ...globals,
        ]);
        const unknown = [...section.matchAll(/--[a-z][a-z-]*/g)]
            .map((match) => match[0])
            .filter((flag) => !allowed.has(flag));
        assert.deepEqual(
            [...new Set(unknown)],
            [],
            `the ${name} section documents flags the command does not declare`,
        );
    }
});
