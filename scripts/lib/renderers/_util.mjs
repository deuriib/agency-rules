import { stringify as yamlStringify } from 'yaml';

/**
 * Wraps YAML frontmatter + body in a Markdown document.
 *
 * A renderer that has nothing to declare returns an empty object — a Claude Code
 * rule with no `paths` is exactly that. Emitting `---\n{}\n---` would be an
 * empty YAML document where the format expects none, so the frontmatter block is
 * omitted entirely.
 */
export function wrap(data, body) {
    const content = (body ?? '').trim();
    const fm = yamlStringify(data ?? {}).trimEnd();
    if (fm === '' || fm === '{}' || fm === 'null') return `${content}\n`;
    return `---\n${fm}\n---\n\n${content}\n`;
}
