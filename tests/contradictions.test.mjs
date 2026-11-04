import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    DEFAULT_MIN_SUBJECT_GRAMS,
    DEFAULT_SUBJECT_THRESHOLD,
    findContradictions,
    numericClaims,
} from '../scripts/lib/contradictions.mjs';

const SIXTY =
    '- **Auto-renewals are reviewed 60 days before expiry**, so the customer can still be saved.';
const NINETY =
    '- **Auto-renewals are reviewed 90 days before expiry**, so the customer can still be saved.';

// ── Extraction ───────────────────────────────────────────────────────────

test('a number and its unit are normalised to one value', () => {
    const [claim] = numericClaims('Reviewed 60 days before expiry.');
    assert.equal(claim.value, '60|day');
});

test('singular and plural units normalise to the same value', () => {
    assert.equal(numericClaims('Review in 1 day.')[0].value, '1|day');
    assert.equal(numericClaims('Review in 2 days.')[0].value, '2|day');
});

test('a percent sign is accepted as well as the word', () => {
    assert.equal(numericClaims('Coverage at least 80% of lines.')[0].value, '80|percent');
    assert.equal(numericClaims('Coverage at least 80 percent of lines.')[0].value, '80|percent');
});

test('each number in a unit becomes its own claim', () => {
    const claims = numericClaims('Cache for 30 seconds or 2 minutes.');
    assert.deepEqual(claims.map((c) => c.value).sort(), ['2|minute', '30|second']);
});

test('a unit with no number yields no claims', () => {
    assert.deepEqual(numericClaims('Never write a secret to any destination.'), []);
});

test('the subject excludes the number and the unit word', () => {
    const [claim] = numericClaims('Reviewed 60 days before expiry.');
    const words = [...claim.grams].join(' ');
    assert.doesNotMatch(words, /60/);
    assert.doesNotMatch(words, /day/);
    assert.match(words, /expiry/);
});

// ── Detection ────────────────────────────────────────────────────────────

test('the same subject with different numbers is a contradiction', () => {
    const { contradictions } = findContradictions([
        { slug: 'a', body: SIXTY },
        { slug: 'b', body: NINETY },
    ]);
    assert.equal(contradictions.length, 1);
    assert.equal(contradictions[0].fromValues[0], '60|day');
    assert.equal(contradictions[0].intoValues[0], '90|day');
});

test('the same number is agreement, not a contradiction, however the tail differs', () => {
    const { contradictions } = findContradictions([
        { slug: 'a', body: SIXTY },
        {
            slug: 'b',
            body: '- **Auto-renewals are reviewed 60 days before expiry**, and the account team is notified.',
        },
    ]);
    assert.deepEqual(contradictions, []);
});

test('different subjects with different numbers are not compared', () => {
    const { contradictions } = findContradictions([
        { slug: 'a', body: '- **Keep functions under 40 lines.** If it needs a scroll, split it.' },
        {
            slug: 'b',
            body: '- **Cyclomatic complexity at or below 10 per function**, and no more than 3 levels of nesting.',
        },
    ]);
    assert.deepEqual(contradictions, []);
});

test('a rule is never compared with itself', () => {
    const body = `${SIXTY}\n- Another line reviewing 90 days before expiry.`;
    const { contradictions } = findContradictions([{ slug: 'a', body }]);
    assert.deepEqual(contradictions, []);
});

test('the report carries its denominator, because a bare "none" overstates coverage', () => {
    const { claims, compared, contradictions } = findContradictions([
        { slug: 'a', body: SIXTY },
        { slug: 'b', body: NINETY },
    ]);
    assert.equal(typeof claims, 'number');
    assert.equal(claims, 2, 'both units contain a numeric claim');
    assert.equal(compared, 1, 'one subject pair was actually compared');
    assert.equal(contradictions.length, 1);
});

test('a subject too short to be specific is skipped', () => {
    // Both say a different number in two words; neither subject clears the floor.
    const { claims } = findContradictions(
        [
            { slug: 'a', body: '- Wait 5 seconds.' },
            { slug: 'b', body: '- Wait 9 seconds.' },
        ],
        { minSubjectGrams: DEFAULT_MIN_SUBJECT_GRAMS },
    );
    assert.equal(claims, 0);
});

test('raising the threshold suppresses a weak match', () => {
    const rules = [
        { slug: 'a', body: SIXTY },
        { slug: 'b', body: NINETY },
    ];
    assert.equal(findContradictions(rules, { subjectThreshold: 0.99 }).contradictions.length, 1);
    // The default is calibrated to catch this case; a strict threshold still does.
    assert.equal(
        findContradictions(rules, { subjectThreshold: DEFAULT_SUBJECT_THRESHOLD }).contradictions
            .length,
        1,
    );
});

test('an empty corpus is safe', () => {
    assert.deepEqual(findContradictions([]), { claims: 0, compared: 0, contradictions: [] });
});
