# @shamar/cherubim

Authentication and access control for Shamar admin panels.

Cherubim follows the [Loom](https://github.com/coolsam726/nodeweaver) RBAC model: **users ↔ roles ↔ permissions** with **policy classes** for record-level rules (Laravel / Adonis style).

## Model

1. **Permissions** — string abilities: `products:viewAny`, `products:edit`, `products:*`, `*`
2. **Roles** — bundles of permissions, assigned via `user.roleIds`
3. **Policies** — `Policy` classes on `Resource.policy` (or `auth.policies`) for record rules + `scopeList`

`Resource.can*` hooks delegate to `Resource.policy` when set, otherwise `userHasPermission()`.

## Policy (Loom / Laravel)

```ts
import { Policy, ownedBy, can } from '@shamar/cherubim'
import type { ShamarUser } from '@shamar/core'

export class OrderPolicy extends Policy {
  static ownerField = 'createdById'

  static view(user: ShamarUser, record: Record<string, unknown>, slug = 'orders') {
    return can(user, 'orders:view') && ownedBy(user, record, 'createdById')
  }

  static edit(user: ShamarUser, record: Record<string, unknown>, slug = 'orders') {
    return can(user, 'orders:edit') && ownedBy(user, record, 'createdById')
  }

  static scopeList(user: ShamarUser) {
    if (can(user, '*') || can(user, 'orders:*')) return undefined
    return { equals: { createdById: user.id } }
  }
}

// app/resources/admin/order_resource.ts
export default class OrderResource extends Resource {
  static override slug = 'orders'
  static override policy = OrderPolicy
}
```

### Adonis instance policies

```ts
import { BasePolicy, instancePolicy } from '@shamar/cherubim'

export default class PostPolicy extends BasePolicy {
  update(user, post) {
    return this.allows(user, 'posts:edit') && post.userId === user.id
  }
}

// config/shamar.ts
auth: {
  policies: {
    posts: instancePolicy(PostPolicy, 'posts'),
  },
}
```

## Checks

```ts
import { Authorizer, can, userHasPermission, assertPolicy } from '@shamar/cherubim'

can(user, 'deals:export')                    // wildcard-aware
userHasPermission(user, 'deals', 'viewAny') // Loom helper
authorizer.canResource(ctx, ProductResource, 'update', record)
authorizer.assertResource(ctx, ProductResource, 'delete', record)
```

## Permissions assignment (ORM-agnostic)

Drop Loom-style permission checkboxes into a Role form once a permissions catalog exists:

```ts
import { PermissionsAssignment } from '@shamar/core'

// in RoleResource.form()
PermissionsAssignment.make('permissionIds')
```

**Contract (any ORM):**

1. Register a read-only `permissions` resource
2. Permission records expose `name`, `resource`, `ability`, and `label`
3. Role stores permission ids (`permissionIds` / `permission_ids`)
4. On boot, upsert via `buildPermissionCatalog(registry)` from `@shamar/core`

Both Lucid and Mongoose adapters enrich `search()` with `name` / `group` / `ability` so grouping and wildcard cascade work. Override `.relationship(...)` if your slug or title attribute differs.

## API credentials (PATs + machine keys)

| Kind | Principal | Abilities |
|------|-----------|-----------|
| **`pat`** | Owning user (roles/permissions) | Optional narrow; empty = full user access |
| **`machine`** | The key itself (`apikey:…`) | The key’s permissions (e.g. `products:*`, `*`) |

### Admin UI

`@shamar/adonis` ships an ORM-agnostic **`ApiKeyResource`**. Bind your model and register it:

```ts
import { ApiKeyResource } from '@shamar/adonis'
import ApiKey from '#models/api_key'

export default class AppApiKeyResource extends ApiKeyResource {
  static override model = ApiKey
}
```

Create via `/admin/api-keys/create` (normal Shamar form). Abilities are picked from the **permissions catalog** (`AbilitiesAssignment` — permission names, not free text). The plaintext secret is flashed once after create.

### Header recommendation

Prefer **two headers** when the API is gated by a machine key and endpoints still need a user:

| Header | Credential | Role |
|--------|------------|------|
| **`X-Api-Key`** | Machine key | Gateway — overall API access |
| **`Authorization: Bearer`** | PAT | User identity for endpoint RBAC |

Avoid `X-Authorization` (non-standard, easy to confuse with `Authorization`). Do not put both secrets in `Authorization` — HTTP effectively has one auth scheme per request.

```http
X-Api-Key: shm_machine_…
Authorization: Bearer shm_pat_…
```

Single-credential mode still works: Bearer **or** `X-Api-Key` alone (machine or PAT).

```ts
import {
  generateApiKey,
  resolveFromApiKey,
  type ApiKeyStore,
} from '@shamar/cherubim'

const { plainText, tokenHash, prefix } = generateApiKey()

// Machine key — mobile / devices / API gateway
await db.insert({ kind: 'machine', name: 'iOS', tokenHash, prefix, abilities: ['products:*'] })

// PAT — acts as a user
await db.insert({ kind: 'pat', name: 'CLI', userId, tokenHash, prefix, abilities: [] })

await resolveFromApiKey(plainText, store, { loadUser }) // dispatches by kind
```

```ts
auth: {
  apiKeys: {
    resolve: (plainText) => resolveFromApiKey(plainText, store, { loadUser }),
    // Opt-in: apply RequireApiKeyMiddleware to /api/shamar
    protectApi: true,
    // When both headers present, cap user permissions by the machine key (default true)
    intersectGatewayAbilities: true,
  },
  roleResolver: { resolveRolePermissions }, // applied for PATs + session
}
```

Or apply the middleware only on selected routes:

```ts
import router from '@adonisjs/core/services/router'

const middleware = router.named({
  shamarApiKey: () => import('@shamar/adonis/require_api_key_middleware'),
})

router
  .group(() => {
    router.get('/mobile/products', …)
  })
  .use([middleware.shamarApiKey()])
```

## Integration

`@shamar/adonis` wires Cherubim into panel routes and `AdminController`:

- `auth.guard`, `auth.resolveUser`, `auth.roleResolver`, `auth.apiKeys`, `auth.policies`
- Resource actions enforced on every admin/API handler
- Navigation filtered by `viewAny`
- `scopeList` applied to list queries and IDOR checks on show/edit/delete
