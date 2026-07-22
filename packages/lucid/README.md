# @shamar/lucid

**Lucid ORM** [`DataAdapter`](../core) for Shamar — list, CRUD, soft-delete, relation search, and named database connections.

## Install

```bash
pnpm add @shamar/lucid @adonisjs/lucid
```

**Peer:** `@adonisjs/lucid` `>=21` (required when you use this adapter).

In a typical Adonis app you install `@shamar/adonis` and choose Lucid at configure time; the provider calls `createLucidAdapter()` for you. Your app still owns the Lucid database provider and migrations.

## With `@shamar/adonis`

```ts
// config/shamar.ts
import { defineConfig, panel } from '@shamar/adonis'

export default defineConfig({
  orm: 'lucid',
  panels: [
    panel('admin')
      .path('/admin')
      .discoverResources('app/resources/admin'),
  ],
})
```

Resources must set `static model` to a **Lucid model class** (not a string name).

```ts
import { Resource, form, table, TextInput, TextColumn } from '@shamar/core'
import Product from '#models/product'

export default class ProductResource extends Resource {
  static model = Product
  static slug = 'products'
  // …
}
```

## Standalone

```ts
import { createLucidAdapter } from '@shamar/lucid'

const adapter = createLucidAdapter()
// pass adapter into your host / defineConfig({ adapter })
```

## Multi-connection

Maps to Lucid connection names from `config/database.ts`:

```ts
export default class LegacyProductResource extends Resource {
  static connection = 'legacy'
  static model = LegacyProduct
}
```

## Soft delete

```ts
export default class OrderResource extends Resource {
  static softDelete = true              // field: deletedAt
  // static softDelete = { field: 'deleted_at' }
}
```

When enabled, list/find exclude rows with the stamp set; `delete` updates the field instead of hard-deleting.

## Behavior notes

- **List** — pagination, sort, search (searchable columns), filters, group-by, and policy `scopeList` equals clauses
- **Search** — relation pickers / `PermissionsAssignment` enrichment (`name`, `group`, `ability` when present)
- **Exists** — powers `.unique()` validation on forms
- Model must expose Lucid-style `query`, `create`, `findOrFail` (duck-typed; no hard Lucid import in this package)

## Related

- [`@shamar/core`](../core) — Resource DSL
- [`@shamar/adonis`](../adonis) — host wiring
- [`@shamar/mongoose`](../mongoose) — MongoDB adapter
