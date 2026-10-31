import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { defineCommand } from 'citty';
import { readRules } from './lib/frontmatter.mjs';
import { renderers } from './lib/renderers/index.mjs';

export default defineCommand({
    meta: {
        name: 'convert',
        description: "Compile rules/ into each harness's native format",
    },
    args: {
        'dry-run': {
            type: 'boolean',
            description: 'Preview which files would be written (no writes)',
        },
        harness: { type: 'string', description: 'Limit compilation to a specific harness' },
    },
    async run({ args }) {
        const dryRun = args['dry-run'];
        const prefix = dryRun ? '  [dry-run]' : ' ';

        const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
        const localRules = resolve(process.cwd(), 'rules');
        const localTools = resolve(process.cwd(), 'tools.json');

        const RULES_DIR =
            process.env.RULES_DIR ||
            ((await import('node:fs').then((fs) => fs.existsSync(localRules)))
                ? localRules
                : resolve(PACKAGE_ROOT, 'rules'));
        const TOOLS_PATH = (await import('node:fs').then((fs) => fs.existsSync(localTools)))
            ? localTools
            : resolve(PACKAGE_ROOT, 'tools.json');

        const INTEGRATIONS_DIR = process.env.INTEGRATIONS_DIR || 'integrations';

        const tools = JSON.parse(await readFile(TOOLS_PATH, 'utf8'));
        const rules = await readRules(RULES_DIR);

        if (rules.length === 0) {
            console.error(`❌ No rules found in ${RULES_DIR}`);
            process.exit(1);
        }

        const harnessIds = args.harness ? [args.harness] : Object.keys(tools.harnesses);

        for (const id of harnessIds) {
            if (!tools.harnesses[id]) {
                console.error(`❌ Unknown harness: ${id}`);
                process.exit(1);
            }
        }

        console.log(
            `📚 Found ${rules.length} rule(s) in ${RULES_DIR}${dryRun ? ' (dry-run — nothing will be written)' : ''}\n`,
        );

        let totalFiles = 0;

        for (const id of harnessIds) {
            const harness = tools.harnesses[id];
            const render = renderers[harness.format];
            if (!render) {
                console.error(`❌ No renderer for format "${harness.format}" (harness: ${id})`);
                process.exit(1);
            }

            const harnessDir = join(INTEGRATIONS_DIR, id);
            const manifest = [];

            for (const rule of rules) {
                let output;
                try {
                    output = render(rule, harness);
                } catch (err) {
                    console.error(`❌ ${id}: failed to render "${rule.slug}": ${err.message}`);
                    process.exit(1);
                }

                const relPath = harness.integrationPath.replace('{{slug}}', rule.slug);
                const outPath = join(harnessDir, relPath);
                manifest.push({ slug: rule.slug, path: relPath, size: output.length });
                totalFiles++;

                if (!dryRun) {
                    await mkdir(dirname(outPath), { recursive: true });
                    await writeFile(outPath, output);
                }
            }

            if (!dryRun) {
                await writeFile(
                    join(harnessDir, '_manifest.json'),
                    JSON.stringify(
                        {
                            harness: id,
                            format: harness.format,
                            files: manifest.map(({ slug, path }) => ({ slug, path })),
                        },
                        null,
                        2,
                    ),
                );
            }

            console.log(`✅ ${id.padEnd(12)} → ${manifest.length} file(s)`);
            if (dryRun) {
                for (const f of manifest) {
                    console.log(
                        `${prefix} would write ${join(harnessDir, f.path)} (${f.size} bytes)`,
                    );
                }
            }
        }

        const summary = dryRun
            ? `\n🔎 Dry-run: would write ${totalFiles} file(s) across ${harnessIds.length} harness(es). Nothing was written.`
            : `\n🎉 Wrote ${totalFiles} file(s) across ${harnessIds.length} harness(es).`;

        console.log(summary);
    },
});
