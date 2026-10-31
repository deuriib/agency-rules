import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import Ajv from 'ajv';
import { defineCommand } from 'citty';
import { readRules } from './lib/frontmatter.mjs';

export default defineCommand({
    meta: {
        name: 'validate',
        description: "Validate each rule's frontmatter against the schema",
    },
    async run() {
        const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
        const localRules = resolve(process.cwd(), 'rules');
        const RULES_DIR =
            process.env.RULES_DIR || (localRules ? localRules : resolve(PACKAGE_ROOT, 'rules'));

        const schema = JSON.parse(await readFile(join(RULES_DIR, '_schema.json'), 'utf8'));
        const ajv = new Ajv({ allErrors: true, strict: false });
        const validate = ajv.compile(schema);

        const rules = await readRules(RULES_DIR);

        if (rules.length === 0) {
            console.error(`❌ No rules found in ${RULES_DIR}`);
            process.exit(1);
        }

        const seen = new Set();
        let failures = 0;

        for (const rule of rules) {
            const errors = [];

            if (seen.has(rule.slug)) {
                errors.push({
                    instancePath: '/name',
                    message: `duplicate rule name "${rule.slug}"`,
                });
            }
            seen.add(rule.slug);

            if (!validate(rule.data)) {
                for (const e of validate.errors ?? []) {
                    errors.push(e);
                }
            }

            if (errors.length > 0) {
                failures++;
                console.error(`❌ ${rule.source}`);
                for (const e of errors) {
                    console.error(`   ${e.instancePath || '/'} ${e.message}`);
                }
            } else {
                console.log(`✅ ${rule.source}`);
            }
        }

        if (failures > 0) {
            console.error(`\n💥 ${failures}/${rules.length} rule(s) failed validation.`);
            process.exit(1);
        }

        console.log(`\n🎉 ${rules.length} rule(s) validated successfully.`);
    },
});
