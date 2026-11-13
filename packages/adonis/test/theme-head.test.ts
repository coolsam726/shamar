import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { HarborTheme, ShamarTheme, TAILWIND_CDN_SCRIPT, themeAsset } from '@shamar/core';
import { resolveThemeHead } from '../src/shamar/theme-head.js';

describe('resolveThemeHead', () => {
  it('links a plain stylesheet without runtime when useTailwind is off', () => {
    const theme = new (class extends ShamarTheme {
      override stylesheet() {
        return '/css/midnight.css';
      }
    })();
    const head = resolveThemeHead(theme, { basePath: '/admin' });
    assert.equal(head.runtime, false);
    assert.equal(head.tailwindSource, 'none');
    assert.equal(head.stylesheetHref, '/css/midnight.css');
    assert.equal(head.runtimeHeadHtml, '');
    assert.equal(head.revealHtml, '');
    assert.equal(head.tailwindScriptSrc, '/admin/assets/tailwind.js');
  });

  it('emits hold + local runtime + reveal when useTailwind is on', () => {
    const theme = new (class extends ShamarTheme {
      override useTailwind() {
        return true;
      }
      override stylesheet() {
        return '/css/midnight.css';
      }
      override googleFonts() {
        return ['Figtree'];
      }
    })();
    const head = resolveThemeHead(theme, { basePath: '/admin' });
    assert.equal(head.runtime, true);
    assert.equal(head.tailwindSource, 'local');
    assert.equal(head.stylesheetHref, undefined);
    assert.match(head.runtimeHeadHtml, /shamar-theme-pending/);
    assert.match(head.runtimeHeadHtml, /text\/tailwindcss/);
    assert.match(head.runtimeHeadHtml, /\/admin\/assets\/tailwind\.js/);
    assert.match(head.runtimeHeadHtml, /data-shamar-tailwind-href="\/css\/midnight\.css"/);
    assert.match(head.revealHtml, /data-shamar-theme-reveal/);
    assert.match(head.fontUrl!, /Figtree/);
  });

  it('falls back to CDN Tailwind when compiled asset is missing in development', () => {
    const root = mkdtempSync(join(tmpdir(), 'shamar-head-'));
    try {
      mkdirSync(join(root, 'resources/css'), { recursive: true });
      writeFileSync(join(root, 'resources/css/demo.css'), '.dev-only { color: red; }');
      const theme = new (class extends ShamarTheme {
        override id() {
          return 'demo';
        }
        override stylesheet() {
          return themeAsset('css/demo.css');
        }
      })();
      const head = resolveThemeHead(theme, {
        basePath: '',
        appRoot: root,
        env: { NODE_ENV: 'development' },
      });
      assert.equal(head.runtime, true);
      assert.equal(head.tailwindSource, 'cdn');
      assert.equal(head.tailwindScriptSrc, TAILWIND_CDN_SCRIPT);
      assert.match(head.runtimeHeadHtml, /cdn\.jsdelivr\.net\/npm\/@tailwindcss\/browser@4\.3\.5/);
      assert.match(head.runtimeHeadHtml, /data-shamar-theme-sheet/);
      assert.match(head.runtimeHeadHtml, /\.dev-only/);
      assert.doesNotMatch(head.runtimeHeadHtml, /data-shamar-tailwind-href/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws in production when compiled asset is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'shamar-head-prod-'));
    try {
      const theme = new (class extends ShamarTheme {
        override id() {
          return 'demo';
        }
        override stylesheet() {
          return themeAsset('css/demo.css');
        }
      })();
      assert.throws(
        () =>
          resolveThemeHead(theme, {
            appRoot: root,
            env: { NODE_ENV: 'production' },
          }),
        /not compiled|CDN Tailwind fallback is development-only/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('links HarborTheme compiled stylesheet when public file exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'shamar-harbor-'));
    try {
      mkdirSync(join(root, 'public/css'), { recursive: true });
      writeFileSync(join(root, 'public/css/harbortheme.css'), '/* compiled */');
      const head = resolveThemeHead(new HarborTheme(), {
        basePath: '/admin',
        appRoot: root,
        env: { NODE_ENV: 'production' },
      });
      assert.equal(head.runtime, false);
      assert.equal(head.tailwindSource, 'compiled');
      assert.equal(head.stylesheetHref, '/css/harbortheme.css');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
