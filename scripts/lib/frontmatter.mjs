import { readdir, readFile } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';
import matter from 'gray-matter';

/**
 * Reads every *.md file under `dir` (recursive), parses YAML frontmatter,
 * and returns an array of { slug, source, data, body }.
 *
 * `slug` is derived from the frontmatter `name` (authoritative), with the
 * filename as fallback. Files starting with `_` are skipped.
 */
export async function readRules(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const rules = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;
    if (entry.name.startsWith('_')) continue;

    const parent = entry.parentPath ?? entry.path;
    const filePath = join(parent, entry.name);
    const raw = await readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const filename = basename(filePath, '.md');
    const slug = typeof parsed.data?.name === 'string' ? parsed.data.name : filename;

    rules.push({
      slug,
      source: relative(dir, filePath),
      data: parsed.data ?? {},
      body: (parsed.content ?? '').trim(),
    });
  }

  return rules.sort((a, b) => a.slug.localeCompare(b.slug));
}
