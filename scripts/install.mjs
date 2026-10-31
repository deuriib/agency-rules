import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { detectHarnesses, expandHome, pathExists } from './lib/detect.mjs';

const { values: args } = parseArgs({
    options: {
        scope: { type: 'string' },
        harness: { type: 'string' },
        all: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
    },
});

const dryRun = args['dry-run'];
const tag = dryRun ? '[dry-run]' : '     ';
const log = (msg) => console.log(`  ${tag} ${msg}`);

const INTEGRATIONS_DIR = process.env.INTEGRATIONS_DIR || 'integrations';
const tools = JSON.parse(await readFile('tools.json', 'utf8'));

let finalScope = args.scope;
let finalHarness = args.harness;

// ── Interactive Mode (si no se pasan parámetros y es una terminal) ─────
if (input.isTTY && ((!finalHarness && !args.all) || !finalScope)) {
    const rl = createInterface({ input, output });

    if (!finalHarness && !args.all) {
        console.log('\n🎯 Select a harness to install into:');
        const keys = Object.keys(tools.harnesses);
        keys.forEach((k, i) => console.log(`  ${i + 1}) ${k} (${tools.harnesses[k].label})`));
        console.log(`  ${keys.length + 1}) Detect automatically`);
        console.log(`  ${keys.length + 2}) All harnesses`);

        const answer = await rl.question(`\nChoice [1-${keys.length + 2}] (default: detect): `);
        const num = parseInt(answer.trim(), 10);

        if (!isNaN(num) && num >= 1 && num <= keys.length) {
            finalHarness = keys[num - 1];
        } else if (num === keys.length + 2 || answer.trim().toLowerCase() === 'all') {
            args.all = true;
        }
    }

    if (!finalScope) {
        console.log('\n🌍 Select installation scope:');
        console.log('  1) project (local to this repo)');
        console.log('  2) user (global for your user)');

        const answer = await rl.question('\nChoice [1-2] (default: 1): ');
        finalScope =
            answer.trim() === '2' || answer.trim().toLowerCase() === 'user' ? 'user' : 'project';
    }

    rl.close();
    console.log('');
}

// Fallback si no se seleccionó nada
if (!finalScope) finalScope = 'project';

if (!['project', 'user'].includes(finalScope)) {
    console.error(`❌ Invalid --scope: ${finalScope} (use "project" or "user")`);
    process.exit(1);
}

let targets;
if (finalHarness) {
    if (!tools.harnesses[finalHarness]) {
        console.error(`❌ Unknown harness: ${finalHarness}`);
        process.exit(1);
    }
    targets = [finalHarness];
} else if (args.all) {
    targets = Object.keys(tools.harnesses);
} else {
    targets = await detectHarnesses(tools);
    if (targets.length === 0) {
        console.warn('⚠️  No harness detected. Pass --harness <id> or --all to force.');
        process.exit(0);
    }
}

console.log(
    `🔍 Targets: ${targets.join(', ')} (scope: ${finalScope})${
        dryRun ? ' — dry-run, no changes will be made' : ''
    }\n`,
);

let copied = 0;
let skippedHarnesses = 0;
let pluginChanges = 0;

for (const id of targets) {
    const harness = tools.harnesses[id];
    const srcDir = join(INTEGRATIONS_DIR, id);

    if (!(await pathExists(srcDir))) {
        console.warn(
            `⚠️  ${id}: no compiled output at ${srcDir}, skipping. Run "mise run convert" first.`,
        );
        skippedHarnesses++;
        continue;
    }

    const manifest = JSON.parse(await readFile(join(srcDir, '_manifest.json'), 'utf8'));
    const destTemplate = harness.dest[finalScope];
    if (!destTemplate) {
        console.warn(`⚠️  ${id}: no dest for scope "${finalScope}"`);
        skippedHarnesses++;
        continue;
    }

    for (const { slug, path: relPath } of manifest.files) {
        const destPath = expandHome(destTemplate.replace('{{slug}}', slug));
        if (dryRun) {
            log(`${id}: would copy ${relPath} → ${destPath}`);
        } else {
            await mkdir(dirname(destPath), { recursive: true });
            await copyFile(join(srcDir, relPath), destPath);
            log(`${id}: ${destPath}`);
        }
        copied++;
    }

    if (harness.plugin) {
        const changed = await handlePlugin(id, harness.plugin, finalScope, dryRun, log);
        if (changed) pluginChanges++;
    }
}

console.log(
    dryRun
        ? `\n🔎 Dry-run: would copy ${copied} file(s) across ${targets.length - skippedHarnesses} harness(es).` +
              (pluginChanges ? ` Would update ${pluginChanges} plugin config(s).` : '') +
              ' Nothing was written.'
        : `\n🎉 Installed ${copied} file(s) across ${targets.length - skippedHarnesses} harness(es).` +
              (pluginChanges ? ` Updated ${pluginChanges} plugin config(s).` : ''),
);

if (dryRun && skippedHarnesses > 0) {
    console.log(
        `\n⚠️  ${skippedHarnesses} harness(es) skipped due to missing integrations. Run "mise run convert" first.`,
    );
}

// ── Plugin registration ──────────────────────────────────────────────
async function handlePlugin(id, plugin, scope, dry, logFn) {
    const configPath =
        scope === 'user'
            ? expandHome('~/.config/opencode/opencode.json')
            : join(process.cwd(), 'opencode.json');

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
        await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    }

    return true;
}
