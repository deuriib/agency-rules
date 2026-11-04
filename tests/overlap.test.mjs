import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    bestMatch,
    bigrams,
    compareRules,
    containment,
    contentTokens,
    DEFAULT_UNIT_THRESHOLD,
    findViolations,
    intersectionSize,
    jaccard,
    pct,
    splitUnits,
    tokenize,
} from '../scripts/lib/overlap.mjs';

// ── Primitives ───────────────────────────────────────────────────────────

test('bigrams are order-sensitive', () => {
    assert.deepEqual([...bigrams(['a', 'b', 'c'])], ['a b', 'b c']);
    // Same words, different order, no shared pair.
    assert.equal(intersectionSize(bigrams(['a', 'b', 'c']), bigrams(['c', 'b', 'a'])), 0);
});

test('bigrams of a short sequence is empty', () => {
    assert.equal(bigrams(['only']).size, 0);
    assert.equal(bigrams([]).size, 0);
});

test('containment is the share of the first set found in the second', () => {
    const a = new Set(['x y', 'y z']);
    const b = new Set(['x y', 'q r']);
    assert.equal(containment(a, b), 0.5);
    assert.equal(containment(b, a), 0.5);
    // Asymmetry: a small set fully inside a large one.
    const small = new Set(['x y']);
    assert.equal(containment(small, a), 1);
    assert.equal(containment(a, small), 0.5);
});

test('containment of an empty set is zero, not NaN', () => {
    assert.equal(containment(new Set(), new Set(['a b'])), 0);
    assert.equal(containment(null, new Set(['a b'])), 0);
});

test('jaccard divides by the union', () => {
    const a = new Set(['a b', 'b c']);
    const b = new Set(['a b', 'c d']);
    assert.equal(jaccard(a, b), 1 / 3);
    assert.equal(jaccard(new Set(), new Set()), 0);
});

test('pct rounds to one decimal', () => {
    assert.equal(pct(0), 0);
    assert.equal(pct(0.1234), 12.3);
    assert.equal(pct(1), 100);
    assert.equal(pct(0.66666), 66.7);
});

test('tokenize drops fenced code, inline code, and links keep their text', () => {
    const md = 'Keep `code` out. [label](https://x.test) stays.\n```js\nconst hidden = 1;\n```';
    const words = tokenize(md);
    assert.ok(!words.includes('hidden'), 'fenced code must not be tokenised');
    assert.ok(!words.includes('code'), 'inline code must not be tokenised');
    assert.ok(words.includes('label'), 'link text is prose and must survive');
});

test('contentTokens removes prose glue but keeps assertions', () => {
    const words = contentTokens('The gate is the requirement, not the code.');
    assert.ok(!words.includes('the'));
    assert.ok(!words.includes('is'));
    assert.ok(words.includes('gate'));
    assert.ok(words.includes('requirement'));
});

// ── Unit splitting ───────────────────────────────────────────────────────

test('splitUnits treats each bullet as one unit and splits prose into sentences', () => {
    const md = [
        '# Heading is not a unit',
        '',
        '- **First.** A bullet with enough words to compare against.',
        '- **Second.** Another bullet with enough content to count.',
        '',
        'One prose sentence that is long enough to count. A second sentence also long enough here.',
    ].join('\n');
    const units = splitUnits(md);
    assert.equal(units.length, 4, 'two bullets + two sentences, heading excluded');
    // The raw text keeps its Markdown so evidence reads like the rule does.
    assert.match(units[0].text, /^\*\*First\.\*\*/);
    assert.match(units[3].text, /^A second sentence/);
});

test('splitUnits ignores code fences and units below the token floor', () => {
    const md = ['```', '- not a unit at all here', '```', '- too short.'].join('\n');
    assert.deepEqual(splitUnits(md), []);
});

test('splitUnits drops table separator rows', () => {
    const md = [
        '| a | b |',
        '| --- | --- |',
        '| a long enough cell value here | another long enough cell |',
    ].join('\n');
    const units = splitUnits(md);
    assert.ok(units.every((u) => !u.text.includes('---')));
});

// ── Comparison ───────────────────────────────────────────────────────────

const RESTATED =
    '- **Never write a secret to a destination.** Emit the variable name, never its contents.';

test('a verbatim restatement scores 100%', () => {
    const { duplicates, perRule } = compareRules([
        { slug: 'a', body: RESTATED },
        { slug: 'b', body: RESTATED },
    ]);
    assert.equal(perRule[0].maxContainmentPercent, 100);
    assert.equal(duplicates[0].score, 100);
    assert.equal(duplicates[0].fromRule, 'a');
    assert.equal(duplicates[0].intoRule, 'b');
});

test('thematic siblings that share vocabulary but no phrasing are not flagged', () => {
    const { perRule } = compareRules([
        { slug: 'java', body: '- **No raw types.** Always parameterize generics list map set.' },
        {
            slug: 'csharp',
            body: '- **Nullable reference types on.** Absence belongs in the type system.',
        },
    ]);
    assert.equal(perRule[0].maxContainmentPercent < DEFAULT_UNIT_THRESHOLD * 100, true);
});

test('a rule referencing another by name is not a restatement', () => {
    const { perRule } = compareRules([
        {
            slug: 'deny',
            body: '- **Never write a secret value to any destination.** Emit the variable name only.',
        },
        {
            slug: 'sec',
            body: '- **Secrets are governed by `deny`** for the prohibition and the detail.',
        },
    ]);
    assert.equal(findViolations(perRule, 10).length, 0);
});

test('bestMatch finds the closest unit and reports no match when the pool is empty', () => {
    const [unit] = splitUnits(
        '- **Short-lived over long-lived.** Prefer federation to a static key.',
    );
    assert.equal(bestMatch(unit, []).score, 0);
    const [same] = splitUnits(
        '- **Short-lived over long-lived.** Prefer federation to a static key.',
    );
    assert.equal(bestMatch(unit, [same]).score, 1);
});

// ── Gate ─────────────────────────────────────────────────────────────────

test('the gate needs both a share and a unit count, so one shared sentence in a small rule cannot fail the build', () => {
    const units = Array.from({ length: 8 }, (_, i) => ({
        slug: `r${i}`,
        body: `- **Rule ${i}.** ${'word '.repeat(6)} unique${i}`,
    }));
    const { perRule } = compareRules(units);
    // One shared unit out of eight is 12.5%, which clears a 10% gate...
    const oneUnit = [{ ...perRule[0], duplicatedUnits: 1, maxContainmentPercent: 12.5 }];
    assert.equal(
        findViolations(oneUnit, 10).length,
        1,
        'share alone does clear the percentage gate',
    );
    // ...which is exactly why the command also requires min-units >= 2.
    assert.equal(oneUnit[0].duplicatedUnits < 2, true);
});

test('compareRules ignores rules with no comparable units', () => {
    const { perRule, duplicates } = compareRules([
        { slug: 'empty', body: '' },
        { slug: 'short', body: '- tiny' },
        { slug: 'real', body: RESTATED },
    ]);
    assert.deepEqual(
        perRule.map((r) => r.slug),
        ['real'],
    );
    assert.equal(duplicates.length, 0);
});

test('compareRules on an empty list is safe', () => {
    assert.deepEqual(compareRules([]), { pairs: [], perRule: [], duplicates: [] });
});
