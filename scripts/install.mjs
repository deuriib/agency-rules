import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { defineCommand } from 'citty';
import { readToolsOrExit } from './lib/cli-rules.mjs';
import { detectHarnesses, expandHome, pathExists } from './lib/detect.mjs';
import { classifyInstall } from './lib/file-compare.mjs';
import { resolveFromCwd, resolveIntegrationsDir, resolveToolsPath } from './lib/paths.mjs';
import { parseSelection, pickByIndices, renderMenu } from './lib/selection.mjs';
import { substituteSlug } from './lib/slug-template.mjs';

export default defineCommand({
    meta: {
        name: 'install',
        description: 'Install compiled artifacts into detected harnesses',
    },
    args: {
        scope: {
            type: 'string',
            description: 'Install local to project or global to user (default: project)',
        },
        harness: {
            type: 'string',
            description: 'Install into specific harnesses (comma-separated)',
        },
        rules: {
            type: 'string',
            description: 'Install only specific rules by slug (comma-separated)',
        },
        all: {
            type: 'boolean',
            description: 'Force installation for all harnesses, ignoring auto-detection',
        },
        'dry-run': {
            type: 'boolean',
            description: 'Preview which files would be copied (no writes)',
        },
    },
    async run({ args }) {
        const dryRun = args['dry-run'];
        const tag = dryRun ? '[dry-run]' : '     ';
        const log = (msg) => console.log(`  ${tag} ${msg}`);

        const INTEGRATIONS_DIR = resolveIntegrationsDir();
        const TOOLS_PATH = resolveToolsPath();

        const tools = await readToolsOrExit(TOOLS_PATH);

        let finalScope = args.scope;
        let finalHarnesses = args.harness ? args.harness.split(',').map((s) => s.trim()) : null;
        let forceAll = args.all;
        const rulesToInstall = args.rules ? args.rules.split(',').map((s) => s.trim()) : null;

        // Whether the fleet came from the user (flag or menu) or from detection.
        // Only the wording of a failure depends on it, but "none of the detected
        // harnesses" for a fleet the user picked by hand is a wrong hint.
        let chosenExplicitly = Boolean(args.harness) || Boolean(args.all);

        // Interactive Mode
        if (input.isTTY && ((!finalHarnesses && !forceAll) || !finalScope)) {
            const rl = createInterface({ input, output });

            if (!finalHarnesses && !forceAll) {
                console.log('\n🎯 Select harnesses to install into:');
                const keys = Object.keys(tools.harnesses);
                keys.forEach((k, i) => {
                    console.log(`  ${i + 1}) ${k} (${tools.harnesses[k].label})`);
                });
                console.log(`  ${keys.length + 1}) Detect automatically`);
                console.log(`  ${keys.length + 2}) All harnesses`);

                const answer = await rl.question(
                    `\nChoice [1-${keys.length + 2}] (comma-separated for multiple, default: detect): `,
                );
                const answers = answer.split(',').map((s) => s.trim());
                const nums = answers.map((a) => parseInt(a, 10)).filter((n) => !Number.isNaN(n));

                if (nums.length > 0) {
                    chosenExplicitly = true;
                    if (nums.includes(keys.length + 2)) {
                        forceAll = true;
                    } else {
                        finalHarnesses = nums
                            .filter((n) => n >= 1 && n <= keys.length)
                            .map((n) => keys[n - 1]);
                    }
                }
            }

            if (!finalScope) {
                console.log('\n🌍 Select installation scope:');
                console.log('  1) project (local to this repo)');
                console.log('  2) user (global for your user)');

                const answer = await rl.question('\nChoice [1-2] (default: 1): ');
                finalScope =
                    answer.trim() === '2' || answer.trim().toLowerCase() === 'user'
                        ? 'user'
                        : 'project';
            }

            rl.close();
            console.log('');
        }

        if (!finalScope) finalScope = 'project';

        if (!['project', 'user'].includes(finalScope)) {
            console.error(`❌ Invalid --scope: ${finalScope} (use "project" or "user")`);
            process.exit(1);
        }

        let targets;
        if (finalHarnesses) {
            for (const id of finalHarnesses) {
                if (!tools.harnesses[id]) {
                    console.error(`❌ Unknown harness: ${id}`);
                    process.exit(1);
                }
            }
            targets = finalHarnesses;
        } else if (forceAll) {
            targets = Object.keys(tools.harnesses);
        } else {
            targets = await detectHarnesses(tools);
            if (targets.length === 0) {
                console.warn('⚠️  No harness detected. Pass --harness <id> or --all to force.');
                process.exit(0);
            }
        }

        console.log(
            `🔍 Targets: ${targets.join(', ')} (scope: ${finalScope})${dryRun ? ' — dry-run, no changes will be made' : ''}\n`,
        );

        // Preflight: resolve every target's manifest and destination before the
        // copy loop. Two things depend on the order:
        //
        // 1. Warnings about a target that cannot be installed — and about a
        //    partial build — are emitted before the first `🆕 added` line, so a
        //    user watching a long install sees the problem before it copies.
        // 2. The failure check below can run before the loop, so a request that
        //    cannot be fulfilled never half-installs a fleet.
        const plan = await planInstall(targets, tools, finalScope, INTEGRATIONS_DIR);
        const available = plan.filter((entry) => !entry.skipped);
        const skipped = plan.length - available.length;

        // Rule selection happens after the harnesses are known, because the
        // candidate list comes from the manifests that will actually be copied.
        // Offering slugs from `rules/` instead would list rules that were never
        // compiled for the selected harness.
        let selectedRules = rulesToInstall;
        if (input.isTTY && !selectedRules) {
            const slugs = slugsInPlan(available);
            if (slugs.length > 0) {
                const rl = createInterface({ input, output });
                console.log(renderMenu({ title: '📚 Select rules to install:', items: slugs }));
                const answer = await rl.question('');
                rl.close();
                console.log('');

                const parsed = parseSelection(answer, { length: slugs.length });
                if (parsed.kind === 'invalid') {
                    console.error(
                        `❌ Invalid selection "${parsed.token}" — expected 1-${slugs.length} or "all".`,
                    );
                    process.exit(1);
                }
                if (parsed.kind === 'some') selectedRules = pickByIndices(parsed.indices, slugs);
                if (selectedRules) {
                    console.log(
                        `📚 Rules: ${selectedRules.length === slugs.length ? 'all' : selectedRules.join(', ')}\n`,
                    );
                }
            }
        }

        const matchedSlugs = new Set();
        for (const entry of available) {
            entry.filesToCopy = entry.manifest.files;
            if (selectedRules) {
                entry.filesToCopy = entry.manifest.files.filter((f) =>
                    selectedRules.includes(f.slug),
                );

                // Warn if requested rules are missing from this specific harness manifest
                const availableSlugs = new Set(entry.manifest.files.map((f) => f.slug));
                const missing = selectedRules.filter((slug) => !availableSlugs.has(slug));
                if (missing.length > 0) {
                    console.warn(
                        `⚠️  ${entry.id}: The following requested rules were not found in the compiled output: ${missing.join(', ')}`,
                    );
                }
            }
            for (const file of entry.filesToCopy) matchedSlugs.add(file.slug);
        }

        // Installing nothing is a failure whenever there was something to
        // install. `install --rules typo` and a fleet whose `integrations/` was
        // never built both used to print `🎉 Installed 0 file(s)` and exit 0 — a
        // green CI step that installed nothing. Auto-detection finding no harness
        // at all is the one legitimate no-op, and it exits earlier.
        const failures = [];
        if (selectedRules) {
            const unmatched = selectedRules.filter((slug) => !matchedSlugs.has(slug));
            if (unmatched.length === selectedRules.length) {
                failures.push(
                    `none of the requested rules exist in the compiled output: ${unmatched.join(', ')}`,
                );
            }
        }
        if (available.length === 0) {
            const reasons = plan.map(
                (entry) =>
                    `${entry.id} (${
                        entry.skipped === 'no-dest'
                            ? `no dest for scope "${finalScope}" in tools.json`
                            : entry.skipped === 'empty-manifest'
                              ? 'manifest lists no files'
                              : 'no compiled output'
                    })`,
            );
            const which = chosenExplicitly ? 'requested' : 'detected';
            failures.push(
                `none of the ${which} harnesses could be installed: ${reasons.join(', ')}`,
            );
        }
        if (failures.length > 0) {
            for (const failure of failures) console.error(`❌ ${failure}`);
            console.error(
                '   Run "agency-rules convert" (or "mise run convert" in this repository) without --rules to compile first.',
            );
            process.exit(1);
        }

        let added = 0;
        let updated = 0;
        let unchanged = 0;
        let pluginChanges = 0;

        for (const entry of available) {
            const { id, harness, srcDir, destTemplate, filesToCopy } = entry;

            if (filesToCopy.length === 0) {
                console.log(`  ${tag} ${id}: no matching rules to install.`);
                continue;
            }

            for (const { slug, path: relPath } of filesToCopy) {
                const destPath = expandHome(substituteSlug(destTemplate, slug));
                const srcPath = join(srcDir, relPath);

                // Compare before copying: rewriting an identical file bumps its
                // timestamp, and a harness watching its rules directory treats
                // that as a change worth reloading.
                const status = await classifyInstall(srcPath, destPath);

                if (status === 'unchanged') {
                    unchanged++;
                    log(`${id}: ⏭️  unchanged (skipped) ${destPath}`);
                    continue;
                }

                if (status === 'added') added++;
                else updated++;

                const verb = status === 'added' ? 'add' : 'update';
                if (dryRun) {
                    log(`${id}: would ${verb} ${destPath}`);
                } else {
                    await mkdir(dirname(destPath), { recursive: true });
                    await copyFile(srcPath, destPath);
                    log(`${id}: ${status === 'added' ? '🆕 added' : '🔄 updated'} ${destPath}`);
                }
            }

            if (harness.plugin) {
                const changed = await handlePlugin(id, harness.plugin, finalScope, dryRun, log);
                if (changed) pluginChanges++;
            }
        }

        console.log(
            dryRun
                ? `\n🔎 Dry-run: would add ${added} file(s) and update ${updated} file(s). ${unchanged} file(s) unchanged across ${available.length} harness(es).` +
                      (pluginChanges ? ` Would update ${pluginChanges} plugin config(s).` : '') +
                      ' Nothing was written.'
                : `\n🎉 Installed ${added + updated} file(s) (${added} added, ${updated} updated) and skipped ${unchanged} unchanged file(s) across ${available.length} harness(es).` +
                      (pluginChanges ? ` Updated ${pluginChanges} plugin config(s).` : ''),
        );

        if (skipped > 0) {
            console.log(`\n⚠️  ${skipped} harness(es) skipped — see the warnings above.`);
        }
    },
});

