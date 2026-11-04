import { splitUnits } from './overlap.mjs';

/**
 * Numeric contradictions between rules.
 *
 * The overlap eval measures shared phrasing; it is blind to two rules asserting
 * contradictory *facts*. `post-sale` said a renewal is reviewed at 90 days while
 * `contracts` said 60 — the same event, two numbers, zero shared words in the
 * respect that matters — and the gate passed both.
 *
 * A contradiction needs two things: the same subject, and a different number.
 * This module approximates the subject with the non-numeric words of a unit, and
 * the number with a normalised `value|unit` pair. When two units from different
 * rules share a subject strongly and share no value, one of them is wrong — or,
 * as often, the two are a legitimate sequence that was not written clearly
 * enough to say so. Either way it is worth a human look.
 *
 * Deliberately conservative: a false positive costs a minute of reading, but a
 * gate people learn to ignore costs the whole check.
 */

/** Units a claim can be measured in. Order matters: longest first. */
const UNITS = [
    'milliseconds',
    'millisecond',
    'seconds',
    'second',
    'minutes',
    'minute',
    'hours',
    'hour',
    'days',
    'day',
    'weeks',
    'week',
    'months',
    'month',
    'years',
    'year',
    'characters',
    'character',
    'items',
    'item',
    'levels',
    'level',
    'percent',
    'lines',
    'line',
    'retries',
    'retry',
    'attempts',
    'attempt',
    'copies',
    'copy',
    'bytes',
    'byte',
    'files',
    'file',
];

/** Canonical form of a unit, so "days" and "day" are one unit. */
const CANONICAL = {
    milliseconds: 'ms',
    millisecond: 'ms',
    seconds: 'second',
    second: 'second',
    minutes: 'minute',
    minute: 'minute',
    hours: 'hour',
    hour: 'hour',
    days: 'day',
    day: 'day',
    weeks: 'week',
    week: 'week',
    months: 'month',
    month: 'month',
    years: 'year',
    year: 'year',
    characters: 'character',
    character: 'character',
    items: 'item',
    item: 'item',
    levels: 'level',
    level: 'level',
    percent: 'percent',
    lines: 'line',
    line: 'line',
    retries: 'retry',
    retry: 'retry',
    attempts: 'attempt',
    attempt: 'attempt',
    copies: 'copy',
    copy: 'copy',
    bytes: 'byte',
    byte: 'byte',
    files: 'file',
    file: 'file',
};

const UNIT_PATTERN = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:(${UNITS.join('|')})\\b|%)`, 'gi');

/** Words removed from a unit before it is used as a subject signature. */
const SUBJECT_NOISE = new Set([
    ...UNITS,
    'percent',
    'within',
    'before',
    'after',
    'least',
    'most',
    'under',
    'over',
    'than',
    'every',
    'each',
]);

/**
 * Share of a subject phrase found in the other before the two are considered the
 * same subject.
 *
 * Calibrated against this repository, like the overlap threshold: at 0.6 an
 * injected "reviewed 30 days before the contract expires" went undetected against
 * the real "reviewed 90 days before expiry", because "before the contract expires"
 * and "before expiry" are the same fact in different words. At 0.5 that pair is
 * caught and the 45-rule corpus still yields zero candidates. Lower values were not
 * measured to add detection, only risk.
 *
 * The honest limitation: a contradiction phrased with entirely different
 * vocabulary around the number is invisible to this. It catches the case where two
 * rules talk about the same thing and disagree on the figure, not two rules that
 * describe one obligation in unrelated language.
 */
export const DEFAULT_SUBJECT_THRESHOLD = 0.5;

/** Minimum bigrams in a subject before it is specific enough to compare. */
export const DEFAULT_MIN_SUBJECT_GRAMS = 4;

/**
 * Units shorter than `splitUnits`'s default are still worth scanning: a claim like
 * "Retry twice" carries a number in very few words. Specificity is enforced by
 * `DEFAULT_MIN_SUBJECT_GRAMS` instead of by length.
 */
export const DEFAULT_MIN_UNIT_TOKENS = 3;

/** Words considered on each side of a number when building its subject. */
export const DEFAULT_SUBJECT_WINDOW = 6;

/**
 * Numeric claims in one unit of text, one per number.
 *
 * The subject of a number is the phrase it modifies, not the sentence it sits in.
 * Using the whole sentence was the first attempt and it failed on real prose: two
 * rules can state the same obligation with completely different surrounding
 * clauses, and the filler words diluted the similarity below any useful
 * threshold. A window of words either side of the number is the phrase that
 * actually carries the claim.
 *
 * @param {string} text
 * @param {{window?: number}} [options]
 * @returns {{value: string, grams: Set<string>}[]}
 */
export function numericClaims(text, options = {}) {
    const window = options.window ?? DEFAULT_SUBJECT_WINDOW;
    const source = String(text ?? '');

    const words = [...source.matchAll(/[a-z][a-z0-9]*/gi)].map((wordMatch) => ({
        word: wordMatch[0].toLowerCase(),
        start: wordMatch.index,
    }));

    const claims = [];
    const seen = new Set();

    for (const match of source.matchAll(UNIT_PATTERN)) {
        const value = Number.parseFloat(match[1]);
        // Group 2 is unset for the `%` form.
        const raw = match[2] ? match[2].toLowerCase() : 'percent';
        const unit = CANONICAL[raw] ?? raw;

        // Index of the first word at or after the number.
        let anchor = words.findIndex((w) => w.start >= (match.index ?? 0));
        if (anchor === -1) anchor = words.length - 1;
        if (anchor < 0) continue;

        const slice = words.slice(Math.max(0, anchor - window), anchor + window + 1);
        const subjectTokens = slice
            .map((w) => w.word)
            .filter((w) => !SUBJECT_NOISE.has(w) && !UNITS.includes(w));

        const grams = bigramsOf(subjectTokens);
        const signature = `${value}|${unit}#${[...grams].sort().join(',')}`;
        if (seen.has(signature)) continue;
        seen.add(signature);

        claims.push({ value: `${value}|${unit}`, grams });
    }

    return claims;
}

