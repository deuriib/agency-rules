/**
 * Frame rendering for the TUI, as a pure string function.
 *
 * Determinism is the point: no clock, no terminal query, no cursor addressing
 * beyond colour and reverse video. The same state renders the same bytes, which
 * is what lets the render output be pinned by a test instead of by a screenshot.
 */

import { sanitize, sanitizeLine } from './sanitize.mjs';
import { itemKey, selectedKeys, visibleWindow } from './state.mjs';

/** The only escape sequences this module is allowed to emit. */
export const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    reverse: '\x1b[7m',
};

export const CHECKBOX = { on: '[x]', off: '[ ]' };
export const RADIO = { on: '(•)', off: '( )' };
export const CURSOR_MARKER = '❯';
export const EMPTY_TEXT = 'no matches';
export const FILTER_HINT = 'press / to filter';
/**
 * The footer, per mode. A single-choice screen has no selection set, so
 * advertising `space toggle`, `a all` and `c clear` there is three keys that do
 * nothing — the footer has to describe the keys the screen actually honours.
 */
export const HELP_LINES = {
    multi: '↑/↓ move · space toggle · / filter · a all · c clear · enter confirm · esc back · ctrl+c quit',
    single: '↑/↓ move · enter confirm · esc back · ctrl+c quit',
};
/** The multi-select footer, kept for callers that only render multi-select. */
export const HELP_LINE = HELP_LINES.multi;

const INDENT = '  ';
const SUB_INDENT = '     ';
// Matching the escape byte is the entire job of this pattern.
// biome-ignore lint/suspicious/noControlCharactersInRegex: stripAnsi must find SGR sequences
const ANSI_PATTERN = /\x1b\[[0-9;]*[A-Za-z]/g;
const DEFAULT_HEIGHT = 10;
const JOINER = ' · ';

/**
 * Remove the escape sequences a frame contains.
 *
 * Exported for tests: it is how "the untrusted text arrived inert" is asserted
 * without depending on the exact colours.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function stripAnsi(text) {
    return String(text ?? '').replace(ANSI_PATTERN, '');
}

/**
 * Render one frame.
 *
 * @param {{items: object[], cursor: number, selected: Set<string>}} state
 * @param {{
 *   title?: string,
 *   filter?: string,
 *   height?: number,
 *   getLabel?: (item: object, index: number) => string,
 *   getSub?: (item: object, index: number) => string,
 *   multi?: boolean,
 *   filtering?: boolean,
 *   notice?: string,
 * }} [options]
 * @returns {string} newline-separated lines, ANSI-decorated
 */
export function renderList(state, options = {}) {
    const {
        title = '',
        filter = '',
        height = DEFAULT_HEIGHT,
        getLabel = defaultLabel,
        getSub = null,
        multi = true,
        filtering = false,
        notice = '',
    } = options;

    const lines = titleLines(title);
    lines.push(filterLine(filter, filtering));
    lines.push(`${INDENT}${ANSI.dim}${counter(state, multi)}${ANSI.reset}`);
    lines.push(...itemLines(state, { height, getLabel, getSub, multi }));
    if (notice) lines.push(`${INDENT}${ANSI.dim}${sanitizeLine(notice)}${ANSI.reset}`);
    lines.push(`${INDENT}${ANSI.dim}${helpLine(multi)}${ANSI.reset}`);
    return lines.join('\n');
}

/**
 * Render a single-choice list: same frame, radio marks instead of checkboxes.
 *
 * @param {{items: object[], cursor: number, selected: Set<string>}} state
 * @param {object} options see {@link renderList}
 * @returns {string}
 */
export function renderChoice(state, options = {}) {
    return renderList(state, { ...options, multi: false });
}

function titleLines(title) {
    return sanitize(title)
        .split('\n')
        .map((line) => `${ANSI.bold}${line}${ANSI.reset}`);
}

/**
 * The filter row, which also has to say whether typing goes into it.
 *
 * Reverse video while filtering is the only cue that separates "this text is a
 * query" from "this text is not receiving your keystrokes"; the hint states the
 * rule the footer promises.
 */
function filterLine(filter, filtering) {
    const row = `${INDENT}${ANSI.dim}/${ANSI.reset} ${sanitizeLine(filter)}`;
    if (filtering) return `${ANSI.reverse}${row}${ANSI.reset}`;
    if (String(filter).trim() === '') {
        return `${row} ${ANSI.dim}${FILTER_HINT}${ANSI.reset}`;
    }
    return row;
}

function helpLine(multi) {
    return multi ? HELP_LINES.multi : HELP_LINES.single;
}

function counter(state, multi) {
    const parts = [];
    if (multi) parts.push(`${selectedKeys(state).length} selected`);
    parts.push(`${state.items.length} shown`);
    return parts.join(JOINER);
}

function itemLines(state, { height, getLabel, getSub, multi }) {
    if (state.items.length === 0) return [`${INDENT}${ANSI.dim}${EMPTY_TEXT}${ANSI.reset}`];
    const { start, end } = visibleWindow(state, height);
    const lines = [];
    for (let index = start; index < end; index++) {
        const item = state.items[index];
        const focused = index === state.cursor;
        const mark = focusMark(state, item, index, multi);
        const label = `${focused ? CURSOR_MARKER : ' '} ${mark} ${sanitizeLine(getLabel(item, index))}`;
        lines.push(focused ? `${ANSI.reverse}${label}${ANSI.reset}` : label);
        const sub = getSub ? sanitizeLine(getSub(item, index)) : '';
        if (sub !== '') lines.push(`${SUB_INDENT}${ANSI.dim}${sub}${ANSI.reset}`);
    }
    return lines;
}

function focusMark(state, item, index, multi) {
    if (!multi) return index === state.cursor ? RADIO.on : RADIO.off;
    return state.selected.has(itemKey(item, index)) ? CHECKBOX.on : CHECKBOX.off;
}

function defaultLabel(item) {
    return String(item?.label ?? item?.key ?? '');
}
