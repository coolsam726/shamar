import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path to the browser runtime (`wire.js`). Serve this file yourself, or let `registerWire` in `@shamar/adonis` serve it. */
export function wireClientPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../client/wire.js');
}

export { escapeAttr, escapeHtml } from './html.js';
export { applyUpdates, invokeMethod, type WireComponent, type WireEffects } from './component.js';
export { newComponentId, signSnapshot, verifySnapshot, type WireSnapshot } from './snapshot.js';
export { WireKernel, type WireDefinition, type WireEnvelope, type WireRequest } from './kernel.js';
