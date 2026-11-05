import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * M8: every command the docs tell a user to run is executed, and stays executed.
 *
 * The failure this prevents is specific and was measured: `mise run install` was
 * documented in the README, absent from CI, and silently installing nothing on a
 * fresh clone while exiting 0. Nothing failed, because nothing ran.
 *
 * So this file holds a ledger. Every command line in every fenced `bash` block is
 * reduced to a signature (`surface | subcommand | flags`) and must be claimed by
 * either an entry that executes it or a declaration that says why it cannot be
 * executed. A documented command with no claim fails the build, which is the only
 * way a doc stops rotting without a human re-reading it.
 *
 * The ledger is checked in both directions: an entry no doc line produces is also
 * a failure. Deleting a documented command must delete its coverage, or the
 * ledger becomes a museum of tests for commands nobody is told to run.
 */

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin', 'agency-rules.mjs');

/** Fenced blocks that contain commands a user is meant to type. */
const DOC_FILES = [
    'README.md',
    'CONTRIBUTING.md',
    'docs/ADDING-A-HARNESS.md',
    'docs/ARCHITECTURE.md',
    'docs/RULE-SPEC.md',
    'docs/TROUBLESHOOTING.md',
    'docs/RELEASING.md',
];

// ── Command shapes ───────────────────────────────────────────────────────

/** Join `\`-continued lines so a wrapped command is one command. */
function joinContinuations(lines) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        while (/\\\s*$/.test(line) && i + 1 < lines.length) {
            line = `${line.replace(/\\\s*$/, '')} ${lines[++i]}`;
        }
        out.push(line);
    }
    return out;
}

