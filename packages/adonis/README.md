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

Pass branding into the login view with `await buildAuthLoginViewData(shamarConfig)` so fonts/colors match the admin shell:

```ts
import { buildAuthLoginViewData } from '@shamar/adonis'
import shamarConfig from '#config/shamar'

return view.render('pages/auth/login', await buildAuthLoginViewData(shamarConfig))
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
| `panels` | Array of `panel(id).path(…).discoverResources(…).discoverPages(…).branding(…)` |
| `branding` | Default branding inherited by panels |
| `media` | File Manager + FilePicker (see [Media library](#media-library)) |
| `apiPrefix` | JSON API prefix (default `/api/shamar`) |
| `adapter` | Escape hatch: custom `DataAdapter` (or factory) for all panels |
| `auth` | Session / API / policy wiring (see below) |

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

Panel-level `.branding({ name, primaryColor, accentColor, logo, logoHeight })` merges over the default — colors, logos, and fonts are inherited unless overridden.

Use `resolveBrandingOverrides` to overlay logos from a DB (global settings) at request time. Prefer panel config + a singleton Settings page over per-company logos.

#### Pages (Filament-style)

Custom panel pages live beside resources. Discover them with `.discoverPages('app/pages/admin')` (`*_page.ts` / `*Page.ts`).

**Single-purpose shortcuts** — `SettingsPage` (singleton settings layout), `FormPage` (generic form), and `ListPage` (one table):

```ts
import { SettingsPage, form, Section, TextInput } from '@shamar/core'

export default class BrandingSettingsPage extends SettingsPage {
  static override slug = 'settings'
  static override label = 'Settings'
  static override navigationGroup = 'Settings'

  static override form() {
    return form((f) => {
      f.schema([Section.make('Branding').schema([TextInput.make('logo').url()])])
    })
  }

  static override async fill() { /* load singleton */ return {} }
  static override async save(data) { /* persist */ return { message: 'Saved' } }
}
```

`SettingsPage` extends `FormPage` and defaults to `contentMaxWidth: '7xl'` plus the shared `shamar::page-form` view (Save lives in the sticky page actions). Use plain `FormPage` for other one-off forms when you do not want the settings defaults.

**Composite `Page`** — multiple forms, tables, infolists, and Edge blocks on one screen via `content()` / `pageContent()`:

```ts
import {
  Page,
  pageContent,
  form,
  table,
  infolist,
  Section,
  TextColumn,
  TextEntry,
  Select,
} from '@shamar/core'

export default class OpsDashboardPage extends Page {
  static override slug = 'ops-dashboard'
  static override label = 'Ops dashboard'

  static override content() {
    return pageContent((p) => {
      p.edge('banner', {
        view: 'pages/admin/ops_banner', // host Edge view; locals from `data`
        data: async (ctx) => ({ userName: ctx.user?.name }),
      })

      p.form('quick-settings', {
        title: 'Quick settings',
        form: () => form((f) => f.schema([Select.make('theme').options([/* … */])])),
        fill: async () => ({ theme: 'system' }),
        save: async (data) => ({ message: 'Saved' }),
      })

      p.table('recent-products', {
        title: 'Recent products',
        model: Product,
        linkResourceSlug: 'products', // row links to the resource show page
        table: () => table((t) => t.schema([TextColumn.make('name').searchable()])),
      })

      p.infolist('environment', {
        title: 'Environment',
        record: () => ({ nodeEnv: process.env.NODE_ENV }),
        infolist: () =>
          infolist((i) => {
            i.schema([Section.make('Runtime').schema([TextEntry.make('nodeEnv')])])
          }),
      })
    })
  }
}
```

Empty `content()` keeps the original custom-page behavior: `static view` + `mount()` locals.

```ts
panel('admin')
  .brandDisplay('both') // or 'logo' | 'name' — also `.brandLogoOnly()` / `.brandNameOnly()`
  .discoverResources('app/resources/admin')
  .discoverPages('app/pages/admin')
