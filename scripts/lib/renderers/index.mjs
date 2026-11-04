import { renderAntigravity } from './antigravity.mjs';
import { renderClaudeRules } from './claude-code.mjs';
import { renderCursor } from './cursor.mjs';
import { renderOhMyPi } from './oh-my-pi.mjs';
import { renderOpencode } from './opencode.mjs';
import { renderPiAgent } from './pi-agent.mjs';

/** Maps `format` from tools.json → renderer function. */
export const renderers = {
    'md-yaml-trigger': renderAntigravity,
    'md-rules-dir': renderPiAgent,
    'md-or-mdc': renderOhMyPi,
    'md-plugin': renderOpencode,
    'md-cursor-mdc': renderCursor,
    'md-claude-rules': renderClaudeRules,
};
