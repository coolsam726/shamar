import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { panel } from '@shamar/core';
import { discoverPanelProviders, withDiscoveredPanels } from '../src/discover_panels.js';

describe('panel classes', () => {
  it('discovers app/panels/*/panel.ts and replaces a config panel with the same id', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shamar-panels-'));
    const file = join(root, 'app/panels/admin/panel.ts');
    await mkdir(join(root, 'app/panels/admin'), { recursive: true });
    await writeFile(
      file,
      `export default class AdminPanel {
        panel() {
          return { id: 'admin', path: '/from-class', resources: [], pages: [] }
        }
      }
`,
    );
    try {
      const classes = await discoverPanelProviders(root);
      assert.equal(classes.length, 1);
      const merged = await withDiscoveredPanels(
        {
          panels: [panel('admin').path('/from-config'), panel('docs').path('/docs')],
        },
        root,
      );
      const ids = (merged.panels ?? []).map((entry) =>
        typeof (entry as { build?: () => { id: string } }).build === 'function'
          ? (entry as { build: () => { id: string; path: string } }).build()
          : (entry as { id: string; path: string }),
      );
      assert.equal(ids[0]?.id, 'admin');
      assert.equal(ids[0]?.path, '/from-class');
      assert.equal(ids[1]?.id, 'docs');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
