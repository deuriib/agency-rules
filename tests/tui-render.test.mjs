import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    ANSI,
    CHECKBOX,
    CURSOR_MARKER,
    EMPTY_TEXT,
    FILTER_HINT,
    HELP_LINES,
    RADIO,
    renderChoice,
    renderList,
    stripAnsi,
} from '../scripts/lib/tui/render.mjs';
import { createListState, moveCursor, toggle } from '../scripts/lib/tui/state.mjs';

/**
 * The frame is a pure string: no clock, no terminal query. That is what makes it
 * testable at all — these assertions pin the shape a user sees (checkbox, cursor,
 * dimmed sub-line, help) and prove untrusted text arrives inert.
 */

const ITEMS = [
    { key: 'devops', label: 'devops', sub: 'Use when touching CI.' },
    { key: 'typescript', label: 'typescript', sub: 'Use when editing TS.' },
    { key: 'contracts', label: 'contracts', sub: 'Use when drafting.' },
];

const options = {
    title: 'Pick harnesses',
    filter: '',
    height: 10,
    getLabel: (item) => item.label,
    getSub: (item) => item.sub,
};

function frame(state, overrides = {}) {
    return renderList(state, { ...options, ...overrides });
}

test('stripAnsi removes escape sequences and keeps the text', () => {
    assert.equal(stripAnsi(`${ANSI.bold}title${ANSI.reset}`), 'title');
    assert.equal(stripAnsi('plain'), 'plain');
    assert.equal(stripAnsi(undefined), '');
});

test('the frame shows the title, the filter line, and the help line', () => {
    const lines = stripAnsi(frame(createListState({ items: ITEMS }))).split('\n');

    assert.equal(lines[0], 'Pick harnesses');
    assert.match(lines[1], /^ {2}\/ /);
    assert.equal(lines.at(-1).trim(), HELP_LINES.multi);
});

test('the help line only advertises keys the screen honours', () => {
    const multi = stripAnsi(frame(createListState({ items: ITEMS })))
        .split('\n')
        .at(-1)
        .trim();
    for (const key of ['space toggle', 'a all', 'c clear']) {
        assert.ok(multi.includes(key), `a multi-select footer must advertise ${key}`);
    }

    const singleState = createListState({ items: [{ key: 'project', label: 'project' }] });
    const single = stripAnsi(renderChoice(singleState, { title: 'Scope' }))
        .split('\n')
        .at(-1)
        .trim();
    assert.equal(single, HELP_LINES.single);
    for (const key of ['space toggle', 'a all', 'c clear']) {
        assert.ok(
            !single.includes(key),
            `a single-choice footer must not advertise ${key}, which does nothing there`,
        );
    }
    for (const key of ['enter confirm', 'esc back', 'ctrl+c quit']) {
        assert.ok(single.includes(key), `a single-choice footer still honours ${key}`);
    }
});

test('an unchecked item renders an empty checkbox and a dimmed sub-line', () => {
    const rendered = frame(createListState({ items: ITEMS }));
    const plain = stripAnsi(rendered);

    assert.ok(plain.includes(`${CHECKBOX.off} devops`), 'unchecked items show an empty box');
    assert.ok(plain.includes('Use when touching CI.'), 'the sub-line is rendered');
    assert.ok(rendered.includes(`${ANSI.dim}Use when touching CI.`), 'the sub-line is dimmed');
});

test('a selected item renders a ticked checkbox', () => {
    const state = toggle(createListState({ items: ITEMS }), 1);
    assert.ok(stripAnsi(frame(state)).includes(`${CHECKBOX.on} typescript`));
});

test('the cursor row is reverse-video and marked', () => {
    const rendered = frame(moveCursor(createListState({ items: ITEMS }), 1));
    const cursorLine = rendered.split('\n').find((line) => line.includes(CURSOR_MARKER));

    assert.ok(cursorLine, 'the cursor row must be marked');
    assert.ok(cursorLine.startsWith(ANSI.reverse), 'the cursor row must be highlighted');
    assert.ok(cursorLine.includes(CHECKBOX.off), 'the cursor row keeps its checkbox');
});

test('the counter reports what is selected and what the filter shows', () => {
    const state = toggle(createListState({ items: ITEMS }), 0);
    const plain = stripAnsi(frame(state, { filter: 'type' }));
    assert.ok(plain.includes('1 selected'));
    assert.ok(plain.includes('3 shown'));
    assert.ok(plain.includes('/ type'));
});

test('an empty result says so instead of drawing nothing', () => {
    const rendered = frame(createListState({ items: [] }));
    assert.ok(stripAnsi(rendered).includes(EMPTY_TEXT));
});

test('only the rows that fit are drawn', () => {
    const state = moveCursor(createListState({ items: ITEMS }), 2);
    const plain = stripAnsi(frame(state, { height: 1 }));

    assert.ok(plain.includes('contracts'), 'the cursor row must be visible');
    assert.ok(!plain.includes('devops'), 'rows outside the window must not be drawn');
});

test('a multi-line title becomes several lines', () => {
    const plain = stripAnsi(frame(createListState({ items: ITEMS }), { title: 'one\ntwo' }));
    const lines = plain.split('\n');
    assert.equal(lines[0], 'one');
    assert.equal(lines[1], 'two');
});

test('untrusted labels cannot inject an escape sequence', () => {
    const hostile = [{ key: 'x', label: '\x1b[31mowned', sub: '\x1b[2Jwiped' }];
    const rendered = frame(createListState({ items: hostile }), { title: '\x1b]0;title' });

    assert.ok(!rendered.includes('\x1b[31m'), 'a colour from the data must not reach the frame');
    assert.ok(
        !rendered.includes('\x1b[2J'),
        'a clear-screen from the data must not reach the frame',
    );
    assert.ok(
        !rendered.includes('\x1b]0;'),
        'a title write from the data must not reach the frame',
    );
});

test('a notice is appended above the help line', () => {
    const plain = stripAnsi(frame(createListState({ items: ITEMS }), { notice: 'Pick one.' }));
    const lines = plain.split('\n');
    assert.equal(lines.at(-2).trim(), 'Pick one.');
});

test('the filter row says where keystrokes go', () => {
    const idle = stripAnsi(frame(createListState({ items: ITEMS }))).split('\n')[1];
    assert.ok(idle.includes(FILTER_HINT), 'an idle filter row must advertise its key');

    const active = frame(createListState({ items: ITEMS }), { filtering: true }).split('\n')[1];
    assert.ok(active.startsWith(ANSI.reverse), 'a filter that owns the keys must look focused');

    const typed = stripAnsi(frame(createListState({ items: ITEMS }), { filter: 'go' })).split(
        '\n',
    )[1];
    assert.ok(!typed.includes(FILTER_HINT), 'a query in progress is not a hint');
});

test('the single-choice frame uses radios and a selected row', () => {
    const state = createListState({ items: [{ key: 'project', label: 'project' }] });
    const plain = stripAnsi(renderChoice(state, { title: 'Scope' }));

    assert.ok(plain.includes(RADIO.on), 'the focused row is marked as chosen');
    assert.ok(!plain.includes('selected'), 'a single choice has no "n selected" counter');
});
