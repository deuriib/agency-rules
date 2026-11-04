/**
 * Human-readable frontmatter validation errors.
 *
 * ajv reports `/ must NOT have additional properties` without naming the key, so
 * three typos produce three identical lines and the author has to diff the
 * frontmatter by hand. That defeats the point of the check — the failure is
 * caught but not diagnosable.
 *
 * Pure functions, so the message for every ajv error shape can be asserted
 * without a rules directory.
 */

/**
 * Edit distance, capped for short field names.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i++) {
        const current = [i];
        for (let j = 1; j <= b.length; j++) {
            const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
            current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
        }
        previous = current;
    }

    return previous[b.length];
}

/**
 * Closest known field to an unknown one, when it is close enough to be a typo.
 *
 * Distance threshold scales with length: `triger` → `trigger` is one edit, while
 * `description` → `globs` is far enough that suggesting it would be noise.
 *
 * @param {string} key the unknown key
 * @param {string[]} known valid field names
 * @returns {string|null}
 */
export function suggestField(key, known) {
    if (typeof key !== 'string' || key.length === 0) return null;

    let best = { field: null, distance: Number.POSITIVE_INFINITY };
    for (const field of known) {
        const distance = levenshtein(key.toLowerCase(), field.toLowerCase());
        if (distance < best.distance) best = { field, distance };
    }

    if (best.field === null) return null;

    const threshold = Math.max(1, Math.floor(key.length / 3));
    return best.distance <= threshold ? best.field : null;
}

/**
 * One-line description of an ajv error.
 *
 * @param {object} error an entry from `validate.errors`
 * @param {{knownFields?: string[]}} [options]
 * @returns {string}
 */
export function formatAjvError(error, options = {}) {
    const known = options.knownFields ?? [];
    const at = error.instancePath || '';
    const params = error.params ?? {};

    switch (error.keyword) {
        case 'additionalProperties': {
            const key = params.additionalProperty;
            const suggestion = suggestField(key, known);
            return suggestion
                ? `/ unknown field "${key}" — did you mean "${suggestion}"?`
                : `/ unknown field "${key}"${known.length ? ` (valid: ${known.join(', ')})` : ''}`;
        }
        case 'required':
            return `/${params.missingProperty}: required field is missing`;
        case 'enum':
            return `${at}: must be one of ${(params.allowedValues ?? []).join(', ')}`;
        case 'type':
            return `${at}: must be a ${params.type}`;
        case 'pattern':
            return `${at}: must match ${params.pattern}`;
        case 'maxLength':
            return `${at}: must be at most ${params.limit} characters`;
        case 'minLength':
            return `${at}: must be at least ${params.limit} character(s)`;
        case 'minItems':
            return `${at}: must have at least ${params.limit} item(s)`;
        case 'oneOf':
            // A `oneOf` failure at /globs is almost always an empty key.
            return `${at}: must be a string or a non-empty array — remove the key if you have nothing to set`;
        default:
            return `${at || '/'} ${error.message ?? 'is invalid'}`;
    }
}

/**
 * Collapse ajv's `oneOf` fan-out.
 *
 * A single `oneOf` failure expands into one error per branch, which reads as
 * three problems where there is one. Keep the branch-specific errors only when
 * they add information the `oneOf` summary does not.
 *
 * @param {object[]} errors
 * @returns {object[]}
 */
export function dedupeErrors(errors) {
    const seen = new Set();
    const out = [];

    // Drop the per-branch noise that a preceding oneOf summary already covers.
    const oneOfPaths = new Set(
        errors.filter((e) => e.keyword === 'oneOf').map((e) => e.instancePath),
    );

    for (const error of errors) {
        if (error.keyword !== 'oneOf' && oneOfPaths.has(error.instancePath)) continue;
        const key = `${error.keyword}|${error.instancePath}|${JSON.stringify(error.params ?? {})}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(error);
    }

    return out;
}