/**
 * Read every target's manifest and destination without touching the disk.
 *
 * A target that cannot be installed is recorded with a reason instead of being
 * dropped, because the caller has to tell "no compiled output" apart from "this
 * harness has no destination for this scope" when it reports the failure.
 */
async function planInstall(targets, tools, scope, integrationsDir) {
    const entries = [];

    for (const id of targets) {
        const harness = tools.harnesses[id];
        const srcDir = join(integrationsDir, id);

        if (!(await pathExists(srcDir))) {
            console.warn(
                `⚠️  ${id}: no compiled output at ${srcDir}, skipping. Run "agency-rules convert" first.`,
            );
            entries.push({ id, harness, skipped: 'no-output' });
            continue;
        }

        const destTemplate = harness.dest?.[scope];
        if (!destTemplate) {
            console.warn(`⚠️  ${id}: no dest for scope "${scope}" in tools.json, skipping.`);
            entries.push({ id, harness, skipped: 'no-dest' });
            continue;
        }

        const manifestPath = join(srcDir, '_manifest.json');
        let manifest;
        try {
            manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        } catch (err) {
            // A directory with no manifest is what a `convert` killed halfway
            // leaves behind, and a corrupt manifest is what a hand edit leaves.
            // Either way the installer cannot know what to copy, and a raw
            // SyntaxError stack says nothing about the fix.
            const reason =
                err.code === 'ENOENT'
                    ? 'file not found'
                    : err instanceof SyntaxError
                      ? `invalid JSON: ${err.message}`
                      : err.message;
            console.error(`❌ ${id}: cannot read ${manifestPath} (${reason}).`);
            console.error('   Run "agency-rules convert" to rebuild the compiled output.');
            process.exit(1);
        }

        // A manifest that declares no files is a broken build, not an empty
        // install. Counting targets rather than files let this end in
        // "🎉 Installed 0 file(s)" and exit 0 — the same green-but-empty run that
        // a missing `integrations/<id>/` used to produce. `convert` cannot emit
        // this shape, so it only arrives from a hand-edited or third-party
        // manifest; the installer should still refuse to call it a success.
        if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
            console.warn(
                `⚠️  ${id}: ${manifestPath} lists no files, skipping. Run "agency-rules convert" to rebuild it.`,
            );
            entries.push({ id, harness, skipped: 'empty-manifest' });
            continue;
        }

        // Reported here, before the copy loop: a warning that arrives after a
        // partial build has already been copied is a warning too late to act on.
        if (manifest.partial) {
            console.warn(
                `⚠️  ${id}: compiled output is partial (\`_manifest.json\` has \`partial: true\`). ` +
                    'Run a full "agency-rules convert" before installing, or the rules left out of the build stay stale.',
            );
        }

        entries.push({ id, harness, srcDir, destTemplate, manifest, skipped: null });
    }

    return entries;
}

