import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * `install --dest <dir>` is the flag the TUI uses to install into a directory the
 * user named instead of a harness directory. It has to write each harness's own
 * `integrationPath` under a directory of its own, be idempotent, and stay out of
 * plugin registration — a config created for a directory no harness reads is a
 * file the next reader has to explain.
 */

const ROOT = join(import.meta.dirname, '..');
const BIN = join(ROOT, 'bin', 'agency-rules.mjs');

/** Run the CLI in a scratch project, with the repository's rules as source. */
function runCli(args, cwd, envOverrides = {}) {
    const env = {
        ...process.env,
        RULES_DIR: join(ROOT, 'rules'),
        INTEGRATIONS_DIR: join(cwd, 'integrations'),
        TOOLS_PATH: join(ROOT, 'tools.json'),
        ...envOverrides,
    };

    return new Promise((resolve) => {
        execFile(process.execPath, [BIN, ...args], { cwd, env }, (error, stdout, stderr) => {
            resolve({ code: error?.code ?? 0, stdout, stderr });
        });
    });
}

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

async function scratchProject() {
    return mkdtemp(join(tmpdir(), 'agency-rules-dest-'));
}

test('install --dest writes the harness integration path under the given directory', async () => {
    const cwd = await scratchProject();
    const dest = await mkdtemp(join(tmpdir(), 'agency-rules-dest-out-'));

    assert.equal((await runCli(['convert', '--harness', 'copilot'], cwd)).code, 0);

    // No --scope: a custom destination leaves the scope nothing to decide.
    const installed = await runCli(
        ['install', '--harness', 'copilot', '--dest', dest, '--rules', 'typescript'],
        cwd,
    );
    assert.equal(installed.code, 0, installed.stderr);

    const written = join(dest, 'copilot', 'typescript.instructions.md');
    assert.ok(
        await exists(written),
        'install --dest must write <dest>/<harness>/<integrationPath>',
    );

    const compiled = await readFile(
        join(cwd, 'integrations', 'copilot', 'typescript.instructions.md'),
        'utf8',
    );
    assert.equal(await readFile(written, 'utf8'), compiled, 'the copy is byte-identical');

    assert.ok(
        !(await exists(join(cwd, '.github', 'instructions'))),
        'a custom destination must not also write the scope destination',
    );
});

test('re-running install --dest reports nothing to do', async () => {
    const cwd = await scratchProject();
    const dest = await mkdtemp(join(tmpdir(), 'agency-rules-dest-out-'));
    const args = ['install', '--harness', 'copilot', '--dest', dest, '--rules', 'typescript'];

    await runCli(['convert', '--harness', 'copilot'], cwd);
    assert.equal((await runCli(args, cwd)).code, 0);

    const second = await runCli(args, cwd);
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /unchanged/, 'a second --dest install is a no-op');
});

test('install --dest skips plugin registration', async () => {
    const cwd = await scratchProject();
    const dest = await mkdtemp(join(tmpdir(), 'agency-rules-dest-out-'));

    assert.equal((await runCli(['convert', '--harness', 'opencode'], cwd)).code, 0);
    const installed = await runCli(
        ['install', '--harness', 'opencode', '--dest', dest, '--rules', 'typescript'],
        cwd,
    );
    assert.equal(installed.code, 0, installed.stderr);
    assert.ok(
        await exists(join(dest, 'opencode', 'typescript.md')),
        'the opencode artifact still lands in the custom directory',
    );
    assert.ok(
        !(await exists(join(cwd, 'opencode.json'))),
        'a custom destination is not a harness config, so no plugin config may be created',
    );
});

test('harnesses that share an integrationPath do not overwrite each other', async () => {
    const cwd = await scratchProject();
    const dest = await mkdtemp(join(tmpdir(), 'agency-rules-dest-out-'));
    const args = [
        'install',
        '--harness',
        'antigravity,opencode',
        '--dest',
        dest,
        '--scope',
        'project',
        '--rules',
        'typescript',
    ];

    assert.equal((await runCli(['convert', '--harness', 'antigravity,opencode'], cwd)).code, 0);

    const first = await runCli(args, cwd);
    assert.equal(first.code, 0, first.stderr);
    assert.ok(await exists(join(dest, 'antigravity', 'typescript.md')));
    assert.ok(await exists(join(dest, 'opencode', 'typescript.md')));

    const second = await runCli(args, cwd);
    assert.equal(second.code, 0, second.stderr);
    assert.doesNotMatch(second.stdout, /🆕|🔄/, 'a second --dest install copies nothing again');
});

/** A contract whose `integrationPath` climbs out of the directory it lands in. */
async function hostileProject(integrationPath) {
    const cwd = await scratchProject();
    for (const id of ['hostile', 'opencode']) {
        await mkdir(join(cwd, 'integrations', id), { recursive: true });
        await writeFile(join(cwd, 'integrations', id, 'typescript.md'), `# ${id}\n`);
        await writeFile(
            join(cwd, 'integrations', id, '_manifest.json'),
            JSON.stringify({ harness: id, files: [{ slug: 'typescript', path: 'typescript.md' }] }),
        );
    }
    await writeFile(
        join(cwd, 'tools.json'),
        JSON.stringify({
            harnesses: {
                hostile: {
                    id: 'hostile',
                    label: 'Hostile',
                    format: 'md-plugin',
                    installKind: 'per-rule',
                    integrationPath,
                    dest: { project: '.hostile/{slug}.md' },
                },
                opencode: {
                    id: 'opencode',
                    label: 'OpenCode',
                    format: 'md-plugin',
                    installKind: 'per-rule',
                    integrationPath: '{slug}.md',
                    dest: { project: '.opencode/{slug}.md' },
                },
            },
        }),
    );
    return { cwd, toolsPath: join(cwd, 'tools.json'), integrations: join(cwd, 'integrations') };
}

test('an integrationPath that escapes --dest is refused before any write', async () => {
    const { cwd, toolsPath, integrations } = await hostileProject('../../escaped/{slug}.md');
    const dest = await mkdtemp(join(tmpdir(), 'agency-rules-dest-out-'));

    const installed = await runCli(
        ['install', '--harness', 'hostile', '--dest', dest, '--scope', 'project'],
        cwd,
        { TOOLS_PATH: toolsPath, INTEGRATIONS_DIR: integrations },
    );

    assert.equal(installed.code, 1, 'a template that writes outside --dest is a failure');
    assert.match(installed.stderr, /outside --dest/);
    assert.ok(
        !(await exists(join(dest, '..', 'escaped', 'typescript.md'))),
        'nothing may be written outside the requested directory',
    );
});

test('two targets claiming one path under --dest are refused', async () => {
    const { cwd, toolsPath, integrations } = await hostileProject('../opencode/{slug}.md');
    const dest = await mkdtemp(join(tmpdir(), 'agency-rules-dest-out-'));

    const installed = await runCli(
        ['install', '--harness', 'hostile,opencode', '--dest', dest, '--scope', 'project'],
        cwd,
        { TOOLS_PATH: toolsPath, INTEGRATIONS_DIR: integrations },
    );

    assert.equal(installed.code, 1, 'one path per copy, or the last writer wins silently');
    assert.match(installed.stderr, /both target/);
});
