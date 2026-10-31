import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { readRules } from './lib/frontmatter.mjs';

const { values: args } = parseArgs({
    options: {
        json: { type: 'boolean', default: false },
    },
});

// Resolve paths (local vs package fallback)
const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
const localRules = resolve(process.cwd(), 'rules');
const RULES_DIR =
    process.env.RULES_DIR || (existsSync(localRules) ? localRules : resolve(PACKAGE_ROOT, 'rules'));

const rules = await readRules(RULES_DIR);

if (rules.length === 0) {
    console.error(`❌ No rules found in ${RULES_DIR}`);
    process.exit(1);
}

// ── JSON Output ───────────────────────────────────────────────────────
if (args.json) {
    const output = rules.map((r) => ({
        name: r.slug,
        description: r.data.description || 'No description provided',
        source: r.source,
    }));
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
}

// ── Pretty Terminal Output ────────────────────────────────────────────
// Find the longest name to align the columns perfectly
const maxSlugLength = Math.max(...rules.map((r) => r.slug.length));

console.log(`\n📚 \x1b[1mAvailable Rules\x1b[0m (${rules.length})\n`);

for (const rule of rules) {
    const paddedSlug = rule.slug.padEnd(maxSlugLength);
    // Using Cyan for the rule name
    console.log(`  \x1b[36m${paddedSlug}\x1b[0m  ${rule.data.description || 'No description'}`);
}

console.log('\n');
