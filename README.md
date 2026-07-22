# Shamar

**Filament-inspired admin panel for AdonisJS** — declarative resources, Lucid or Mongoose, RBAC (Cherubim), and a JSON API.

Inspired by [Filament](https://filamentphp.com/) (PHP) and architecturally aligned with [Loom](https://github.com/coolsam726/nodeweaver) (NestJS), but built natively for the latest AdonisJS stack.

## Packages

| Package | Description |
|---------|-------------|
| [`@shamar/core`](packages/core) | Resource DSL: forms, tables, actions, navigation, auth contracts |
| [`@shamar/cherubim`](packages/cherubim) | Auth & access control: abilities, policies, API credentials |
| [`@shamar/lucid`](packages/lucid) | Lucid ORM adapter (SQL — list, CRUD, soft-delete, connections) |
| [`@shamar/mongoose`](packages/mongoose) | Mongoose adapter (MongoDB — list, CRUD, soft-delete) |
| [`@shamar/adonis`](packages/adonis) | Service provider, routes, controllers, middleware, Edge views |

## Install (Adonis app)

```bash
pnpm add @shamar/adonis
# plus one of:
pnpm add @adonisjs/lucid    # SQL
pnpm add mongoose           # MongoDB

node ace configure @shamar/adonis   # pick Lucid or Mongoose
```

Then define resources and open the panel path (default `/admin`). Full host docs: [`packages/adonis/README.md`](packages/adonis/README.md).

## Quick start

```ts
// app/resources/admin/user_resource.ts
import {
  Resource,
  form,
  table,
  TextInput,
  TextColumn,
  Toggle,
} from '@shamar/core'
import User from '#models/user'

export default class UserResource extends Resource {
  static model = User
  static slug = 'users'
  static label = 'Users'

  static form() {
    return form((f) => {
      f.schema([
        TextInput.make('name').required(),
        TextInput.make('email').email().required().searchable(),
        TextInput.make('password').password().createOnly(),
        Toggle.make('active'),
      ])
    })
  }

  static table() {
    return table((t) => {
      t.schema([
        TextColumn.make('name').sortable(),
        TextColumn.make('email').sortable().searchable(),
        TextColumn.make('active').toggle(),
      ])
    })
  }
}
```

```ts
// config/shamar.ts
import { defineConfig, panel } from '@shamar/adonis'

export default defineConfig({
  orm: 'lucid', // or 'mongoose' — chosen at `node ace configure @shamar/adonis`
  panels: [
    panel('admin')
      .path('/admin')
      .discoverResources('app/resources/admin')
      .branding({ name: 'Admin' }),
    panel('app')
      .path('/app')
      .discoverResources('app/resources/app'),
  ],
})
```

Single-panel apps can still use legacy `path` + `resources` (becomes one default panel).

At configure time you pick **Lucid (SQL)** or **Mongoose (MongoDB)**. The Resource DSL is the same; only models and `orm` differ. Your app owns the DB connection lifecycle.

### Forms, infolists, and tables (Filament-style)

Containers use `.schema([...])` for children (forms, infolists, and tables). Layout width uses `.columns(n)` on sections/fieldsets. Children are `Component.make()` instances with their own chains.

**Section** (card + header) vs **Fieldset** (`<fieldset>` + legend):

```ts
form((f) => {
  f.schema([
    Section.make('Identity')
      .description('Core details')
      .icon('building')
      .columns(2)
      .schema([TextInput.make('name')]),
    Fieldset.make('Flags').schema([Toggle.make('active')]),
  ])
})
```

```ts
import {
  form, table, infolist,
  Section, Fieldset, TextInput, Toggle,
  TextEntry, TextColumn,
} from '@shamar/core'

static form() {
  return form((f) => {
    f.schema([
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
  })
}

static infolist() {
  return infolist((i) => {
    // Same Section / Fieldset layout components as forms (Filament 5 schemas).
    i.schema([
      Section.make('Company')
        .columns(3)
        .schema([
          TextEntry.make('name').columnSpanFull(),
          TextEntry.make('email').label('Email Address'),
          TextEntry.make('active').boolean().columnSpan(2),
        ]),
    ])
  })
}

static table() {
  return table((t) => {
    t.schema([
      TextColumn.make('name').sortable().searchable(),
      TextColumn.make('email').email(),
      TextColumn.make('active').boolean(),
    ])
  })
}
```

`live()` fields POST to `{panel}/{slug}/form-state`; the server runs `afterStateUpdated` and returns patched field meta (Alpine `shamarForm`).

## Filament concepts mapped to Shamar

| Filament | Shamar |
|----------|--------|
| `Schemas\Components\Section` / `Fieldset` | Shared `Section` / `Fieldset` (forms + infolists) |
| `Resource` | `Resource` class (`@shamar/core`) |
| `TextInput::make()` / `Section::make()->schema()` | `TextInput.make()` / `Section.make().schema([...])` |
| `TextEntry::make()` / infolist `schema()` | `TextEntry.make()` / `infolist((i) => i.schema([...]))` |
| `TextColumn::make()` / `$table->columns()` | `TextColumn.make()` / `table((t) => t.schema([...]))` |
| Multi-panel | `panel(id).path().discoverResources()` |
| `ListRecords` / `CreateRecord` | Adonis controllers + Edge pages |
| `Action` / `BulkAction` | `actions((a) => a.header(…) / a.bulkDelete(…) / a.row(…))` |
| `RelationManager` | `Relation.field()` + relation widgets (phase 2) |
| `Policy` | `Resource.policy` class + Cherubim `Policy` (Loom / Laravel) |
| Panel navigation | `navigationGroup`, `navigationSort` |
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

[`apps/playground`](apps/playground) is the living Mongoose demo (dual panels `/admin` + `/app`, session auth, API keys, RBAC). See its README for run instructions and seed credentials.

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
