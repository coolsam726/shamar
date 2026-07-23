# @shamar/rest

REST helpers and **OpenAPI-powered docs** for Shamar — generated from resources **and** your Adonis routes.

## Install

```bash
pnpm add @shamar/rest
```

Peers: `@adonisjs/core` (provider / macros), `@vinejs/vine` (request/query schemas).

## Quick start

```ts
// adonisrc.ts — after @shamar/adonis/provider
() => import('@shamar/rest/provider'),
```

```ts
// config/shamar.ts
rest: {
  openapi: { title: 'My API', version: '1.0.0' },
  discover: { prefixes: ['/api'] }, // default
},
```

| URL | Purpose |
|-----|---------|
| `/api/shamar/openapi.json` | OpenAPI 3.1 document |
| `/api/shamar/docs` | Scalar UI |

## Custom routes (no hand-written OpenAPI)

Attach Vine validators + response DTOs on the route. Docs are generated from that metadata and from route discovery:

```ts
import vine from '@vinejs/vine'
import { dto, string, optional, number, array } from '@shamar/rest'
import UsersController from '#controllers/users_controller'

const listUsersValidator = vine.create({
  page: vine.number().optional(),
  search: vine.string().optional(),
})

const createUserValidator = vine.create({
  email: vine.string().email(),
  name: vine.string(),
})

const UserDto = dto({
  id: string(),
  email: string({ format: 'email' }),
  name: string(),
  age: optional(number()),
})

router
  .get('/api/users', [UsersController, 'index'])
  .openapi({
    tags: ['Users'],
    summary: 'List users',
    query: listUsersValidator,
    response: array(UserDto),
  })

router
  .post('/api/users', [UsersController, 'store'])
  .openapi({
    tags: ['Users'],
    body: createUserValidator,
    response: UserDto,
    responseStatus: 201,
  })
```

Or via the helper:

```ts
import { rest } from '@shamar/rest'

rest(router)
  .get('/api/users', [UsersController, 'index'])
  .openapi({ query: listUsersValidator, response: array(UserDto), tags: ['Users'] })
```

### What gets generated automatically

| Source | Docs content |
|--------|----------------|
| Adonis route path/method | Operation path, HTTP verb, path params (`:id` → `{id}`) |
| `.openapi({ query })` | Query parameters (from Vine) |
| `.openapi({ body })` | Request body (from Vine) |
| `.openapi({ response })` | Response schema (from DTO / Vine / raw) |
| Shamar resources | Full CRUD under `/api/shamar/:slug` from resource fields |

Routes under `discover.prefixes` (default `/api`) appear even without `.openapi()` — as minimal stubs. Add metadata for rich docs.

## Response DTO helpers

```ts
import {
  dto, schema, string, number, integer, boolean,
  array, nullable, optional, enumOf, literal, record,
} from '@shamar/rest'

const OrderDto = dto({
  id: string(),
  status: enumOf(['pending', 'paid', 'shipped']),
  total: number(),
  note: optional(nullable(string())),
  items: array(dto({
    sku: string(),
    qty: integer({ minimum: 1 }),
  })),
})
```

You can also pass:
- a **Vine** validator / schema (`toJSONSchema()`)
- a Shamar **`ResourceMeta`**
- a raw OpenAPI schema object

## Config

```ts
rest: {
  enabled: true,
  openapiPath: '/openapi.json',
  docs: { path: '/docs' },
  discover: {
    prefixes: ['/api'],
    exclude: ['/api/internal'],
  },
  openapi: {
    title: 'My API',
    version: '1.0.0',
    servers: [{ url: '/' }],
  },
}
```

## CSRF

Exclude `/api/*` (or at least `/api/shamar/*`) from Shield CSRF, same as the JSON API.
