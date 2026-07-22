# @shamar/adonis

AdonisJS **service provider** for Shamar — panels, routes, controllers, Edge views, CSS assets, and Cherubim auth wiring.

## Install

```bash
pnpm add @shamar/adonis
# pick one persistence stack:
pnpm add @adonisjs/lucid   # SQL
# or
pnpm add mongoose          # MongoDB
```

### Peer dependencies

| Peer | Required when |
|------|----------------|
| `@adonisjs/core` `>=6` | Always |
| `@adonisjs/lucid` `>=21` | `orm: 'lucid'` |
| `mongoose` `>=8` | `orm: 'mongoose'` |
| `edge.js` `>=6` | Rendering Edge views (usually already present) |

Workspace packages pulled in automatically: `@shamar/core`, `@shamar/cherubim`, `@shamar/lucid`, `@shamar/mongoose`.

## Configure

```bash
node ace configure @shamar/adonis
```

You choose **Lucid** or **Mongoose**. Codemods then:

1. Register `@shamar/adonis/provider` in `adonisrc.ts`
2. Write `config/shamar.ts` from the package stub

Your app still owns the database connection (Lucid provider or `mongoose.connect`).

## Quick start

```ts
// config/shamar.ts
import { defineConfig, panel } from '@shamar/adonis'

export default defineConfig({
  orm: 'lucid', // or 'mongoose'
  branding: { name: 'Admin' },
  panels: [
    panel('admin')
      .path('/admin')
      .discoverResources('app/resources/admin'),
  ],
})
```

```ts
// app/resources/admin/product_resource.ts
import { Resource, form, table, TextInput, TextColumn } from '@shamar/core'
import Product from '#models/product'

export default class ProductResource extends Resource {
  static model = Product
  static slug = 'products'
  static label = 'Products'

  static form() {
    return form((f) => {
      f.schema([
        TextInput.make('name').required(),
        TextInput.make('sku').required().unique(),
      ])
    })
  }

  static table() {
    return table((t) => {
      t.schema([
        TextColumn.make('name').sortable().searchable(),
        TextColumn.make('sku').sortable().searchable(),
      ])
    })
  }
}
```

Open `/admin` after starting the server. Single-panel apps can still use legacy top-level `path` + `resources` (normalized into one default panel).

## Config reference

`defineConfig` accepts:

| Key | Description |
|-----|-------------|
| `orm` | `'lucid'` \| `'mongoose'` (default Lucid). Panels may override. |
| `panels` | Array of `panel(id).path(…).discoverResources(…).branding(…)` |
| `branding` | Default branding inherited by panels |
| `apiPrefix` | JSON API prefix (default `/api/shamar`) |
| `adapter` | Escape hatch: custom `DataAdapter` (or factory) for all panels |
| `auth` | Session / API / policy wiring (see below) |

### Auth

```ts
auth: {
  guard: 'web',                 // Adonis auth guard (default web)
  loginPath: '/login',
  logoutPath: '/logout',
  required: true,               // default true when guard or resolveUser is set
  strictPermissions: true,      // Cherubim strict mode
  superUser: (user) => user.permissions?.includes('*'),
  roleResolver: { resolveRolePermissions },
  policies: { posts: instancePolicy(PostPolicy, 'posts') },
  resolveUser: async (ctx) => { /* map session → CherubimUser */ },
  apiKeys: {
    resolve: (plainText, ctx) => resolveFromApiKey(plainText, store, { loadUser }),
    protectApi: true,           // RequireApiKeyMiddleware on /api/shamar
    intersectGatewayAbilities: true,
  },
}
```

Full RBAC, policies, and credential details: [`@shamar/cherubim`](../cherubim).

### API keys admin UI

```ts
import { ApiKeyResource } from '@shamar/adonis'
import ApiKey from '#models/api_key'

export default class AppApiKeyResource extends ApiKeyResource {
  static override model = ApiKey
}
```

Register under a panel’s `discoverResources` folder (or `.resources([...])`).

### Middleware export

Apply API-key checks on selected routes without `protectApi`:

```ts
import router from '@adonisjs/core/services/router'

const middleware = router.named({
  shamarApiKey: () => import('@shamar/adonis/require_api_key_middleware'),
})

router
  .group(() => {
    router.get('/mobile/products', /* … */)
  })
  .use([middleware.shamarApiKey()])
```

## Assets & views

Shipped with the package (no copy step required for defaults):

- Edge templates under `resources/views/shamar`
- Admin CSS under `assets/` (built via `pnpm build:css` in this package)

Override branding colors via `branding.primaryColor` / `accentColor` in config.

## Package exports

| Export | Purpose |
|--------|---------|
| `@shamar/adonis` | `defineConfig`, `panel`, `ApiKeyResource`, runtime helpers |
| `@shamar/adonis/provider` | Service provider |
| `@shamar/adonis/require_api_key_middleware` | Named middleware |

## Related

- [`@shamar/core`](../core) — Resource DSL
- [`@shamar/cherubim`](../cherubim) — policies, Authorizer, API keys
- [`@shamar/lucid`](../lucid) / [`@shamar/mongoose`](../mongoose) — adapters
- [Playground](../../apps/playground) — Mongoose dual-panel demo
