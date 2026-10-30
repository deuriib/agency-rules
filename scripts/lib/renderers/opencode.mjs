import { wrap } from './_util.mjs';

/**
 * OpenCode's `opencode-rules` plugin discovers .md files with a `description`
 * (used for matching) and optional `globs`/`match` controls.
 */
export function renderOpencode(rule, _harness) {
  const d = rule.data;
  const fm = { description: d.description };
  if (d.globs !== undefined) fm.globs = d.globs;
  if (d.match !== undefined) fm.match = d.match;
  return wrap(fm, rule.body);
}
