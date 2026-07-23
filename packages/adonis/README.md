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
| `ldapts` `>=7` | LDAP login (`auth.loginMode` `ldap` / `both`) |

Workspace packages pulled in automatically: `@shamar/core`, `@shamar/cherubim`, `@shamar/lucid`, `@shamar/mongoose`.

## Configure

```bash
node ace configure @shamar/adonis
```

You choose **Lucid** or **Mongoose**, then whether to publish the opinionated login page. Codemods then:

1. Register `@shamar/adonis/provider` and `@shamar/adonis/commands` in `adonisrc.ts`
2. Write `config/shamar.ts` from the package stub
3. Optionally publish `components/layouts/auth.edge` + `pages/auth/login.edge`

Your app still owns the database connection (Lucid provider or `mongoose.connect`).

### Publish auth views later

```bash
node ace shamar:publish-auth
# overwrite without prompts:
node ace shamar:publish-auth --force
```

Published views are host-owned — edit freely after publishing. Re-running asks for confirmation before overwriting.

Pass branding into the login view with `buildAuthLoginViewData(shamarConfig)` so fonts/colors match the admin shell:

```ts
import { buildAuthLoginViewData } from '@shamar/adonis'
import shamarConfig from '#config/shamar'

return view.render('pages/auth/login', buildAuthLoginViewData(shamarConfig))
```

Optional login copy (`auth.login`) — subtitle under the brand, footer under the form (hidden when empty):

```ts
auth: {
  loginMode: 'both',
  login: {
    subtitle: 'Sign in with your campus account',
    footer: 'Need help? Contact ICT Support.', // omit or '' to hide
    usernameLabel: 'Staff username',
    usernamePlaceholder: 'jdoe or jdoe@strathmore.edu',
  },
}
```

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
    // .allowUsersWithoutRoles() // opt in: empty role/permission users may enter
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

## REST + OpenAPI docs

Install [`@shamar/rest`](../rest) and register its provider after Shamar:

```ts
// adonisrc.ts
() => import('@shamar/adonis/provider'),
() => import('@shamar/rest/provider'),
```

```ts
// config/shamar.ts
rest: {
  openapi: { title: 'My API', version: '1.0.0' },
},
```

Then open `/api/shamar/docs` (Scalar) and `/api/shamar/openapi.json`.

## Config reference

`defineConfig` accepts:

| Key | Description |
|-----|-------------|
| `orm` | `'lucid'` \| `'mongoose'` (default Lucid). Panels may override. |
| `panels` | Array of `panel(id).path(…).discoverResources(…).branding(…)` |
| `branding` | Default branding inherited by panels |

#### Branding

```ts
branding: {
  name: 'Admin',
  primaryColor: '#f1511b',
  accentColor: '#286291',
  // Load a Google Font and apply it to the admin UI:
  googleFont: 'DM Sans',
  // Or with options:
  // googleFont: { family: 'Inter', weights: [400, 500, 600, 700], italic: true },
  // Manual override (skips auto URL/stack from googleFont when set):
  // fontFamily: '"DM Sans", system-ui, sans-serif',
  // fontUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans&display=swap',
}
```

Panel-level `.branding({ googleFont: '…' })` overrides the default.
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
  // Password / LDAP login (host SessionController calls resolvePasswordLogin)
  loginMode: 'both',            // local | ldap | both (LDAP first, then local)
  ldap: {
    // existing (default): AD users must already exist locally with externalId sync UID
    // create: auto-provision local users on first successful LDAP bind
    provisioning: 'existing',
    domains: [
      {
        id: 'corp',
        url: 'ldaps://dc.corp.example',
        bindDn: 'cn=svc,dc=corp,dc=example',
        bindPassword: '…',
        searchBase: 'dc=corp,dc=example',
        searchFilter: '(uid={{username}})',
        emailDomains: ['corp.example'],
        netbios: 'CORP',
        groupRoleMap: { 'CN=Admins,OU=Groups,DC=corp': 'adminRoleId' },
        timeoutMs: 5_000,           // ldapts operation timeout (default 10_000)
        connectTimeoutMs: 5_000,    // optional; defaults to timeoutMs
      },
    ],
  },
}
```

Install optional peer `ldapts` when enabling LDAP. Helpers: `resolvePasswordLogin`, `createLdaptsDirectoryClient`, `authenticateLdap`.

| `loginMode` | Behavior |
|-------------|----------|
| `local` | Local passwords only (default when no domains) |
| `ldap` | LDAP directories only |
| `both` | Try LDAP domains first; fall back to local on miss |

| `ldap.provisioning` | Behavior |
|---------------------|----------|
| `existing` (default) | Directory bind must match a pre-synced local user (`externalId`) |
| `create` | Upsert local users on first LDAP login |

Multi-domain: prefer domains matching `user@email.domain` / `NETBIOS\user`, then remaining domains in order.

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
