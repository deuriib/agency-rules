# Adding a Harness

This guide walks through adding support for a new coding agent. The example
uses a hypothetical harness called **`example-agent`**.

---

## Prerequisites

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) first. You need to understand:

- Why `tools.json` is a contract (not a list).
- What renderers do (pure functions, no I/O).
- What the installer does (copies per manifest).

---

## Step 1 — Add an entry to `tools.json`

Add a new key under `harnesses`. Every field matters:

```json
"example-agent": {
  "id": "example-agent",
  "label": "Example Agent",
  "format": "md-example",
  "installKind": "per-rule",
  "integrationPath": "{{slug}}.md",
  "detect": { "dirs": [".example", "~/.example"] },
  "dest": {
    "project": ".example/rules/{{slug}}.md",
    "user": "~/.example/rules/{{slug}}.md"
  },
  "frontmatter": {
    "required": ["description"],
    "map": {
      "description": "string",
      "globs": "array<string>|string"
    }
  }
}
```

Field checklist:

- [ ] `id` — matches the key, kebab-case.
- [ ] `label` — human-readable name.
- [ ] `format` — you will use this string as a key in `renderers/index.mjs`.
- [ ] `installKind` — currently only `per-rule` is implemented.
- [ ] `integrationPath` — path under `integrations/<id>/`. Use `{{slug}}`.
- [ ] `detect.dirs` / `detect.files` — where the harness lives.
- [ ] `dest.project` / `dest.user` — install destinations.
- [ ] `frontmatter.required` — fields the harness cannot run without.
- [ ] `frontmatter.map` — documentation of supported fields.
- [ ] `plugin` — only if the harness needs a plugin registered.

---

## Step 2 — Create the renderer

Create `scripts/lib/renderers/example-agent.mjs`:

```js
import { wrap } from './_util.mjs';

export function renderExampleAgent(rule, _harness) {
  const d = rule.data;
  const fm = { description: d.description };
  if (d.globs !== undefined) fm.globs = d.globs;
  return wrap(fm, rule.body);
}
```

Rules for renderers:

- Pure. No `fs`, no `process`, no globals.
- Signature is `(rule, harness) => string`.
- Read only the fields your harness understands. Drop the rest silently —
  other harnesses may need them.
- Use `wrap()` from `_util.mjs` for consistent frontmatter formatting.

---

## Step 3 — Register the renderer

Edit `scripts/lib/renderers/index.mjs`:

```js
import { renderExampleAgent } from './example-agent.mjs';

export const renderers = {
  // ...
  'md-example': renderExampleAgent,
};
```

The key must be the exact string from `tools.json`'s `format` field.

---

## Step 4 — Add tests

Edit `tests/convert.test.mjs` and add a block:

```js
import { renderExampleAgent } from '../scripts/lib/renderers/example-agent.mjs';

test('example-agent: emits description', () => {
  const fm = matter(renderExampleAgent(baseRule)).data;
  assert.equal(fm.description, 'Rules for TS.');
});

test('example-agent: preserves globs as-is', () => {
  const fm = matter(renderExampleAgent(baseRule)).data;
  assert.deepEqual(fm.globs, ['**/*.ts', '**/*.tsx']);
});
```

Cover:

- A rule with only the required fields.
- A rule with every optional field your harness supports.
- The "body preserved verbatim" test in the shared block.

---

## Step 5 — Verify end-to-end

```bash
mise run validate        # schema must still pass
mise run convert         # your harness should appear in the summary
ls integrations/example-agent/
mise run test            # all renderer tests, including yours
mise run install --harness example-agent --scope project
```

Inspect `integrations/example-agent/<slug>.md` and confirm the output matches
your harness's expected format.

---

## Step 6 — Update docs

- Add a row to the compatibility matrix in `docs/RULE-SPEC.md`.
- Add a row to the harness table in `README.md`.
- Update the "Adding a rule — checklist" in `CONTRIBUTING.md` if the new
  harness changes requirements.

---

## Step 7 — Open a PR

Title: `feat(harness): support example-agent`

Include in the description:

- Link to the harness's documentation.
- A sample compiled output.
- Screenshot or log from `mise run install` (optional but helpful).

---

## Supported harnesses (current)

| Harness | `format` | `installKind` | Path |
| --- | --- | --- | --- |
| Google Antigravity | `md-yaml-trigger` | `per-rule` | `.agents/rules/*.md` |
| pi-agent | `md-rules-dir` | `per-rule` | `.pi/rules/<slug>/RULES.md` |
| oh-my-pi (omp) | `md-or-mdc` | `per-rule` | `.omp/rules/*.md` |
| OpenCode | `md-plugin` | `per-rule` | `.opencode/rules/*.md` |
