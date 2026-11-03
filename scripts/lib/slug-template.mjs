/**
 * One placeholder, one substitution — shared by `convert` and `install`.
 *
 * Rule destinations use `{slug}`, the same placeholder the agent contract uses
 * (`tools.json` in `deuriib/agency-agents`). Before v0.10.0 this repository used
 * `{{slug}}`, a second syntax for the same idea; two vocabularies for one tool
 * set is how `pi-agent` ended up meaning `piAgent` in the app's ledger.
 *
 * The substitution is fail-closed: any brace left in the result is an error,
 * so a template authored with the old double-brace form (`{{slug}}`) becomes a
 * compile failure instead of a directory literally named `{pi-agent}`.
 */

/** Placeholder token understood by every destination and integration path. */
export const SLUG_PLACEHOLDER = '{slug}';

/**
 * Replace `{slug}` in a template with a validated slug.
 *
 * @param {string} template destination or integration path template
 * @param {string} slug rule slug
 * @returns {string} the resolved path fragment
 */
export function substituteSlug(template, slug) {
    if (typeof template !== 'string' || !template.includes(SLUG_PLACEHOLDER)) {
        throw new Error(`template "${template}" must contain the ${SLUG_PLACEHOLDER} placeholder`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
        throw new Error(`refusing to substitute unsafe slug "${slug}"`);
    }
    const resolved = template.replaceAll(SLUG_PLACEHOLDER, slug);
    if (/[{}]/.test(resolved)) {
        throw new Error(
            `template "${template}" still contains braces after substitution — use ${SLUG_PLACEHOLDER}, not the legacy double-brace form`,
        );
    }
    return resolved;
}
