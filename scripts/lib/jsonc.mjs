/**
 * Read JSONC — JSON with comments and trailing commas.
 *
 * OpenCode accepts both formats, and a hand-maintained config is usually the
 * JSONC one. Two jobs need this: deciding whether a plugin is already
 * registered in a file the installer must not rewrite, and refusing to guess
 * when a file is neither format.
 *
 * The installer never writes JSONC back. Serializing it would drop every
 * comment and reformat the file, so a JSONC config that lacks the entry gets a
 * message naming the exact edit instead of a silent rewrite.
 */

/**
 * Remove `//` and block comments without touching string contents.
 *
 * A naive regex fails on the two cases that actually occur in configs: a URL in
 * a string (`"https://..."` looks like a line comment) and a `/*` inside a
 * description. Tracking strings and escapes is the only way to tell them apart.
 */
function stripComments(text) {
    let out = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            out += char;
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === '"') inString = false;
            continue;
        }

        if (char === '"') {
            inString = true;
            out += char;
            continue;
        }

        if (char === '/' && text[i + 1] === '/') {
            while (i < text.length && text[i] !== '\n') i++;
            // Keep the newline so a `//` comment between two tokens does not
            // glue them together.
            if (i < text.length) out += text[i];
            continue;
        }

        if (char === '/' && text[i + 1] === '*') {
            i += 2;
            while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
            i++;
            continue;
        }

        out += char;
    }

    return out;
}

/**
 * Drop a comma that is followed only by whitespace and a closing bracket.
 *
 * Scanned rather than matched: `,(\s*[}\]])` also fires inside a string, so
 * `{"a": "x,}"}` would lose a character that belongs to the value.
 */
function stripTrailingCommas(text) {
    let out = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            out += char;
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === '"') inString = false;
            continue;
        }

        if (char === '"') {
            inString = true;
            out += char;
            continue;
        }

        if (char === ',') {
            let next = i + 1;
            while (next < text.length && /\s/.test(text[next])) next++;
            if (text[next] === '}' || text[next] === ']') continue;
        }

        out += char;
    }

    return out;
}

/**
 * Parse a JSONC string. Throws the same `SyntaxError` `JSON.parse` would, so a
 * caller can try strict JSON first and fall back here without special casing.
 */
export function parseJsonc(text) {
    return JSON.parse(stripTrailingCommas(stripComments(text)));
}
