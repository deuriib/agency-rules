import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineCommand } from 'citty';
import { readRulesOrExit } from './lib/cli-rules.mjs';
import { detectHarnesses } from './lib/detect.mjs';
import { aggregateStatus, ruleStatus, STATUS_META } from './lib/status.mjs';

const STATUS_ORDER_LABELS = ['synced', 'modified', 'missing', 'unbuilt'];

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';

export default defineCommand({
    meta: {
        name: 'list',
        description: 'List all available rules',
    },
    args: {
        json: {
            type: 'boolean',
            description: 'Output in JSON format',
            default: false,
        },
        harness: {
            type: 'string',
            description: 'Show install status for these harnesses (comma-separated)',
        },
        scope: {
            type: 'string',
            description: 'Status against project or user installs (default: project)',
        },
        // Declared as `status` so citty's built-in `--no-status` negation works.
        // A literal `no-status` key is not negated by citty and silently did
        // nothing.
        status: {
            type: 'boolean',
            description: 'Check install status (--no-status to skip)',
            default: true,
        },
    },
    async run({ args }) {
        const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
        const localRules = resolve(process.cwd(), 'rules');
        const RULES_DIR =
            process.env.RULES_DIR ||
            (existsSync(localRules) ? localRules : resolve(PACKAGE_ROOT, 'rules'));
        const INTEGRATIONS_DIR = process.env.INTEGRATIONS_DIR || 'integrations';

        const rules = await readRulesOrExit(RULES_DIR);
        if (rules.length === 0) {
            console.error(`❌ No rules found in ${RULES_DIR}`);
            process.exit(1);
        }

        const scope = args.scope || 'project';
        if (!['project', 'user'].includes(scope)) {
            console.error(`❌ Invalid --scope: ${scope} (use "project" or "user")`);
            process.exit(1);
        }

        const localTools = resolve(process.cwd(), 'tools.json');
        const TOOLS_PATH = existsSync(localTools)
            ? localTools
            : resolve(PACKAGE_ROOT, 'tools.json');
        const tools = JSON.parse(await readFile(TOOLS_PATH, 'utf8'));

        let targets = [];
        if (args.status) {
            if (args.harness) {
                targets = args.harness.split(',').map((s) => s.trim());
                for (const id of targets) {
                    if (!tools.harnesses[id]) {
                        console.error(`❌ Unknown harness: ${id}`);
                        process.exit(1);
                    }
                }
            } else {
                targets = await detectHarnesses(tools);
            }
        }

        // Per-rule status, and the per-harness detail that explains it.
        const status = new Map();
        for (const rule of rules) {
            if (targets.length === 0) continue;
            const perHarness = {};
            for (const id of targets) {
                perHarness[id] = await ruleStatus(rule.slug, tools.harnesses[id], {
                    integrationsDir: INTEGRATIONS_DIR,
                    scope,
                });
            }
            status.set(rule.slug, {
                status: aggregateStatus(Object.values(perHarness)),
                harnesses: perHarness,
            });
        }

        if (args.json) {
            console.log(
                JSON.stringify(
                    rules.map((rule) => {
                        const entry = status.get(rule.slug);
                        return {
                            name: rule.slug,
                            description: rule.data.description || 'No description provided',
                            source: rule.source,
                            ...(entry ? { status: entry.status, harnesses: entry.harnesses } : {}),
                        };
                    }),
                    null,
                    2,
                ),
            );
            return;
        }

        const maxSlugLength = Math.max(...rules.map((r) => r.slug.length));
        const showStatus = targets.length > 0;

        console.log(
            `\n📚 ${BOLD}Available Rules${RESET} (${rules.length})` +
                (showStatus ? ` ${DIM}— status vs ${targets.join(', ')} (${scope})${RESET}` : ''),
        );
        if (!showStatus && args.status) {
            console.log(
                `${DIM}   No harness detected; pass --harness <id> to see install status.${RESET}`,
            );
        }
        console.log('');

        for (const rule of rules) {
            const entry = status.get(rule.slug);
            let marker = '';
            if (entry) {
                const meta = STATUS_META[entry.status];
                marker = `${meta.color}${meta.icon}${RESET} `;
            }
            console.log(
                `  ${marker}${CYAN}${rule.slug.padEnd(maxSlugLength)}${RESET}  ${
                    rule.data.description || 'No description'
                }`,
            );
        }

        if (showStatus) {
            const legend = STATUS_ORDER_LABELS.map((key) => {
                const meta = STATUS_META[key];
                return `${meta.color}${meta.icon} ${meta.label}${RESET}`;
            }).join(`${DIM} · ${RESET}`);
            console.log(`\n${DIM}   ${RESET}${legend}`);
        }
        console.log('');
    },
});
