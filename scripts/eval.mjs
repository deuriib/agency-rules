import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineCommand } from 'citty';
import { readRulesOrExit } from './lib/cli-rules.mjs';
import { DEFAULT_MIN_UNIT_TOKENS, DEFAULT_UNIT_THRESHOLD, findViolations } from './lib/overlap.mjs';

const GATE_THRESHOLD = 10;
const GATE_MIN_UNITS = 2;

const C = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    bold: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

export default defineCommand({
    meta: {
        name: 'eval',
        description: 'Score textual overlap between rules to catch duplication',
    },
    args: {
        threshold: {
            type: 'string',
            description: `Fail when a rule has this share of its units restated elsewhere (default: ${GATE_THRESHOLD})`,
        },
        'min-units': {
            type: 'string',
            description: `Ignore a rule until this many of its units are restated (default: ${GATE_MIN_UNITS})`,
        },
        'unit-threshold': {
            type: 'string',
            description: `How much of a unit must match to count as restated (default: ${DEFAULT_UNIT_THRESHOLD})`,
        },
        'min-tokens': {
            type: 'string',
            description: `Ignore units shorter than this (default: ${DEFAULT_MIN_UNIT_TOKENS})`,
        },
        rule: { type: 'string', description: 'Score one rule against the rest' },
        top: { type: 'string', description: 'How many evidence rows to print (default: 10)' },
        json: { type: 'boolean', description: 'Output JSON instead of a table' },
    },
    async run({ args }) {
        const threshold = num(args.threshold, GATE_THRESHOLD);
        const minUnits = num(args['min-units'], GATE_MIN_UNITS);
        const unitThreshold = num(args['unit-threshold'], DEFAULT_UNIT_THRESHOLD);
        const minTokens = num(args['min-tokens'], DEFAULT_MIN_UNIT_TOKENS);
        const top = num(args.top, 10);

        const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
        const localRules = resolve(process.cwd(), 'rules');
        const RULES_DIR =
            process.env.RULES_DIR ||
            (existsSync(localRules) ? localRules : resolve(PACKAGE_ROOT, 'rules'));

        const rules = await readRulesOrExit(RULES_DIR);
        const { perRule, duplicates } = compareRules(rules, { unitThreshold, minTokens });

        if (perRule.length === 0) {
            console.error(`❌ No rules found in ${RULES_DIR}`);
            process.exit(1);
        }

        // Gate on the share of a rule that is restated elsewhere, not on a single
        // matched unit: a small rule with one shared sentence is 12% duplicated
        // and means nothing. Both a floor and a count are required.
        const violations = findViolations(perRule, threshold).filter(
            (rule) => rule.duplicatedUnits >= minUnits,
        );

        const scoped = args.rule ? perRule.filter((rule) => rule.slug === args.rule) : perRule;

        if (args.rule && scoped.length === 0) {
            console.error(`❌ No rule named "${args.rule}" in ${RULES_DIR}`);
            process.exit(1);
        }

        if (args.json) {
            console.log(
                JSON.stringify(
                    {
                        rules: perRule.length,
                        threshold,
                        minUnits,
                        unitThreshold,
                        violations: violations.length,
                        perRule,
                        duplicates,
                    },
                    null,
                    2,
                ),
            );
            process.exit(violations.length > 0 ? 1 : 0);
        }

        const totalUnits = perRule.reduce((sum, rule) => sum + rule.units, 0);
        console.log(
            `\n📊 ${C.bold}Rule overlap eval${C.reset} ${C.dim}— ${perRule.length} rules, ${totalUnits} units${C.reset}`,
        );
        console.log(
            `${C.dim}   A unit is a bullet or sentence. A unit counts as restated when ≥${Math.round(unitThreshold * 100)}% of its word pairs appear in another rule's unit.${C.reset}`,
        );
        console.log(
            `${C.dim}   Gate: ≥${threshold}% of a rule's units restated, and ≥${minUnits} units.${C.reset}\n`,
        );

        if (violations.length > 0) {
            console.log(`${C.red}❌ ${violations.length} rule(s) restate another rule${C.reset}\n`);
            for (const rule of violations) {
                console.log(
                    `  ${C.red}${String(rule.maxContainmentPercent).padStart(5)}%${C.reset}  ${C.bold}${rule.slug}${C.reset} ${C.dim}← ${rule.closestRule} (${rule.duplicatedUnits}/${rule.units} units)${C.reset}`,
                );
            }
            console.log('');
        } else {
            console.log(`${C.green}✅ No rule restates another${C.reset}\n`);
        }

        if (args.rule) {
            const only = scoped[0];
            console.log(`  ${C.bold}${only.slug}${C.reset}`);
            console.log(
                `    ${only.duplicatedUnits}/${only.units} units restated (${only.maxContainmentPercent}%) in ${only.closestRule ?? '—'}`,
            );
            const mine = duplicates.filter((d) => d.fromRule === only.slug);
            for (const d of mine.slice(0, top)) {
                console.log(`\n    ${C.yellow}${d.score}%${C.reset} → ${d.intoRule}`);
                console.log(`      ${d.unit}`);
            }
            console.log('');
            return;
        }

        console.log(`${C.bold}Highest share per rule${C.reset}`);
        for (const rule of scoped.slice(0, top)) {
            const mark =
                rule.duplicatedUnits >= minUnits && rule.maxContainmentPercent >= threshold
                    ? `${C.red}✗${C.reset}`
                    : `${C.dim}·${C.reset}`;
            const other = rule.closestRule ?? '—';
            console.log(
                `  ${mark} ${String(rule.maxContainmentPercent).padStart(5)}%  ${C.cyan}${rule.slug.padEnd(24)}${C.reset} ${C.dim}← ${other.padEnd(22)} (${rule.duplicatedUnits}/${rule.units} units)${C.reset}`,
            );
        }

        if (duplicates.length > 0) {
            console.log(
                `\n${C.bold}Evidence${C.reset} ${C.dim}(highest-scoring matched units)${C.reset}`,
            );
            for (const d of duplicates.slice(0, top)) {
                console.log(
                    `  ${C.yellow}${String(d.score).padStart(5)}%${C.reset}  ${C.dim}${d.fromRule} → ${d.intoRule}${C.reset}`,
                );
                console.log(`          ${truncate(d.unit, 96)}`);
            }
        }

        console.log('');
        process.exit(violations.length > 0 ? 1 : 0);
    },
});

function num(value, fallback) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function truncate(text, max) {
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