function bigramsOf(tokens) {
    const out = new Set();
    for (let i = 0; i + 1 < tokens.length; i++) out.add(`${tokens[i]} ${tokens[i + 1]}`);
    return out;
}

/** Share of `a` found in `b`. */
function containmentOf(a, b) {
    if (a.size === 0) return 0;
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    let shared = 0;
    for (const gram of small) if (large.has(gram)) shared++;
    return shared / small.size;
}

function pct(value) {
    return Math.round(value * 1000) / 10;
}

/**
 * Find pairs of numeric claims that describe the same subject with different
 * values.
 *
 * @param {{slug: string, body: string}[]} rules
 * @param {{subjectThreshold?: number, minSubjectGrams?: number, minUnitTokens?: number}} [options]
 * The claim count is returned alongside the findings on purpose: "no
 * contradictions" means nothing without the denominator, and a check that hides how
 * narrow it is invites more trust than it has earned.
 *
 * @returns {{claims: number, compared: number,
 *            contradictions: {fromRule: string, intoRule: string, subject: number,
 *              from: string, into: string, fromValues: string[], intoValues: string[]}[]}}
 */
export function findContradictions(rules, options = {}) {
    const subjectThreshold = options.subjectThreshold ?? DEFAULT_SUBJECT_THRESHOLD;
    const minGrams = options.minSubjectGrams ?? DEFAULT_MIN_SUBJECT_GRAMS;
    const minUnitTokens = options.minUnitTokens ?? DEFAULT_MIN_UNIT_TOKENS;
    const window = options.window ?? DEFAULT_SUBJECT_WINDOW;

    const claims = [];
    for (const rule of rules) {
        for (const unit of splitUnits(rule.body, { minTokens: minUnitTokens })) {
            for (const claim of numericClaims(unit.text, { window })) {
                if (claim.grams.size < minGrams) continue;
                claims.push({ rule: rule.slug, text: unit.text, ...claim });
            }
        }
    }

    let compared = 0;
    const out = [];
    for (let i = 0; i < claims.length; i++) {
        for (let j = i + 1; j < claims.length; j++) {
            const a = claims[i];
            const b = claims[j];
            if (a.rule === b.rule) continue;

            const subject = containmentOf(a.grams, b.grams);
            if (subject < subjectThreshold) continue;
            compared++;

            // A shared value means they agree, even if phrased differently.
            if (a.value === b.value) continue;

            out.push({
                fromRule: a.rule,
                intoRule: b.rule,
                subject: pct(subject),
                from: a.text,
                into: b.text,
                fromValues: [a.value],
                intoValues: [b.value],
            });
        }
    }

    return {
        claims: claims.length,
        compared,
        contradictions: out.sort((x, y) => y.subject - x.subject),
    };
}
