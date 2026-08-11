import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAuthLoginViewData } from '../src/auth_login_view.js';
import {
  buildBrandingCss,
  brandingOverrideToPartial,
  mergeBranding,
  mergePanelBranding,
  resolveBranding,
  resolveGoogleFont,
} from '../src/shamar/branding.js';

describe('resolveGoogleFont', () => {
  it('builds a CSS2 URL and font stack from a family name', () => {
    const resolved = resolveGoogleFont('DM Sans');
    assert.equal(
      resolved.fontUrl,
      'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
    );
    assert.match(resolved.fontFamily, /^"DM Sans",/);
  });

  it('supports custom weights and italics', () => {
    const resolved = resolveGoogleFont({
      family: 'Inter',
      weights: [400, 700],
      italic: true,
      display: 'optional',
    });
    assert.equal(
      resolved.fontUrl,
      'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,400;1,700&display=optional',
    );
  });
});

describe('resolveBranding googleFont', () => {
  it('applies googleFont when fontFamily/fontUrl are omitted', () => {
    const branding = resolveBranding({ name: 'Admin', googleFont: 'Source Sans 3' });
    assert.equal(branding.brandName, 'Admin');
    assert.match(branding.fontFamily, /^"Source Sans 3",/);
    assert.match(branding.fontUrl ?? '', /fonts\.googleapis\.com/);
    assert.equal(branding.fontPreconnect, true);
  });

  it('lets explicit fontFamily and fontUrl win', () => {
    const branding = resolveBranding({
      googleFont: 'Inter',
      fontFamily: 'Georgia, serif',
      fontUrl: 'https://example.com/fonts.css',
    });
    assert.equal(branding.fontFamily, 'Georgia, serif');
    assert.equal(branding.fontUrl, 'https://example.com/fonts.css');
    assert.equal(branding.fontPreconnect, false);
  });
});

describe('mergePanelBranding', () => {
  it('keeps global colors and fonts when a panel only overrides the name', () => {
    const merged = mergePanelBranding(
      {
        name: 'Shamar Playground',
        primaryColor: '#f1511b',
        accentColor: '#286291',
        googleFont: { family: 'Poppins', weights: [400, 700, 800] },
      },
      { name: 'Admin' },
    );
    assert.equal(merged?.name, 'Admin');
    assert.equal(merged?.primaryColor, '#f1511b');
    assert.equal(merged?.accentColor, '#286291');
    const branding = resolveBranding(merged);
    assert.match(branding.fontFamily, /^"Poppins",/);
    assert.match(buildBrandingCss(branding), /--color-shamar-brand-panel:/);
    assert.match(buildBrandingCss(branding), /--color-shamar-top-accent:/);
  });

  it('applies logoHeight from panel branding', () => {
    const branding = resolveBranding({ name: 'Admin', logoHeight: 40 });
    assert.equal(branding.logoHeight, '40px');
    assert.match(buildBrandingCss(branding), /--shamar-logo-height:\s*40px/);
  });

  it('respects brandDisplay logo / name / both', () => {
    const both = resolveBranding({
      name: 'Admin',
      logo: '/logo.svg',
      brandDisplay: 'both',
    });
    assert.equal(both.showLogo, true);
    assert.equal(both.showBrandName, true);

    const logoOnly = resolveBranding({
      name: 'Admin',
      logo: '/logo.svg',
      brandDisplay: 'logo',
    });
    assert.equal(logoOnly.showLogo, true);
    assert.equal(logoOnly.showBrandName, false);

    const nameOnly = resolveBranding({
      name: 'Admin',
      logo: '/logo.svg',
      brandDisplay: 'name',
    });
    assert.equal(nameOnly.showLogo, false);
    assert.equal(nameOnly.showBrandName, true);

    const logoFallback = resolveBranding({
      name: 'Admin',
      brandDisplay: 'logo',
    });
    assert.equal(logoFallback.showLogo, false);
    assert.equal(logoFallback.showBrandName, true);
  });

  it('keeps panel brandDisplay when override omits it', () => {
    const panel = resolveBranding({
      name: 'Admin',
      brandDisplay: 'name',
    });
    const merged = mergeBranding(
      panel,
      brandingOverrideToPartial({
        logo: '/logo.svg',
      }),
    );
    assert.equal(merged.brandDisplay, 'name');
    assert.equal(merged.showLogo, false);
    assert.equal(merged.showBrandName, true);
    assert.equal(merged.logoUrl, '/logo.svg');
  });
});

describe('buildAuthLoginViewData', () => {
  it('mirrors admin branding tokens for the login view', async () => {
    const data = await buildAuthLoginViewData({
      branding: {
        name: 'Acme',
        primaryColor: '#0ea5e9',
        accentColor: '#334155',
        googleFont: 'DM Sans',
      },
      auth: { loginMode: 'both' },
    });
    assert.equal(data.brandName, 'Acme');
    assert.equal(data.loginMode, 'both');
    assert.equal(data.branding.primaryColor, '#0ea5e9');
    assert.match(data.branding.fontFamily, /^"DM Sans",/);
    assert.match(data.brandingCss, /--color-primary-500:\s*#0ea5e9/);
    assert.match(data.brandingCss, /--shamar-font-family:/);
    assert.match(data.loginSubtitle, /directory or local/i);
    assert.equal(data.loginFooter, '');
  });

  it('uses configured login subtitle and footer', async () => {
    const data = await buildAuthLoginViewData({
      auth: {
        loginMode: 'ldap',
        login: {
          subtitle: 'Use your campus account',
          footer: 'Contact ICT if you cannot sign in.',
          usernameLabel: 'Staff ID',
          usernamePlaceholder: 'jdoe',
        },
      },
    });
    assert.equal(data.loginSubtitle, 'Use your campus account');
    assert.equal(data.loginFooter, 'Contact ICT if you cannot sign in.');
    assert.equal(data.loginUsernameLabel, 'Staff ID');
    assert.equal(data.loginUsernamePlaceholder, 'jdoe');
  });
});
