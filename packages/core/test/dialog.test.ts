import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ActionBuilder } from '../src/actions.js';
import { dialogPresentation, isDialogPageMode } from '../src/dialog.js';

describe('dialog presentation helpers', () => {
  it('detects dialog page modes', () => {
    assert.equal(isDialogPageMode('modal'), true);
    assert.equal(isDialogPageMode('sidebar'), true);
    assert.equal(isDialogPageMode('fullscreen'), true);
    assert.equal(isDialogPageMode('page'), false);
    assert.equal(isDialogPageMode(undefined), false);
  });

  it('normalizes presentation values', () => {
    assert.equal(dialogPresentation('sidebar'), 'sidebar');
    assert.equal(dialogPresentation('fullscreen'), 'fullscreen');
    assert.equal(dialogPresentation('modal'), 'modal');
    assert.equal(dialogPresentation('page'), 'modal');
    assert.equal(dialogPresentation(undefined), 'modal');
  });

  it('exposes Action presentation builders', () => {
    const actions = new ActionBuilder();
    actions.row('preview', 'Preview').url('/x').openInEmbed().asSidebar();
    actions.header('full', 'Full').url('/y').openInEmbed().asFullscreen();
    const built = actions.build();
    assert.equal(built[0]?.presentation, 'sidebar');
    assert.equal(built[1]?.presentation, 'fullscreen');
  });
});
