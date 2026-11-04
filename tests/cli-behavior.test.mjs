import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * Exit codes are the CLI's contract with CI, so they are tested against the real
 * binary rather than a helper.
 *
 * Each test runs in its own temporary directory with `RULES_DIR` and
 * `INTEGRATIONS_DIR` removed from the environment: mise exports both, and an
 * inherited value would silently point the command at the repository under test
 * instead of the fixture.
 */

const BIN = join(import.meta.dirname, '..', 'bin', 'agency-rules.mjs');
const ROOT = join(import.meta.dirname, '..');

/** Run the CLI with a clean environment. */
function runCli(args, options = {}) {
    const env = { ...process.env, ...options.env };
    if (!options.env?.RULES_DIR) delete env.RULES_DIR;
    if (!options.env?.INTEGRATIONS_DIR) delete env.INTEGRATIONS_DIR;
    // Documented in the skill, so someone following the docs will export it.
    if (!options.env?.TOOLS_PATH) delete env.TOOLS_PATH;

    return new Promise((resolve) => {
        execFile(
            process.execPath,
            [BIN, ...args],
            { cwd: options.cwd, env },
            (error, stdout, stderr) => {
                resolve({ code: error?.code ?? 0, stdout, stderr });
            },
        );
    });
}

async function tempDir(prefix = 'agency-rules-cli-') {
    return mkdtemp(join(tmpdir(), prefix));
}

/** Two rules that state the same obligation with different numbers. */
async function contradictionFixture() {
    const dir = await tempDir();
    const rules = join(dir, 'rules');
    await mkdir(join(rules, 'a'), { recursive: true });
    await mkdir(join(rules, 'b'), { recursive: true });
    await writeFile(
        join(rules, '_schema.json'),
        await readFile(join(ROOT, 'rules', '_schema.json')),
    );

    const line = (days) =>
        `- **Auto-renewals are reviewed ${days} days before expiry**, so the customer can still be saved.\n`;
    await writeFile(
        join(rules, 'a', 'renewals.md'),
        `---\nname: renewals\ndescription: Use when handling an auto-renewal.\n---\n\n${line(60)}`,
    );
    await writeFile(
        join(rules, 'b', 'billing.md'),
        `---\nname: billing\ndescription: Use when billing a renewal.\n---\n\n${line(90)}`,
    );
    await writeFile(
        join(rules, 'a', 'unrelated.md'),
        '---\nname: unrelated\ndescription: Use when doing something else entirely.\n---\n\n- Keep the flux capacitor aligned with the quarterly deployment window.\n',
    );
    return dir;
}

// ── eval: one gate for every output mode ─────────────────────────────────
test('eval exits 1 on a numeric contradiction in text mode', async () => {
    const dir = await contradictionFixture();
    const run = await runCli(['eval'], { cwd: dir, env: { RULES_DIR: join(dir, 'rules') } });
    assert.equal(run.code, 1, 'a contradiction must fail the gate');
    assert.match(run.stdout, /numeric contradiction/i);
});

test('eval --json exits 1 on the same contradiction', async () => {
    // The regression: text mode gated on contradictions, --json did not, so a CI
    // job using --json passed with contradictory numbers in the payload.
    const dir = await contradictionFixture();
    const run = await runCli(['eval', '--json'], {
        cwd: dir,
        env: { RULES_DIR: join(dir, 'rules') },
    });
    assert.equal(run.code, 1);
    const payload = JSON.parse(run.stdout);
    assert.equal(payload.contradictions.length, 1);
});

test('eval --rule gates on that rule instead of returning early', async () => {
    const dir = await contradictionFixture();
    const env = { RULES_DIR: join(dir, 'rules') };

    const guilty = await runCli(['eval', '--rule', 'renewals'], { cwd: dir, env });
    assert.equal(guilty.code, 1, 'the rule in the contradiction must fail');

    const innocent = await runCli(['eval', '--rule', 'unrelated'], { cwd: dir, env });
    assert.equal(innocent.code, 0, 'a clean rule must still pass');
});

test('eval --rule --json reports the scope it gated on', async () => {
    const dir = await contradictionFixture();
    const run = await runCli(['eval', '--rule', 'unrelated', '--json'], {
        cwd: dir,
        env: { RULES_DIR: join(dir, 'rules') },
    });
    const payload = JSON.parse(run.stdout);
    assert.equal(payload.scopedTo, 'unrelated');
    assert.equal(payload.contradictions.length, 0);
    assert.equal(run.code, 0);
});

// ── validate: the packaged fallback ──────────────────────────────────────
test('validate works outside a repository by falling back to the packaged rules', async () => {
    const dir = await tempDir();
    const run = await runCli(['validate'], { cwd: dir });
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, /validated successfully/);
});

test('a missing schema is one clear message, not an ENOENT stack trace', async () => {
    const empty = await tempDir();
    const run = await runCli(['validate'], { cwd: empty, env: { RULES_DIR: empty } });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /Cannot read the rule schema/);
    assert.doesNotMatch(run.stderr, /\n\s+at /, 'no stack trace');
});

