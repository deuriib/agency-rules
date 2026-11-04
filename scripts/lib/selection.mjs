/**
 * Parsing for the numbered menus the installer and the scaffolder prompt with.
 *
 * Kept pure and separate from `readline` so the interactive path has tests —
 * an interactive prompt is where a typo silently installs the wrong thing.
 */

/** Menu answer meaning "everything in the list". */
export const ALL = 'all';

/**
 * Interpret a numbered menu answer.
 *
 * Accepts `1,3`, ` 1 , 3 `, an empty string (defaults to everything), or
 * `all`. Rejects anything else rather than guessing: a mistyped menu answer
 * must not silently install a subset the user did not ask for.
 *
 * @param {string} answer raw user input
 * @param {{length: number, allLabel?: string}} options
 * @returns {{kind: 'all'} | {kind: 'some', indices: number[]} | {kind: 'invalid', token: string}}
 */
export function parseSelection(answer, options) {
    const length = options?.length ?? 0;
    const allLabel = options?.allLabel ?? ALL;

    const raw = String(answer ?? '')
        .trim()
        .toLowerCase();

    if (raw === '' || raw === allLabel) return { kind: 'all' };
    if (length === 0) return { kind: 'invalid', token: raw };

    const tokens = raw
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token !== '');

    if (tokens.length === 0) return { kind: 'all' };

    const indices = [];
    for (const token of tokens) {
        if (!/^\d+$/.test(token)) return { kind: 'invalid', token };
        const index = Number(token);
        if (index < 1 || index > length) return { kind: 'invalid', token };
        indices.push(index);
    }

    return { kind: 'some', indices: [...new Set(indices)].sort((a, b) => a - b) };
}

/**
 * Map 1-based menu indices back onto their values.
 *
 * @param {number[]} indices
 * @param {string[]} values
 * @returns {string[]}
 */
export function pickByIndices(indices, values) {
    return indices.map((index) => values[index - 1]).filter((value) => value !== undefined);
}

/**
 * Rendered menu for a numbered list.
 *
 * @param {{title: string, items: string[], allLabel?: string, defaultLabel?: string}} config
 * @returns {string}
 */
export function renderMenu({ title, items, allLabel = ALL, defaultLabel = allLabel }) {
    const lines = [title];
    for (const [i, item] of items.entries()) lines.push(`  ${i + 1}) ${item}`);
    lines.push(`  ${allLabel}) All`);
    const max = items.length;
    lines.push(
        `\nChoice [1-${max}, ${allLabel}] (comma-separated for multiple, default: ${defaultLabel}): `,
    );
    return lines.join('\n');
}
