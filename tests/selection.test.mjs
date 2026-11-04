import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseSelection, pickByIndices, renderMenu } from '../scripts/lib/selection.mjs';

test('an empty answer selects everything', () => {
    assert.deepEqual(parseSelection('', { length: 5 }), { kind: 'all' });
    assert.deepEqual(parseSelection('   ', { length: 5 }), { kind: 'all' });
});

test('the all label selects everything', () => {
    assert.deepEqual(parseSelection('all', { length: 5 }), { kind: 'all' });
    assert.deepEqual(parseSelection('ALL', { length: 5 }), { kind: 'all' });
});

test('comma-separated indices are parsed, deduped, and sorted', () => {
    assert.deepEqual(parseSelection('2,5', { length: 5 }), { kind: 'some', indices: [2, 5] });
    assert.deepEqual(parseSelection(' 5 , 2 ', { length: 5 }), { kind: 'some', indices: [2, 5] });
    assert.deepEqual(parseSelection('3,3,1', { length: 5 }), { kind: 'some', indices: [1, 3] });
});

test('an out-of-range or non-numeric token is rejected, never coerced', () => {
    for (const answer of ['0', '6', '99', 'abc', '1,x', '-1', '1.5']) {
        const result = parseSelection(answer, { length: 5 });
        assert.equal(result.kind, 'invalid', `"${answer}" must not be accepted`);
    }
});

test('a single index selects exactly one rule', () => {
    assert.deepEqual(parseSelection('3', { length: 5 }), { kind: 'some', indices: [3] });
});

test('an empty list rejects everything rather than defaulting to all', () => {
    assert.equal(parseSelection('1', { length: 0 }).kind, 'invalid');
});

test('pickByIndices maps 1-based menu numbers to values', () => {
    const values = ['alpha', 'beta', 'gamma'];
    assert.deepEqual(pickByIndices([1, 3], values), ['alpha', 'gamma']);
    assert.deepEqual(pickByIndices([], values), []);
});

test('pickByIndices ignores an index that no longer exists', () => {
    assert.deepEqual(pickByIndices([1, 9], ['alpha']), ['alpha']);
});

test('the menu numbers every item, offers all, and states the default', () => {
    const menu = renderMenu({ title: 'Select:', items: ['a', 'b'] });
    assert.match(menu, /1\) a/);
    assert.match(menu, /2\) b/);
    assert.match(menu, /all\) All/);
    assert.match(menu, /default: all/);
});