// ── new: never scaffold into the installed package ───────────────────────
test('new refuses to write a rule inside the packaged rules directory', async () => {
    const dir = await tempDir();
    const run = await runCli(['new', 'demo', '--description', 'Use when testing the guard.'], {
        cwd: dir,
    });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /No local rules\/ directory/);
});

test('new still scaffolds when there is a local rules/ directory', async () => {
    const dir = await tempDir();
    await mkdir(join(dir, 'rules'));
    const run = await runCli(['new', 'demo', '--description', 'Use when testing the guard.'], {
        cwd: dir,
    });
    assert.equal(run.code, 0, run.stderr);
    await stat(join(dir, 'rules', 'base', 'demo.md'));
});

// ── convert: a real reset, and an honest manifest ────────────────────────
test('convert resets the harness directory and flags a filtered build as partial', async () => {
    const dir = await tempDir();
    const integrations = join(dir, 'integrations');
    const stale = join(integrations, 'cursor', 'orphan-rule.mdc');
    await mkdir(join(integrations, 'cursor'), { recursive: true });
    await writeFile(stale, 'stale artifact');

    const partial = await runCli(['convert', '--harness', 'cursor', '--rules', 'typescript'], {
        cwd: dir,
        env: { INTEGRATIONS_DIR: integrations },
    });
    assert.equal(partial.code, 0, partial.stderr);

    await assert.rejects(stat(stale), 'a stale artifact must not survive a rebuild');
    const manifest = JSON.parse(
        await readFile(join(integrations, 'cursor', '_manifest.json'), 'utf8'),
    );
    assert.equal(manifest.partial, true);
    assert.deepEqual(manifest.filter, ['typescript']);
    assert.deepEqual(
        manifest.files.map((f) => f.slug),
        ['typescript'],
    );

    const full = await runCli(['convert', '--harness', 'cursor'], {
        cwd: dir,
        env: { INTEGRATIONS_DIR: integrations },
    });
    assert.equal(full.code, 0, full.stderr);
    const fullManifest = JSON.parse(
        await readFile(join(integrations, 'cursor', '_manifest.json'), 'utf8'),
    );
    assert.equal(fullManifest.partial, false);
    assert.equal(fullManifest.filter, null);
    assert.ok(fullManifest.files.length > 1);
});

test('convert --dry-run writes nothing at all, manifest included', async () => {
    const dir = await tempDir();
    const integrations = join(dir, 'integrations');
    const run = await runCli(['convert', '--harness', 'cursor', '--dry-run'], {
        cwd: dir,
        env: { INTEGRATIONS_DIR: integrations },
    });
    assert.equal(run.code, 0, run.stderr);
    await assert.rejects(stat(join(integrations, 'cursor', '_manifest.json')));
});

// ── install: an explicit request that installs nothing is a failure ──────
test('install exits 1 when none of the requested rules were compiled', async () => {
    const dir = await tempDir();
    const project = await tempDir('agency-rules-install-');
    const integrations = join(dir, 'integrations');
    await runCli(['convert', '--harness', 'cursor', '--rules', 'typescript'], {
        cwd: dir,
        env: { INTEGRATIONS_DIR: integrations },
    });

    const run = await runCli(
        ['install', '--harness', 'cursor', '--scope', 'project', '--rules', 'typo-rule'],
        { cwd: project, env: { INTEGRATIONS_DIR: integrations } },
    );
    assert.equal(run.code, 1);
    assert.match(run.stderr, /none of the requested rules exist/);
    assert.doesNotMatch(run.stdout, /🎉 Installed/, 'no success line above a failure');
});

test('install exits 1 when an explicitly requested harness has no output', async () => {
    const project = await tempDir('agency-rules-install-');
    const run = await runCli(['install', '--harness', 'cursor', '--scope', 'project'], {
        cwd: project,
        env: { INTEGRATIONS_DIR: join(project, 'no-integrations') },
    });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /none of the requested harnesses could be installed/);
    assert.match(run.stderr, /cursor \(no compiled output\)/);
    // The preflight runs before the copy loop: a failing run leaves the disk alone.
    await assert.rejects(stat(join(project, '.cursor')));
});

test('install --all exits 1 rather than celebrating an empty build', async () => {
    // The regression that survived the first fix: the failure was gated on an
    // explicit --harness, so a fleet with nothing compiled printed
    // "🎉 Installed 0 file(s)" and exited 0.
    const project = await tempDir('agency-rules-install-');
    const run = await runCli(['install', '--all', '--scope', 'project'], {
        cwd: project,
        env: { INTEGRATIONS_DIR: join(project, 'no-integrations') },
    });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /none of the requested harnesses could be installed/);
    assert.doesNotMatch(run.stdout, /🎉 Installed/);
});

