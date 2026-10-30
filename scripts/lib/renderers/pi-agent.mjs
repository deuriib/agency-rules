import { wrap } from './_util.mjs';

/**
 * pi-agent expects each rule in its own directory as RULES.md with a
 * frontmatter carrying `name`, `description`, and optionally `tools`.
 */
export function renderPiAgent(rule, _harness) {
  const d = rule.data;
  const fm = {
    name: d.name,
    description: d.description,
  };
  if (Array.isArray(d.tools) && d.tools.length > 0) {
    fm.tools = d.tools;
  }
  return wrap(fm, rule.body);
}
