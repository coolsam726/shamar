import { buildPermissionCatalog, permissionKey } from '../src/permissions.js';
import { Resource } from '../src/resource.js';
import { ResourceRegistry } from '../src/registry.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

class ArticleResource extends Resource {
  static override slug = 'articles';
  static override label = 'Articles';
  static override permissions() {
    return [
      { name: 'approve', label: 'Approve articles' },
      'publish',
    ];
  }
}

describe('buildPermissionCatalog', () => {
  it('includes CRUD, wildcard, and custom abilities per resource', () => {
    const registry = new ResourceRegistry([ArticleResource]);
    const entries = buildPermissionCatalog(registry);
    const names = entries.map((entry) => entry.name);

    assert.ok(names.includes('*'));
    assert.ok(names.includes(permissionKey('articles', 'viewAny')));
    assert.ok(names.includes(permissionKey('articles', '*')));
    assert.ok(names.includes(permissionKey('articles', 'approve')));
    assert.ok(names.includes(permissionKey('articles', 'publish')));

    const approve = entries.find((entry) => entry.name === 'articles:approve');
    assert.equal(approve?.label, 'Approve articles');
    assert.equal(approve?.resource, 'articles');
    assert.equal(approve?.ability, 'approve');
  });
});