test('auto-detected harnesses with no compiled output also fail', async () => {
    // Same gate, chosen by detection instead of by flag — the case that stayed
    // green after the first attempt at this fix.
    const project = await tempDir('agency-rules-install-');
    const home = await tempDir('agency-rules-home-');
    await mkdir(join(project, '.cursor'));

    const run = await runCli(['install', '--scope', 'project'], {
        cwd: project,
        env: { HOME: home, INTEGRATIONS_DIR: join(project, 'no-integrations') },
    });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /none of the detected harnesses could be installed: cursor/);
});

test('install reports a corrupt manifest instead of a stack trace', async () => {
    const dir = await tempDir();
    const project = await tempDir('agency-rules-install-');
    const integrations = join(dir, 'integrations');
    await mkdir(join(integrations, 'cursor'), { recursive: true });
    await writeFile(join(integrations, 'cursor', '_manifest.json'), '{ not json');

    const run = await runCli(['install', '--harness', 'cursor', '--scope', 'project'], {
        cwd: project,
        env: { INTEGRATIONS_DIR: integrations },
    });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /cannot read .*_manifest\.json/);
    assert.doesNotMatch(run.stderr, /\n\s+at /, 'no stack trace');
});

test('convert fails before resetting anything when a harness has no renderer', async () => {
    const dir = await tempDir();
    const integrations = join(dir, 'integrations');
    const keep = join(integrations, 'cursor', 'keep-me.mdc');
    await mkdir(join(integrations, 'cursor'), { recursive: true });
    await writeFile(keep, 'previous build');

    const tools = JSON.parse(await readFile(join(ROOT, 'tools.json'), 'utf8'));
    tools.harnesses.cursor.format = 'no-such-format';
    const toolsPath = join(dir, 'tools.json');
    await writeFile(toolsPath, JSON.stringify(tools));

    const run = await runCli(['convert', '--harness', 'cursor'], {
        cwd: dir,
        env: { INTEGRATIONS_DIR: integrations, TOOLS_PATH: toolsPath },
    });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /No renderer for format/);
    assert.equal(
        await readFile(keep, 'utf8'),
        'previous build',
        'the previous build must survive a run that cannot finish',
    );
});

test('install names a missing destination as the reason, not a missing build', async () => {
    const dir = await tempDir();
    const project = await tempDir('agency-rules-install-');
    const integrations = join(dir, 'integrations');
    await runCli(['convert', '--harness', 'cursor', '--rules', 'typescript'], {
        cwd: dir,
        env: { INTEGRATIONS_DIR: integrations },
    });

    // A cloned contract with no `user` destination for the harness.
    const tools = JSON.parse(await readFile(join(ROOT, 'tools.json'), 'utf8'));
    delete tools.harnesses.cursor.dest.user;
    const toolsPath = join(project, 'tools.json');
    await writeFile(toolsPath, JSON.stringify(tools));

    const run = await runCli(['install', '--harness', 'cursor', '--scope', 'user'], {
        cwd: project,
        env: { INTEGRATIONS_DIR: integrations, TOOLS_PATH: toolsPath },
    });
    assert.equal(run.code, 1);
    assert.match(run.stderr, /no dest for scope "user"/);
});

test('install registers the plugin at the config path declared in tools.json', async () => {
    const dir = await tempDir();
    const project = await tempDir('agency-rules-install-');
    const integrations = join(dir, 'integrations');
    await runCli(['convert', '--harness', 'opencode', '--rules', 'typescript'], {
        cwd: dir,
        env: { INTEGRATIONS_DIR: integrations },
    });

    // The path must come from the contract, so the fixture renames it: asserting
    // the literal `opencode.json` would also pass with the hardcoded path this
    // fix removed, which is a test that cannot fail.
    const tools = JSON.parse(await readFile(join(ROOT, 'tools.json'), 'utf8'));
    tools.harnesses.opencode.plugin.config.project = 'custom-plugin.json';
    const toolsPath = join(project, 'tools.json');
    await writeFile(toolsPath, JSON.stringify(tools));

    const run = await runCli(
        ['install', '--harness', 'opencode', '--scope', 'project', '--rules', 'typescript'],
        { cwd: project, env: { INTEGRATIONS_DIR: integrations, TOOLS_PATH: toolsPath } },
    );
    assert.equal(run.code, 0, run.stderr);

    const config = JSON.parse(await readFile(join(project, 'custom-plugin.json'), 'utf8'));
    assert.deepEqual(config.plugin, ['opencode-rules@latest']);
    await assert.rejects(stat(join(project, 'opencode.json')), 'must not write the old path');
});

test('every harness with a plugin declares both config paths in tools.json', async () => {
    // The regression: the installer hardcoded OpenCode's config path, so a second
    // harness with a plugin would have written into OpenCode's file.
    const tools = JSON.parse(await readFile(join(ROOT, 'tools.json'), 'utf8'));
    for (const [id, harness] of Object.entries(tools.harnesses)) {
        if (!harness.plugin) continue;
        assert.ok(harness.plugin.config?.project, `${id}: missing plugin.config.project`);
        assert.ok(harness.plugin.config?.user, `${id}: missing plugin.config.user`);
        assert.ok(harness.plugin.entry, `${id}: missing plugin.entry`);
    }
});
