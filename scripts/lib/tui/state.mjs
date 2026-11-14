/**
 * Cursor and selection state for one TUI list, as a pure value.
 *
 * Every helper returns a new state, so the key handler never mutates the object
 * the previous frame was drawn from, and every rule in this file is testable
 * without a terminal. Selection is a set of keys rather than of indices: the
 * filter rebuilds the visible list on each keystroke, and an index-based
 * selection would silently move to a different rule.
 *
 * `allItems` is the whole universe and `items` is the working list the filter
 * rebuilds. Selection is measured against `allItems`, so narrowing the filter
 * hides a pick without forgetting it.
 */

/** Cursor position before the first move, and for an empty list. */
const FIRST_INDEX = 0;
const STEP = 1;

/**
 * Identity of an item across re-filters.
 *
 * @param {object} item
 * @param {number} [index] fallback identity for items with no natural key
 * @returns {string}
 */
export function itemKey(item, index = FIRST_INDEX) {
    const key = item?.key ?? item?.slug ?? item?.id;
    if (key === undefined || key === null) return String(index);
    return String(key);
}

/**
 * Build the initial state.
 *
 * @param {{items?: object[], selected?: Iterable<string>}} [config]
 * @returns {{items: object[], allItems: object[], cursor: number, selected: Set<string>}}
 */
export function createListState({ items = [], selected = [] } = {}) {
    const wanted = new Set(selected);
    const allItems = [...items];
    const keys = allItems.map((item, index) => itemKey(item, index));
    return {
        allItems,
        items: [...allItems],
        cursor: FIRST_INDEX,
        selected: new Set(keys.filter((key) => wanted.has(key))),
    };
}

/**
 * Move the cursor, clamped to the list.
 *
 * @param {object} state
 * @param {number} delta
 * @returns {object}
 */
export function moveCursor(state, delta) {
    const last = state.items.length - STEP;
    if (last < FIRST_INDEX) return withCursor(state, FIRST_INDEX);
    return withCursor(state, clamp(state.cursor + delta, FIRST_INDEX, last));
}

/**
 * Replace the visible list after a filter change, keeping the selection and
 * the universe it was made from.
 *
 * @param {object} state
 * @param {object[]} items
 * @returns {object}
 */
export function setItems(state, items) {
    const last = items.length - STEP;
    const cursor = clamp(state.cursor, FIRST_INDEX, Math.max(FIRST_INDEX, last));
    return { ...state, items: [...items], cursor };
}

/**
 * Toggle one item. An out-of-range index is a no-op, not a throw: the key
 * handler runs between a filter change and a redraw.
 *
 * @param {object} state
 * @param {number} index
 * @returns {object}
 */
export function toggle(state, index) {
    const item = state.items[index];
    if (item === undefined) return state;
    const key = itemKey(item, index);
    const selected = new Set(state.selected);
    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    return { ...state, selected };
}

/**
 * Add every visible item to the selection, keeping the picks it does not show.
 * "All" means "all of these", not "these and nothing else".
 *
 * @param {object} state
 * @returns {object}
 */
export function selectAll(state) {
    const selected = new Set(state.selected);
    for (const [index, item] of state.items.entries()) selected.add(itemKey(item, index));
    return { ...state, selected };
}

/**
 * Drop the whole selection.
 *
 * @param {object} state
 * @returns {object}
 */
export function clearSelection(state) {
    if (state.selected.size === 0) return state;
    return { ...state, selected: new Set() };
}

/**
 * Selected items, in universe order — a pick hidden by the filter is still one.
 *
 * @param {object} state
 * @returns {object[]}
 */
export function selectedItems(state) {
    return state.allItems.filter((item, index) => state.selected.has(itemKey(item, index)));
}

/**
 * Selected keys, in universe order — what the caller maps back to harness ids
 * or rule slugs. Read from `allItems`, so the counter and `canConfirm` agree
 * with the picks the user made rather than with what the filter left visible.
 *
 * @param {object} state
 * @returns {string[]}
 */
export function selectedKeys(state) {
    return state.allItems.flatMap((item, index) =>
        state.selected.has(itemKey(item, index)) ? [itemKey(item, index)] : [],
    );
}

/**
 * The slice of the list that fits the space, with the cursor inside it.
 *
 * @param {object} state
 * @param {number} height rows available for items
 * @returns {{start: number, end: number}}
 */
export function visibleWindow(state, height) {
    const total = state.items.length;
    const size = Math.max(STEP, Math.trunc(Number(height) || STEP));
    if (total <= size) return { start: FIRST_INDEX, end: total };
    const start = Math.min(Math.max(FIRST_INDEX, state.cursor - size + STEP), total - size);
    return { start, end: start + size };
}

function withCursor(state, cursor) {
    if (cursor === state.cursor) return state;
    return { ...state, cursor };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
