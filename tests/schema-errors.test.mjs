import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    dedupeErrors,
    formatAjvError,
    levenshtein,
    suggestField,
} from '../scripts/lib/schema-errors.mjs';

const KNOWN = ['name', 'description', 'globs', 'alwaysApply', 'trigger', 'match', 'tags', 'tools'];

test('levenshtein counts single-character edits', () => {
    assert.equal(levenshtein('trigger', 'trigger'), 0);
    assert.equal(levenshtein('triger', 'trigger'), 1);
    assert.equal(levenshtein('', 'abc'), 3);
    assert.equal(levenshtein('abc', ''), 3);
    assert.equal(levenshtein('globs', 'glob'), 1);
    assert.equal(levenshtein('kitten', 'sitting'), 3);
});

test('a near-miss key gets the right suggestion', () => {
    assert.equal(suggestField('triger', KNOWN), 'trigger');
    assert.equal(suggestField('alwaysAply', KNOWN), 'alwaysApply');
    assert.equal(suggestField('glob', KNOWN), 'globs');
    assert.equal(suggestField('descripton', KNOWN), 'description');
});

test('a key far from every field gets no suggestion rather than a wrong one', () => {
    assert.equal(suggestField('javaScript', KNOWN), null);
    assert.equal(suggestField('x', KNOWN), null);
    assert.equal(suggestField('', KNOWN), null);
});

test('an unknown field names the key and suggests the fix', () => {
    const message = formatAjvError(
        {
            keyword: 'additionalProperties',
            instancePath: '',
            params: { additionalProperty: 'triger' },
        },
        { knownFields: KNOWN },
    );
    assert.match(message, /unknown field "triger"/);
    assert.match(message, /did you mean "trigger"/);
});

test('an unknown field with no close match lists the valid fields instead', () => {
    const message = formatAjvError(
        {
            keyword: 'additionalProperties',
            instancePath: '',
            params: { additionalProperty: 'javaScript' },
        },
        { knownFields: KNOWN },
    );
    assert.match(message, /unknown field "javaScript"/);
    assert.doesNotMatch(message, /did you mean/);
    assert.match(message, /valid: name, description/);
});

test('a missing required field is named', () => {
    const message = formatAjvError({
        keyword: 'required',
        instancePath: '',
        params: { missingProperty: 'description' },
    });
    assert.equal(message, '/description: required field is missing');
});

test('an invalid enum value lists what is allowed', () => {
    const message = formatAjvError({
        keyword: 'enum',
        instancePath: '/trigger',
        params: { allowedValues: ['always_on', 'glob', 'model_decision', 'manual'] },
    });
    assert.match(message, /\/trigger: must be one of always_on, glob/);
});

test('an empty globs key gets an instruction, not a schema dump', () => {
    const message = formatAjvError({
        keyword: 'oneOf',
        instancePath: '/globs',
        params: { passingSchemas: null },
    });
    assert.match(message, /remove the key if you have nothing to set/);
});

test('pattern, type, and length errors read as sentences', () => {
    assert.match(
        formatAjvError({
            keyword: 'pattern',
            instancePath: '/name',
            params: { pattern: '^[a-z]' },
        }),
        /\/name: must match \^\[a-z\]/,
    );
    assert.match(
        formatAjvError({ keyword: 'type', instancePath: '/name', params: { type: 'string' } }),
        /must be a string/,
    );
    assert.match(
        formatAjvError({
            keyword: 'maxLength',
            instancePath: '/description',
            params: { limit: 1024 },
        }),
        /at most 1024/,
    );
});

test('oneOf fan-out collapses to a single message', () => {
    const errors = [
        { keyword: 'oneOf', instancePath: '/globs', params: {} },
        { keyword: 'type', instancePath: '/globs', params: { type: 'string' } },
        { keyword: 'type', instancePath: '/globs', params: { type: 'array' } },
    ];
    const deduped = dedupeErrors(errors);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0].keyword, 'oneOf');
});

test('dedupeErrors removes exact repeats but keeps distinct problems', () => {
    const errors = [
        { keyword: 'required', instancePath: '', params: { missingProperty: 'name' } },
        { keyword: 'required', instancePath: '', params: { missingProperty: 'name' } },
        { keyword: 'required', instancePath: '', params: { missingProperty: 'description' } },
    ];
    assert.equal(dedupeErrors(errors).length, 2);
});
