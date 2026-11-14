import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sanitize, sanitizeLine } from '../scripts/lib/tui/sanitize.mjs';

/**
 * The TUI's trust boundary.
 *
 * Rule descriptions and harness labels are repository data rendered into an ANSI
 * stream: an ESC byte in one of them is a terminal instruction, not text. These
 * tests pin the boundary so a later "pass the string through as-is" refactor has
 * to argue with a red suite.
 */

test('an ANSI colour sequence cannot reach the terminal', () => {
    const hostile = '\x1b[31mred\x1b[0m';
    const safe = sanitize(hostile);

    assert.equal(safe, '?[31mred?[0m');
    assert.ok(!safe.includes('\x1b'), 'no escape byte may survive');
});

test('a cursor-addressing sequence is defused', () => {
    assert.ok(!sanitize('\x1b[2J\x1b[H').includes('\x1b'));
});

test('C0 controls other than tab and newline are replaced', () => {
    assert.equal(sanitize('a\x00b\x07c\x1fd'), 'a?b?c?d');
    assert.equal(sanitize('tab\tand\nnewline'), 'tab\tand\nnewline');
});

test('C1 controls are replaced', () => {
    assert.equal(sanitize('a\x9bb'), 'a?b');
});

test('sanitizeLine collapses what one terminal line cannot hold', () => {
    assert.equal(sanitizeLine('  Use when\twriting\nrules  '), 'Use when writing rules');
});

test('non-string input yields an empty string instead of a throw', () => {
    assert.equal(sanitize(undefined), '');
    assert.equal(sanitize(null), '');
    assert.equal(sanitize(42), '');
    assert.equal(sanitizeLine(['a']), '');
});
