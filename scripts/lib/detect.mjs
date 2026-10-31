import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function expandHome(p) {
    if (p === '~') return homedir();
    if (p.startsWith('~/')) return join(homedir(), p.slice(2));
    return p;
}

export async function pathExists(p) {
    try {
        await access(expandHome(p));
        return true;
    } catch {
        return false;
    }
}

export async function detectHarnesses(tools) {
    const detected = [];
    for (const [id, harness] of Object.entries(tools.harnesses)) {
        const dirs = harness.detect?.dirs ?? [];
        const files = harness.detect?.files ?? [];
        let found = false;
        for (const p of [...dirs, ...files]) {
            if (await pathExists(p)) {
                found = true;
                break;
            }
        }
        if (found) detected.push(id);
    }
    return detected;
}
