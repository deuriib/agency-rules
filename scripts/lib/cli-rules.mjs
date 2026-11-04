import { readFile } from 'node:fs/promises';
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
        // A missing directory is user input (`RULES_DIR`), not a broken rule: say
        // so instead of printing a raw `ENOENT: scandir '…'`.
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
            console.error(`❌ Rules directory not found: ${dir}`);
            console.error('   Set RULES_DIR to a directory containing rule Markdown.');
            process.exit(1);
        }
        console.error(`❌ ${err.message}`);
        process.exit(1);
    }
}

/**
 * Read and parse `tools.json` for a command.
 *
 * `TOOLS_PATH` is an override, so a bad value is user input and deserves a
 * message with the path in it rather than an ENOENT stack. Same contract as
 * `readRulesOrExit`: print why, then exit 1.
 *
 * @param {string} toolsPath
 * @returns {Promise<object>} never returns on failure
 */
export async function readToolsOrExit(toolsPath) {
    try {
        return JSON.parse(await readFile(toolsPath, 'utf8'));
    } catch (err) {
        const reason =
            err.code === 'ENOENT'
                ? 'file not found'
                : err instanceof SyntaxError
                  ? `invalid JSON: ${err.message}`
                  : err.message;
        console.error(`❌ Cannot read the harness contract at ${toolsPath} (${reason}).`);
        console.error('   Run this from a repository containing tools.json, or set TOOLS_PATH.');
        process.exit(1);
    }
}
