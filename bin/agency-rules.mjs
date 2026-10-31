#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const command = process.argv[2];

// ── Read version dynamically ──────────────────────────────────────────
const getVersion = async () => {
    try {
        const pkgPath = resolve(import.meta.dirname, '..', 'package.json');
        const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
        return pkg.version || '0.0.0';
    } catch {
        return '0.0.0';
    }
};

const version = await getVersion();

// ── Help Menus ────────────────────────────────────────────────────────
const showHelp = () => {
    console.log(`
\x1b[36magency-rules\x1b[0m v${version}
Write rules once. Run them in every harness.

\x1b[33mUsage:\x1b[0m
  $ agency-rules <command> [options]

\x1b[33mCommands:\x1b[0m
  \x1b[32mlist\x1b[0m         List all available rules
  \x1b[32mconvert\x1b[0m      Compile rules/ into each harness's native format
  \x1b[32minstall\x1b[0m      Install compiled artifacts into detected harnesses
  \x1b[32mvalidate\x1b[0m     Validate each rule's frontmatter against the schema

\x1b[33mGlobal Options:\x1b[0m
  -h, --help      Show this help message
  -v, --version   Show version number

\x1b[33mExamples:\x1b[0m
  $ agency-rules list
  $ agency-rules validate
  $ agency-rules convert --dry-run
  $ agency-rules install --scope user --harness opencode
`);
};

const showCommandHelp = (cmd) => {
    const helps = {
        list: `
\x1b[36magency-rules list\x1b[0m
List all available rules and their descriptions.

\x1b[33mOptions:\x1b[0m
  --json            Output the list in JSON format (useful for scripting)

\x1b[33mExamples:\x1b[0m
  $ agency-rules list
  $ agency-rules list --json | jq '.'
`,
        convert: `
\x1b[36magency-rules convert\x1b[0m
Compile rules/ into each harness's native format.

\x1b[33mOptions:\x1b[0m
  --dry-run         Preview which files would be written (no writes)
  --harness <id>    Limit compilation to a specific harness (e.g., antigravity)

\x1b[33mExamples:\x1b[0m
  $ agency-rules convert
  $ agency-rules convert --dry-run
  $ agency-rules convert --harness pi-agent
`,
        install: `
\x1b[36magency-rules install\x1b[0m
Install compiled artifacts into detected harnesses.

\x1b[33mOptions:\x1b[0m
  --dry-run              Preview which files would be copied (no writes)
  --scope <project|user> Install local to project or global to user (default: project)
  --harness <id>         Install into a specific harness
  --all                  Force installation for all harnesses, ignoring auto-detection

\x1b[33mExamples:\x1b[0m
  $ agency-rules install
  $ agency-rules install --dry-run
  $ agency-rules install --scope user
  $ agency-rules install --harness opencode --scope project
`,
        validate: `
\x1b[36magency-rules validate\x1b[0m
Validate each rule's frontmatter against the schema.

\x1b[33mOptions:\x1b[0m
  (No specific options)

\x1b[33mExamples:\x1b[0m
  $ agency-rules validate
`,
    };
    console.log(helps[cmd] || '');
};

// ── Global Flags ──────────────────────────────────────────────────────
if (process.argv.includes('--version') || process.argv.includes('-v')) {
    console.log(version);
    process.exit(0);
}

if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
}

if (!['list', 'convert', 'install', 'validate'].includes(command)) {
    console.error(`\x1b[31mError:\x1b[0m Unknown command '${command}'`);
    showHelp();
    process.exit(1);
}

// ── Command-specific Help ─────────────────────────────────────────────
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showCommandHelp(command);
    process.exit(0);
}

// ── Execute ───────────────────────────────────────────────────────────
process.argv.splice(2, 1);

const scriptPath = resolve(import.meta.dirname, '..', 'scripts', `${command}.mjs`);

try {
    await import(pathToFileURL(scriptPath).href);
} catch (err) {
    console.error(`\x1b[31m❌ Failed to execute '${command}':\x1b[0m`, err.message);
    process.exit(1);
}
