import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { actions, defaultActions } from '@shamar/core';
import { partitionRowActions } from '../src/shamar/resource-actions.js';

describe('row action grouping', () => {
  it('defaults row actions into the menu partition with icons', () => {
    const row = defaultActions().filter((action) => action.placement === 'row');
    const parts = partitionRowActions(row);
    assert.equal(parts.inline.length, 0);
    assert.deepEqual(
      parts.menu.map((action) => action.name),
      ['view', 'edit', 'delete'],
    );
    assert.deepEqual(
      parts.menu.map((action) => action.icon),
      ['eye', 'pencil', 'trash'],
    );
  });

  it('puts ungrouped actions inline', () => {
    const row = actions((a) => {
      a.view().ungrouped();
      a.edit();
      a.delete();
      a.row('approve', 'Approve').ungrouped();
    }).filter((action) => action.placement === 'row');

    const parts = partitionRowActions(row);
    assert.deepEqual(
      parts.inline.map((action) => action.name),
      ['view', 'approve'],
    );
    assert.deepEqual(
      parts.menu.map((action) => action.name),
      ['edit', 'delete'],
    );
  });
});
