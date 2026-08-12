import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mediaPublicUrl,
  normalizeMediaVisibility,
  resolveMediaFileUrl,
} from '../src/shamar/media-url.js';

describe('media-url helpers', () => {
  it('normalizes visibility and builds public/private URLs', () => {
    assert.equal(normalizeMediaVisibility('public'), 'public');
    assert.equal(normalizeMediaVisibility('nope'), 'private');
    assert.equal(mediaPublicUrl('abc'), '/media/abc');
    assert.equal(
      resolveMediaFileUrl(
        { id: '1', visibility: 'public' },
        { panelBasePath: '/admin', publicPath: '/media' },
      ),
      '/media/1',
    );
    assert.equal(
      resolveMediaFileUrl(
        { id: '1', visibility: 'private' },
        { panelBasePath: '/admin', publicPath: '/media' },
      ),
      '/admin/media/files/1/raw',
    );
  });
});
