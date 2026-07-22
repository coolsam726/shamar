# Shamar

**Filament-inspired admin panel for AdonisJS** — declarative resources, Lucid ORM, RBAC, and a JSON API.

Inspired by [Filament](https://filamentphp.com/) (PHP) and architecturally aligned with [Loom](https://github.com/coolsam726/nodeweaver) (NestJS), but built natively for the latest AdonisJS stack.

## Packages

| Package | Description |
|---------|-------------|
| `@shamar/core` | Resource DSL: forms, tables, actions, navigation, auth contracts |
| `@shamar/lucid` | Lucid ORM adapter (SQL — list, CRUD, soft-delete, connections) |
| `@shamar/mongoose` | Mongoose adapter (MongoDB — list, CRUD, soft-delete) |
| `@shamar/adonis` | Service provider, routes, controllers, middleware, Edge views |

## Quick start (target DX)

```ts
// app/resources/user_resource.ts
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

At configure time you pick **Lucid (SQL)** or **Mongoose (MongoDB)**. The Resource DSL is the same; only models and `orm` differ.

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
| `Action` / `BulkAction` | `Action.header()` / `Action.bulk()` |
| `RelationManager` | `Relation.field()` + relation widgets (phase 2) |
| `Policy` | `Resource.policy` + `can*` hooks |
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
