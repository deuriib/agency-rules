import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { PACKAGE_ROOT, resolveRulesDir, resolveToolsPath } from '../scripts/lib/paths.mjs';

/**
 * The rules-directory fallback used to be written out five times, and one copy
 * was wrong: `resolve(cwd, 'rules')` is always truthy, so `validate`'s packaged
 * fallback was dead code and it crashed with an ENOENT stack outside a checkout.
 * These tests pin the single implementation.
 */

async function tempDir() {
    return mkdtemp(join(tmpdir(), 'agency-rules-paths-'));
}

test('RULES_DIR wins over everything', async () => {
    const cwd = await tempDir();
    await mkdir(join(cwd, 'rules'));
    const resolved = resolveRulesDir({ cwd, env: { RULES_DIR: '/tmp/elsewhere' } });
    assert.deepEqual(resolved, { dir: '/tmp/elsewhere', source: 'env' });
});

test('a local rules/ directory beats the packaged copy', async () => {
    const cwd = await tempDir();
    await mkdir(join(cwd, 'rules'));
    const resolved = resolveRulesDir({ cwd, env: {} });
    assert.equal(resolved.dir, join(cwd, 'rules'));
    assert.equal(resolved.source, 'local');
});

test('with no local rules/ it falls back to the packaged copy', async () => {
    const cwd = await tempDir();
    const resolved = resolveRulesDir({ cwd, env: {} });
    assert.equal(resolved.dir, join(PACKAGE_ROOT, 'rules'));
    assert.equal(resolved.source, 'package');
});

test('the packaged fallback is reported, so `new` can refuse to scaffold into it', async () => {
    const cwd = await tempDir();
    assert.equal(resolveRulesDir({ cwd, env: {} }).source, 'package');
});

test('tools.json prefers the local contract and falls back to the packaged one', async () => {
    const cwd = await tempDir();
    assert.equal(resolveToolsPath({ cwd }), join(PACKAGE_ROOT, 'tools.json'));
    await writeFile(join(cwd, 'tools.json'), '{"harnesses":{}}');
    assert.equal(resolveToolsPath({ cwd }), join(cwd, 'tools.json'));
});
