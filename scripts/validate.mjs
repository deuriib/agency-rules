import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import Ajv from 'ajv';
import { defineCommand } from 'citty';
import { readRules } from './lib/frontmatter.mjs';
import { dedupeErrors, formatAjvError } from './lib/schema-errors.mjs';

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
        const knownFields = Object.keys(schema.properties ?? {});

        // A YAML syntax error or a duplicate key throws instead of returning a
        // rule, so reading is per-file and a bad file must not abort the run.
        const parseFailures = [];
        const rules = [];
        for (const rule of await readRules(RULES_DIR, { onError: (e) => parseFailures.push(e) })) {
            rules.push(rule);
        }

        if (rules.length === 0 && parseFailures.length === 0) {
            console.error(`❌ No rules found in ${RULES_DIR}`);
            process.exit(1);
        }

        const seen = new Map();
        let failures = 0;

        for (const failure of parseFailures) {
            failures++;
            console.error(`❌ ${failure.message}`);
        }

        for (const rule of rules) {
            const errors = [];

            const firstAt = seen.get(rule.slug);
            if (firstAt) {
                errors.push(`/name: duplicate rule name "${rule.slug}" (also in ${firstAt})`);
            } else {
                seen.set(rule.slug, rule.source);
            }

            // `docs/RULE-SPEC.md` says the slug should equal the filename. Nothing
            // enforced it, so a file could advertise a name that no other file
            // matches and every reference to it would still resolve by filename.
            const expected = basename(rule.source, '.md');
            if (typeof rule.data?.name === 'string' && rule.data.name !== expected) {
                errors.push(
                    `/name: "${rule.data.name}" does not match the filename "${expected}.md" — rename one or the other`,
                );
            }

            if (!validate(rule.data)) {
                for (const e of dedupeErrors(validate.errors ?? [])) {
                    errors.push(formatAjvError(e, { knownFields }));
                }
            }

            if (errors.length > 0) {
                failures++;
                console.error(`❌ ${rule.source}`);
                for (const line of errors) console.error(`   ${line}`);
            } else {
                console.log(`✅ ${rule.source}`);
            }
        }

        const total = rules.length + parseFailures.length;
        if (failures > 0) {
            console.error(`\n💥 ${failures}/${total} rule(s) failed validation.`);
            process.exit(1);
        }

        console.log(`\n🎉 ${rules.length} rule(s) validated successfully.`);
    },
});
