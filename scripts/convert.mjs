import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { defineCommand } from 'citty';
import { readRulesOrExit, readToolsOrExit } from './lib/cli-rules.mjs';
import { resolveIntegrationsDir, resolveRulesDir, resolveToolsPath } from './lib/paths.mjs';
import { renderers } from './lib/renderers/index.mjs';
import { substituteSlug } from './lib/slug-template.mjs';

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
        harness: { type: 'string', description: 'Limit to specific harnesses (comma-separated)' },
        rules: { type: 'string', description: 'Limit to specific rule slugs (comma-separated)' },
    },
    async run({ args }) {
        const dryRun = args['dry-run'];
        const prefix = dryRun ? '  [dry-run]' : ' ';

        const { dir: RULES_DIR } = resolveRulesDir();
        const TOOLS_PATH = resolveToolsPath();
        const INTEGRATIONS_DIR = resolveIntegrationsDir();
        const requestedRules = args.rules
            ? args.rules
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            : null;

        const tools = await readToolsOrExit(TOOLS_PATH);
        const allRules = await readRulesOrExit(RULES_DIR);

        if (allRules.length === 0) {
            console.error(`❌ No rules found in ${RULES_DIR}`);
            process.exit(1);
        }

        let targetHarnesses;
        if (args.harness) {
            targetHarnesses = args.harness.split(',').map((s) => s.trim());
            for (const id of targetHarnesses) {
                if (!tools.harnesses[id]) {
                    console.error(`❌ Unknown harness: ${id}`);
                    process.exit(1);
                }
            }
        } else {
            targetHarnesses = Object.keys(tools.harnesses);
        }

        let targetRules = allRules;
        if (requestedRules) {
            targetRules = allRules.filter((r) => requestedRules.includes(r.slug));

            const missingRules = requestedRules.filter(
                (slug) => !allRules.some((r) => r.slug === slug),
            );
            if (missingRules.length > 0) {
                console.warn(`⚠️  The following rules were not found: ${missingRules.join(', ')}`);
            }

            if (targetRules.length === 0) {
                console.error(`❌ No matching rules found to convert.`);
                process.exit(1);
            }
        }

        console.log(
            `📚 Found ${targetRules.length} rule(s) in ${RULES_DIR}${dryRun ? ' (dry-run — nothing will be written)' : ''}\n`,
        );

        if (requestedRules) {
            console.log(
                dryRun
                    ? `⚠️  A real run with --rules would write a partial manifest: ${targetRules.length} rule(s) only, and \`install\` installs exactly what the manifest lists.\n`
                    : `⚠️  Partial build: _manifest.json will list only these ${targetRules.length} rule(s), and \`install\` installs exactly what the manifest lists.\n` +
                          '   Run `convert` without --rules for a full build before installing.\n',
            );
        }

        let totalFiles = 0;

        // Validate every renderer before the first reset. Checked inside the loop,
        // an unsupported format aborted the run after the harnesses already
        // processed had been wiped and rewritten — a failed build that left the
        // output half-old and half-new.
        for (const id of targetHarnesses) {
            const harness = tools.harnesses[id];
            if (!renderers[harness.format]) {
                console.error(`❌ No renderer for format "${harness.format}" (harness: ${id})`);
                process.exit(1);
            }
        }

        for (const id of targetHarnesses) {
            const harness = tools.harnesses[id];
            const render = renderers[harness.format];
            const harnessDir = join(INTEGRATIONS_DIR, id);
            const manifest = [];

            // Full reset before writing. `integrations/` is a gitignored build
            // product, so an artifact whose rule was renamed or filtered out is
            // stale output that nothing should install. Without the reset the
            // directory kept orphans (and docs/ARCHITECTURE.md claimed a reset
            // that never happened). A partial build therefore produces a partial
            // directory, which the manifest's `partial` flag makes visible.
            if (!dryRun) {
                await rm(harnessDir, { recursive: true, force: true });
            } else {
                console.log(`${prefix} would reset ${harnessDir}/`);
            }

            for (const rule of targetRules) {
                let output;
                try {
                    output = render(rule, harness);
                } catch (err) {
                    console.error(`❌ ${id}: failed to render "${rule.slug}": ${err.message}`);
                    process.exit(1);
                }

                const relPath = substituteSlug(harness.integrationPath, rule.slug);
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
                            partial: Boolean(requestedRules),
                            filter: requestedRules,
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
            ? `\n🔎 Dry-run: would write ${totalFiles} file(s) across ${targetHarnesses.length} harness(es). Nothing was written.`
            : `\n🎉 Wrote ${totalFiles} file(s) across ${targetHarnesses.length} harness(es).`;

        console.log(summary);
    },
});
