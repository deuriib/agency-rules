import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { aggregateStatus, ruleStatus, STATUS_META } from '../scripts/lib/status.mjs';

test('every aggregate state has an icon and a colour', () => {
    for (const key of ['synced', 'modified', 'missing', 'unbuilt']) {
        assert.ok(STATUS_META[key].icon, `${key} needs an icon`);
        assert.ok(STATUS_META[key].color, `${key} needs a colour`);
        assert.ok(STATUS_META[key].label, `${key} needs a label`);
    }
});

test('all targets synced is synced', () => {
    assert.equal(aggregateStatus(['synced', 'synced']), 'synced');
});

test('any unbuilt wins, because an uncompiled rule cannot be installed', () => {
    assert.equal(aggregateStatus(['unbuilt', 'synced']), 'unbuilt');
    assert.equal(aggregateStatus(['unbuilt']), 'unbuilt');
});

test('missing everywhere is missing', () => {
    assert.equal(aggregateStatus(['missing', 'missing']), 'missing');
});

test('installed in some places only is modified, not synced', () => {
    assert.equal(aggregateStatus(['synced', 'missing']), 'modified');
    assert.equal(aggregateStatus(['synced', 'modified']), 'modified');
    assert.equal(aggregateStatus(['missing', 'modified']), 'modified');
});

test('no targets means unbuilt, never a false synced', () => {
    assert.equal(aggregateStatus([]), 'unbuilt');
    assert.equal(aggregateStatus(null), 'unbuilt');
});

async function withTempDir(fn) {
    const dir = await mkdtemp(join(tmpdir(), 'agency-rules-status-'));
    try {
        return await fn(dir);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}

const harness = {
    id: 'demo',
    integrationPath: '{slug}.md',
    dest: { project: '{slug}.md' },
};

test('ruleStatus: unbuilt when the compiled artifact is missing', async () => {
    await withTempDir(async (dir) => {
        await mkdir(join(dir, 'integrations', 'demo'), { recursive: true });
        const status = await ruleStatus('demo-rule', harness, {
            integrationsDir: join(dir, 'integrations'),
            scope: 'project',
        });
        assert.equal(status, 'unbuilt');
    });
});

test('ruleStatus: missing when compiled but not installed', async () => {
    await withTempDir(async (dir) => {
        const integrations = join(dir, 'integrations');
        await mkdir(join(integrations, 'demo'), { recursive: true });
        await writeFile(join(integrations, 'demo', 'demo-rule.md'), 'compiled');
        const status = await ruleStatus('demo-rule', harness, {
            integrationsDir: integrations,
            scope: 'project',
        });
        assert.equal(status, 'missing');
    });
});

test('ruleStatus: synced and modified against a real destination', async () => {
    await withTempDir(async (dir) => {
        const integrations = join(dir, 'integrations');
        await mkdir(join(integrations, 'demo'), { recursive: true });
        await writeFile(join(integrations, 'demo', 'demo-rule.md'), 'compiled');
        await writeFile(join(dir, 'demo-rule.md'), 'compiled');

        // Dest templates must carry {slug} — substituteSlug rejects one without,
        // which is why this uses an absolute template that still has the token.
        const abs = { ...harness, dest: { project: join(dir, '{slug}.md') } };
        assert.equal(
            await ruleStatus('demo-rule', abs, { integrationsDir: integrations, scope: 'project' }),
            'synced',
        );

        await writeFile(join(dir, 'demo-rule.md'), 'locally edited');
        assert.equal(
            await ruleStatus('demo-rule', abs, { integrationsDir: integrations, scope: 'project' }),
            'modified',
        );
    });
});

test('ruleStatus: unbuilt when the scope has no destination', async () => {
    await withTempDir(async (dir) => {
        const integrations = join(dir, 'integrations');
        await mkdir(integrations, { recursive: true });
        await writeFile(join(integrations, 'demo-rule.md'), 'compiled');
        assert.equal(
            await ruleStatus(
                'demo-rule',
                { ...harness, dest: {} },
                {
                    integrationsDir: integrations,
                    scope: 'user',
                },
            ),
            'unbuilt',
        );
    });
});

test('ruleStatus: an unsafe slug is unbuilt, never a path we would not write', async () => {
    await withTempDir(async (dir) => {
        const integrations = join(dir, 'integrations');
        await mkdir(join(integrations, 'demo'), { recursive: true });
        assert.equal(
            await ruleStatus('../escape', harness, {
                integrationsDir: integrations,
                scope: 'project',
            }),
            'unbuilt',
        );
    });
});
