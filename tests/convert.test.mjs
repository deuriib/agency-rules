import assert from 'node:assert/strict';
import { test } from 'node:test';
import matter from 'gray-matter';

import { renderAntigravity } from '../scripts/lib/renderers/antigravity.mjs';
import { renderOhMyPi } from '../scripts/lib/renderers/oh-my-pi.mjs';
import { renderOpencode } from '../scripts/lib/renderers/opencode.mjs';
import { renderPiAgent } from '../scripts/lib/renderers/pi-agent.mjs';

const baseRule = {
    slug: 'typescript',
    data: {
        name: 'typescript',
        description: 'Rules for TS.',
        globs: ['**/*.ts', '**/*.tsx'],
    },
    body: '# TS\n\n- No any.',
};

// ── Antigravity ──────────────────────────────────────────────────────────
test('antigravity: alwaysApply=true → trigger=always_on', () => {
    const out = renderAntigravity({ ...baseRule, data: { ...baseRule.data, alwaysApply: true } });
    const fm = matter(out).data;
    assert.equal(fm.trigger, 'always_on');
    assert.equal(fm.globs, undefined);
});

test('antigravity: globs present → trigger=glob, globs joined as string', () => {
    const fm = matter(renderAntigravity(baseRule)).data;
    assert.equal(fm.trigger, 'glob');
    assert.equal(fm.globs, '**/*.ts,**/*.tsx');
    assert.equal(fm.description, 'Rules for TS.');
});

test('antigravity: description only → trigger=model_decision', () => {
    const rule = { ...baseRule, data: { name: 'x', description: 'd' } };
    const fm = matter(renderAntigravity(rule)).data;
    assert.equal(fm.trigger, 'model_decision');
});

test('antigravity: explicit trigger wins', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, trigger: 'manual' } };
    assert.equal(matter(renderAntigravity(rule)).data.trigger, 'manual');
});

// ── pi-agent ─────────────────────────────────────────────────────────────
test('pi-agent: keeps name + description, no globs', () => {
    const fm = matter(renderPiAgent(baseRule)).data;
    assert.equal(fm.name, 'typescript');
    assert.equal(fm.description, 'Rules for TS.');
    assert.equal(fm.globs, undefined);
});

test('pi-agent: preserves tools', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, tools: ['read', 'edit'] } };
    const fm = matter(renderPiAgent(rule)).data;
    assert.deepEqual(fm.tools, ['read', 'edit']);
});

// ── oh-my-pi ─────────────────────────────────────────────────────────────
test('oh-my-pi: preserves globs as array', () => {
    const fm = matter(renderOhMyPi(baseRule)).data;
    assert.deepEqual(fm.globs, ['**/*.ts', '**/*.tsx']);
});

test('oh-my-pi: preserves alwaysApply=false', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, alwaysApply: false } };
    assert.equal(matter(renderOhMyPi(rule)).data.alwaysApply, false);
});

// ── OpenCode ─────────────────────────────────────────────────────────────
test('opencode: emits description + globs', () => {
    const fm = matter(renderOpencode(baseRule)).data;
    assert.equal(fm.description, 'Rules for TS.');
    assert.deepEqual(fm.globs, ['**/*.ts', '**/*.tsx']);
});

test('opencode: preserves match', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, match: 'all' } };
    assert.equal(matter(renderOpencode(rule)).data.match, 'all');
});

// ── Body preservation ────────────────────────────────────────────────────
test('all renderers preserve the rule body verbatim', () => {
    for (const render of [renderAntigravity, renderPiAgent, renderOhMyPi, renderOpencode]) {
        assert.match(render(baseRule), /- No any\./);
    }
});
