import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { defineCommand } from 'citty';
import { readToolsOrExit } from './lib/cli-rules.mjs';
import { detectHarnesses, expandHome, pathExists } from './lib/detect.mjs';
import { classifyInstall } from './lib/file-compare.mjs';
import { parseJsonc } from './lib/jsonc.mjs';
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

/** Config files OpenCode reads for the same stem, in preference order. */
function configCandidates(configPath) {
    const slash = configPath.lastIndexOf('/');
    const dot = configPath.lastIndexOf('.');
    const stem = dot > slash ? configPath.slice(0, dot) : configPath;
    const candidates = [configPath];
    for (const ext of ['.json', '.jsonc']) {
        const candidate = `${stem}${ext}`;
        if (!candidates.includes(candidate)) candidates.push(candidate);
    }
    return candidates;
}

/** The first config OpenCode would read for this path, or null. */
async function findExistingConfig(configPath) {
    for (const candidate of configCandidates(configPath)) {
        if (await pathExists(candidate)) return candidate;
    }
    return null;
}

/**
 * The declared key first, then the names it replaced.
 *
 * OpenCode's schema deprecates `plugin` in favour of `plugins`, and a config
 * written before that change still registers the same package. Reading both is
 * what stops the installer appending a second copy of an entry already there
 * under the old name.
 */
function pluginKeys(key) {
    return [...new Set([key, 'plugins', 'plugin'])];
}

/** Whether `entry` is in any of `keys`, as a bare string or an EntryEncoded object. */
function declaresEntry(config, keys, entry) {
    for (const key of keys) {
        const list = config?.[key];
        if (!Array.isArray(list)) continue;
        for (const item of list) {
            const name = typeof item === 'string' ? item : item?.package;
            if (name === entry) return true;
        }
    }
    return false;
}

/**
 * Parse a config file as strict JSON, falling back to JSONC.
 *
 * `editable` says whether the file can be written back without destroying it:
 * only strict JSON can, because re-serializing JSONC drops every comment and
 * reformats what the user maintains by hand.
 */
async function readConfig(path) {
    const text = await readFile(path, 'utf8');
    try {
        return { config: JSON.parse(text), editable: true };
    } catch {
        try {
            return { config: parseJsonc(text), editable: false };
        } catch {
            return null;
        }
    }
}

/** The plugin list a config actually uses, preferring the declared key. */
function existingPluginList(config, keys) {
    for (const key of keys) {
        if (Array.isArray(config?.[key])) return { key, list: config[key] };
    }
    return null;
}

async function handlePlugin(id, plugin, scope, dry, logFn) {
    // The path and the key are both contract data, not assumptions about
    // OpenCode: a hardcoded `opencode.json` worked only while OpenCode was the
    // one harness with a plugin, and a hardcoded `plugin` kept writing the key
    // the schema had already deprecated.
    const configTemplate = plugin.config?.[scope];
    if (!configTemplate) {
        console.warn(
            `⚠️  ${id}: no plugin config path for scope "${scope}" in tools.json, skipping plugin registration`,
        );
        return false;
    }

    const key = plugin.key;
    if (!key) {
        console.warn(`⚠️  ${id}: no plugin key in tools.json, skipping plugin registration`);
        return false;
    }

    const configPath = resolveFromCwd(configTemplate);
    const keys = pluginKeys(key);

    // A `.jsonc` beside the declared `.json` is the same config to OpenCode.
    // Creating the declared one anyway would leave two files claiming the same
    // role, with no rule saying which wins.
    const existing = await findExistingConfig(configPath);

    if (existing) {
        const parsed = await readConfig(existing);
        if (!parsed) {
            console.warn(
                `⚠️  ${id}: ${existing} is not valid JSON or JSONC, skipping plugin registration`,
            );
            return false;
        }

        if (declaresEntry(parsed.config, keys, plugin.entry)) {
            logFn(`${id}: plugin "${plugin.entry}" already registered in ${existing}`);
            return false;
        }

        if (!parsed.editable) {
            console.warn(
                `⚠️  ${id}: ${existing} is JSONC and is left untouched so its comments survive. ` +
                    `Add "${plugin.entry}" to its "${key}" array by hand.`,
            );
            return false;
        }

        const current = existingPluginList(parsed.config, keys);
        logFn(`${id}: ${dry ? 'would add' : 'added'} "${plugin.entry}" to ${existing}`);

        if (!dry) {
            const target = current?.key ?? key;
            parsed.config[target] = [...(current?.list ?? []), plugin.entry];
            await writeFile(existing, `${JSON.stringify(parsed.config, null, 2)}\n`);
        }

        return true;
    }

    // Nothing to edit. Before creating a config, consult the other scope:
    // OpenCode merges its config sources and a later `plugins` array replaces
    // the earlier one for that key, so a project file created here would
    // silently drop every plugin the user registered globally.
    if (scope === 'project') {
        const userTemplate = plugin.config?.user;
        const userPath = userTemplate ? resolveFromCwd(userTemplate) : null;
        // The user config needs the same sibling lookup: on this machine it is
        // `opencode.jsonc`, and only testing the declared `.json` would miss it
        // and create the project file this branch exists to avoid.
        const existingUser = userPath ? await findExistingConfig(userPath) : null;
        if (existingUser) {
            const userConfig = await readConfig(existingUser);
            const userList = userConfig && existingPluginList(userConfig.config, keys);
            if (userList?.list.length) {
                if (declaresEntry(userConfig.config, keys, plugin.entry)) {
                    logFn(
                        `${id}: plugin "${plugin.entry}" is already registered in ${existingUser}, ` +
                            `so ${configPath} was not created`,
                    );
                } else {
                    console.warn(
                        `⚠️  ${id}: ${existingUser} registers other plugins, and a project "${key}" array ` +
                            `would replace them, so ${configPath} was not created. Add ` +
                            `"${plugin.entry}" to ${existingUser} or to an existing project config.`,
                    );
                }
                return false;
            }
        }
    }

    logFn(
        `${id}: ${dry ? 'would create and add' : 'created and added'} "${plugin.entry}" to ${configPath}`,
    );

    if (!dry) {
        await mkdir(dirname(configPath), { recursive: true });
        await writeFile(configPath, `${JSON.stringify({ [key]: [plugin.entry] }, null, 2)}\n`);
    }

    return true;
}