```

| Kind | Base class | Routes |
|------|------------|--------|
| Custom | `Page` (no `content()`) | `GET /:slug` |
| Composite | `Page` + `content()` | `GET /:slug`, `POST /:slug/sections/:section`, `POST /:slug/sections/:section/form-state` |
| Form | `FormPage` | `GET\|POST /:slug`, `POST /:slug/form-state` |
| List | `ListPage` | `GET /:slug` (table), `GET /:slug/:id` (read-only infolist; derived from columns or `static infolist()`) |

Page slugs must not collide with resource slugs or reserved names (`assets`, `profile`, `media`).
Resource routes like `/:slug/:id/edit` redirect to the page when `slug` is a registered **form/custom** page. List pages keep `GET /:slug/:id` as the record view.

Table sections on a composite page use prefixed query params (`{sectionKey}_page`, `{sectionKey}_search`, …) so several tables can share one URL.

`brandDisplay` (on `.branding({ brandDisplay })` or `.brandDisplay()`) controls whether the shell shows **logo + name**, **logo only**, or **name only**.

#### Media library

Enable a File Manager (sidebar **Files**) and `FilePicker` form fields:

```ts
import { defineConfig, panel } from '@shamar/adonis'
import { createMongooseMediaLibraryAdapter } from '@shamar/mongoose'
import MediaFolder from '#models/media_folder'
import MediaFile from '#models/media_file'

export default defineConfig({
  media: {
    enabled: true,
    root: 'storage/media',       // local blob disk (default)
    publicPath: '/media',        // ungated URL for public files
    adapter: () =>
      createMongooseMediaLibraryAdapter({
        Folder: MediaFolder,
        File: MediaFile,
      }),
  },
  panels: [panel('admin').path('/admin').discoverResources('app/resources/admin')],
})
```

Lucid hosts use `createLucidMediaLibraryAdapter` from `@shamar/lucid` with folder/file models.

- **Manager** — folder tree, icons/tiles/list/details, multi-select, cut/copy/paste, public/private
- **FilePicker** — browse + upload in the field dialog; `.accept('image/*')`, optional public uploads
- **Visibility** — `public` files at `{publicPath}/:id`; private files require panel auth (`/{panel}/media/files/:id/raw`)
- **Abilities** — `media.view`, `media.upload`, `media.manage` (or `media.*` / `*`)

#### Form widgets

Built-in controls (resource forms, `FormPage`, and composite `p.form()` sections):

| Class | Type | Notes |
| --- | --- | --- |
| `DatePicker` / `DateTimePicker` / `TimePicker` / `WeekPicker` / `MonthPicker` | `date` / `datetime` / `time` / `week` / `month` | [Flowbite datepicker](https://flowbite.com/docs/components/datepicker/) (lazy-loaded). `.seconds()` on date-time and time. `.native()` for browser inputs. |
| `RichEditor` | `richEditor` | TipTap HTML. Modes: **simple** (default, TipTap Simple Editor–style toolbar), **notion** (slash + bubble), **document** (Docx page chrome). Helpers: `.simple()` / `.notion()` / `.document()` / `.docx()`. Document mode supports File → Import Document and Export DOCX. Optional `.toolbar([...])`. |
| `MarkdownEditor` | `markdownEditor` | Write / preview. Markdown string. |
| `CodeEditor` | `codeEditor` | CodeMirror 6 (lazy CDN). `.language()` / `.languages()` |
| `Repeater` | `repeater` | Nested schema. JSON array payload. `.schema([...])` |
| `KeyValue` | `keyValue` | Pair editor → record payload. |
| `TagsInput` | `tags` | `string[]` |
| `CheckboxList` | `checkboxList` | Static `.options()` or a relation |
| `ColorPicker` | `color` | Swatch + hex |
| `Slider` | `slider` | `.min()` / `.max()` / `.step()` / `.showValue()` |
| `Rating` | `rating` | Star buttons. `.allowZero()` |
| `Radio` / `ToggleButtons` | `radio` | `.buttons()` or `ToggleButtons.make()`. `.multiple()` → checkbox list |

Extend:

```ts
import { FormComponent, registerFieldType, FIELD_ABSENT } from '@shamar/core'
import { registerFieldView } from '@shamar/adonis'

registerFieldType({
  type: 'signature',
  valueKind: 'scalar',
  hydrate: (value) => value ?? '',
  dehydrate: (field, input) => {
    const raw = input[field.name]
    return raw == null || raw === '' ? FIELD_ABSENT : String(raw)
  },
  empty: () => '',
})
registerFieldView('signature', 'views/fields/signature')

export class SignatureInput extends FormComponent {
  static make(name: string) {
    return new SignatureInput(name)
  }
  private constructor(name: string) {
    super(name, 'signature')
  }
}
```

The Edge view is included from `field-input` and receives `field`, `stateRef`, and `nestedField` (true inside a Repeater). Hydrate (stored → form) and dehydrate (request → stored) live on the field type, so custom inputs do not need changes in the admin controller.

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
