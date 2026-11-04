import { readRules } from './frontmatter.mjs';

/**
 * Textual overlap between rules.
 *
 * The defect being measured is a rule that **restates** content already in
 * another rule. Two rules may legitimately share a topic — `java` and `csharp`
 * both discuss unsafe casts — without sharing sentences. Only shared sentences
 * are a second source of truth that will drift.
 *
 * Whole-body similarity is the wrong instrument for that: a single copied
 * bullet is a fraction of a percent of a rule's total text, so a body-level
 * score buries the exact defect it is meant to find. This module therefore
 * scores at **unit** granularity — one bullet or sentence at a time — and
 * reports the share of a rule's units that already exist elsewhere.
 *
 * Word-bigram containment is used per unit rather than token-set Jaccard,
 * because bigrams are order-sensitive: "the gate is the requirement" scores
 * high against a restatement and low against a sentence that merely uses the
 * same words. No model, no network, no API key.
 */

/** Minimum words for a unit to be worth comparing. */
export const DEFAULT_MIN_UNIT_TOKENS = 5;

/**
 * Share of a unit's bigrams that must be found in another unit to call it a
 * restatement.
 *
 * Calibrated against this repository: 0.6 found nothing at all (too strict to
 * be a gate), while 0.25 began flagging rules that merely share a topic. At
 * 0.35 the known real overlaps surface and thematic siblings do not.
 */
export const DEFAULT_UNIT_THRESHOLD = 0.35;

/** Common prose glue — carries no evidence of duplication on its own. */
const STOPWORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'been',
    'but',
    'by',
    'do',
    'does',
    'for',
    'from',
    'has',
    'have',
    'if',
    'in',
    'into',
    'is',
    'it',
    'its',
    'no',
    'not',
    'of',
    'on',
    'or',
    'so',
    'that',
    'the',
    'their',
    'them',
    'then',
    'there',
    'these',
    'they',
    'this',
    'to',
    'was',
    'what',
    'when',
    'which',
    'will',
    'with',
    'you',
    'your',
]);

/** Strip fenced code, inline code, and Markdown emphasis before analysis. */
function stripMarkup(markdown) {
    return String(markdown ?? '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/[*_>#|]/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

/**
 * Lowercase content words from any text.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
    return (
        stripMarkup(text)
            .toLowerCase()
            .match(/[a-z][a-z0-9]*/g) ?? []
    );
}

/**
 * Content tokens only — stopwords removed. Used for unit comparison so that
 * sentences score on what they assert, not on how English connects clauses.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function contentTokens(text) {
    return tokenize(text).filter((word) => !STOPWORDS.has(word));
}

/**
 * Set of adjacent token pairs. Order-sensitive, which is what separates a
 * restatement from a sentence that merely shares vocabulary.
 *
 * @param {string[]} tokens
 * @returns {Set<string>}
 */
export function bigrams(tokens) {
    const out = new Set();
    for (let i = 0; i + 1 < tokens.length; i++) out.add(`${tokens[i]} ${tokens[i + 1]}`);
    return out;
}

/** Intersection size of two sets. */
export function intersectionSize(a, b) {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    let count = 0;
    for (const item of small) if (large.has(item)) count++;
    return count;
}

/**
 * Share of `a` found in `b`, 0–1. Asymmetric: it answers "how much of this unit
 * appears over there", which is the question duplication actually asks.
 */
export function containment(a, b) {
    if (!a || a.size === 0) return 0;
    return intersectionSize(a, b) / a.size;
}

/** Symmetric overlap, 0–1. */
export function jaccard(a, b) {
    if (!a || !b) return 0;
    const union = a.size + b.size - intersectionSize(a, b);
    return union === 0 ? 0 : intersectionSize(a, b) / union;
}

/**
 * Split a rule body into comparable units.
 *
 * A bullet is one unit. A prose paragraph is split into sentences. Headings and
 * table headers are dropped — they are labels, not claims.
 *
 * @param {string} markdown
 * @param {{minTokens?: number}} [options]
 * @returns {{text: string, tokens: string[], grams: Set<string>}[]}
 */
