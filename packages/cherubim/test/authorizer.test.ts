import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Resource, userHasPermission } from '@shamar/core';
import {
  Authorizer,
  Policy,
  PolicyRegistry,
  can,
  covers,
  matchesPermission,
  ownedBy,
  permissionKey,
  toCherubimUser,
  ForbiddenError,
  authorizeResourceAction,
} from '../src/index.js';

// Test policy inline for locked items
class LockedItemPolicyTest extends Policy {
  static override edit(user: Parameters<typeof Policy.edit>[0], record: Record<string, unknown>, slug = 'locked-items') {
    return super.edit(user, record, slug) && !record.locked;
  }
  static override delete(user: Parameters<typeof Policy.delete>[0], record: Record<string, unknown>, slug = 'locked-items') {
    return super.delete(user, record, slug) && !record.locked;
  }
}

describe('permission matching (Loom)', () => {
  it('matches exact and wildcard grants', () => {
    const grants = ['products:viewAny', 'users:*'];
    assert.equal(matchesPermission(grants, 'products:viewAny'), true);
    assert.equal(matchesPermission(grants, 'users:create'), true);
    assert.equal(matchesPermission(grants, 'products:create'), false);
  });

  it('supports global and cross-resource wildcards', () => {
    assert.equal(can({ id: '1', name: 'A', permissions: ['*'] }, 'anything:here'), true);
    assert.equal(can({ id: '1', name: 'A', permissions: ['*:view'] }, 'orders:view'), true);
  });

  it('covers prefix wildcards', () => {
    assert.equal(covers('users:*', 'users:create'), true);
    assert.equal(covers('users:create', 'users:delete'), false);
  });

  it('checks userHasPermission', () => {
    const user = { id: '1', name: 'Editor', permissions: ['products:*'] };
    assert.equal(userHasPermission(user, 'products', 'edit'), true);
    assert.equal(userHasPermission(user, 'orders', 'view'), false);
  });
});

describe('Policy', () => {
  class LockedResource extends Resource {
    static override slug = 'locked-items';
    static override policy = LockedItemPolicyTest;
  }

  const admin = toCherubimUser({
    id: '1',
    name: 'Admin',
    permissions: ['locked-items:*'],
  });

  it('denies edit/delete on locked records', () => {
    assert.equal(authorizeResourceAction(LockedResource, 'update', admin, { locked: true }), false);
    assert.equal(authorizeResourceAction(LockedResource, 'delete', admin, { locked: false }), true);
  });

  it('ownedBy matches owner fields', () => {
    const user = { id: '42', name: 'Owner' };
    assert.equal(ownedBy(user, { createdById: '42' }), true);
    assert.equal(ownedBy(user, { userId: '99' }), false);
  });
});

describe('Authorizer', () => {
  class ProductResource extends Resource {
    static override slug = 'products';
  }

  const registry = new PolicyRegistry();
  const authorizer = new Authorizer({}, undefined, registry);

  const admin = toCherubimUser({
    id: '1',
    name: 'Admin',
    permissions: ['*'],
  });

  const editor = toCherubimUser({
    id: '2',
    name: 'Editor',
    permissions: ['products:viewAny', 'products:edit', 'products:create'],
  });

  const viewer = toCherubimUser({
    id: '3',
    name: 'Viewer',
    permissions: ['products:viewAny', 'products:view'],
  });

  it('checks string abilities via permissions', async () => {
    const ctx = { user: admin };
    assert.equal(await authorizer.can(ctx, permissionKey('products', 'create')), true);
    assert.equal(await authorizer.can(ctx, permissionKey('orders', 'create')), true);
  });

  it('enforces RBAC on resources via Resource.can*', () => {
    assert.equal(authorizer.canResource({ user: admin }, ProductResource, 'create'), true);
    assert.equal(authorizer.canResource({ user: editor }, ProductResource, 'create'), true);
    assert.equal(authorizer.canResource({ user: viewer }, ProductResource, 'create'), false);
  });

  it('denies when user has no permissions', () => {
    const openUser = toCherubimUser({ id: '4', name: 'Open' });
    assert.equal(authorizer.canResource({ user: openUser }, ProductResource, 'create'), false);
  });

  it('throws ForbiddenError on assertResource', () => {
    assert.throws(
      () => authorizer.assertResource({ user: viewer }, ProductResource, 'create'),
      ForbiddenError,
    );
  });

  it('supports super users', () => {
    const custom = new Authorizer({
      superUser: (user) => user.email === 'root@example.com',
    });
    const root = toCherubimUser({ id: '0', name: 'Root', email: 'root@example.com' });
    assert.equal(custom.canResource({ user: root }, ProductResource, 'delete'), true);
  });

  it('respects Resource.can* even for users with *', () => {
    class ReadonlyResource extends Resource {
      static override slug = 'permissions';
      static override canCreate() {
        return false;
      }
      static override canEdit() {
        return false;
      }
      static override canDelete() {
        return false;
      }
    }

    assert.equal(authorizer.canResource({ user: admin }, ReadonlyResource, 'viewAny'), true);
    assert.equal(authorizer.canResource({ user: admin }, ReadonlyResource, 'create'), false);
    assert.equal(authorizer.canResource({ user: admin }, ReadonlyResource, 'update'), false);
    assert.equal(authorizer.canResource({ user: admin }, ReadonlyResource, 'delete'), false);
  });
});
