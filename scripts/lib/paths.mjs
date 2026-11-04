import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { expandHome } from './detect.mjs';

/**
 * Where each command reads its inputs from.
 *
 * The fallback used to be copy-pasted into five commands and drifted in one of
 * them: `validate` guarded `resolve(cwd, 'rules')` with a truthiness check that a
 * string always passes, so its packaged fallback was dead code and it crashed
 * with a raw ENOENT outside a repository while its siblings worked from any
 * directory. One helper, one behaviour.
 */

/** The installed package root — `scripts/lib` → `scripts` → root. */
export const PACKAGE_ROOT = resolve(import.meta.dirname, '..', '..');

/**
 * Resolve the rules directory, and say where it came from.
 *
 * The source matters to `new`: reading the packaged rules is fine, scaffolding
 * into `node_modules` is not.
 *
 * @param {{cwd?: string, env?: Record<string, string | undefined>}} [options]
 * @returns {{dir: string, source: 'env'|'local'|'package'}}
 */
export function resolveRulesDir(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const env = options.env ?? process.env;

    if (env.RULES_DIR) return { dir: env.RULES_DIR, source: 'env' };

    const local = join(cwd, 'rules');
    if (existsSync(local)) return { dir: local, source: 'local' };

    return { dir: join(PACKAGE_ROOT, 'rules'), source: 'package' };
}

/**
 * Resolve `tools.json`, falling back to the packaged contract.
 *
 * `TOOLS_PATH` exists because `INTEGRATIONS_DIR` and `RULES_DIR` can point at
 * another checkout: without a matching override, the compiled output of one
 * repository would be installed using the packaged contract of another.
 *
 * @param {{cwd?: string, env?: Record<string, string | undefined>}} [options]
 * @returns {string}
 */
export function resolveToolsPath(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const env = options.env ?? process.env;

    if (env.TOOLS_PATH) return env.TOOLS_PATH;

    const local = join(cwd, 'tools.json');
    return existsSync(local) ? local : join(PACKAGE_ROOT, 'tools.json');
}

/**
 * Resolve the compiled-output directory. Deliberately relative to the caller:
 * `integrations/` is a build product of the repository you are standing in, so
 * it never falls back to the package.
 *
 * @param {{env?: Record<string, string | undefined>}} [options]
 * @returns {string}
 */
export function resolveIntegrationsDir(options = {}) {
    const env = options.env ?? process.env;
    return env.INTEGRATIONS_DIR || 'integrations';
}

/**
 * Resolve a path that may be absolute, home-relative, or relative to the cwd.
 *
 * @param {string} pathTemplate
 * @param {{cwd?: string}} [options]
 * @returns {string}
 */
export function resolveFromCwd(pathTemplate, options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const expanded = expandHome(pathTemplate);
    return isAbsolute(expanded) ? expanded : join(cwd, expanded);
}
