/**
 * The TUI's thin raw-mode driver.
 *
 * Everything decidable lives in the pure modules next door (`state`, `filter`,
 * `render`, `keys`, `sanitize`); this file owns the terminal and nothing else:
 * raw mode, the alternate screen, one keypress loop, and the guarantee that the
 * terminal is given back on *every* exit path — including `process.exit` from
 * the command that runs after the UI.
 */

import process from 'node:process';
import { emitKeypressEvents } from 'node:readline';
import { filterItems } from './filter.mjs';
import { interpretKey, interpretTextKey } from './keys.mjs';
import { ANSI, renderChoice, renderList } from './render.mjs';
import { sanitize, sanitizeLine } from './sanitize.mjs';
import {
    clearSelection,
    createListState,
    moveCursor,
    selectAll,
    selectedKeys,
    setItems,
    toggle,
} from './state.mjs';

/** Frame chrome: title, filter, counter, help. */
const CHROME_LINES = 4;
/** A row plus its dimmed sub-line. */
const LINES_PER_ITEM = 2;
const FALLBACK_ROWS = 24;
const EXIT_INTERRUPTED = 130;
const ALT_SCREEN_ENTER = '\x1b[?1049h';
const ALT_SCREEN_LEAVE = '\x1b[?1049l';
const CURSOR_HIDE = '\x1b[?25l';
const CURSOR_SHOW = '\x1b[?25h';
const CLEAR_HOME = '\x1b[H\x1b[2J';
const NEWLINE = '\n';
const PROMPT_MARK = '›';
const PROMPT_HELP = 'enter confirm · esc back · ctrl+c quit';
export const NOTICE_PICK_ONE = 'Select at least one item — space toggles, a selects all.';

/** The session that owns the terminal right now, if any. */
let activeSession = null;
let guardInstalled = false;

/**
 * Close the terminal on the paths a promise cannot cover.
 *
 * `install` calls `process.exit(1)` when a target cannot be installed, and
 * SIGINT arrives from outside the event loop. Both would leave the caller in the
 * alternate screen with the cursor hidden; `close` is idempotent, so a signal
 * that arrives after a normal close is still a no-op.
 */
function installExitGuard() {
    if (guardInstalled) return;
    guardInstalled = true;
    process.on('exit', () => activeSession?.close());
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () => {
            activeSession?.close();
            process.exit(EXIT_INTERRUPTED);
        });
    }
}

function openSession() {
    const { stdin, stdout } = process;
    const wasRaw = Boolean(stdin.isRaw);
    emitKeypressEvents(stdin);
    if (typeof stdin.setRawMode === 'function') stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdout.write(`${ALT_SCREEN_ENTER}${CURSOR_HIDE}`);

    let closed = false;
    return {
        close() {
            if (closed) return;
            closed = true;
            if (typeof stdin.setRawMode === 'function') stdin.setRawMode(wasRaw);
            stdin.pause();
            stdout.write(`${CURSOR_SHOW}${ALT_SCREEN_LEAVE}`);
        },
    };
}

/**
 * Run one interactive screen until `onKey` returns a result.
 *
 * `onKey` receives a normalised sequence and returns the value to resolve with,
 * or null to keep going. Redrawing after every key keeps the reducer — not the
 * driver — in charge of what a key means.
 */
async function runSession({ draw, onKey }) {
    installExitGuard();
    const session = openSession();
    activeSession = session;

    return new Promise((resolve, reject) => {
        function detach() {
            process.stdin.off('keypress', handleKey);
            process.stdout.off('resize', guardedDraw);
        }
        function settle(result) {
            detach();
            session.close();
            activeSession = null;
            resolve(result);
        }
        // A throw is an exit path too: without this the alternate screen and raw
        // mode outlive the session, and every later keystroke is swallowed by a
        // terminal nobody is reading.
        function fail(err) {
            detach();
            session.close();
            activeSession = null;
            reject(err);
        }
        function guardedDraw() {
            try {
                draw();
            } catch (err) {
                fail(err);
            }
        }
        function handleKey(text, key) {
            try {
                const result = onKey(key?.sequence ?? key?.name ?? text);
                if (result) settle(result);
                else draw();
            } catch (err) {
                fail(err);
            }
        }

        process.stdin.on('keypress', handleKey);
        process.stdout.on('resize', guardedDraw);
        guardedDraw();
    });
}

/**
 * Room for item rows once the chrome is paid for.
 *
 * `extra` is the number of chrome lines this particular frame adds beyond the
 * fixed ones (today: the notice row), so the frame never exceeds `rows` and
 * scrolls the title away.
 */
function itemHeight(extra = 0) {
    const rows = process.stdout.rows ?? FALLBACK_ROWS;
    return Math.max(1, Math.floor((rows - CHROME_LINES - extra) / LINES_PER_ITEM));
}

