import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * The logging path is a terminal-facing surface.
 *
 * `render` sanitizes what it draws, but `install` and `convert` print harness
 * ids, formats and labels straight from `tools.json` — and `tui` prints those
 * lines *after* it leaves the alternate screen, so an ESC byte in a harness id
 * reaches the user's terminal with nothing between it and the SGR/OSC parser.
 *
 * Each test here runs the real binary against a scratched `tools.json` whose ids
 * and formats carry an SGR colour and an OSC title write, then asserts no ESC
 * byte survived anywhere in the output. The assertions are on the absence of
 * `\x1b`, not on a rendered message, because the whole class of payloads is what
 * must not arrive.
 */

const BIN = join(import.meta.dirname, '..', 'bin', 'agency-rules.mjs');
const ROOT = join(import.meta.dirname, '..');

/**
 * The escape byte as a pattern, built from its code point so the source holds no
 * control character of its own: `assert.doesNotMatch` needs a RegExp, and a
 * regex literal spelling `\x1b` is exactly what the linter flags.
 */
const ESC_BYTE = new RegExp(String.fromCharCode(0x1b));

/** SGR (red) plus an OSC 0 title write terminated by BEL: the reported payload. */
const SGR = '\x1b[31m';
const OSC = '\x1b]0;INSTALL-PWNED\x07';
const HOSTILE_ID = `evil${SGR}HARNESS${OSC}`;

/** Run the CLI in a scratch project, with `tools.json` and outputs kept there. */
function runCli(args, cwd, extraEnv = {}) {
    const env = {
        ...process.env,
        RULES_DIR: join(ROOT, 'rules'),
        INTEGRATIONS_DIR: join(cwd, 'integrations'),
        TOOLS_PATH: join(cwd, 'tools.json'),
        ...extraEnv,
    };

    return new Promise((resolve) => {
        execFile(process.execPath, [BIN, ...args], { cwd, env }, (error, stdout, stderr) => {
            resolve({ code: error?.code ?? 0, stdout, stderr, both: stdout + stderr });
        });
    });
}

/** A harness contract that installs cleanly under a hostile id. */
function harness(overrides = {}) {
    return {
        format: 'md-rules-dir',
        installKind: 'per-rule',
        integrationPath: '{slug}.md',
        dest: { project: 'out/{slug}.md', user: 'out-user/{slug}.md' },
        ...overrides,
    };
}

/** Write a scratch `tools.json` and return the scratch directory. */
async function scratchTools(harnesses) {
    const cwd = await mkdtemp(join(tmpdir(), 'agency-rules-log-sanitize-'));
    const contract = { version: 2, harnesses };
    await writeFile(join(cwd, 'tools.json'), `${JSON.stringify(contract, null, 2)}\n`);
    return cwd;
}

test('the absence assertions cannot pass vacuously', () => {
    // The suite below asserts that a pattern *matches nothing*; a pattern that
    // matches nothing anywhere would prove nothing. This pins the other half.
    assert.ok(ESC_BYTE.test(HOSTILE_ID), 'the pattern must find the payload it hunts');
    assert.ok(ESC_BYTE.test(SGR) && ESC_BYTE.test(OSC));
});

test('convert sanitizes a hostile harness id before logging it', async () => {
    const cwd = await scratchTools({
        [HOSTILE_ID]: {
            id: HOSTILE_ID,
            label: `Evil ${SGR}Label${OSC}`,
            ...harness(),
        },
    });

    const run = await runCli(['convert', '--harness', HOSTILE_ID], cwd);

    assert.equal(run.code, 0, run.stderr);
    assert.doesNotMatch(run.both, ESC_BYTE, 'no escape byte may reach the terminal');
    assert.match(run.both, /HARNESS/, 'the harness must still be named, inertly');
    assert.match(run.both, /\?\[31m/, 'the SGR introducer is replaced, not stripped silently');
});

test('install sanitizes a hostile harness id before logging it', async () => {
    const cwd = await scratchTools({
        [HOSTILE_ID]: {
            id: HOSTILE_ID,
            label: `Evil ${SGR}Label${OSC}`,
            ...harness(),
        },
    });

    const converted = await runCli(['convert', '--harness', HOSTILE_ID], cwd);
    assert.equal(converted.code, 0, converted.stderr);

    const run = await runCli(['install', '--harness', HOSTILE_ID, '--scope', 'project'], cwd);

    assert.equal(run.code, 0, run.stderr);
    assert.doesNotMatch(run.both, ESC_BYTE, 'no escape byte may reach the terminal');
    assert.match(run.both, /HARNESS/, 'the targets line must still name the harness');
    assert.match(run.both, /added/, 'the copy must have run, not been skipped');
});

test('convert sanitizes a hostile format in the "no renderer" failure', async () => {
    const id = `evil${SGR}FORMAT-HARNESS${OSC}`;
    const cwd = await scratchTools({
        [id]: {
            id,
            label: 'Evil',
            ...harness({ format: `no-such-format${SGR}${OSC}` }),
        },
    });

    const run = await runCli(['convert', '--harness', id], cwd);

    assert.equal(run.code, 1, 'an unknown format is still a failure');
    assert.match(run.stderr, /No renderer for format/);
    assert.doesNotMatch(run.both, ESC_BYTE, 'the failure must not print the payload either');
});

test('install sanitizes a hostile id in the skip warnings and the failure', async () => {
    const id = `nodest${SGR}SKIPPED${OSC}`;
    const cwd = await scratchTools({
        [id]: {
            id,
            label: 'No dest',
            ...harness({ dest: { user: 'out-user/{slug}.md' } }),
        },
    });

    // No convert: the "no compiled output at …" warning and the "none of the
    // requested harnesses could be installed" failure both carry the id.
    const run = await runCli(['install', '--harness', id, '--scope', 'project'], cwd);

    assert.equal(run.code, 1, 'a harness that cannot be installed is a failure');
    assert.match(run.both, /no compiled output/);
    assert.doesNotMatch(run.both, ESC_BYTE, 'the warning path is a terminal surface too');
});

test('the hostile payload from the report is inert end to end', async () => {
    // The exact id from the gate: `evil\x1b[31mHARNESS\x1b]0;INSTALL-PWNED\x07`.
    const cwd = await scratchTools({ [HOSTILE_ID]: { id: HOSTILE_ID, ...harness() } });

    const converted = await runCli(['convert'], cwd);
    const installed = await runCli(['install', '--all', '--scope', 'project'], cwd);

    assert.equal(converted.code, 0, converted.stderr);
    assert.equal(installed.code, 0, installed.stderr);
    assert.doesNotMatch(converted.both + installed.both, ESC_BYTE);
    assert.match(await readFile(join(cwd, 'out', 'typescript.md'), 'utf8'), /./);
});
