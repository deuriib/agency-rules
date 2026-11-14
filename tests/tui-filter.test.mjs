import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterItems, searchableText } from '../scripts/lib/tui/filter.mjs';

/**
 * The filter decides what a keystroke hides. An over-eager match installs rules
 * the user did not pick; an under-eager one hides the rule they were looking for.
 */

const ITEMS = [
    {
        slug: 'typescript',
        description: 'Strict typing for TypeScript files.',
        tags: ['lang', 'types'],
    },
    { slug: 'devops', description: 'CI pipelines and releases.', tags: ['ops'] },
    { slug: 'contracts', description: 'Drafting and renewing agreements.', tags: [] },
];

const fields = (item) => [item.slug, item.description, item.tags];

test('an empty query returns every item, in order', () => {
    assert.deepEqual(filterItems(ITEMS, '', fields), ITEMS);
    assert.deepEqual(filterItems(ITEMS, '   ', fields), ITEMS);
    assert.deepEqual(filterItems(ITEMS, undefined, fields), ITEMS);
});

test('the query matches a slug, case-insensitively', () => {
    assert.deepEqual(
        filterItems(ITEMS, 'DEVOPS', fields).map((item) => item.slug),
        ['devops'],
    );
});

test('the query matches a description', () => {
    assert.deepEqual(
        filterItems(ITEMS, 'renewing', fields).map((item) => item.slug),
        ['contracts'],
    );
});

test('the query matches a tag nested in an array', () => {
    assert.deepEqual(
        filterItems(ITEMS, 'ops', fields).map((item) => item.slug),
        ['devops'],
    );
});

test('the query is trimmed before matching', () => {
    assert.deepEqual(
        filterItems(ITEMS, '  typing  ', fields).map((item) => item.slug),
        ['typescript'],
    );
});

test('a query that matches nothing returns nothing', () => {
    assert.deepEqual(filterItems(ITEMS, 'kubernetes', fields), []);
});

test('searchableText is the lowercase union of every field', () => {
    const text = searchableText(ITEMS[0], fields);
    assert.match(text, /typescript/);
    assert.match(text, /strict typing/);
    assert.match(text, /lang/);
    assert.equal(text, text.toLowerCase());
});

test('missing and non-string fields are ignored rather than stringified', () => {
    const sparse = [{ slug: 'bare' }];
    assert.equal(
        searchableText(sparse[0], (item) => [item.slug, item.tags, 7]),
        'bare',
    );
});