/** Split a command into tokens, keeping quoted strings whole. */
function tokenize(text) {
    const tokens = [];
    let current = '';
    let quote = null;
    for (const char of text) {
        if (quote) {
            if (char === quote) quote = null;
            else current += char;
        } else if (char === '"' || char === "'") {
            quote = char;
        } else if (/\s/.test(char)) {
            if (current) tokens.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current) tokens.push(current);
    return tokens;
}

/**
 * Remove leading `NAME=value` assignments, honouring quotes and `$(...)` so a
 * value with spaces is consumed whole.
 */
function stripLeadingAssignments(text) {
    let rest = text;
    while (/^[A-Z_][A-Z0-9_]*=/.test(rest)) {
        let i = rest.indexOf('=') + 1;
        let depth = 0;
        let quote = null;
        for (; i < rest.length; i++) {
            const char = rest[i];
            if (quote) {
                if (char === quote) quote = null;
                continue;
            }
            if (char === '"' || char === "'") {
                quote = char;
                continue;
            }
            if (char === '(') depth++;
            else if (char === ')') depth--;
            else if (/\s/.test(char) && depth === 0) break;
        }
        rest = rest.slice(i).trim();
    }
    return rest;
}

/**
 * `surface | subcommand | sorted-flags`.
 *
 * Positional arguments are deliberately excluded: `--harness cursor` and
 * `--harness antigravity` exercise the same code path, and the validity of each
 * value is a data question that `tests/slug-template.test.mjs` already pins.
 * Flags are sorted so the order a doc writes them in does not matter.
 */
export function signatureOf(line) {
    // `RULES_DIR=… npx agency-rules …` — a leading assignment is environment, not
    // the command being documented. Its value can contain spaces and quotes
    // (`VERSION=$(node -p "…")`), so it is consumed as a unit rather than token by
    // token, and a line that only assigns documents a value, not a command.
    const text = stripLeadingAssignments(
        line
            .replace(/\s+#.*$/, '')
            .replace(/<\/dev\/null/g, '')
            .trim(),
    );
    if (!text) return null;
    const tokens = tokenize(text);
    if (tokens.length === 0) return null;

    let surface;
    let rest;
    if (tokens[0] === 'npx') {
        surface = 'npx';
        rest = tokens.slice(1);
        if (rest[0] === 'agency-rules') rest = rest.slice(1);
    } else if (tokens[0] === 'node') {
        surface = 'node';
        rest = tokens.slice(1);
        if (/\.mjs$/.test(rest[0] ?? '')) rest = rest.slice(1);
    } else if (tokens[0] === 'mise') {
        surface = 'mise';
        rest = tokens.slice(1);
        if (rest[0] === 'run') rest = rest.slice(1);
    } else {
        surface = tokens[0];
        rest = tokens.slice(1);
    }

    // `--` separates mise's own flags from the task's; it is not a flag.
    rest = rest.filter((token) => token !== '--');
    const subcommand = rest.find((token) => !token.startsWith('-')) ?? '';
    const flags = [...new Set(rest.filter((token) => token.startsWith('-')))].sort();

    return `${surface}|${subcommand}|${flags.join(',')}`;
}

// ── The ledger ───────────────────────────────────────────────────────────

/**
 * Executed by `tests/documented-commands.test.mjs` below, against the real
 * binary in a scratch directory — the same code path `npx agency-rules`
 * resolves to once the package is installed.
 */
const EXECUTED_BY_TEST = [
    { argv: ['validate'], covers: ['npx|validate|'] },
    { argv: ['eval'], covers: ['npx|eval|'] },
    { argv: ['eval', '--json'], covers: ['npx|eval|--json'] },
    { argv: ['eval', '--rule', 'devops'], covers: ['npx|eval|--rule'] },
    { argv: ['list', '--harness', 'antigravity'], covers: ['npx|list|--harness'] },
    { argv: ['list', '--harness', 'cursor'], covers: [] },
    { argv: ['list', '--harness', 'copilot'], covers: [] },
    { argv: ['convert'], covers: ['npx|convert|'] },
    { argv: ['convert', '--dry-run'], covers: [] },
    { argv: ['install'], covers: ['npx|install|'] },
    {
        argv: ['install', '--harness', 'cursor', '--scope', 'project', '--rules', 'typescript,go'],
        covers: ['npx|install|--harness,--rules,--scope'],
    },
    {
        argv: ['install', '--dry-run', '--harness', 'cursor', '--scope', 'project'],
        covers: ['node|install|--dry-run,--harness,--scope'],
    },
    {
        argv: ['install', '--dry-run', '--all', '--scope', 'project'],
        covers: [],
    },
    {
        argv: ['install', '--all', '--scope', 'project'],
        covers: [],
    },
    {
        argv: ['new', 'api-review', '--description', 'Use when reviewing REST endpoints.'],
        covers: ['npx|new|--description'],
    },
];

/**
 * Executed by `.github/workflows/ci.yml`, in the "Documented commands" step.
 * These go through `mise`, so the test suite cannot run them without making
 * `mise` a requirement of `node --test`.
 */
const EXECUTED_BY_WORKFLOW = [
    { covers: ['mise|install|'] },
    { covers: ['mise|setup|'] },
    { covers: ['mise|ci|'] },
    { covers: ['mise|test|'] },
    { covers: ['mise|validate|'] },
    { covers: ['mise|eval|'] },
    { covers: ['mise|eval|--json'] },
    { covers: ['mise|eval|--rule'] },
    { covers: ['mise|eval|--force'] },
    { covers: ['mise|convert|'] },
    { covers: ['mise|convert:dry-run|'] },
    { covers: ['mise|install|'] },
    { covers: ['mise|install|--all'] },
    { covers: ['mise|install|--all,--scope'] },
    { covers: ['mise|install|--harness,--scope'] },
    { covers: ['mise|install:dry-run|'] },
    { covers: ['mise|install:dry-run|--all'] },
    { covers: ['mise|tasks|'] },
    { covers: ['mise|list|--harness'] },
    { covers: ['mise|create-rule|--description'] },
    { covers: ['mise|check:ci|'] },
];

/**
 * Documented lines that are not project commands, or cannot be executed as
 * written. Each needs a reason that is checkable, not a shrug.
 */
const DECLARED = [
    {
        signature: 'git|clone|',
        reason: 'CI checks the repository out with actions/checkout; the documented URL is machine-checked against package.json in the test below instead',
    },
    { signature: 'cd|agency-rules|', reason: 'shell navigation after the clone' },
    {
        signature: 'mkdir|/tmp/install-check|-p',
        reason: 'scratch scaffolding for the installer recipe; the command it wraps is covered',
    },
    {
        signature: 'curl|https://mise.run|',
        reason: 'machine prerequisite installs mise; CI does the same with jdx/mise-action',
    },
    {
        signature: 'brew|install|',
        reason: 'the macOS alternative to `curl https://mise.run | sh`; same prerequisite, no macOS runner here',
    },
    {
        signature: 'ls|integrations/example-agent/|',
        reason: 'illustrative output path for the hypothetical `example-agent` in the extension guide, which has no harness entry',
    },
    {
        signature: 'mise|install|--harness,--scope',
        reason: 'the same signature as the real `--harness cursor` form; only the example value differs, and example-agent is not a harness',
    },
    {
        signature: 'mise|check|',
        reason: 'write-mode formatter for the inner loop. CI runs its read-only twin `mise run check:ci`, and `tests/ci-parity.test.mjs` fails if `ci` ever depends on the writing form again',
    },
    {
        signature: 'node||--test',
        reason: 'prose about which Node versions expand the test glob, not a command a reader is told to run; the supported entry point is `mise run test`',
    },
    {
        signature: 'mise|install|--scope',
        reason: 'the anti-pattern the `--all` paragraph explains; the no-op it describes is asserted by `tests/documented-path.test.mjs`, which needs an empty HOME to reach that branch',
    },
    {
        // One class, one declaration: the release procedure inspects the registry,
        // a tarball, and the publish log. None of those can run while CI is running,
        // because the release they verify does not exist yet. The lookahead keeps
        // the mise prerequisite install (`curl https://mise.run | sh`) out of this
        // bucket — it has its own reason above.
        matches: /^(curl|tar|gh)\|(?!https:\/\/mise\.run)/,
        reason: 'release-time verification against the published registry, its tarball, or its publish log; CI has no release to verify, and the shasum comparison this procedure describes is the verification',
    },
    {
        matches: /^npx\|agency-rules@/,
        reason: 'verifies the published tarball rather than this checkout; it cannot run before the release it verifies exists',
    },
];

const CLAIMED = new Set([
    ...EXECUTED_BY_TEST.flatMap((entry) => entry.covers),
    ...EXECUTED_BY_WORKFLOW.flatMap((entry) => entry.covers),
    ...DECLARED.flatMap((entry) => entry.signature ?? []),
]);

/**
 * A declaration may name one signature or a class of them, because some buckets
 * are better described by shape than enumerated: every command in the release
 * procedure reads the registry, and each one is unexecutable for one reason.
 */
const CLAIMED_PATTERNS = DECLARED.flatMap((entry) => entry.matches ?? []);

function isClaimed(signature) {
    return CLAIMED.has(signature) || CLAIMED_PATTERNS.some((pattern) => pattern.test(signature));
}

// ── Doc scanning ─────────────────────────────────────────────────────────

async function documentedCommands() {
    const found = [];
    for (const file of DOC_FILES) {
        const raw = joinContinuations((await readFile(join(ROOT, file), 'utf8')).split('\n'));
        let inBlock = false;
        let language = null;
        for (let i = 0; i < raw.length; i++) {
            const line = raw[i];
            const fence = line.trim().match(/^```(\w*)$/);
            if (fence && !inBlock) {
                inBlock = true;
                language = fence[1];
                continue;
            }
            if (inBlock && line.trim().startsWith('```')) {
                inBlock = false;
                continue;
            }
            if (inBlock) {
                // `console` and `text` blocks hold output or prose, not commands.
                if (language !== 'bash' && language !== 'sh') continue;
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const signature = signatureOf(trimmed);
                if (signature) found.push({ file, line: i + 1, command: trimmed, signature });
                continue;
            }

            // Inline code outside a fence: this is how the Commands table
            // documents a task, and a table is as much a promise as a block.
            for (const span of line.matchAll(/`([^`\n]+)`/g)) {
                const command = span[1].trim();
                if (!/^(mise|npx|node)\s/.test(command)) continue;
                const signature = signatureOf(command);
                if (signature) found.push({ file, line: i + 1, command, signature });
            }
        }
    }
    return found;
}

// ── Tests ────────────────────────────────────────────────────────────────

test('every documented command is either executed or declared impossible', async () => {
    const missing = (await documentedCommands()).filter((entry) => !isClaimed(entry.signature));
    assert.deepEqual(
        missing.map((entry) => `${entry.file}:${entry.line}  ${entry.command}`),
        [],
        'these documented commands are not executed by CI and not declared — the docs promise ' +
            'something nothing runs',
    );
});

test('no ledger entry outlives the command it covers', async () => {
    const documented = new Set((await documentedCommands()).map((entry) => entry.signature));
    const orphaned = [
        ...[...CLAIMED].filter((signature) => !documented.has(signature)),
        ...DECLARED.filter(
            (entry) => entry.matches && ![...documented].some((sig) => entry.matches.test(sig)),
        ).map((entry) => String(entry.matches)),
    ];
    assert.deepEqual(
        orphaned,
        [],
        'these ledger entries cover no documented command any more; delete them with the doc line',
    );
});

test('the documented clone URL is the one package.json publishes', async () => {
    const readme = await readFile(join(ROOT, 'README.md'), 'utf8');
    const documented = readme.match(/git clone (https:\/\/\S+?\.git)/)?.[1];
    assert.ok(documented, 'the README must show a literal clone URL, not a placeholder');

    const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
    const published = pkg.repository.url.replace(/^git\+/, '');
    assert.equal(
        documented,
        published,
        'a clone URL that disagrees with package.json is a placeholder with extra steps',
    );
});

// ── Execution ────────────────────────────────────────────────────────────

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * A scratch project with a clean HOME, so `list`/`install` see no harness from
 * the developer's machine and `new` has somewhere to write that is not this
 * repository.
 */
async function scratchProject() {
    const cwd = await mkdtemp(join(tmpdir(), 'agency-rules-docs-'));
    const home = join(cwd, 'home');
    const rules = join(cwd, 'rules');
    await mkdir(home, { recursive: true });
    await mkdir(rules, { recursive: true });
    await cp(join(ROOT, 'rules', '_schema.json'), join(rules, '_schema.json'));

    const env = {
        ...process.env,
        HOME: home,
        RULES_DIR: join(ROOT, 'rules'),
        INTEGRATIONS_DIR: join(cwd, 'integrations'),
        TOOLS_PATH: join(ROOT, 'tools.json'),
    };

    const run = (args, overrides = {}) =>
        new Promise((resolve) => {
            execFile(
                process.execPath,
                [BIN, ...args],
                { cwd, env: { ...env, ...overrides } },
                (error, stdout, stderr) => {
                    resolve({ args, code: error?.code ?? 0, stdout, stderr });
                },
            );
        });

    return { cwd, home, rules, run };
}

test('every command in the ledger runs as documented', async () => {
    const { cwd, rules, run } = await scratchProject();
    const failures = [];

    for (const { argv } of EXECUTED_BY_TEST) {
        // `new` is documented for a repository that owns a `rules/` tree, and it
        // refuses to scaffold anywhere else. Point it at the scratch rules dir so
        // the assertion is about the command, not about this repository's layout.
        const overrides = argv[0] === 'new' && argv[1] !== undefined ? { RULES_DIR: rules } : {};

        const result = await run(argv, overrides);
        if (result.code !== 0) {
            failures.push(
                `agency-rules ${argv.join(' ')} → exit ${result.code}\n${(result.stderr || result.stdout).trim()}`,
            );
        }
    }

    assert.deepEqual(failures, [], 'a documented command does not exit 0 as written');

    // The install entries above are only meaningful if they produced files.
    assert.ok(
        await exists(join(cwd, '.github', 'instructions', 'typescript.instructions.md')),
        'the documented install wrote nothing',
    );
    assert.ok(
        await exists(join(cwd, '.cursor', 'rules', 'go.mdc')),
        'the documented multi-rule install wrote nothing',
    );
});
