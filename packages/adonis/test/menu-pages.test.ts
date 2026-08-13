import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ResourceRegistry } from '@shamar/core';
import { mergeNavigationGroups } from '../src/shamar/menu.js';
import { navigationGroups } from '../src/shamar/view-context.js';

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

  it('preserves group icons when merging', () => {
    const groups = mergeNavigationGroups(
      [{ name: 'Media Library', icon: 'folder', items: [{ slug: 'media', label: 'Media Library' }] }],
      [],
    );
    assert.equal(groups[0]?.icon, 'folder');
  });
});

describe('navigationGroups mediaNav', () => {
  const emptyRegistry = new ResourceRegistry([]);

  it('places media as its own top-level root when navigationGroup is omitted', () => {
    const groups = navigationGroups(emptyRegistry, {
      mediaNav: {
        label: 'Media Library',
        navigationSort: 50,
        navigationIcon: 'folder',
      },
    });

    const media = groups.find((g) => g.name === 'Media Library');
    assert.ok(media);
    assert.equal(media!.icon, 'folder');
    assert.equal(media!.items.length, 1);
    assert.equal(media!.items[0]?.slug, 'media');
    assert.ok(!groups.some((g) => g.name === 'System'));
  });

  it('nests media under an explicit navigationGroup', () => {
    const groups = navigationGroups(emptyRegistry, {
      mediaNav: {
        label: 'Files',
        navigationGroup: 'System',
        navigationSort: 50,
        navigationIcon: 'folder',
      },
    });

    const system = groups.find((g) => g.name === 'System');
    assert.ok(system);
    assert.equal(system!.items[0]?.slug, 'media');
    assert.equal(system!.items[0]?.icon, 'folder');
    assert.ok(!groups.some((g) => g.name === 'Files'));
  });

  it('treats empty-string navigationGroup as top-level', () => {
    const groups = navigationGroups(emptyRegistry, {
      mediaNav: {
        label: 'Files',
        navigationGroup: '   ',
        navigationSort: 10,
        navigationIcon: 'photo',
      },
    });

    const files = groups.find((g) => g.name === 'Files');
    assert.ok(files);
    assert.equal(files!.icon, 'photo');
  });
});
