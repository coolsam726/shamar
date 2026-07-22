# @shamar/core

Filament-inspired **Resource DSL** for Shamar — forms, tables, infolists, actions, navigation, and auth contracts. ORM-agnostic: persistence lives in adapters (`@shamar/lucid`, `@shamar/mongoose`) or your own `DataAdapter`.

Most apps consume this transitively via [`@shamar/adonis`](../adonis). Use `@shamar/core` directly when building a custom host or adapter.

## Install

```bash
pnpm add @shamar/core
```

No peer dependencies.

## Resource skeleton

```ts
import {
  Resource,
  form,
  table,
  infolist,
  actions,
  Section,
  TextInput,
  Toggle,
  TextColumn,
  TextEntry,
} from '@shamar/core'
import User from '#models/user'

export default class UserResource extends Resource {
  static model = User
  static slug = 'users'
  static label = 'Users'
  static singularLabel = 'User'
  static recordTitleField = 'email'
  static navigationGroup = 'System'
  static navigationSort = 5

  static form() {
    return form((f) => {
      f.schema([
        Section.make('Identity')
          .columns(2)
          .schema([
            TextInput.make('fullName').required(),
            TextInput.make('email').email().required().unique(),
            TextInput.make('password').password().createOnly().required(),
            Toggle.make('active'),
          ]),
      ])
    })
  }

  static table() {
    return table((t) => {
      t.schema([
        TextColumn.make('fullName').sortable().searchable(),
        TextColumn.make('email').sortable().searchable().filterable(),
        TextColumn.make('active').boolean().filterable(),
      ])
    })
  }

  static infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('User').schema([
          TextEntry.make('fullName'),
          TextEntry.make('email'),
          TextEntry.make('active').boolean(),
        ]),
      ])
    })
  }

  static resourceActions() {
    return actions((a) => {
      a.create()
      a.view()
      a.edit()
      a.delete()
      a.bulkDelete()
      a.header('export', 'Export').ability('viewAny')
      a.row('archive', 'Archive').confirm('Archive this user?')
    })
  }
}
```

## Builders

| Builder | Purpose |
|---------|---------|
| `form((f) => …)` | Create / edit schemas |
| `table((t) => …)` | List columns, filters, group-by defaults |
| `infolist((i) => …)` | Show / view schemas |
| `actions((a) => …)` | Create, view, edit, delete, bulk, header, and row actions |
| `panel(id)` | Multi-panel registration (also re-exported from `@shamar/adonis`) |

Containers use `.schema([...])` for children. Layout width uses `.columns(n)` on sections and fieldsets.

### Layout

`Section`, `Fieldset`, `Grid`, `Group`, `Flex`, `Tabs` / `Tab`, `Wizard` / `Step`, `Callout`, `EmptyState`, `Placeholder`

### Form fields

`TextInput`, `Textarea`, `Select`, `Toggle`, `Checkbox`, `Radio`, `CheckboxList`, `Hidden`, `ColorPicker`, `TagsInput`, `DatePicker`, `DateTimePicker`, `FileUpload`, `RelationTable`, `PermissionsAssignment`, `AbilitiesAssignment`

### Table / infolist

`TextColumn` · `TextEntry`, `IconEntry`, `ColorEntry`, `ImageEntry`

## Common modifiers

| Modifier | Applies to | Notes |
|----------|------------|--------|
| `.required()` | fields | Validation |
| `.live()` / `.afterStateUpdated()` | fields | Reactive form-state POST |
| `.searchable()` | fields / columns | Global list search |
| `.sortable()` | columns | Order by |
| `.filterable()` / `.groupable()` | columns | List Filters / Group menus |
| `.relationship(slug, titleAttr)` | relation fields | BelongsTo / M2M pickers |
| `.unique()` | fields | Uses adapter `exists()` |
| `.createOnly()` / `.editOnly()` | fields | Visibility by page |
| `.columnSpan(n)` / `.columnSpanFull()` | fields / entries | Grid span |

List defaults:

```ts
table((t) => {
  t.defaultFilters([{ field: 'active', value: true, label: 'Active' }])
  t.defaultGroupBy('status')
  t.schema([/* columns */])
})
```

## Soft delete & tenancy hooks

```ts
export default class OrderResource extends Resource {
  static softDelete = true // or { field: 'deleted_at' }
  // static companyScoped = true  // when tenancy is enabled in the host
}
```

Adapters exclude soft-deleted rows from list/find and stamp the field on delete when enabled.

## Auth contracts

`Resource` exposes `canAccess` / `canViewAny` / `canView` / `canCreate` / `canEdit` / `canDelete`. Set `static policy` to a Cherubim `Policy` (or register via Adonis `auth.policies`) for record rules and `scopeList`.

See [`@shamar/cherubim`](../cherubim) for RBAC, policies, and API keys.

## Custom ORM (`DataAdapter`)

```ts
import type { DataAdapter } from '@shamar/core'

const adapter: DataAdapter = {
  list(meta, query) { /* … */ },
  findOne(meta, id) { /* … */ },
  create(meta, data) { /* … */ },
  update(meta, id, data) { /* … */ },
  delete(meta, id) { /* … */ },
  exists(meta, column, value, options) { /* … */ },
  search(meta, query) { /* … */ },
}
```

Pass it as `adapter` in `@shamar/adonis` `defineConfig`, or wire it in a custom host.

## Related

- [`@shamar/adonis`](../adonis) — Adonis provider, routes, Edge UI
- [`@shamar/lucid`](../lucid) / [`@shamar/mongoose`](../mongoose) — stock adapters
- [`@shamar/cherubim`](../cherubim) — auth & policies
- [Playground](../../apps/playground) — living demo
