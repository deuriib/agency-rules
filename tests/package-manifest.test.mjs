import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

/**
 * The published package has to be runnable.
 *
 * `npx agency-rules` works only if the tarball contains the executable that
 * `package.json#bin` points at, and only if that file starts with a shebang.
 * Neither is checked by any other test: the suite exercises the code through
 * paths that assume the file is present, so a rename or a `files` regression
 * would go green here and break for every user after the publish.
 */

const ROOT = join(import.meta.dirname, '..');
const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));

/** Entry point of the declared command, as `package.json` states it. */
function declaredBinPath() {
    assert.equal(typeof pkg.bin, 'object', 'package.json must declare a bin command');
    const [name] = Object.keys(pkg.bin);
    return { name, target: pkg.bin[name] };
}

test('the command is declared under a name npm accepts', () => {
    const { name } = declaredBinPath();
    assert.equal(name, pkg.name, 'the command should be the package name');
    assert.match(name, /^[a-z0-9][a-z0-9._-]*$/, 'a slash or leading dot cannot be linked');
});

test('the bin target is a path npm does not need to rewrite', () => {
    // `.` prefixes and absolute paths are "corrected" at publish time. npm keeps
    // the entry but prints `script name … was invalid and removed`, which is
    // false and sends the next reader chasing a bin problem that does not exist.
    const { target } = declaredBinPath();
    assert.ok(!target.startsWith('./'), `drop the "./" prefix from bin: ${target}`);
    assert.ok(!target.startsWith('/'), `bin must be relative: ${target}`);
    assert.equal(target.split('/')[0], 'bin', 'the executable lives under bin/');
});

test('the bin target exists, is executable, and starts with a shebang', async () => {
    const { target } = declaredBinPath();
    const mode = await stat(join(ROOT, target)).then((s) => s.mode);
    assert.ok((mode & 0o111) !== 0, `${target} is not executable`);

    const firstLine = (await readFile(join(ROOT, target), 'utf8')).split('\n')[0];
    assert.match(firstLine, /^#!.*node/, `${target} needs a node shebang to be runnable`);
});

test('the packed tarball contains the declared executable', async () => {
    // `npm pack --dry-run` is the ground truth for what ships: it applies the
    // `files` allowlist and the always-included set. A bin that is declared but
    // not packed produces a package that installs and cannot run.
    const packed = await packFileList();
    if (packed === null) return; // npm unavailable: the filesystem checks above still hold

    const { target } = declaredBinPath();
    assert.ok(
        packed.includes(target),
        `${target} is missing from the packed files — "npx ${pkg.name}" would have no executable`,
    );
    assert.ok(packed.includes('package.json'), 'package.json must always ship');
    assert.ok(
        packed.some((path) => path.startsWith('scripts/')),
        'the CLI resolves its subcommands from scripts/ at runtime',
    );
    assert.ok(
        packed.includes('tools.json'),
        'the harness contract is read at runtime, not build time',
    );
});

/** File paths npm would pack, or null when npm is not installed. */
function packFileList() {
    return new Promise((resolve) => {
        execFile(
            process.platform === 'win32' ? 'npm.cmd' : 'npm',
            ['pack', '--dry-run', '--json'],
            { cwd: ROOT, env: process.env, maxBuffer: 8 * 1024 * 1024 },
            (error, stdout) => {
                if (error) {
                    // ENOENT means npm is not on PATH in this environment; any
                    // other failure is a real problem and must not be swallowed.
                    if (error.code === 'ENOENT') return resolve(null);
                    throw error;
                }
                const manifest = Object.values(JSON.parse(stdout))[0];
                resolve(manifest.files.map((file) => file.path));
            },
        );
    });
}
