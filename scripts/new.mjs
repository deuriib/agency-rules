import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { defineCommand } from 'citty';
import { readRulesOrExit } from './lib/cli-rules.mjs';
import { resolveRulesDir } from './lib/paths.mjs';
import { assertValidCategory, assertValidSlug, buildRuleSkeleton } from './lib/rule-template.mjs';

export default defineCommand({
    meta: {
        name: 'new',
        description: 'Scaffold a new rule in the neutral format',
    },
    args: {
        slug: {
            type: 'positional',
            description: 'Rule name in kebab-case (e.g. api-review)',
            required: true,
        },
        category: {
            type: 'string',
            description: 'Category directory under rules/ (default: base)',
        },
        description: {
            type: 'string',
            description: 'When the rule applies — prompted for when omitted on a TTY',
        },
        'dry-run': {
            type: 'boolean',
            description: 'Print the skeleton without writing it',
        },
    },
    async run({ args }) {
        const { dir: RULES_DIR, source } = resolveRulesDir();

        // A read-only command may fall back to the rules shipped in the package;
        // a scaffolder may not. Writing a skeleton into an installed package
        // (`node_modules/agency-rules/rules/…`) is a rule nobody will ever find
        // again — refuse and say what to do instead.
        //
        // Checked after the slug and category are validated: a typo in the slug
        // deserves the slug error, not a message about where the command ran.
        const slug = args.slug;
        const category = args.category || 'base';

        try {
            assertValidSlug(slug);
            assertValidCategory(category);
        } catch (err) {
            console.error(`❌ ${err.message}`);
            process.exit(1);
        }

        if (source === 'package') {
            console.error(`❌ No local rules/ directory in ${process.cwd()}`);
            console.error(
                '   Run this from the repository that owns the rules, or set RULES_DIR to one.',
            );
            process.exit(1);
        }

        // `RULES_DIR` is unvalidated user input, and `mkdir -p` would happily
        // create the whole tree somewhere nobody is looking.
        if (!existsSync(RULES_DIR)) {
            console.error(`❌ RULES_DIR does not exist: ${RULES_DIR}`);
            console.error('   Point it at a directory containing rule Markdown, or unset it.');
            process.exit(1);
        }

        // A duplicate name is a schema-level failure (`validate` rejects it), so
        // catch it while the file does not exist yet rather than after.
        const existing = await readRulesOrExit(RULES_DIR);
        const clash = existing.find((r) => r.slug === slug);
        if (clash) {
            console.error(`❌ A rule named "${slug}" already exists at ${clash.source}`);
            process.exit(1);
        }

        let description = args.description;
        if (!description) {
            if (!input.isTTY) {
                console.error(
                    '❌ --description is required in a non-interactive shell.\n' +
                        '   It is the only field a harness can match on, so it cannot be a placeholder.\n' +
                        '   Example: agency-rules new api-review --description "Use when reviewing REST endpoints, to catch missing validation."',
                );
                process.exit(1);
            }
            const rl = createInterface({ input, output });
            console.log(
                '\nℹ️  The description answers WHEN the rule applies, never what it contains.\n' +
                    '   Good: "Use when editing Python modules, to keep typing and imports consistent."\n',
            );
            description = await rl.question('Description: ');
            rl.close();
            console.log('');
        }

        let content;
        try {
            content = buildRuleSkeleton({ slug, description, category });
        } catch (err) {
            console.error(`❌ ${err.message}`);
            process.exit(1);
        }

        const outPath = join(RULES_DIR, category, `${slug}.md`);
        if (existsSync(outPath)) {
            console.error(`❌ Refusing to overwrite ${outPath}`);
            process.exit(1);
        }

        if (args['dry-run']) {
            console.log(`🔎 Would write ${outPath}\n`);
            console.log(content);
            return;
        }

        await mkdir(dirname(outPath), { recursive: true });
        await writeFile(outPath, content);

        console.log(`✅ Created ${outPath}\n`);
        console.log('Next:');
        console.log('  1. Replace the placeholder bullets with real rules.');
        console.log('  2. agency-rules validate');
        console.log('  3. agency-rules convert && agency-rules install');
    },
});
