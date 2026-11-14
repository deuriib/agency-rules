/**
 * The trust boundary for terminal output.
 *
 * Rule slugs, descriptions, tags, and the harness ids and labels in `tools.json`
 * are repository data, not code — but they land in an ANSI stream. An ESC byte
 * in a harness id is not text any more: it moves the cursor, re-colours the
 * frame, or (with the right sequence) rewrites the terminal title. Every string
 * from `rules/` or `tools.json` is passed through `sanitize` before it reaches
 * `render` or a `console.log`, and only the renderer adds escape sequences of
 * its own.
 *
 * The TUI is not the only consumer: `install` and `convert` print harness data
 * too, and `tui` prints their output after it leaves the alternate screen, so
 * the sanitizer lives here rather than under `lib/tui/`.
 */

/** C0 controls stop here; tab and newline are the two that are real text. */
const C0_END = 0x1f;
const TAB = 0x09;
const NEWLINE = 0x0a;
/** DEL, then the C1 block (which contains CSI, the introducer for colour). */
const DEL = 0x7f;
const C1_END = 0x9f;

/** Runs of whitespace that a single terminal line cannot hold literally. */
const INLINE_WHITESPACE = /[\t\n\r]+/g;

/** Stand-in for a control character, so the payload stays visible but inert. */
export const REPLACEMENT = '?';

/**
 * Neutralize control characters in untrusted text.
 *
 * Written as a character scan rather than a regex because that is what this
 * function is for: the ranges *are* the policy, and a lint that flags control
 * characters inside a pattern would be right to flag this one too.
 *
 * @param {unknown} value
 * @returns {string} the text with control characters replaced, never a control
 */
export function sanitize(value) {
    if (typeof value !== 'string') return '';
    let safe = '';
    for (const char of value) {
        safe += isControl(char.codePointAt(0)) ? REPLACEMENT : char;
    }
    return safe;
}

/**
 * Sanitize text that occupies exactly one terminal line.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function sanitizeLine(value) {
    return sanitize(value).replace(INLINE_WHITESPACE, ' ').trim();
}

function isControl(code) {
    if (code === TAB || code === NEWLINE) return false;
    if (code <= C0_END) return true;
    return code >= DEL && code <= C1_END;
}
