import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { readRules } from './lib/frontmatter.mjs';
import { renderers } from './lib/renderers/index.mjs';

const { values: args } = parseArgs({
    options: {
        'dry-run': { type: 'boolean', default: false },
        harness: { type: 'string' },
    },
});

const dryRun = args['dry-run'];
const prefix = dryRun ? '  [dry-run]' : ' ';

const RULES_DIR = process.env.RULES_DIR || 'rules';
const INTEGRATIONS_DIR = process.env.INTEGRATIONS_DIR || 'integrations';

const tools = JSON.parse(await readFile('tools.json', 'utf8'));
const rules = await readRules(RULES_DIR);

if (rules.length === 0) {
    console.error(`❌ No rules found in ${RULES_DIR}`);
    process.exit(1);
}

console.log(
    `📚 Found ${rules.length} rule(s) in ${RULES_DIR}${dryRun ? ' (dry-run — nothing will be written)' : ''}\n`,
);

const harnessIds = args.harness ? [args.harness] : Object.keys(tools.harnesses);

for (const id of harnessIds) {
    if (!tools.harnesses[id]) {
        console.error(`❌ Unknown harness: ${id}`);
        process.exit(1);
    }
}

let totalFiles = 0;

for (const id of harnessIds) {
    const harness = tools.harnesses[id];
    const render = renderers[harness.format];
    if (!render) {
        console.error(`❌ No renderer for format "${harness.format}" (harness: ${id})`);
        process.exit(1);
    }

    if (!harness.integrationPath) {
        console.error(`❌ Missing "integrationPath" for harness "${id}" in tools.json`);
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
            console.log(`${prefix} would write ${join(harnessDir, f.path)} (${f.size} bytes)`);
        }
    }
}

const summary = dryRun
    ? `\n🔎 Dry-run: would write ${totalFiles} file(s) across ${harnessIds.length} harness(es). Nothing was written.`
    : `\n🎉 Wrote ${totalFiles} file(s) across ${harnessIds.length} harness(es).`;

console.log(summary);
