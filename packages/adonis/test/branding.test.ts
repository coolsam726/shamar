import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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
