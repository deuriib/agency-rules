#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineCommand, runMain } from 'citty';

// Read version dynamically from package.json
const pkgPath = resolve(import.meta.dirname, '..', 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

const main = defineCommand({
  meta: {
    name: 'agency-rules',
    version: pkg.version,
    description: 'Write rules once. Run them in every harness.',
  },
  subCommands: {
    // Lazy load each command only when invoked
    list: () => import('../scripts/list.mjs').then((m) => m.default),
    convert: () => import('../scripts/convert.mjs').then((m) => m.default),
    install: () => import('../scripts/install.mjs').then((m) => m.default),
    validate: () => import('../scripts/validate.mjs').then((m) => m.default),
  },
});

runMain(main);
