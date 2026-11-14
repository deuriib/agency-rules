import assert from 'node:assert/strict';
import { test } from 'node:test';

import { interpretKey, interpretTextKey, normalizeKey } from '../scripts/lib/tui/keys.mjs';

/**
 * A terminal sends bytes; the UI needs intent. Arrow keys arrive as `\x1b[A`,
 * backspace as `\x7f` or `\x08`, Enter as `\r` or `\n` — and `a` and `c` are
 * shortcuts while navigating but query text while filtering.
 */

test('arrow sequences and names both mean "move"', () => {
    assert.deepEqual(interpretKey('\x1b[A'), { type: 'move', delta: -1 });
    assert.deepEqual(interpretKey('\x1b[B'), { type: 'move', delta: 1 });
    assert.deepEqual(interpretKey('up'), { type: 'move', delta: -1 });
    assert.deepEqual(interpretKey('down'), { type: 'move', delta: 1 });
    assert.deepEqual(interpretKey('\x1bOA'), { type: 'move', delta: -1 });
});

test('space and tab toggle the current item', () => {
    assert.equal(interpretKey(' ').type, 'toggle');
    assert.equal(interpretKey('\t').type, 'toggle');
    assert.equal(interpretKey('space').type, 'toggle');
});

test('enter confirms, escape goes back, ctrl+c quits', () => {
    assert.equal(interpretKey('\r').type, 'confirm');
    assert.equal(interpretKey('\n').type, 'confirm');
    assert.equal(interpretKey('return').type, 'confirm');
    assert.equal(interpretKey('\x1b').type, 'back');
    assert.equal(interpretKey('escape').type, 'back');
    assert.equal(interpretKey('\x03').type, 'quit');
    assert.equal(interpretKey('c-c').type, 'quit');
});

test('the shortcuts work in either letter case', () => {
    assert.equal(interpretKey('a').type, 'selectAll');
    assert.equal(interpretKey('A').type, 'selectAll');
    assert.equal(interpretKey('c').type, 'clear');
});

test('slash opens the filter while navigating and closes it while filtering', () => {
    assert.equal(interpretKey('/').type, 'filterStart');
    assert.equal(interpretKey('/', { filtering: true }).type, 'filterEnd');
});

test('while filtering, letters are query text rather than shortcuts', () => {
    assert.deepEqual(interpretKey('a', { filtering: true }), { type: 'filter', char: 'a' });
    assert.deepEqual(interpretKey('C', { filtering: true }), { type: 'filter', char: 'C' });
    assert.deepEqual(interpretKey('?', { filtering: true }), { type: 'filter', char: '?' });
});

test('backspace edits the filter only while filtering', () => {
    assert.deepEqual(interpretKey('\x7f', { filtering: true }), { type: 'filterBackspace' });
    assert.deepEqual(interpretKey('\x08', { filtering: true }), { type: 'filterBackspace' });
    assert.equal(interpretKey('\x7f').type, null);
});

test('a space is query text while filtering, and tab still toggles', () => {
    assert.deepEqual(interpretKey(' ', { filtering: true }), { type: 'filter', char: ' ' });
    assert.deepEqual(interpretKey('space', { filtering: true }), { type: 'filter', char: ' ' });
    assert.equal(interpretKey('\t', { filtering: true }).type, 'toggle');
});

test('an unbound key is inert, never a guess', () => {
    for (const key of ['z', 'q', '\x1b[C', '', 'pageup']) {
        assert.equal(interpretKey(key).type, null, `"${key}" must not be bound`);
    }
});

test('normalizeKey keeps printable text but names the sequences', () => {
    assert.equal(normalizeKey('\x1b[B'), 'down');
    assert.equal(normalizeKey('x'), 'x');
    assert.equal(normalizeKey(''), '');
});

test('a text field treats shortcuts as text and space as a space', () => {
    assert.deepEqual(interpretTextKey('a'), { type: 'text', char: 'a' });
    assert.deepEqual(interpretTextKey('space'), { type: 'text', char: ' ' });
    assert.deepEqual(interpretTextKey('/'), { type: 'text', char: '/' });
    assert.deepEqual(interpretTextKey('\x7f'), { type: 'textBackspace' });
    assert.equal(interpretTextKey('\r').type, 'confirm');
    assert.equal(interpretTextKey('\x1b').type, 'back');
    assert.equal(interpretTextKey('\x03').type, 'quit');
});

test('a control byte is never printable text', () => {
    assert.deepEqual(interpretTextKey('\u009b'), { type: null });
    assert.deepEqual(interpretTextKey('\u0085'), { type: null });
    assert.deepEqual(interpretTextKey('\x7f'), { type: 'textBackspace' });
    assert.equal(interpretKey('\u009b', { filtering: true }).type, null);
});
