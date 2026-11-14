/**
 * Pure filtering for the TUI lists.
 *
 * The filter decides what a keystroke hides, so it lives outside the raw-mode
 * driver: a wrong match is a unit-test failure, not something only a human at a
 * terminal notices.
 */

/**
 * Every string an item can be found by, lowercased for comparison.
 *
 * Fields may be nested arrays (a rule's `tags`), because the caller passes the
 * frontmatter values it already has rather than flattening them first.
 *
 * @param {object} item
 * @param {(item: object) => unknown} getFields
 * @returns {string}
 */
export function searchableText(item, getFields) {
    const parts = [];
    collectStrings(getFields(item), parts);
    return parts.join('\n').toLowerCase();
}

/**
 * Items whose searchable text contains the query, case-insensitively.
 *
 * An empty query is not a filter that matches nothing: it returns every item,
 * in the order it was given.
 *
 * @param {object[]} items
 * @param {string} query
 * @param {(item: object) => unknown} getFields
 * @returns {object[]}
 */
export function filterItems(items, query, getFields) {
    const needle = String(query ?? '')
        .trim()
        .toLowerCase();
    if (needle === '') return [...items];
    return items.filter((item) => searchableText(item, getFields).includes(needle));
}

function collectStrings(value, out) {
    if (Array.isArray(value)) {
        for (const entry of value) collectStrings(entry, out);
        return;
    }
    if (typeof value === 'string' && value.trim() !== '') out.push(value);
}
