import { stringify as yamlStringify } from 'yaml';

/**
 * Pure helpers behind `agency-rules new`. Kept out of the command so the
 * skeleton can be asserted on without touching the filesystem.
 */

/** Same contract the schema enforces: lowercase, digits, hyphens. */
export const RULE_SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Same contract `substituteSlug` relies on for filesystem safety. */
export const CATEGORY_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * @param {string} slug candidate rule name
 * @throws when the slug is not kebab-case
 */
export function assertValidSlug(slug) {
    if (typeof slug !== 'string' || !RULE_SLUG_PATTERN.test(slug)) {
        throw new Error(
            `invalid slug "${slug}" — must match ${RULE_SLUG_PATTERN} (lowercase, digits, hyphens; no spaces, no capitals)`,
        );
    }
}

/**
 * @param {string} category candidate category directory
 * @throws when the category would escape `rules/` or produce an odd path
 */
export function assertValidCategory(category) {
    if (typeof category !== 'string' || !CATEGORY_PATTERN.test(category)) {
        throw new Error(`invalid category "${category}" — must match ${CATEGORY_PATTERN}`);
    }
}

/** `coding-standards` → `Coding Standards` */
export function titleize(slug) {
    return slug
        .split('-')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Build the neutral-format skeleton for a new rule.
 *
 * Frontmatter is emitted through the YAML serialiser rather than string
 * interpolation, so a description containing `:`, `#`, or a quote stays valid
 * YAML instead of producing a rule that fails `validate` for the wrong reason.
 *
 * `trigger` and `alwaysApply` are deliberately absent: `docs/RULE-SPEC.md`
 * derives the trigger from the description and globs, so the author only adds
 * one when they mean to override that derivation.
 *
 * @param {{ slug: string, description: string, category?: string }} input
 * @returns {string} the file contents
 */
export function buildRuleSkeleton({ slug, description, category = 'base' }) {
    assertValidSlug(slug);
    assertValidCategory(category);
    if (typeof description !== 'string' || description.trim() === '') {
        throw new Error('a description is required — it is the only field a harness can match on');
    }

    const fm = yamlStringify({
        name: slug,
        description: description.trim(),
        tags: [category],
    }).trimEnd();

    const title = titleize(slug);

    const body = [
        `# ${title}`,
        '',
        `What this rule governs, in one paragraph. Name the neighbouring rule that`,
        `owns the adjacent concern so the reader is not left guessing which applies.`,
        '',
        'The body is copied verbatim into every harness, so keep it plain Markdown:',
        'no harness-specific syntax, no frontmatter-like blocks.',
        '',
        '## Rules',
        '',
        '- **Lead-in.** One idea per bullet, phrased as the behaviour to prefer and',
        '  the failure it prevents. Replace this placeholder.',
        '',
        '## Verification',
        '',
        '- The check that proves the rule was followed. Delete this section if the',
        '  rule has nothing to verify.',
    ].join('\n');

    return `---\n${fm}\n---\n\n${body}\n`;
}
