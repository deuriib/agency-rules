import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    clearSelection,
    createListState,
    moveCursor,
    selectAll,
    selectedItems,
    selectedKeys,
    setItems,
    toggle,
    visibleWindow,
} from '../scripts/lib/tui/state.mjs';

/**
 * Cursor and selection are the part of the TUI a user cannot see breaking: a
 * cursor that drifts on re-filter, or a selection stored by index, installs a
 * rule nobody asked for. The state model is pure so each rule is pinned here.
 */

const ITEMS = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }, { key: 'e' }];

test('a new state starts at the first item with nothing selected', () => {
    const state = createListState({ items: ITEMS });
    assert.equal(state.cursor, 0);
    assert.deepEqual([...state.selected], []);
    assert.deepEqual(state.items, ITEMS);
});

test('a supplied selection is kept, minus keys that are not in the list', () => {
    const state = createListState({ items: ITEMS, selected: ['b', 'zzz'] });
    assert.deepEqual(selectedKeys(state), ['b']);
});

test('the universe survives a filter and stays apart from the working list', () => {
    const state = createListState({ items: ITEMS, selected: ['b'] });
    const filtered = setItems(state, [ITEMS[0]]);

    assert.deepEqual(state.allItems, ITEMS);
    assert.deepEqual(state.items, ITEMS);
    assert.deepEqual(filtered.items, [ITEMS[0]]);
    assert.deepEqual(filtered.allItems, ITEMS);
});

test('the cursor moves and clamps at both ends', () => {
    let state = createListState({ items: ITEMS });
    state = moveCursor(state, 2);
    assert.equal(state.cursor, 2);
    state = moveCursor(state, -5);
    assert.equal(state.cursor, 0);
    state = moveCursor(state, 99);
    assert.equal(state.cursor, ITEMS.length - 1);
});

test('the cursor stays at zero on an empty list', () => {
    const state = moveCursor(createListState({ items: [] }), 3);
    assert.equal(state.cursor, 0);
});

test('moveCursor returns a new state and leaves the old one untouched', () => {
    const state = createListState({ items: ITEMS, selected: ['a'] });
    const moved = moveCursor(state, 1);
    assert.notEqual(moved, state);
    assert.equal(state.cursor, 0);
    assert.deepEqual(selectedKeys(moved), ['a']);
});

test('toggle adds and removes one key', () => {
    let state = createListState({ items: ITEMS });
    state = toggle(state, 1);
    assert.deepEqual(selectedKeys(state), ['b']);
    state = toggle(state, 1);
    assert.deepEqual(selectedKeys(state), []);
});

test('toggling an index outside the list is a no-op, not a throw', () => {
    const state = createListState({ items: ITEMS });
    assert.equal(toggle(state, 99), state);
});

test('selectedItems reports the selected entries in list order', () => {
    let state = createListState({ items: ITEMS });
    state = toggle(state, 3);
    state = toggle(state, 0);
    assert.deepEqual(
        selectedItems(state).map((item) => item.key),
        ['a', 'd'],
    );
});

test('selectAll then clearSelection covers and empties the list', () => {
    let state = selectAll(createListState({ items: ITEMS }));
    assert.deepEqual(selectedKeys(state), ['a', 'b', 'c', 'd', 'e']);
    state = clearSelection(state);
    assert.deepEqual(selectedKeys(state), []);
});

test('setItems keeps the selection and keeps the cursor inside the new list', () => {
    let state = createListState({ items: ITEMS, selected: ['e'] });
    state = moveCursor(state, 4);
    state = setItems(state, [ITEMS[0], ITEMS[1]]);
    assert.deepEqual(selectedKeys(state), ['e'], 'a pick the filter hides is still selected');
    assert.equal(state.cursor, 1);
});

test('a filter narrows the list without dropping the picks it hides', () => {
    let state = createListState({ items: ITEMS });
    state = toggle(state, 0);
    state = toggle(state, 2);
    state = setItems(state, [ITEMS[0]]);

    assert.deepEqual(selectedKeys(state), ['a', 'c']);
    assert.deepEqual(
        selectedItems(state).map((item) => item.key),
        ['a', 'c'],
    );
    assert.equal(state.items.length, 1, 'the counter still reports what the filter shows');
});

test('selectAll adds the visible items to the selection instead of replacing it', () => {
    let state = createListState({ items: ITEMS });
    state = toggle(state, 4);
    state = setItems(state, [ITEMS[0], ITEMS[1]]);
    state = selectAll(state);

    assert.deepEqual(selectedKeys(state), ['a', 'b', 'e']);
});

test('the window is the whole list when everything fits', () => {
    const state = createListState({ items: ITEMS });
    assert.deepEqual(visibleWindow(state, 10), { start: 0, end: 5 });
});

test('the window scrolls to keep the cursor visible', () => {
    const state = moveCursor(createListState({ items: ITEMS }), 4);
    const { start, end } = visibleWindow(state, 2);
    assert.deepEqual({ start, end }, { start: 3, end: 5 });
    assert.ok(start <= state.cursor && state.cursor < end, 'the cursor must be inside the window');
});

test('the first rows do not scroll away from the cursor', () => {
    const state = createListState({ items: ITEMS });
    assert.deepEqual(visibleWindow(state, 3), { start: 0, end: 3 });
});

test('a zero or nonsense height still shows one row', () => {
    const state = createListState({ items: ITEMS });
    assert.deepEqual(visibleWindow(state, 0), { start: 0, end: 1 });
    assert.deepEqual(visibleWindow(state, Number.NaN), { start: 0, end: 1 });
});
