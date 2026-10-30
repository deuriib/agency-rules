import { wrap } from './_util.mjs';

/**
 * oh-my-pi preserves `name`, `description`, optional `globs` and
 * `alwaysApply` in the frontmatter. Accepts .md or .mdc; we emit .md.
 */
export function renderOhMyPi(rule, _harness) {
  const d = rule.data;
  const fm = {
    name: d.name,
    description: d.description,
  };
  if (d.globs !== undefined) fm.globs = d.globs;
  if (d.alwaysApply !== undefined) fm.alwaysApply = d.alwaysApply;
  return wrap(fm, rule.body);
}
