import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import matter from 'gray-matter';

/**
 * The documented path, executed.
 *
 * `docs/` and `README.md` promise that `convert` then `install` puts a rule in
 * front of a harness. A promise nobody executes rots silently: the command can
 * keep exiting 0 while writing a file the harness never loads. This suite runs
 * the two commands a newcomer is told to run, against the real binary, and then
 * asserts the properties Copilot needs from the file it receives.
 *
 * It runs in CI with the rest of the suite, so a change that breaks the
 * documented path fails the build instead of failing the next newcomer.
 */

const BIN = join(import.meta.dirname, '..', 'bin', 'agency-rules.mjs');
const ROOT = join(import.meta.dirname, '..');

/** Run the CLI in a scratch project directory, with the repo's rules as source. */
function runCli(args, cwd, extraEnv = {}) {
    const env = {
        ...process.env,
        RULES_DIR: join(ROOT, 'rules'),
        INTEGRATIONS_DIR: join(cwd, 'integrations'),
        TOOLS_PATH: join(ROOT, 'tools.json'),
        ...extraEnv,
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

test('documented path: convert then install writes a loadable Copilot instruction file', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'agency-rules-docs-'));

    const converted = await runCli(['convert', '--harness', 'copilot'], cwd);
    assert.equal(converted.code, 0, converted.stderr);

    const installed = await runCli(
        ['install', '--harness', 'copilot', '--scope', 'project', '--rules', 'typescript'],
        cwd,
    );
    assert.equal(installed.code, 0, installed.stderr);
    assert.match(installed.stdout, /added/);

    const dest = join(cwd, '.github', 'instructions', 'typescript.instructions.md');
    assert.ok(await exists(dest), 'install must write .github/instructions/<slug>.instructions.md');

    const { data } = matter(await readFile(dest, 'utf8'));
    assert.equal(
        data.applyTo,
        '**/*.ts,**/*.tsx',
        'a path-specific instruction file without a matching applyTo is never loaded',
    );

    // Byte-identical to the compiled artifact: the installer copies, it does not
    // re-render, so what was tested is what landed.
    const compiled = await readFile(
        join(cwd, 'integrations', 'copilot', 'typescript.instructions.md'),
        'utf8',
    );
    assert.equal(await readFile(dest, 'utf8'), compiled);
});

test('documented path: a glob-less rule still gets an applyTo, and it covers every file', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'agency-rules-docs-'));

    const converted = await runCli(['convert', '--harness', 'copilot'], cwd);
    assert.equal(converted.code, 0, converted.stderr);

    const installed = await runCli(
        ['install', '--harness', 'copilot', '--scope', 'project', '--rules', 'coding-standards'],
        cwd,
    );
    assert.equal(installed.code, 0, installed.stderr);

    const dest = join(cwd, '.github', 'instructions', 'coding-standards.instructions.md');
    const { data } = matter(await readFile(dest, 'utf8'));
    assert.equal(data.applyTo, '**', 'no globs means every file, stated explicitly');
});

test('documented path: re-running install changes nothing', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'agency-rules-docs-'));

    await runCli(['convert', '--harness', 'copilot'], cwd);
    const args = ['install', '--harness', 'copilot', '--scope', 'project', '--rules', 'typescript'];
    await runCli(args, cwd);
    const dest = join(cwd, '.github', 'instructions', 'typescript.instructions.md');
    const first = await readFile(dest, 'utf8');

    const second = await runCli(args, cwd);
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /unchanged/, 'an idempotent install reports nothing to do');
    assert.equal(await readFile(dest, 'utf8'), first);
});

test('documented path: install with nothing detected is a silent-by-design no-op, and says so', async () => {
    // The README tells a newcomer to read the output, not just the status code,
    // because this branch exits 0. That contract is prose today; here it is a
    // test, so a later "exit 1 is stricter" refactor has to argue with a red
    // build instead of with nobody. No `--harness` and no `--all`: detection runs
    // and, in an empty directory, finds nothing.
    const cwd = await mkdtemp(join(tmpdir(), 'agency-rules-docs-'));

    await runCli(['convert', '--harness', 'copilot'], cwd);
    // An empty HOME, because detection also looks at `~/.pi`, `~/.claude` and the
    // rest: on a machine that has harnesses installed it would find them and take
    // the failure branch instead. The branch under test is "nothing anywhere".
    const home = join(cwd, 'home');
    await mkdir(home, { recursive: true });
    const run = await runCli(['install', '--scope', 'project'], cwd, { HOME: home });

    assert.equal(run.code, 0, 'no detected harness is a legitimate no-op');
    assert.match(run.stderr, /No harness detected/);
    assert.ok(!(await exists(join(cwd, '.github', 'instructions'))), 'nothing may be written');
});

test('documented path: with no overrides, convert writes into the project you are standing in', async () => {
    // The README says to inspect `integrations/` after `convert`. Nothing asserted
    // that a bare run puts it there — every other test in this file sets
    // INTEGRATIONS_DIR, which would hide a default that resolves somewhere else.
    // The environment is the trap here twice over: mise exports RULES_DIR and
    // INTEGRATIONS_DIR into a developer's shell, so a clean-room run proves
    // nothing unless both are removed first.
    const cwd = await mkdtemp(join(tmpdir(), 'agency-rules-docs-'));

    const env = { ...process.env };
    for (const name of ['RULES_DIR', 'INTEGRATIONS_DIR', 'TOOLS_PATH']) delete env[name];

    const run = await new Promise((resolve) => {
        execFile(
            process.execPath,
            [BIN, 'convert', '--harness', 'copilot'],
            { cwd, env },
            (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stdout, stderr }),
        );
    });

    assert.equal(run.code, 0, run.stderr);
    assert.ok(
        await exists(join(cwd, 'integrations', 'copilot', 'typescript.instructions.md')),
        'a bare convert must write integrations/ into the directory it was run from',
    );
});
