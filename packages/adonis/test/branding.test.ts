import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAuthLoginViewData } from '../src/auth_login_view.js';
import {
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

describe('buildAuthLoginViewData', () => {
  it('mirrors admin branding tokens for the login view', () => {
    const data = buildAuthLoginViewData({
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

  it('uses configured login subtitle and footer', () => {
    const data = buildAuthLoginViewData({
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
