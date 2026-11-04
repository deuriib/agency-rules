import { readRules } from './frontmatter.mjs';

/**
 * `readRules` for CLI commands.
 *
 * `readRules` throws on invalid YAML so library callers can decide what to do.
 * A command has only one sensible decision: print the file and the reason, then
 * exit 1. Without this, an uncaught throw dumps the whole Error object — buffer,
 * position, source — and the actual reason scrolls off the screen.
 *
 * `validate` does not use this: it collects parse failures per file so one bad
 * rule does not hide the other thirty-nine.
 *
 * @param {string} dir
 * @returns {Promise<Awaited<ReturnType<typeof readRules>>>} never returns on failure
 */
export async function readRulesOrExit(dir) {
    try {
        return await readRules(dir);
    } catch (err) {
        console.error(`❌ ${err.message}`);
        process.exit(1);
    }
}
