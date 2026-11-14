import { join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { defineCommand } from 'citty';
import convertCommand from './convert.mjs';
import installCommand from './install.mjs';
import { readRulesOrExit, readToolsOrExit } from './lib/cli-rules.mjs';
import { detectHarnesses, pathExists } from './lib/detect.mjs';
import { resolveIntegrationsDir, resolveRulesDir, resolveToolsPath } from './lib/paths.mjs';
import { multiSelect, promptText, selectOne } from './lib/tui/index.mjs';
import { sanitize, sanitizeLine } from './lib/tui/sanitize.mjs';

/**
 * The interactive front end for `install`.
 *
 * `install` already asks its three questions through `readline`, one numbered
 * prompt at a time. This command asks the same three — plus a review — as a
 * single keyboard-driven screen, and then calls `install` with every flag filled
 * in so its own prompts are never re-entered: a prompt raised after the
 * alternate screen closed would fight the terminal it just gave back.
 */

const DETECT_KEY = '__detect__';
const ALL_KEY = '__all__';
const SCOPE_PROJECT = 'project';
const SCOPE_USER = 'user';
const SCOPE_CUSTOM = 'custom';
const ACTION_RUN = 'run';
const ACTION_BACK = 'back';
const MANIFEST_FILE = '_manifest.json';
const NO_HARNESS =
    '⚠️  No harness detected on this machine. Pick a harness explicitly in the first step, or install the harness first.';
const NO_TTY =
    '❌ The interactive UI needs a terminal. Use "agency-rules install" with its flags instead.';

const STEP = { harnesses: 'harnesses', scope: 'scope', rules: 'rules', review: 'review' };
const NEXT_STEP = { harnesses: 'scope', scope: 'rules', rules: 'review', review: null };
const PREVIOUS_STEP = { scope: 'harnesses', rules: 'scope', review: 'rules' };
const OUTCOME_NEXT = 'next';
const OUTCOME_BACK = 'back';
const OUTCOME_QUIT = 'quit';

export default defineCommand({
    meta: {
        name: 'tui',
        description: 'Interactive terminal UI for installing rules',
    },
    async run() {
        requireTerminal();
        const tools = await readToolsOrExit(resolveToolsPath());
        const { dir: rulesDir } = resolveRulesDir();
        const rules = await readRulesOrExit(rulesDir);
        if (rules.length === 0) {
            console.error(`❌ No rules found in ${rulesDir}`);
            process.exit(1);
        }

        const plan = await collectPlan(tools, rules);
        if (!plan) return;

        try {
            await executePlan(
                plan,
                rules.map((rule) => rule.slug),
            );
        } catch (err) {
            console.error(`❌ ${err.message}`);
            process.exit(1);
        }
    },
});

function requireTerminal() {
    if (input.isTTY && output.isTTY) return;
    console.error(NO_TTY);
    process.exit(1);
}

/**
 * Walk the four steps until the user confirms or backs out entirely.
 *
 * Back keeps the answers already given: stepping backwards only re-opens the
 * previous screen, and its previous selection is pre-checked there.
 */
async function collectPlan(tools, rules) {
    const plan = { harnesses: [], scope: SCOPE_PROJECT, dest: null, rules: [] };
    let step = STEP.harnesses;

    while (step) {
        const outcome = await runStep(step, plan, tools, rules);
        if (outcome === OUTCOME_QUIT) return null;
        if (outcome === OUTCOME_BACK) {
            step = PREVIOUS_STEP[step];
            if (!step) return null;
            continue;
        }
        step = NEXT_STEP[step];
    }

    return plan;
}

function runStep(step, plan, tools, rules) {
    if (step === STEP.harnesses) return stepHarnesses(plan, tools);
    if (step === STEP.scope) return stepScope(plan);
    if (step === STEP.rules) return stepRules(plan, rules);
    return stepReview(plan);
}

async function stepHarnesses(plan, tools) {
    const answer = await multiSelect({
        title: 'Step 1/4 — harnesses to install into',
        items: harnessItems(tools),
        getLabel: (item) => item.label,
        getSub: (item) => item.sub,
        selected: plan.harnesses,
        allowEmpty: false,
    });
    if (answer.action !== 'confirm') return answer.action;

    const chosen = await resolveHarnesses(tools, answer.selected);
    if (chosen.length === 0) {
        console.log(NO_HARNESS);
        return OUTCOME_QUIT;
    }
    plan.harnesses = chosen;
    return OUTCOME_NEXT;
}

function harnessItems(tools) {
    const declared = Object.entries(tools.harnesses).map(([id, harness]) => ({
        key: id,
        label: `${sanitize(id)} — ${sanitizeLine(harness.label ?? id)}`,
        sub: sanitizeLine(harness.format ?? ''),
    }));
    return [
        ...declared,
        {
            key: DETECT_KEY,
            label: 'Detect automatically',
            sub: 'the harnesses present on this machine',
        },
        { key: ALL_KEY, label: 'All harnesses', sub: 'every harness declared in tools.json' },
    ];
}

async function resolveHarnesses(tools, selected) {
    const declared = Object.keys(tools.harnesses);
    if (selected.includes(ALL_KEY)) return declared;
    const explicit = selected.filter((id) => declared.includes(id));
    if (!selected.includes(DETECT_KEY)) return explicit;
    // "Detect automatically" ticks alongside explicit picks: the answer is what
    // the machine has plus what the user named. Returning detection alone made
    // the explicit ticks look ignored.
    const detected = await detectHarnesses(tools);
    return [...new Set([...detected, ...explicit])];
}

async function stepScope(plan) {
    while (true) {
        const answer = await selectOne({
            title: 'Step 2/4 — where should the rules land?',
            options: [SCOPE_PROJECT, SCOPE_USER, SCOPE_CUSTOM],
            labels: [
                'project — local to this repository',
                'user — global for your account',
                'custom path — a directory you name',
            ],
        });
        if (answer.action !== 'confirm') return answer.action;

        if (answer.value !== SCOPE_CUSTOM) {
            plan.scope = answer.value;
            plan.dest = null;
            return OUTCOME_NEXT;
        }

        const typed = await promptText({
            title: 'Custom directory (absolute or ~-relative)',
            initial: plan.dest ?? '',
        });
        if (typed.action !== 'confirm') return typed.action;

        const dest = typed.value.trim();
        if (dest !== '') {
            plan.scope = SCOPE_PROJECT;
            plan.dest = dest;
            return OUTCOME_NEXT;
        }
    }
}

async function stepRules(plan, rules) {
    const items = rules.map((rule) => ({
        key: rule.slug,
        tags: (rule.data?.tags ?? []).map((tag) => sanitizeLine(tag)),
        label: sanitize(rule.slug),
        sub: sanitizeLine(rule.data?.description ?? ''),
    }));
    const answer = await multiSelect({
        title: `Step 3/4 — rules to install (${rules.length} available, empty selection installs all)`,
        items,
        getLabel: (item) => item.label,
        getSub: (item) => item.sub,
        selected: plan.rules,
        allowEmpty: true,
    });
    if (answer.action !== 'confirm') return answer.action;

    const known = new Set(rules.map((rule) => rule.slug));
    plan.rules = answer.selected.filter((slug) => known.has(slug));
    return OUTCOME_NEXT;
}

async function stepReview(plan) {
    const answer = await selectOne({
        title: reviewSummary(plan),
        options: [ACTION_RUN, ACTION_BACK],
        labels: ['Run install', 'Back to rules'],
    });
    if (answer.action !== 'confirm') return answer.action;
    return answer.value === ACTION_RUN ? OUTCOME_NEXT : OUTCOME_BACK;
}

function reviewSummary(plan) {
    const destination = plan.dest
        ? `${sanitizeLine(plan.dest)} (custom path)`
        : `${plan.scope} scope — the destination in tools.json`;
    const count = plan.rules.length === 0 ? 'all rules' : `${plan.rules.length} selected`;
    return [
        'Step 4/4 — review',
        `Harnesses: ${plan.harnesses.map((id) => sanitizeLine(id)).join(', ')}`,
        `Destination: ${destination}`,
        `Rules: ${count}`,
    ].join('\n');
}

/**
 * Compile what is missing, then hand the whole plan to `install`.
 *
 * `install` is called with every flag it inspects, including the full rule list
 * when the selection was left empty — "all rules" is the absence of a filter in
 * the UI, but passing nothing would open `install`'s own rule prompt.
 */
async function executePlan(plan, allSlugs) {
    const integrations = resolveIntegrationsDir();
    const missing = [];
    for (const id of plan.harnesses) {
        if (!(await pathExists(join(integrations, id, MANIFEST_FILE)))) missing.push(id);
    }

    if (missing.length > 0) {
        // Harness ids come from `tools.json`, and this line is printed after the
        // alternate screen is gone — the plain terminal deserves the same trust
        // boundary as the frame did.
        const which = missing.map((id) => sanitizeLine(id)).join(', ');
        console.log(`⚙️  No compiled output for ${which} — compiling first.\n`);
        await convertCommand.run({ args: { harness: plan.harnesses.join(',') } });
    }

    const rules = plan.rules.length > 0 ? plan.rules : allSlugs;
    await installCommand.run({
        args: {
            harness: plan.harnesses.join(','),
            scope: plan.scope,
            rules: rules.join(','),
            dest: plan.dest ?? undefined,
            'dry-run': false,
        },
    });
}
