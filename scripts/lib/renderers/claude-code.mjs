import { wrap } from './_util.mjs';

/**
 * Claude Code loads every `*.md` under `.claude/rules/` recursively.
 *
 * Its conditional-loading field is `paths`, not `globs` — a rule with `paths`
 * loads only when Claude touches a matching file, and a rule without it loads at
 * launch. That means the mapping is direct:
 *
 *   neutral `globs`      → `paths`
 *   neutral `alwaysApply` → no `paths` (the default is already "always")
 *
 * There is no `description` key in a Claude Code rule, so the neutral
 * description is intentionally dropped here rather than emitted as an unknown
 * field. A rule with neither `globs` nor a description therefore compiles to
 * body-only Markdown, which is why `wrap` handles an empty frontmatter object.
 */
export function renderClaudeRules(rule, _harness) {
    const d = rule.data;
    const fm = {};

    // `alwaysApply: true` means "ignore globs and always apply" in the neutral
    // format, and a rule with no `paths` is already always-on in Claude Code —
    // so emitting paths there would contradict the rule's own intent.
    if (d.globs !== undefined && d.alwaysApply !== true) {
        fm.paths = Array.isArray(d.globs) ? d.globs : [d.globs];
    }

    return wrap(fm, rule.body);
}
