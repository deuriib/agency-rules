import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { classifyInstall, filesAreEqual } from '../scripts/lib/file-compare.mjs';

async function withTempDir(fn) {
    const dir = await mkdtemp(join(tmpdir(), 'agency-rules-cmp-'));
    try {
        return await fn(dir);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

test('identical files are equal', async () => {
    await withTempDir(async (dir) => {
        const a = join(dir, 'a.md');
        const b = join(dir, 'b.md');
        await writeFile(a, '# Same\n');
        await writeFile(b, '# Same\n');
        assert.equal(await filesAreEqual(a, b), true);
    });
});

test('same length, different content, is not equal', async () => {
    await withTempDir(async (dir) => {
        const a = join(dir, 'a.md');
        const b = join(dir, 'b.md');
        await writeFile(a, 'aaaa');
        await writeFile(b, 'bbbb');
        assert.equal(await filesAreEqual(a, b), false);
    });
});

test('different length is not equal and is decided without reading content', async () => {
    await withTempDir(async (dir) => {
        const a = join(dir, 'a.md');
        const b = join(dir, 'b.md');
        await writeFile(a, 'short');
        await writeFile(b, 'much longer content');
        assert.equal(await filesAreEqual(a, b), false);
    });
});

test('a missing destination is not equal, not an exception', async () => {
    await withTempDir(async (dir) => {
        const a = join(dir, 'a.md');
        await writeFile(a, 'content');
        assert.equal(await filesAreEqual(a, join(dir, 'nope.md')), false);
    });
});

test('two empty files are equal', async () => {
    await withTempDir(async (dir) => {
        const a = join(dir, 'a.md');
        const b = join(dir, 'b.md');
        await writeFile(a, '');
        await writeFile(b, '');
        assert.equal(await filesAreEqual(a, b), true);
    });
});

test('binary content is compared byte for byte', async () => {
    await withTempDir(async (dir) => {
        const a = join(dir, 'a.bin');
        const b = join(dir, 'b.bin');
        await writeFile(a, Buffer.from([0, 1, 2, 255]));
        await writeFile(b, Buffer.from([0, 1, 2, 255]));
        await writeFile(join(dir, 'c.bin'), Buffer.from([0, 1, 2, 254]));
        assert.equal(await filesAreEqual(a, b), true);
        assert.equal(await filesAreEqual(a, join(dir, 'c.bin')), false);
    });
});

test('classifyInstall reports added, updated, and unchanged', async () => {
    await withTempDir(async (dir) => {
        const src = join(dir, 'src.md');
        const same = join(dir, 'same.md');
        const stale = join(dir, 'stale.md');
        await writeFile(src, 'compiled');
        await writeFile(same, 'compiled');
        await writeFile(stale, 'older version');

        assert.equal(await classifyInstall(src, join(dir, 'missing.md')), 'added');
        assert.equal(await classifyInstall(src, stale), 'updated');
        assert.equal(await classifyInstall(src, same), 'unchanged');
    });
});

test('a directory where a file is expected counts as updated, not unchanged', async () => {
    await withTempDir(async (dir) => {
        const src = join(dir, 'src.md');
        const asDir = join(dir, 'dest.md');
        await writeFile(src, 'content');
        await mkdir(asDir, { recursive: true });
        assert.equal(await classifyInstall(src, asDir), 'updated');
    });
});
