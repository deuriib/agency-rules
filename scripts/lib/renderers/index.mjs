import { renderAntigravity } from './antigravity.mjs';
import { renderPiAgent } from './pi-agent.mjs';
import { renderOhMyPi } from './oh-my-pi.mjs';
import { renderOpencode } from './opencode.mjs';

/** Maps `format` from tools.json → renderer function. */
export const renderers = {
  'md-yaml-trigger': renderAntigravity,
  'md-rules-dir': renderPiAgent,
  'md-or-mdc': renderOhMyPi,
  'md-plugin': renderOpencode,
};
