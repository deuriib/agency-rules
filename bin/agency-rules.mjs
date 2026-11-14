#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
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
    new: () => import('../scripts/new.mjs').then((m) => m.default),
    eval: () => import('../scripts/eval.mjs').then((m) => m.default),
    tui: () => import('../scripts/tui.mjs').then((m) => m.default),
  },
});

/**
 * A bare `agency-rules` in a terminal means "show me what I can install".
 *
 * Only that exact case takes the detour: a subcommand, a flag (`--help`,
 * `--version`), or any non-TTY invocation keeps the parsed CLI, because a prompt
 * written into a pipe is not a prompt.
 */
const bareInvocation = process.argv.length === 2 && stdin.isTTY && stdout.isTTY;

if (bareInvocation) {
  const { default: tui } = await import('../scripts/tui.mjs');
  await tui.run({ args: {} });
} else {
  runMain(main);
}
