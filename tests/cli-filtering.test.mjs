import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const tools = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'tools.json'), 'utf8'));

test('every harness id in a --harness list is a declared harness', () => {
    const input = 'antigravity,opencode,piAgent';
    const requested = input.split(',').map((s) => s.trim());
    const unknown = requested.filter((id) => !tools.harnesses[id]);
    assert.deepEqual(unknown, [], 'a mistyped id exits 1 instead of converting silently');
});

test('comma-separated rules parsing', () => {
    const input = 'typescript,commit-conventions';
    const result = input.split(',').map((s) => s.trim());
    assert.deepEqual(result, ['typescript', 'commit-conventions']);
});

test('rule filtering correctly excludes unrequested files', () => {
    const allRules = [{ slug: 'typescript' }, { slug: 'python' }, { slug: 'commit-conventions' }];
    const requested = ['typescript', 'commit-conventions'];
    const filtered = allRules.filter((r) => requested.includes(r.slug));
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].slug, 'typescript');
    assert.equal(filtered[1].slug, 'commit-conventions');
});

test('missing rules are detected', () => {
    const allRules = [{ slug: 'typescript' }];
    const requested = ['typescript', 'non-existent'];
    const missing = requested.filter((slug) => !allRules.some((r) => r.slug === slug));
    assert.deepEqual(missing, ['non-existent']);
});
