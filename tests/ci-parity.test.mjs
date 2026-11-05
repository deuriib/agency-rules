import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { parse as parseYaml } from 'yaml';

/**
 * `mise run ci` and `.github/workflows/ci.yml` must cover the same checks.
 *
 * They drifted silently: `eval` was added to the mise task's `depends` and never
 * added to the workflow, so the duplication gate ran for a developer and not for
 * a pull request. A green PR badge then meant less than it appeared to.
 */

const ROOT = join(import.meta.dirname, '..');

/** Workflow steps that stand in for a mise task under a different command. */
const EQUIVALENTS = {
    // The workflow calls the binary directly so Biome's own action reports it.
    'check:ci': 'biome ci',
};

function ciTaskDependencies() {
    const toml = readFileSync(join(ROOT, 'mise.toml'), 'utf8');
    const section = toml.split('[tasks.ci]')[1];
    if (!section) throw new Error('mise.toml has no [tasks.ci] section');
    const match = section.match(/depends\s*=\s*\[([^\]]*)\]/);
    if (!match) throw new Error('[tasks.ci] has no depends array');
    return match[1]
        .split(',')
        .map((entry) => entry.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
}

function workflowStepNames() {
    const workflow = parseYaml(readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8'));
    const steps = workflow?.jobs?.ci?.steps ?? [];
    return steps.map((step) => `${step.name ?? ''} ${step.run ?? ''}`).join('\n');
}

test('the ci task declares its dependencies', () => {
    const deps = ciTaskDependencies();
    assert.ok(deps.length >= 3, `expected several deps, got ${JSON.stringify(deps)}`);
    assert.ok(deps.includes('validate'));
    assert.ok(deps.includes('test'));
});

test('every check in the ci task also runs in the pull request workflow', () => {
    const steps = workflowStepNames();
    const missing = ciTaskDependencies().filter((dep) => {
        const invoked = EQUIVALENTS[dep] ?? `mise run ${dep}`;
        return !steps.includes(invoked);
    });
    assert.deepEqual(
        missing,
        [],
        `these ci checks do not run in .github/workflows/ci.yml: ${missing.join(', ')}`,
    );
});

test('the overlap eval is part of both the task and the workflow', () => {
    // The specific regression: eval was added to `depends` only.
    assert.ok(ciTaskDependencies().includes('eval'), 'eval must be in [tasks.ci] depends');
    assert.match(workflowStepNames(), /mise run eval/);
});

test('the ci pipeline never runs a task that writes to the tree it is verifying', () => {
    // `check` is `biome check --write`; a `ci` that depended on it could edit the
    // files it was judging and still exit 0. `check:ci` is the read-only twin.
    assert.ok(
        !ciTaskDependencies().includes('check'),
        'ci must use check:ci, not the write-mode check',
    );
});

test('the documented install and observe commands run in the workflow', () => {
    // The Quick Start tells a newcomer to run these two. A destination in
    // tools.json that stops resolving has to fail a build, not a newcomer.
    const steps = workflowStepNames();
    assert.match(steps, /mise run install --all --scope project/);
    assert.match(steps, /mise run list --harness/);
});
