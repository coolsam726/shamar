# Shamar

**Filament-inspired admin panel for AdonisJS** — declarative resources, Lucid or Mongoose, RBAC (Cherubim), and a JSON API.

Inspired by [Filament](https://filamentphp.com/) (PHP) and architecturally aligned with [Loom](https://github.com/coolsam726/nodeweaver) (NestJS), but built natively for the latest AdonisJS stack.

**Documentation + demo:** one server — `pnpm site:build` then playground. Routes: `/` landing, `/docs`, `/demo` panel. Public site: [`https://demo.shamar.dev`](https://demo.shamar.dev) on Render, DNS in Cloudflare ([`DEPLOY.md`](DEPLOY.md)).

## Packages

| Package | Description |
|---------|-------------|
| [`@shamar/core`](packages/core) | Resource DSL: forms, tables, actions, navigation, auth contracts |
| [`@shamar/cherubim`](packages/cherubim) | Auth & access control: abilities, policies, API credentials |
| [`@shamar/wire`](packages/wire) | Server-driven components (`wire:model`, `wire:click`, `$wire`). Additive; existing Alpine UI stays until a piece is moved over |
| [`@shamar/lucid`](packages/lucid) | Lucid ORM adapter (SQL — list, CRUD, soft-delete, connections) |
| [`@shamar/mongoose`](packages/mongoose) | Mongoose adapter (MongoDB — list, CRUD, soft-delete) |
| [`@shamar/adonis`](packages/adonis) | Service provider, routes, controllers, middleware, Edge views |
| [`@shamar/rest`](packages/rest) | REST helpers + OpenAPI document + Scalar docs UI |

## Install (Adonis app)

```bash
pnpm add @shamar/adonis
# plus one of:
pnpm add @adonisjs/lucid    # SQL
pnpm add mongoose           # MongoDB

node ace configure @shamar/adonis   # pick Lucid or Mongoose
```

Then define resources (and optional panel pages) and open the panel path (default `/admin`). Full host docs: [`packages/adonis/README.md`](packages/adonis/README.md).

For OpenAPI docs over the JSON API **and** your custom `/api/*` routes, add [`@shamar/rest`](packages/rest) and register `@shamar/rest/provider` after the Adonis provider — then open `/api/shamar/docs`. Attach `.openapi({ body, query, response })` on routes (Vine + DTO helpers); no hand-written OpenAPI JSON.

## Quick start

```ts
// app/panels/admin/resources/user_resource.ts
import {
  Resource,
  TextInput,
  TextColumn,
  Toggle,
  type FormBuilder,
  type TableBuilder,
} from '@shamar/core'
import User from '#models/user'

export default class UserResource extends Resource {
  static model = User
  static slug = 'users'
  static label = 'Users'

  static form(form: FormBuilder) {
    return form.schema([
      TextInput.make('name').required(),
      TextInput.make('email').email().required().searchable(),
      TextInput.make('password').password().createOnly(),
      Toggle.make('active'),
    ])
  }

  static table(table: TableBuilder) {
    return table.schema([
      TextColumn.make('name').sortable(),
      TextColumn.make('email').sortable().searchable(),
      TextColumn.make('active').toggle(),
    ])
  }
}
```

```ts
// app/panels/admin/panel.ts — discovered on boot. config/shamar.ts holds orm, auth, and shared branding.
import { PanelProvider, panel } from '@shamar/adonis'

export default class AdminPanel extends PanelProvider {
  panel() {
    return panel('admin')
      .path('/admin')
      .discoverResources('app/panels/admin/resources')
      .discoverPages('app/panels/admin/pages')
      .branding({ name: 'Admin' })
  }
}
```

`node ace make:panel` writes that class. A class with the same id replaces a panel still listed in `config/shamar.ts`.

At configure time you pick **Lucid (SQL)** or **Mongoose (MongoDB)**. The Resource DSL is the same; only models and `orm` differ. Your app owns the DB connection lifecycle.

### Forms, infolists, and tables (Filament-style)

Containers use `.schema([...])` for children (forms, infolists, and tables). Layout width uses `.columns(n)` on sections/fieldsets. Children are `Component.make()` instances with their own chains.

**Section** (card + header) vs **Fieldset** (`<fieldset>` + legend):

```ts
static form(form: FormBuilder) {
  return form.schema([
    Section.make('Identity')
      .description('Core details')
      .icon('building')
      .columns(2)
      .schema([TextInput.make('name')]),
    Fieldset.make('Flags').schema([Toggle.make('active')]),
  ])
}
```

```ts
import {
  Section, Fieldset, TextInput, Toggle,
  TextEntry, TextColumn,
  type FormBuilder, type TableBuilder, type InfolistBuilder,
} from '@shamar/core'

static form(form: FormBuilder) {
  return form.schema([
    Section.make('Identity')
      .columns(2)
      .schema([
        TextInput.make('name').required().live().afterStateUpdated(({ get, set }) => {
          set('code', slugify(get('name')))
        }),
        TextInput.make('code').columnSpanFull(),
        TextInput.make('email').email().required(),
      ]),
    Fieldset.make('Status').schema([Toggle.make('active')]),
  ])
}

static infolist(infolist: InfolistBuilder) {
  // Same Section / Fieldset layout components as forms (Filament 5 schemas).
  return infolist.schema([
    Section.make('Company')
      .columns(3)
      .schema([
        TextEntry.make('name').columnSpanFull(),
        TextEntry.make('email').label('Email Address'),
        TextEntry.make('active').boolean().columnSpan(2),
      ]),
  ])
}

static table(table: TableBuilder) {
  return table.schema([
    TextColumn.make('name').sortable().searchable(),
    TextColumn.make('email').email(),
    TextColumn.make('active').boolean(),
  ])
}
```

`live()` fields still POST to `{panel}/{slug}/form-state` and patch Alpine `shamarForm`. That path stays. Components that move to `@shamar/wire` use `wire:*` and `$wire` instead: the browser posts a signed snapshot and the server morphs the island. Migration is one component at a time; it does not require a 1.x break.

## Filament concepts mapped to Shamar

| Filament | Shamar |
|----------|--------|
| `Schemas\Components\Section` / `Fieldset` | Shared `Section` / `Fieldset` (forms + infolists) |
| `Resource` | `Resource` class (`@shamar/core`) |
| `TextInput::make()` / `Section::make()->schema()` | `TextInput.make()` / `Section.make().schema([...])` |
| `TextEntry::make()` / infolist `schema()` | `TextEntry.make()` / `infolist.schema([...])` |
| `TextColumn::make()` / `$table->columns()` | `TextColumn.make()` / `table.schema([...])` |
| Multi-panel | `panel(id).path().discoverResources()` |
| `ListRecords` / `CreateRecord` | Adonis controllers + Edge pages |
| `Action` / `BulkAction` | `actions.header(…)` / `actions.bulkDelete()` / `actions.row(…)` |
| `RelationManager` | `Relation.field()` + relation widgets (phase 2) |
| `Policy` | `Resource.policy` class + Cherubim `Policy` (Loom / Laravel) |
| Panel navigation | `navigationGroup`, `navigationSubGroup` (top-bar dropdown), `navigationSort` |
| Livewire | [`@shamar/wire`](packages/wire) — signed islands, `wire:*`, `$wire`. Hosted by `@shamar/adonis` at `POST {panel}/wire` |
| Live form fields | `.live()` + `.afterStateUpdated()` → `POST …/form-state` |
| Multi-tenancy | `companyScoped` + session company switcher (phase 2) |

## Multi-database (Laravel-style)

Lucid connections map directly:

```ts
export default class LegacyProductResource extends Resource {
  static connection = 'legacy' // uses config/database.ts connection name
  static model = LegacyProduct
}
```

## Playground

[`apps/playground`](apps/playground) is the living Mongoose demo (dual panels `/admin` + `/app`, session auth, API keys, RBAC). See its README for run instructions and seed credentials. Enable `SHAMAR_DEMO_MODE` for the public 20-minute reset sandbox used by [`apps/docs`](apps/docs).

## CI

GitHub Actions [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pull requests and pushes to `main`: package build + tests, plus a playground production build (catches unused-import / `tsc` failures before publish).

## Publishing

GitHub Actions [`.github/workflows/publish.yml`](.github/workflows/publish.yml) builds, tests, and publishes `@shamar/*` packages when a GitHub Release is published (or via workflow_dispatch dry-run).

## Development

```bash
pnpm install
pnpm docker:up   # MongoDB :27017 + Compass Web :8081 (see DOCKER.md)
pnpm docker:dev  # + playground HMR on :3333
pnpm docker:prod # + playground production on :3333
pnpm build
pnpm test
pnpm dev         # playground — you manage this process
```

## License

MIT
