import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseJsonc } from '../scripts/lib/jsonc.mjs';

test('parses plain JSON unchanged', () => {
    assert.deepEqual(parseJsonc('{"a":1,"b":[1,2]}'), { a: 1, b: [1, 2] });
});

test('drops line comments, keeping the newline between tokens', () => {
    const text = `{
        // the schema this file is validated against
        "a": 1,
        "b": 2 // trailing note
    }`;
    assert.deepEqual(parseJsonc(text), { a: 1, b: 2 });
});

test('drops block comments, including one between two tokens', () => {
    const text = `{"a": /* inline */ 1, /* between */ "b": 2}`;
    assert.deepEqual(parseJsonc(text), { a: 1, b: 2 });
});

test('drops a trailing comma in an object and in an array', () => {
    const text = `{"a": [1, 2, 3,], "b": {"c": 1,},}`;
    assert.deepEqual(parseJsonc(text), { a: [1, 2, 3], b: { c: 1 } });
});

test('keeps `//` inside a string, which is a URL and not a comment', () => {
    const text = '{"$schema":"https://opencode.ai/config.json","a":1}';
    assert.deepEqual(parseJsonc(text), {
        $schema: 'https://opencode.ai/config.json',
        a: 1,
    });
});

test('keeps `/*` inside a string', () => {
    const text = '{"note":"use /* carefully */ here"}';
    assert.deepEqual(parseJsonc(text), { note: 'use /* carefully */ here' });
});

test('keeps an escaped quote inside a string from opening a new one', () => {
    const text = '{"a":"he said \\"hi\\" // not a comment"}';
    assert.deepEqual(parseJsonc(text), { a: 'he said "hi" // not a comment' });
});

test('keeps a comma that belongs to a string value before a closing brace', () => {
    // A `,(\s*[}\]])` regex would eat this comma and change the value.
    assert.deepEqual(parseJsonc('{"a":"x,}"}'), { a: 'x,}' });
    assert.deepEqual(parseJsonc('{"a":"x,]"}'), { a: 'x,]' });
});

test('throws a SyntaxError on input that is neither JSON nor JSONC', () => {
    assert.throws(() => parseJsonc('{"a": '), SyntaxError);
    assert.throws(() => parseJsonc('not json at all'), SyntaxError);
});

test('parses a realistic OpenCode config with comments and trailing commas', () => {
    const text = `{
  "$schema": "https://opencode.ai/config.json",
  // the plugin that loads rules from .opencode/rules
  "plugins": [
    "opencode-rules@latest",
    "@upstash/context7-opencode@latest",
  ],
  "mcp": {
    "servers": {
      "gateway": { "type": "remote", "url": "http://localhost:8080/mcp", },
    },
  },
}`;
    const parsed = parseJsonc(text);
    assert.deepEqual(parsed.plugins, [
        'opencode-rules@latest',
        '@upstash/context7-opencode@latest',
    ]);
    assert.equal(parsed.mcp.servers.gateway.type, 'remote');
});
