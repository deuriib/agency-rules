import assert from 'node:assert/strict';
import { test } from 'node:test';
import matter from 'gray-matter';

import {
    assertValidCategory,
    assertValidSlug,
    buildRuleSkeleton,
    titleize,
} from '../scripts/lib/rule-template.mjs';

test('titleize turns a slug into a heading', () => {
    assert.equal(titleize('coding-standards'), 'Coding Standards');
    assert.equal(titleize('api-review'), 'Api Review');
    assert.equal(titleize('a'), 'A');
});

test('assertValidSlug accepts kebab-case and rejects everything else', () => {
    for (const ok of ['a', 'api-review', 'go', 'rule2', 'typescript-strict']) {
        assert.doesNotThrow(() => assertValidSlug(ok), ok);
    }
    for (const bad of ['', 'Api-Review', 'api_review', 'api review', '../escape', '1abc', null]) {
        assert.throws(() => assertValidSlug(bad), /invalid slug/, String(bad));
    }
});

test('assertValidCategory rejects a path that would escape rules/', () => {
    assert.doesNotThrow(() => assertValidCategory('base'));
    assert.doesNotThrow(() => assertValidCategory('security'));
    for (const bad of ['../base', 'Base', 'a/b', '', null]) {
        assert.throws(() => assertValidCategory(bad), /invalid category/, String(bad));
    }
});

test('skeleton frontmatter parses and carries name, description, category tag', () => {
    const out = buildRuleSkeleton({
        slug: 'api-review',
        description: 'Use when reviewing REST endpoints, to catch missing validation.',
        category: 'base',
    });
    const parsed = matter(out);
    assert.equal(parsed.data.name, 'api-review');
    assert.equal(
        parsed.data.description,
        'Use when reviewing REST endpoints, to catch missing validation.',
    );
    assert.deepEqual(parsed.data.tags, ['base']);
});

test('skeleton omits trigger and alwaysApply so the spec can derive them', () => {
    const parsed = matter(buildRuleSkeleton({ slug: 'x-rule', description: 'Use when x.' }));
    assert.equal(parsed.data.trigger, undefined);
    assert.equal(parsed.data.alwaysApply, undefined);
    assert.equal(parsed.data.globs, undefined);
});

test('skeleton heading is the titleized slug', () => {
    const out = buildRuleSkeleton({ slug: 'api-review', description: 'Use when x.' });
    assert.match(out, /^# Api Review$/m);
});

test('a description with YAML metacharacters stays valid YAML', () => {
    const tricky = 'Use when a: b # c — "quoted" and \'single\'.';
    const parsed = matter(buildRuleSkeleton({ slug: 'tricky', description: tricky }));
    assert.equal(parsed.data.description, tricky);
});

test('an empty or whitespace description is rejected', () => {
    assert.throws(
        () => buildRuleSkeleton({ slug: 'x', description: '   ' }),
        /description is required/,
    );
    assert.throws(() => buildRuleSkeleton({ slug: 'x' }), /description is required/);
});

test('skeleton never emits a NAME-## numeric id', () => {
    const out = buildRuleSkeleton({ slug: 'api-review', description: 'Use when x.' });
    assert.doesNotMatch(out, /\b[A-Z]{2,}-\d{1,3}\b/);
});
