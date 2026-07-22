# @shamar/mongoose

**Mongoose** [`DataAdapter`](../core) for Shamar — list, CRUD, soft-delete, and relation search over MongoDB collections.

## Install

```bash
pnpm add @shamar/mongoose mongoose
```

**Peer:** `mongoose` `>=8` (required when you use this adapter).

In a typical Adonis app you install `@shamar/adonis` and choose Mongoose at configure time; the provider calls `createMongooseAdapter()` for you. **Your app owns** `mongoose.connect` (and disconnect) — Shamar does not open the connection.

## With `@shamar/adonis`

```ts
// config/shamar.ts
import { defineConfig, panel } from '@shamar/adonis'

export default defineConfig({
  orm: 'mongoose',
  panels: [
    panel('admin')
      .path('/admin')
      .discoverResources('app/resources/admin'),
  ],
})
```

See the [playground](../../apps/playground) for a full Mongoose + dual-panel example.

## Model binding

Prefer a Mongoose model class on the resource:

```ts
import { Resource } from '@shamar/core'
import Product from '#models/product'

export default class ProductResource extends Resource {
  static model = Product
  static slug = 'products'
}
```

String model names work when you pass a connection into the adapter:

```ts
import { createMongooseAdapter } from '@shamar/mongoose'
import mongoose from 'mongoose'

const adapter = createMongooseAdapter({
  connection: mongoose.connection,
})

// resource: static model = 'Product'
```

## IDs

Documents are normalized for the admin UI: Mongo `_id` is exposed as string `id` on serialized records. Lookups accept the string id.

## Soft delete

```ts
export default class TicketResource extends Resource {
  static softDelete = true              // field: deletedAt
  // static softDelete = { field: 'deleted_at' }
}
```

List/find skip stamped documents; delete sets the timestamp instead of removing the document.

## Standalone

```ts
import { createMongooseAdapter } from '@shamar/mongoose'

const adapter = createMongooseAdapter()
// or createMongooseAdapter({ connection })
```

## Behavior notes

- **List** — pagination, sort, search, filters, group-by, soft-delete exclusion, policy scopes
- **Search** — relation / permission catalog pickers
- **Exists** — `.unique()` form validation
- Models are duck-typed (`find`, `findById`, `create`, …) so this package does not hard-depend on mongoose types at compile time

## Related

- [`@shamar/core`](../core) — Resource DSL
- [`@shamar/adonis`](../adonis) — host wiring
- [`@shamar/lucid`](../lucid) — SQL adapter
- [Playground](../../apps/playground) — reference Mongoose app
