import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineCommand } from 'citty';
import { readRules } from './lib/frontmatter.mjs';

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
    },
    async run({ args }) {
        const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
        const localRules = resolve(process.cwd(), 'rules');
        const RULES_DIR =
            process.env.RULES_DIR ||
            (existsSync(localRules) ? localRules : resolve(PACKAGE_ROOT, 'rules'));

        const rules = await readRules(RULES_DIR);

        if (rules.length === 0) {
            console.error(`❌ No rules found in ${RULES_DIR}`);
            process.exit(1);
        }

        if (args.json) {
            const output = rules.map((r) => ({
                name: r.slug,
                description: r.data.description || 'No description provided',
                source: r.source,
            }));
            console.log(JSON.stringify(output, null, 2));
            return;
        }

        const maxSlugLength = Math.max(...rules.map((r) => r.slug.length));
        console.log(`\n📚 \x1b[1mAvailable Rules\x1b[0m (${rules.length})\n`);

        for (const rule of rules) {
            const paddedSlug = rule.slug.padEnd(maxSlugLength);
            console.log(
                `  \x1b[36m${paddedSlug}\x1b[0m  ${rule.data.description || 'No description'}`,
            );
        }
        console.log('\n');
    },
});