/** Union of every rule slug the selected harnesses have compiled. */
function slugsInPlan(entries) {
    const slugs = new Set();
    for (const entry of entries) {
        for (const file of entry.manifest.files ?? []) slugs.add(file.slug);
    }
    return [...slugs].sort();
}

async function handlePlugin(id, plugin, scope, dry, logFn) {
    // The config path is contract data, not an assumption about OpenCode: a
    // hardcoded `opencode.json` worked only while OpenCode was the one harness
    // with a plugin, and would have written the wrong file for the next one.
    const configTemplate = plugin.config?.[scope];
    if (!configTemplate) {
        console.warn(
            `⚠️  ${id}: no plugin config path for scope "${scope}" in tools.json, skipping plugin registration`,
        );
        return false;
    }

    const configPath = resolveFromCwd(configTemplate);

    let config = {};
    let existed = false;
    if (await pathExists(configPath)) {
        existed = true;
        try {
            config = JSON.parse(await readFile(configPath, 'utf8'));
        } catch {
            console.warn(`⚠️  ${id}: ${configPath} is not valid JSON, skipping plugin registration`);
            return false;
        }
    }

    config.plugin = config.plugin || [];
    if (config.plugin.includes(plugin.entry)) {
        logFn(`${id}: plugin "${plugin.entry}" already registered in ${configPath}`);
        return false;
    }

    const action = existed ? 'would add' : 'would create and add';
    logFn(`${id}: ${action} "${plugin.entry}" to ${configPath}`);

    if (!dry) {
        config.plugin.push(plugin.entry);
        await mkdir(dirname(configPath), { recursive: true });
        await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    }

    return true;
}
