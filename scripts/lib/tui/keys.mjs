/**
 * Key interpretation for the TUI, separated from the terminal.
 *
 * A terminal sends bytes; the UI needs intent. Mapping the two here means the
 * awkward part — arrow keys arriving as `\x1b[A`, backspace as either `\x7f` or
 * `\x08`, Enter as `\r` or `\n` — is a table with tests instead of a condition
 * buried in an event handler.
 *
 * Two modes, because `a` and `c` cannot both be shortcuts and filter input:
 * navigating, `/` opens the filter and letters are shortcuts; filtering, letters
 * are query text and `/` closes the filter.
 */

/** Arrow and control sequences a terminal actually sends, by canonical name. */
const KEY_ALIASES = new Map([
    ['\x1b[A', 'up'],
    ['\x1bOA', 'up'],
    ['\x1b[B', 'down'],
    ['\x1bOB', 'down'],
    ['\r', 'enter'],
    ['\n', 'enter'],
    ['return', 'enter'],
    ['\x1b', 'escape'],
    ['esc', 'escape'],
    ['\x7f', 'backspace'],
    ['\x08', 'backspace'],
    ['\t', 'tab'],
    ['\x1b[Z', 'tab'],
    [' ', 'space'],
    ['\x03', 'ctrl+c'],
    ['c-c', 'ctrl+c'],
]);

const MOVES = new Map([
    ['up', -1],
    ['down', 1],
]);

const NO_ACTION = { type: null };
const TOGGLE = { type: 'toggle' };
const CONFIRM = { type: 'confirm' };
const BACK = { type: 'back' };
const QUIT = { type: 'quit' };
const SELECT_ALL = { type: 'selectAll' };
const CLEAR = { type: 'clear' };
const FILTER_START = { type: 'filterStart' };
const FILTER_END = { type: 'filterEnd' };
const FILTER_BACKSPACE = { type: 'filterBackspace' };
const TEXT_BACKSPACE = { type: 'textBackspace' };
const SPACE_CHAR = ' ';

const FIRST_PRINTABLE = 0x20;
const LAST_PRINTABLE = 0x7e;
const DELETE = 0x7f;

/**
 * Canonical name for a key event.
 *
 * Accepts a raw sequence (`'\x1b[A'`), a readline key name (`'up'`), or a
 * single character (`'a'`). Unknown input keeps its own text, so anything that
 * is not a control sequence can be treated as a printable character.
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizeKey(input) {
    const raw = typeof input === 'string' ? input : '';
    if (raw === '') return '';
    return KEY_ALIASES.get(raw) ?? raw;
}

/**
 * Map a key to an action.
 *
 * @param {string} input raw sequence, key name, or character
 * @param {{filtering?: boolean}} [options]
 * @returns {{type: string|null, delta?: number, char?: string}}
 */
export function interpretKey(input, options = {}) {
    const key = normalizeKey(input);
    if (key === '') return NO_ACTION;
    if (MOVES.has(key)) return { type: 'move', delta: MOVES.get(key) };
    if (key === 'ctrl+c') return QUIT;
    return options.filtering ? filteringAction(key) : navigatingAction(key);
}

function navigatingAction(key) {
    switch (fold(key)) {
        case 'space':
        case 'tab':
            return TOGGLE;
        case 'enter':
            return CONFIRM;
        case 'escape':
            return BACK;
        case 'a':
            return SELECT_ALL;
        case 'c':
            return CLEAR;
        case '/':
            return FILTER_START;
        default:
            return NO_ACTION;
    }
}

function filteringAction(key) {
    switch (key) {
        case 'space':
            return { type: 'filter', char: SPACE_CHAR };
        case 'tab':
            return TOGGLE;
        case 'enter':
            return CONFIRM;
        case 'escape':
            return BACK;
        case 'backspace':
            return FILTER_BACKSPACE;
        case '/':
            return FILTER_END;
        default:
            return isPrintable(key) ? { type: 'filter', char: key } : NO_ACTION;
    }
}

/**
 * Map a key to a free-text field action.
 *
 * Same normalisation as {@link interpretKey}, different vocabulary: every
 * printable character — including `a`, `c`, and `/` — is text here, because a
 * path the user types must not be reinterpreted as a shortcut.
 *
 * @param {string} input raw sequence, key name, or character
 * @returns {{type: string|null, char?: string}}
 */
export function interpretTextKey(input) {
    const key = normalizeKey(input);
    if (key === '') return NO_ACTION;
    switch (key) {
        case 'enter':
            return CONFIRM;
        case 'escape':
            return BACK;
        case 'ctrl+c':
            return QUIT;
        case 'backspace':
            return TEXT_BACKSPACE;
        case 'space':
            return { type: 'text', char: SPACE_CHAR };
        default:
            return isPrintable(key) ? { type: 'text', char: key } : NO_ACTION;
    }
}

/** Shortcuts are case-insensitive; a one-letter key has no other meaning here. */
function fold(key) {
    return key.length === 1 ? key.toLowerCase() : key;
}

function isPrintable(key) {
    if (key.length !== 1) return false;
    const code = key.codePointAt(0);
    // The C1 block is the one a UTF-8 terminal decodes `\u009b` into, and CSI is
    // its first useful member: text that can start an escape sequence is not text.
    return code >= FIRST_PRINTABLE && code !== DELETE && code <= LAST_PRINTABLE;
}