export function splitUnits(markdown, options = {}) {
    const minTokens = options.minTokens ?? DEFAULT_MIN_UNIT_TOKENS;
    const withoutCode = String(markdown ?? '').replace(/```[\s\S]*?```/g, '\n');

    const raw = [];
    for (const line of withoutCode.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '') continue;
        if (trimmed.startsWith('#')) continue;
        if (/^\|[\s:|-]+\|?$/.test(trimmed)) continue;

        const withoutBullet = trimmed.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '');
        if (/^[-*+|]/.test(trimmed)) {
            raw.push(withoutBullet);
        } else {
            for (const sentence of withoutBullet.split(/(?<=[.!?])\s+/)) {
                if (sentence.trim() !== '') raw.push(sentence);
            }
        }
    }

    const units = [];
    for (const text of raw) {
        const tokens = contentTokens(text);
        if (tokens.length < minTokens) continue;
        units.push({ text: text.trim(), tokens, grams: bigrams(tokens) });
    }
    return units;
}

/**
 * Best match for one unit among another rule's units.
 *
 * @param {{grams: Set<string>}} unit
 * @param {{text: string, grams: Set<string>}[]} pool
 */
export function bestMatch(unit, pool) {
    let best = { score: 0, text: null };
    for (const candidate of pool) {
        const score = containment(unit.grams, candidate.grams);
        if (score > best.score) best = { score, text: candidate.text };
    }
    return best;
}

/** 0.1234 → 12.3 */
export function pct(value) {
    return Math.round(value * 1000) / 10;
}

/**
 * Compare every rule pair at unit granularity.
 *
 * @param {{slug: string, body: string}[]} rules
 * @param {{minTokens?: number, unitThreshold?: number}} [options]
 */
export function compareRules(rules, options = {}) {
    const minTokens = options.minTokens ?? DEFAULT_MIN_UNIT_TOKENS;
    const unitThreshold = options.unitThreshold ?? DEFAULT_UNIT_THRESHOLD;

    const prepared = rules
        .map((rule) => ({ slug: rule.slug, units: splitUnits(rule.body, { minTokens }) }))
        .filter((entry) => entry.units.length > 0);

    const pairs = [];
    const duplicates = [];

    for (let i = 0; i < prepared.length; i++) {
        for (let j = i + 1; j < prepared.length; j++) {
            const a = prepared[i];
            const b = prepared[j];

            let duplicatedInB = 0;
            for (const unit of a.units) {
                const match = bestMatch(unit, b.units);
                if (match.score >= unitThreshold) {
                    duplicatedInB++;
                    duplicates.push({
                        fromRule: a.slug,
                        intoRule: b.slug,
                        score: pct(match.score),
                        unit: unit.text,
                        matched: match.text,
                    });
                }
            }

            let duplicatedInA = 0;
            for (const unit of b.units) {
                if (bestMatch(unit, a.units).score >= unitThreshold) duplicatedInA++;
            }

            const aInB = duplicatedInB / a.units.length;
            const bInA = duplicatedInA / b.units.length;
            if (aInB === 0 && bInA === 0) continue;

            pairs.push({
                a: a.slug,
                b: b.slug,
                aInB,
                bInA,
                aInBPercent: pct(aInB),
                bInAPercent: pct(bInA),
                duplicatedUnits: duplicatedInB + duplicatedInA,
            });
        }
    }
    pairs.sort((x, y) => Math.max(y.aInB, y.bInA) - Math.max(x.aInB, x.bInA));

    const perRule = prepared.map((entry) => {
        let best = { value: 0, other: null, units: 0 };
        for (const other of prepared) {
            if (other.slug === entry.slug) continue;
            let count = 0;
            for (const unit of entry.units) {
                if (bestMatch(unit, other.units).score >= unitThreshold) count++;
            }
            const value = count / entry.units.length;
            if (value > best.value) best = { value, other: other.slug, units: count };
        }
        return {
            slug: entry.slug,
            units: entry.units.length,
            duplicatedUnits: best.units,
            maxContainment: best.value,
            maxContainmentPercent: pct(best.value),
            closestRule: best.other,
        };
    });
    perRule.sort((x, y) => y.maxContainment - x.maxContainment);

    duplicates.sort((x, y) => y.score - x.score);

    return { pairs, perRule, duplicates };
}

/**
 * Rules whose share of restated units meets or exceeds the threshold.
 *
 * @param {ReturnType<typeof compareRules>['perRule']} perRule
 * @param {number} thresholdPercent
 */
export function findViolations(perRule, thresholdPercent) {
    return perRule.filter((rule) => rule.maxContainmentPercent >= thresholdPercent);
}

/** Convenience: read a rules directory and compare it. */
export async function compareRulesDir(dir, options = {}) {
    const rules = await readRules(dir);
    return compareRules(rules, options);
}
