import { stringify as yamlStringify } from 'yaml';

/** Wraps YAML frontmatter + body in a Markdown document. */
export function wrap(data, body) {
  const fm = yamlStringify(data).trimEnd();
  const content = (body ?? '').trim();
  return `---\n${fm}\n---\n\n${content}\n`;
}
