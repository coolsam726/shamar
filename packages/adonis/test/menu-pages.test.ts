import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeNavigationGroups } from '../src/shamar/menu.js';

describe('mergeNavigationGroups', () => {
  it('merges page items into resource groups and sorts', () => {
    const groups = mergeNavigationGroups(
      [
        {
          name: 'Settings',
          items: [{ slug: 'preferences', label: 'Preferences', navigationSort: 10 }],
        },
        {
          name: 'Content',
          items: [{ slug: 'products', label: 'Products', navigationSort: 5 }],
        },
      ],
      [
        {
          slug: 'settings',
          label: 'Settings',
          navigationGroup: 'Settings',
          navigationSort: 1,
        },
        {
          slug: 'product-catalog',
          label: 'Product catalog',
          navigationGroup: 'Catalog',
          navigationSort: 1,
        },
      ],
    );

    const settings = groups.find((g) => g.name === 'Settings');
    assert.ok(settings);
    assert.deepEqual(
      settings!.items.map((i) => i.slug),
      ['settings', 'preferences'],
    );

    const catalog = groups.find((g) => g.name === 'Catalog');
    assert.ok(catalog);
    assert.equal(catalog!.items[0]?.slug, 'product-catalog');
  });
});
