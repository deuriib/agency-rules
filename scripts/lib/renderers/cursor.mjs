import { wrap } from './_util.mjs';

/**
 * Cursor discovers `.cursor/rules/*.mdc` and reads three frontmatter fields.
 *
 * `globs` is emitted as a comma-joined string rather than a YAML list: Cursor's
 * documented schema treats it as a single pattern field, and a list is not
 * guaranteed to parse. This mirrors what the Antigravity renderer does with the
 * same input, for the same reason.
 *
 * `name` is deliberately not emitted — Cursor derives identity from the
 * filename, and an unexpected key is noise in a file the user may open.
 */
export function renderCursor(rule, _harness) {
    const d = rule.data;
    const fm = {};

    if (d.description) fm.description = d.description;
    // `alwaysApply: true` overrides globs in the neutral format, so both are not
    // emitted together: two competing scoping signals in one file is a bug
    // waiting for whoever reads the frontmatter next.
    if (d.globs !== undefined && d.alwaysApply !== true) {
        fm.globs = Array.isArray(d.globs) ? d.globs.join(',') : d.globs;
    }
    if (d.alwaysApply !== undefined) fm.alwaysApply = d.alwaysApply;

    return wrap(fm, rule.body);
}
