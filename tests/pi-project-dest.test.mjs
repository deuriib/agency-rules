import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { substituteSlug } from '../scripts/lib/slug-template.mjs';

const ROOT = join(import.meta.dirname, '..');
const tools = JSON.parse(readFileSync(join(ROOT, 'tools.json'), 'utf8'));

const piAgent = tools.harnesses.piAgent;

/**
 * Pi resolves rules from `<agent-dir>/rules`, and the `rules.ts` extension
 * mirrors that from the agent directory only. The user destination is
 * `~/.pi/agent/rules/{slug}/RULES.md`, so the project destination has to keep
 * the `agent` segment. It used to be `.pi/rules/{slug}/RULES.md`, which
 * compiled fine and installed cleanly into a directory nothing reads: a
 * project-scope install produced dead files and `list` still reported them
 * synced, because status compares the file to the compiled output and never
 * asks whether a loader would open it.
 */
test('piAgent project rules land where the loader reads them', () => {
    assert.equal(piAgent.dest.project, '.pi/agent/rules/{slug}/RULES.md');
    assert.equal(
        substituteSlug(piAgent.dest.project, 'coding-standards'),
        '.pi/agent/rules/coding-standards/RULES.md',
    );
});

/**
 * The invariant behind the fix, asserted without repeating either path: the
 * tail of the user destination after `~/.pi/` must be the tail of the project
 * destination after `.pi/`. Change one side without the other and this fails,
 * which is the only way the two stay honest as the harness evolves.
 */
test('the project destination mirrors the user destination', () => {
    const userTail = piAgent.dest.user.replace(/^~\/\.pi\//, '');
    const projectTail = piAgent.dest.project.replace(/^\.pi\//, '');

    assert.equal(projectTail, userTail);
});

test('the dead `.pi/rules` path is not reachable from the contract', () => {
    for (const scope of ['project', 'user']) {
        assert.doesNotMatch(piAgent.dest[scope], /^\.pi\/rules\//, scope);
        assert.doesNotMatch(piAgent.dest[scope], /(^|\/)\.pi\/rules\//, scope);
    }
});