async function runList(config) {
    let filter = '';
    let filtering = false;
    let notice = '';
    let state = createListState({ items: config.items, selected: config.selected });

    const fields = (item) => [
        item?.key,
        item?.slug,
        item?.tags,
        config.getLabel?.(item),
        config.getSub?.(item),
    ];
    const visible = () => filterItems(config.items, filter, fields);
    const applyFilter = () => {
        state = setItems(state, visible());
    };
    const canConfirm = () =>
        !config.multi || config.allowEmpty !== false || selectedKeys(state).length > 0;
    const render = config.multi ? renderList : renderChoice;
    const draw = () => {
        const frame = render(state, {
            title: config.title,
            filter,
            height: itemHeight(notice === '' ? 0 : 1),
            getLabel: config.getLabel,
            getSub: config.getSub,
            filtering,
            notice,
        });
        process.stdout.write(`${CLEAR_HOME}${frame}`);
    };

    const onKey = (sequence) => {
        const action = interpretKey(sequence, { filtering });
        switch (action.type) {
            case 'move':
                state = moveCursor(state, action.delta);
                notice = '';
                return null;
            case 'toggle':
                if (config.multi) state = toggle(state, state.cursor);
                return null;
            case 'selectAll':
                if (config.multi) state = selectAll(state);
                return null;
            case 'clear':
                if (config.multi) state = clearSelection(state);
                return null;
            case 'filterStart':
                filtering = true;
                return null;
            case 'filterEnd':
                filtering = false;
                return null;
            case 'filter':
                filter += action.char;
                applyFilter();
                return null;
            case 'filterBackspace':
                filter = filter.slice(0, -1);
                applyFilter();
                return null;
            case 'confirm':
                if (!canConfirm()) {
                    notice = NOTICE_PICK_ONE;
                    return null;
                }
                return { state, filter, action: 'confirm' };
            case 'back':
            case 'quit':
                return { state, filter, action: action.type };
            default:
                return null;
        }
    };

    return runSession({ draw, onKey });
}

/**
 * Multi-select over `items`.
 *
 * @param {{
 *   title: string,
 *   items: object[],
 *   getLabel: (item: object) => string,
 *   getSub?: (item: object) => string,
 *   selected?: Iterable<string>,
 *   allowEmpty?: boolean,
 * }} config
 * @returns {Promise<{selected: string[], filter: string, action: 'confirm'|'back'|'quit'}>}
 */
export async function multiSelect({
    title,
    items,
    getLabel,
    getSub,
    selected = [],
    allowEmpty = true,
}) {
    const result = await runList({
        title,
        items,
        getLabel,
        getSub,
        selected,
        allowEmpty,
        multi: true,
    });
    return { selected: selectedKeys(result.state), filter: result.filter, action: result.action };
}

/**
 * Single-choice list over `options`.
 *
 * @param {{title: string, options: string[], labels?: string[]}} config
 * @returns {Promise<{value: string|null, action: 'confirm'|'back'|'quit'}>}
 */
export async function selectOne({ title, options, labels = [] }) {
    const items = options.map((value, index) => ({ key: value, label: labels[index] ?? value }));
    const result = await runList({
        title,
        items,
        getLabel: (item) => item.label,
        multi: false,
    });
    const current = result.state.items[result.state.cursor];
    return { value: current?.key ?? null, action: result.action };
}

/**
 * Free-text prompt, used for the custom destination.
 *
 * @param {{title: string, initial?: string}} config
 * @returns {Promise<{value: string, action: 'confirm'|'back'|'quit'}>}
 */
export async function promptText({ title, initial = '' }) {
    let value = initial;

    const draw = () => {
        const lines = sanitize(title)
            .split('\n')
            .map((line) => `${ANSI.bold}${line}${ANSI.reset}`);
        lines.push(`  ${PROMPT_MARK} ${sanitizeLine(value)}`);
        lines.push(`  ${ANSI.dim}${PROMPT_HELP}${ANSI.reset}`);
        process.stdout.write(`${CLEAR_HOME}${lines.join(NEWLINE)}`);
    };

    const onKey = (sequence) => {
        const action = interpretTextKey(sequence);
        switch (action.type) {
            case 'text':
                value += action.char;
                return null;
            case 'textBackspace':
                value = value.slice(0, -1);
                return null;
            case 'confirm':
            case 'back':
            case 'quit':
                // Sanitized here, before it can become `plan.dest` and then a
                // filesystem path: the prompt is the last place typed bytes are
                // still inert text.
                return { value: sanitizeLine(value), action: action.type };
            default:
                return null;
        }
    };

    return runSession({ draw, onKey });
}
