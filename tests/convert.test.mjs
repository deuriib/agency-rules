import assert from 'node:assert/strict';
import { test } from 'node:test';
import matter from 'gray-matter';

import { renderAntigravity } from '../scripts/lib/renderers/antigravity.mjs';
import { renderClaudeRules } from '../scripts/lib/renderers/claude-code.mjs';
import { renderCopilot } from '../scripts/lib/renderers/copilot.mjs';
import { renderCursor } from '../scripts/lib/renderers/cursor.mjs';
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

// ── Cursor ───────────────────────────────────────────────────────────────
test('cursor: emits description, globs as a joined string, and alwaysApply', () => {
    const fm = matter(renderCursor(baseRule)).data;
    assert.equal(fm.description, 'Rules for TS.');
    assert.equal(fm.globs, '**/*.ts,**/*.tsx');
    assert.equal(fm.alwaysApply, undefined);
});

test('cursor: alwaysApply is preserved and suppresses globs', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, alwaysApply: true } };
    const fm = matter(renderCursor(rule)).data;
    assert.equal(fm.alwaysApply, true);
    assert.equal(fm.globs, undefined, 'alwaysApply overrides globs');
});

test('cursor: does not emit name, which Cursor derives from the filename', () => {
    assert.equal(matter(renderCursor(baseRule)).data.name, undefined);
});

test('cursor: a single glob string passes through unchanged', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, globs: '**/*.ts' } };
    assert.equal(matter(renderCursor(rule)).data.globs, '**/*.ts');
});

// ── Claude Code ──────────────────────────────────────────────────────────
test('claude-code: maps globs to paths as an array', () => {
    const fm = matter(renderClaudeRules(baseRule)).data;
    assert.deepEqual(fm.paths, ['**/*.ts', '**/*.tsx']);
});

test('claude-code: omits description, which the format does not define', () => {
    assert.equal(matter(renderClaudeRules(baseRule)).data.description, undefined);
});

test('claude-code: alwaysApply produces no paths, because that is the default', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, alwaysApply: true } };
    assert.equal(matter(renderClaudeRules(rule)).data.paths, undefined);
});

test('claude-code: a rule with nothing to declare compiles to body-only Markdown', () => {
    const rule = { slug: 'x', data: { name: 'x', description: 'd' }, body: '# X\n\n- rule.' };
    const out = renderClaudeRules(rule);
    assert.ok(!out.startsWith('---'), 'no empty frontmatter block');
    assert.match(out, /^# X/);
});

test('a single glob string becomes a one-element paths array', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, globs: '**/*.ts' } };
    assert.deepEqual(matter(renderClaudeRules(rule)).data.paths, ['**/*.ts']);
});

// ── GitHub Copilot ───────────────────────────────────────────────────────
test('copilot: joins globs into the comma-separated applyTo string', () => {
    const fm = matter(renderCopilot(baseRule)).data;
    assert.equal(fm.applyTo, '**/*.ts,**/*.tsx');
    assert.equal(fm.description, 'Rules for TS.');
});

test('copilot: a rule with no globs applies to every file, explicitly', () => {
    const rule = { slug: 'x', data: { name: 'x', description: 'd' }, body: '# X\n\n- rule.' };
    const fm = matter(renderCopilot(rule)).data;
    assert.equal(fm.applyTo, '**', 'applyTo is never omitted — Copilot would drop the file');
});

test('copilot: alwaysApply suppresses globs, which alwaysApply overrides', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, alwaysApply: true } };
    assert.equal(matter(renderCopilot(rule)).data.applyTo, '**');
});

test('copilot: a single glob string passes through unchanged', () => {
    const rule = { ...baseRule, data: { ...baseRule.data, globs: '**/*.ts' } };
    assert.equal(matter(renderCopilot(rule)).data.applyTo, '**/*.ts');
});

test('copilot: does not emit keys Copilot does not document', () => {
    const rule = {
        ...baseRule,
        data: { ...baseRule.data, alwaysApply: false, trigger: 'glob', match: 'all' },
    };
    const fm = matter(renderCopilot(rule)).data;
    assert.deepEqual(Object.keys(fm).sort(), ['applyTo', 'description']);
});

// ── Body preservation ────────────────────────────────────────────────────
test('all renderers preserve the rule body verbatim', () => {
    const renderers = [
        renderAntigravity,
        renderPiAgent,
        renderOhMyPi,
        renderOpencode,
        renderCursor,
        renderClaudeRules,
        renderCopilot,
    ];
    for (const render of renderers) {
        assert.match(render(baseRule), /- No any\./);
    }
});
