import { readFile, stat } from 'node:fs/promises';

/**
 * Byte comparison for the installer.
 *
 * `install` used to copy every compiled rule on every run, which rewrote
 * timestamps for files that had not changed — and a rewritten timestamp can
 * trigger a hot reload in a harness watching its rules directory.
 *
 * Size is checked before content, so the common "different" case costs one
 * `stat` instead of two reads.
 */

/**
 * @param {string} a path to the compiled file
 * @param {string} b path to the installed file
 * @returns {Promise<boolean>} true only when both exist and are byte-identical
 */
export async function filesAreEqual(a, b) {
    let statA;
    let statB;
    try {
        [statA, statB] = await Promise.all([stat(a), stat(b)]);
    } catch {
        // Either path is missing or unreadable: not equal, and not an error —
        // a missing destination is the normal first-install case.
        return false;
    }

    if (statA.size !== statB.size) return false;

    // Both empty: equal without reading either file.
    if (statA.size === 0) return true;

    const [bufferA, bufferB] = await Promise.all([readFile(a), readFile(b)]);
    return bufferA.equals(bufferB);
}

/**
 * Classify what installing `src` over `dest` would do.
 *
 * @param {string} src
 * @param {string} dest
 * @returns {Promise<'added'|'updated'|'unchanged'>}
 */
export async function classifyInstall(src, dest) {
    let destStat;
    try {
        destStat = await stat(dest);
    } catch {
        return 'added';
    }
    if (!destStat.isFile()) return 'updated';
    return (await filesAreEqual(src, dest)) ? 'unchanged' : 'updated';
}
