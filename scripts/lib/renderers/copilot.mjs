import { wrap } from './_util.mjs';

/**
 * GitHub Copilot reads path-specific instructions from
 * `.github/instructions/*.instructions.md` in a repository, and from
 * `$HOME/.copilot/instructions/` at user scope.
 *
 * `applyTo` is the field Copilot cannot work without. A path-specific file is
 * injected only when its `applyTo` glob matches a file Copilot is working on, so
 * a file emitted without one would install cleanly and reach no prompt — the
 * exact failure mode this package exists to prevent. `applyTo` is therefore
 * always emitted, never conditionally dropped.
 *
 * Globs are joined into one comma-separated string because that is the syntax
 * Copilot documents; a YAML list is not a form it promises to parse. This
 * mirrors the Cursor and Antigravity renderers, which join the same input for
 * the same reason.
 *
 * `description` is emitted because VS Code documents it for task-based
 * discovery. `excludeAgent` is not emitted: the neutral format has no field for
 * it, and inventing one here would put a harness-specific key in every rule's
 * frontmatter to serve a use no rule has declared.
 */
export function renderCopilot(rule, _harness) {
    const d = rule.data;
    const fm = {};

    const globs = d.globs === undefined ? null : Array.isArray(d.globs) ? d.globs : [d.globs];

    // `alwaysApply: true` outranks globs in the neutral format, and a rule with
    // no globs applies everywhere. Both are "every file" for Copilot, so the
    // pattern is written explicitly rather than left absent.
    fm.applyTo = globs && d.alwaysApply !== true ? globs.join(',') : '**';

    if (d.description) fm.description = d.description;

    return wrap(fm, rule.body);
}
