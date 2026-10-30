import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readRules } from '../scripts/lib/frontmatter.mjs';

test('readRules: parses YAML frontmatter and body', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agency-rules-'));
  try {
    await mkdir(join(dir, 'sub'), { recursive: true });
    await writeFile(
      join(dir, 'sub', 'test.md'),
      `---\nname: test-rule\ndescription: Hello.\n---\n\n# Body\n\nContent.\n`
    );
    const rules = await readRules(dir);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].slug, 'test-rule');
    assert.equal(rules[0].data.description, 'Hello.');
    assert.match(rules[0].body, /^# Body/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('readRules: slug falls back to filename if no name', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agency-rules-'));
  try {
    await writeFile(join(dir, 'fallback.md'), `---\ndescription: x\n---\nbody\n`);
    const rules = await readRules(dir);
    assert.equal(rules[0].slug, 'fallback');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('readRules: skips files starting with "_"', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'agency-rules-'));
  try {
    await writeFile(join(dir, '_ignore.md'), `---\nname: ignored\ndescription: x\n---\n`);
    await writeFile(join(dir, 'keep.md'), `---\nname: keep\ndescription: y\n---\n`);
    const rules = await readRules(dir);
    assert.deepEqual(rules.map((r) => r.slug), ['keep']);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
