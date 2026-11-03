import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { SLUG_PLACEHOLDER, substituteSlug } from '../scripts/lib/slug-template.mjs';

const ROOT = join(import.meta.dirname, '..');
const tools = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8'));

test('substitutes the single-brace placeholder', () => {
    assert.equal(SLUG_PLACEHOLDER, '{slug}');
    assert.equal(
        substituteSlug('.agents/rules/{slug}.md', 'coding-standards'),
        '.agents/rules/coding-standards.md',
    );
    assert.equal(substituteSlug('{slug}/RULES.md', 'nexus-strategy'), 'nexus-strategy/RULES.md');
});

test('rejects the legacy double-brace form instead of writing a literal braced path', () => {
    assert.throws(
        () => substituteSlug('.agents/rules/{{slug}}.md', 'coding-standards'),
        /still contains braces/,
    );
});

test('rejects a template with no placeholder', () => {
    assert.throws(
        () => substituteSlug('.agents/rules/rules.md', 'coding-standards'),
        /must contain/,
    );
});

test('rejects a path-traversal or otherwise unsafe slug', () => {
    for (const slug of ['../escape', 'a/b', '', 'Coding-Standards', 'a b']) {
        assert.throws(() => substituteSlug('{slug}.md', slug), /unsafe slug/, slug);
    }
});

test('every harness template uses the single-brace placeholder and resolves', () => {
    for (const [key, harness] of Object.entries(tools.harnesses)) {
        assert.equal(harness.id, key, `${key}: harness id must equal its key`);
        assert.ok(
            harness.integrationPath.includes(SLUG_PLACEHOLDER),
            `${key}: integrationPath must use {slug}`,
        );
        assert.doesNotThrow(() => substituteSlug(harness.integrationPath, 'a-rule'), key);
        for (const [scope, template] of Object.entries(harness.dest)) {
            assert.ok(template.includes(SLUG_PLACEHOLDER), `${key}.${scope} must use {slug}`);
            assert.doesNotThrow(() => substituteSlug(template, 'a-rule'), `${key}.${scope}`);
        }
    }
});

test('harness ids are the agent tool ids', () => {
    // Issue #68: one id scheme across agents and rules. These are the
    // camelCase `id` values in agency-agents/tools.json.
    assert.deepEqual(Object.keys(tools.harnesses).sort(), [
        'antigravity',
        'ohMyPi',
        'opencode',
        'piAgent',
    ]);
});
