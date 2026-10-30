import { wrap } from './_util.mjs';

/**
 * Antigravity expects a YAML frontmatter with a mandatory `trigger` field.
 * Precedence:
 *   1. explicit `trigger` in the rule
 *   2. `alwaysApply: true`           → always_on
 *   3. `globs` present               → glob
 *   4. only `description`            → model_decision
 *   5. nothing                       → manual
 */
export function renderAntigravity(rule, _harness) {
  const d = rule.data;
  let trigger = d.trigger;

  if (!trigger) {
    if (d.alwaysApply === true) trigger = 'always_on';
    else if (d.globs) trigger = 'glob';
    else if (d.description) trigger = 'model_decision';
    else trigger = 'manual';
  }

  const fm = { trigger };
  if (trigger === 'glob' && d.globs) {
    fm.globs = Array.isArray(d.globs) ? d.globs.join(',') : d.globs;
  }
  if (d.description) fm.description = d.description;

  return wrap(fm, rule.body);
}
