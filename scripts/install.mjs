import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { detectHarnesses, expandHome, pathExists } from './lib/detect.mjs';

const { values: args } = parseArgs({
    options: {
        scope: { type: 'string', default: 'project' },
        harness: { type: 'string' },
        all: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
    },
});

if (!['project', 'user'].includes(args.scope)) {
    console.error(`❌ Invalid --scope: ${args.scope} (use "project" or "user")`);
    process.exit(1);
}

const dryRun = args['dry-run'];
const tag = dryRun ? '[dry-run]' : '     ';
const log = (msg) => console.log(`  ${tag} ${msg}`);

const INTEGRATIONS_DIR = process.env.INTEGRATIONS_DIR || 'integrations';
const tools = JSON.parse(await readFile('tools.json', 'utf8'));

let targets;
if (args.harness) {
    if (!tools.harnesses[args.harness]) {
        console.error(`❌ Unknown harness: ${args.harness}`);
        process.exit(1);
    }
    targets = [args.harness];
} else if (args.all) {
    targets = Object.keys(tools.harnesses);
} else {
    targets = await detectHarnesses(tools);
    if (targets.length === 0) {
        console.warn(
            `⚠️  No harness detected. Pass --harness <id> or --all to force.${dryRun ? '' : ''}`,
        );
        process.exit(0);
    }
}

console.log(
    `🔍 Targets: ${targets.join(', ')} (scope: ${args.scope})${dryRun ? ' — dry-run, no changes will be made' : ''}\n`,
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
    const destTemplate = harness.dest[args.scope];
    if (!destTemplate) {
        console.warn(`⚠️  ${id}: no dest for scope "${args.scope}"`);
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
        const changed = await handlePlugin(id, harness.plugin, args.scope, dryRun, log);
        if (changed) pluginChanges++;
    }
}

console.log(
    dryRun
        ? `\n🔎 Dry-run: would copy ${copied} file(s) across ${targets.length - skippedHarnesses} harness(es).` +
              (pluginChanges ? ` Would update ${pluginChanges} plugin config(s).` : '') +
              ` Nothing was written.`
        : `\n🎉 Installed ${copied} file(s) across ${targets.length - skippedHarnesses} harness(es).` +
              (pluginChanges ? ` Updated ${pluginChanges} plugin config(s).` : ''),
);

if (dryRun && skippedHarnesses > 0) {
    console.log(
        `\n⚠️  ${skippedHarnesses} harness(es) skipped due to missing integrations. Run "mise run convert" first.`,
    );
}

// ── Plugin registration ────────────────────────────────────────────────
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
