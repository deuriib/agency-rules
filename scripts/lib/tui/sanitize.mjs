/**
 * The TUI's import point for the terminal trust boundary.
 *
 * The implementation moved to `lib/sanitize.mjs` once `install` and `convert`
 * needed it for their log lines: `tui` prints their output after the alternate
 * screen closes, so "the render path sanitizes" was never enough. This module
 * stays as the TUI's own name for it, and re-exports the same three names so
 * existing imports and tests are unchanged.
 */

export { REPLACEMENT, sanitize, sanitizeLine } from '../sanitize.mjs';
