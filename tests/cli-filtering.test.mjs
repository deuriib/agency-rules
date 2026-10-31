import assert from 'node:assert/strict';
import { test } from 'node:test';

test('comma-separated harness parsing', () => {
    const input = 'antigravity,opencode,pi-agent';
    const result = input.split(',').map((s) => s.trim());
    assert.deepEqual(result, ['antigravity', 'opencode', 'pi-agent']);
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
