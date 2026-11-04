import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import matter from 'gray-matter';

/**
 * Reads every *.md file under `dir` (recursive), parses YAML frontmatter,
 * and returns an array of { slug, source, data, body }.
 *
 * `slug` is derived from the frontmatter `name` (authoritative), with the
 * filename as fallback. Files starting with `_` are skipped.
 *
 * A file with invalid YAML — a syntax error, a duplicate key — throws out of
 * `matter`. Without `onError`, that aborts the whole run with a raw parser dump
 * that leaks the file buffer. Callers that validate should pass `onError` to
 * collect the failure per file and keep going.
 */
export async function readRules(dir, options = {}) {
    const onError = options.onError;
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    const rules = [];

    for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith('.md')) continue;
        if (entry.name.startsWith('_')) continue;

        const parent = entry.parentPath ?? entry.path;
        const filePath = join(parent, entry.name);
        const source = relative(dir, filePath);
        const raw = await readFile(filePath, 'utf8');

        let parsed;
        try {
            parsed = matter(raw);
        } catch (err) {
            const reason = err.reason ?? err.message ?? 'invalid frontmatter';
            const line = err.mark?.line !== undefined ? ` (line ${err.mark.line + 1})` : '';
            // The path goes in the message, not only in a property: convert and
            // list rethrow this to the terminal, where a message without a file
            // name is unusable.
            const wrapped = new Error(`${source}: invalid YAML frontmatter: ${reason}${line}`);
            wrapped.source = source;
            if (onError) {
                onError(wrapped);
                continue;
            }
            throw wrapped;
        }

        const filename = basename(filePath, '.md');
        const slug = typeof parsed.data?.name === 'string' ? parsed.data.name : filename;

        rules.push({
            slug,
            source,
            data: parsed.data ?? {},
            body: (parsed.content ?? '').trim(),
        });
    }

    return rules.sort((a, b) => a.slug.localeCompare(b.slug));
}
