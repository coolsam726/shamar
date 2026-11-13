import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  DefaultTheme,
  HarborTheme,
  ShamarTheme,
  assertCompiledThemeOrDevFallback,
  brandColorScaleCss,
  deriveDarkColor,
  explicitOrDerivedDark,
  finishCompiledCss,
  isThemeAsset,
  panel,
  requiredPartialMarkers,
  resolveDarkBrandColor,
  resolveThemeChrome,
  resolveThemePartials,
  resolveThemeTailwindSource,
  sanitizeThemeClasses,
  themeAsset,
  themeAssetPublicUrl,
  themeCompileSource,
  themeUsesRuntime,
} from '../src/index.js';

describe('ShamarTheme / HarborTheme', () => {
  it('registers on the panel builder', () => {
    const theme = new HarborTheme();
    const config = panel('admin').theme(theme).build();
    assert.equal(config.theme, theme);
    assert.equal(config.theme?.id(), 'harbor');
  });

  it('points stylesheet at themeAsset(css/harbortheme.css)', () => {
    const sheet = new HarborTheme().stylesheet();
    assert.ok(sheet && isThemeAsset(sheet));
    assert.equal(themeAssetPublicUrl(sheet!), '/css/harbortheme.css');
  });

  it('exposes chrome hooks as sanitized classes', () => {
    const chrome = resolveThemeChrome(new HarborTheme());
    assert.equal(chrome.sidebar, 'harbor-sidebar');
    assert.equal(chrome.brand, 'harbor-brand');
    assert.equal(chrome.panel, '');
  });

  it('drops illegal class tokens', () => {
    assert.equal(sanitizeThemeClasses('ok bad"token still-ok'), 'ok still-ok');
  });
});

describe('dark brand color resolution', () => {
  it('derives a readable dark shade while keeping hue', () => {
    assert.equal(deriveDarkColor('#ff2a00'), '#ff6647');
  });

  it('prefers panel dark, then theme hook, then derived light', () => {
    assert.equal(explicitOrDerivedDark('#112233', '#abcdef', '#ff2a00'), '#112233');
    assert.equal(explicitOrDerivedDark(null, '#abcdef', '#ff2a00'), '#abcdef');
    assert.equal(explicitOrDerivedDark(null, null, '#ff2a00'), '#ff6647');
    assert.equal(explicitOrDerivedDark(null, null, null), null);
  });

  it('falls back to theme token when panel set no primary', () => {
    const tokens = new DefaultTheme().tokens();
    assert.equal(
      resolveDarkBrandColor(null, null, null, tokens.darkPrimary),
      tokens.darkPrimary,
    );
  });
});

describe('themeAsset', () => {
  it('maps resources paths to public URLs', () => {
    const token = themeAsset('css/midnight.css');
    assert.equal(themeAssetPublicUrl(token), '/css/midnight.css');
  });
});

describe('themeUsesRuntime / compile helpers', () => {
  it('turns on for useTailwind and missing compiled assets in development', () => {
    assert.equal(themeUsesRuntime(new DefaultTheme()), false);
    const tw = new (class extends ShamarTheme {
      override useTailwind() {
        return true;
      }
    })();
    assert.equal(themeUsesRuntime(tw), true);
    assert.equal(resolveThemeTailwindSource(tw), 'local');

    const root = mkdtempSync(join(tmpdir(), 'shamar-theme-'));
    try {
      const assetTheme = new (class extends ShamarTheme {
        override id() {
          return 'demo';
        }
        override stylesheet() {
          return themeAsset('css/demo.css');
        }
      })();
      assert.equal(themeUsesRuntime(assetTheme, root, { NODE_ENV: 'development' }), true);
      assert.equal(resolveThemeTailwindSource(assetTheme, root, { NODE_ENV: 'development' }), 'cdn');
      assert.doesNotThrow(() =>
        assertCompiledThemeOrDevFallback(assetTheme, root, { NODE_ENV: 'development' }),
      );
      assert.throws(
        () => assertCompiledThemeOrDevFallback(assetTheme, root, { NODE_ENV: 'production' }),
        /not compiled|CDN Tailwind fallback is development-only/,
      );
      assert.equal(themeUsesRuntime(assetTheme, root, { NODE_ENV: 'production' }), false);

      mkdirSync(join(root, 'public/css'), { recursive: true });
      writeFileSync(join(root, 'public/css/demo.css'), '/* ok */');
      assert.equal(themeUsesRuntime(assetTheme, root, { NODE_ENV: 'development' }), false);
      assert.equal(resolveThemeTailwindSource(assetTheme, root, { NODE_ENV: 'production' }), 'compiled');
      assert.doesNotThrow(() =>
        assertCompiledThemeOrDevFallback(assetTheme, root, { NODE_ENV: 'production' }),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('builds compile source with brand theme tokens', () => {
    const src = themeCompileSource('.x { @apply bg-primary-500; }\n', []);
    assert.match(src, /@import "tailwindcss\/theme"/);
    assert.match(src, /--color-primary-500/);
    const finished = finishCompiledCss('.x{color:red}');
    assert.match(finished, /--ff-primary-500/);
    assert.match(brandColorScaleCss(), /\.shamar-panel/);
  });
});

describe('theme partials', () => {
  it('rejects missing markers and fills valid HTML', () => {
    const bad = new (class extends ShamarTheme {
      override partial(slot: string) {
        return slot === 'sidebar' ? '<aside></aside>' : null;
      }
    })();
    assert.throws(() => resolveThemePartials(bad), /missing markers/);

    const good = new (class extends ShamarTheme {
      override partial(slot: string) {
        if (slot !== 'topbar') return null;
        return `<header class="shamar-topbar"><!-- ff-hook:topbar.start -->X<!-- ff-hook:topbar.end --></header>`;
      }
    })();
    const partials = resolveThemePartials(good);
    assert.equal(partials.topbar, '<header class="shamar-topbar">X</header>');
    assert.ok(requiredPartialMarkers('sidebar').some((m) => m.includes('sidebar.start')));
  });
});
