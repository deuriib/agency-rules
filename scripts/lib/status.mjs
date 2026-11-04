import { join } from 'node:path';
import { expandHome, pathExists } from './detect.mjs';
import { classifyInstall } from './file-compare.mjs';
import { substituteSlug } from './slug-template.mjs';

/**
 * Installation status for `list`.
 *
 * A rule can be in four states relative to the user's harnesses, and the
 * interesting ones are the two that are invisible today: a rule compiled but
 * never installed, and a rule installed but edited locally so it no longer
 * matches what `convert` produces.
 */

export const STATUS_META = {
    synced: { icon: '✅', color: '\x1b[32m', label: 'synced' },
    modified: { icon: '🔄', color: '\x1b[33m', label: 'modified' },
    missing: { icon: '⬜', color: '\x1b[90m', label: 'missing' },
    unbuilt: { icon: '❓', color: '\x1b[35m', label: 'unbuilt' },
};

/**
 * Status of one rule in one harness.
 *
 * @param {string} slug
 * @param {object} harness tools.json entry
 * @param {{integrationsDir: string, scope: string}} options
 * @returns {Promise<'synced'|'modified'|'missing'|'unbuilt'>}
 */
export async function ruleStatus(slug, harness, options) {
    const { integrationsDir, scope } = options;

    const destTemplate = harness.dest?.[scope];
    if (!destTemplate) return 'unbuilt';

    // Fail closed on an unsafe slug or a malformed template rather than
    // reporting a status computed from a path we would never write.
    let srcPath;
    let destPath;
    try {
        srcPath = join(integrationsDir, harness.id, substituteSlug(harness.integrationPath, slug));
        destPath = expandHome(substituteSlug(destTemplate, slug));
    } catch {
        return 'unbuilt';
    }

    if (!(await pathExists(srcPath))) return 'unbuilt';

    const state = await classifyInstall(srcPath, destPath);
    if (state === 'unchanged') return 'synced';
    if (state === 'added') return 'missing';
    return 'modified';
}

/**
 * Fold per-harness states into the single status a table can show.
 *
 * `unbuilt` wins because a rule that has not been compiled cannot be installed
 * anywhere, whatever the other harnesses say. `synced` requires every target to
 * agree — one stale harness means the user's setup is not in sync.
 *
 * @param {string[]} states
 * @returns {'synced'|'modified'|'missing'|'unbuilt'}
 */
export function aggregateStatus(states) {
    if (!Array.isArray(states) || states.length === 0) return 'unbuilt';
    if (states.includes('unbuilt')) return 'unbuilt';
    if (states.every((state) => state === 'synced')) return 'synced';
    if (states.every((state) => state === 'missing')) return 'missing';
    // Installed somewhere but not identical everywhere: partially installed or
    // locally edited.
    return 'modified';
}
