# Shamar — progress handoff

Last updated: 2026-07-21

Use this file when opening the Shamar workspace to resume work.

## What this is

**Shamar** is a separate monorepo (not part of `nestweaver-stack`) for a Filament-inspired admin panel on AdonisJS, under the `@shamar` namespace.

- **Inspiration**: [Filament](https://filamentphp.com/) (DX), [Loom](https://github.com/coolsam726/nodeweaver) (architecture)
- **ORM**: Lucid + Mongoose (configure-time choice)
- **Location**: `/home/smaosa/shamar`
- **Git**: initialized locally (not pushed)

## Monorepo layout

```
shamar/
├── packages/
│   ├── core/       @shamar/core     — Resource DSL, form/table/infolist/panel, registry
│   ├── lucid/      @shamar/lucid    — Lucid DataAdapter (SQL)
│   ├── mongoose/   @shamar/mongoose — Mongoose DataAdapter (MongoDB)
│   └── adonis/     @shamar/adonis   — defineConfig(), panels, discover, provider, Edge + Alpine
├── apps/
│   └── playground/   @shamar/playground — dual panels /admin + /app on Mongoose
├── README.md
└── PROGRESS.md   (this file)
```

## Completed

- [x] Separate project scaffold (removed partial `packages/adonis-loom` from nestweaver-stack)
- [x] `@shamar/core`: `Resource`, `form()`, `table()`, `actions()`, `ResourceRegistry`, `extendResource`
- [x] Filament-style fluent builders with chainable modifiers (`.required()`, `.searchable()`, etc.)
- [x] `@shamar/lucid`: `createLucidAdapter()` — list/find/create/update/delete, soft-delete, named connections
- [x] `@shamar/mongoose`: `createMongooseAdapter()` — MongoDB via Mongoose; `_id`→`id`; configure-time ORM choice
- [x] `@shamar/adonis`: `defineConfig()`, `ShamarProvider`, `ResourceController` (stub contracts)
- [x] `orm: 'lucid' | 'mongoose'` in config; `node ace configure @shamar/adonis` prompts for ORM
- [x] Tests: core resource metadata + registry; adonis provider boot
- [x] `pnpm install`, `pnpm build`, `pnpm test` all pass
- [x] **Real Adonis provider** — `ShamarProvider` registers IoC bindings, admin + API routes, mounts Edge views
- [x] **`node ace configure @shamar/adonis`** — configure hook adds provider + `config/shamar.ts` stub
- [x] **`apps/playground`** — Adonis hypermedia app; Shamar on **Mongoose**; dual panels
- [x] **Edge views / UI** — dashboard, list, show (infolist), create/edit form
- [x] **Multi-panel** — `panel(id).path().discoverResources()`, per-panel routes/assets/IoC
- [x] **Infolist** — `Resource.infolist()` / `detail()` with sections + columnSpan; show page wired
- [x] **Form/table expansion** — sections, columnSpan, date/datetime/file/image, closure-typed modifiers
- [x] **Live forms** — Alpine `loomForm` + `POST {panel}/{slug}/form-state` for `live` / `afterStateUpdated`

## Playground Mongo

- Requires a local MongoDB and `MONGO_URI` (see `.env`). `MongoProvider` connects on boot and seeds sample companies + `admin@example.com` / `password` when empty.
- Auth User model is **Mongoose** (custom `SessionMongooseUserProvider`); Lucid remains installed but unused for playground data.
- Panels: `/admin` discovers `app/resources/admin` (Companies); `/app` discovers `app/resources/app` (Profiles). Company name is `live` and syncs `code` via `afterStateUpdated` when code is empty.

## Not started / next steps

1. **Auth & policies** — wire `canViewAny`, `canCreate`, etc. to Adonis auth + Lucid policies
2. **Relation managers** — belongsTo/hasMany widgets (Filament `RelationManager`)
3. **RBAC / permissions** — action abilities, role seeding
4. **Multi-tenancy** — `companyScoped` + company switcher (phase 2)
5. **Lucid adapter tests** — mock model/query builder tests
6. **Polish admin UI** — richer field widgets, validation errors, auth middleware on admin routes

## Target developer experience

```ts
// app/resources/user_resource.ts
import { Resource, form, table } from '@shamar/core'
import User from '#models/user'

export default class UserResource extends Resource {
  static model = User
  static slug = 'users'
  static label = 'Users'

  static form() {
    return form(f =>
      f.text('name').required()
        .email('email').required().searchable()
        .password('password').createOnly()
    )
  }

  static table() {
    return table(t =>
      t.text('name').sortable()
        .text('email').sortable().searchable()
        .toggle('active')
    )
  }
}
```

```ts
// config/shamar.ts
import { defineConfig } from '@shamar/adonis'
import UserResource from '#resources/user_resource'

export default defineConfig({
  path: '/admin',
  resources: [UserResource],
  auth: { model: () => import('#models/user') },
})
```

## Multi-database (Laravel-style)

Resources declare a Lucid connection name:

```ts
static connection = 'legacy' // maps to config/database.ts
```

Same concept as the Laravel-style work in nestweaver-stack (`ConnectionRegistry`, `Resource.connection`).

## Commands

```bash
cd /home/smaosa/shamar
pnpm install
pnpm docker:up    # MongoDB + Compass Web (see DOCKER.md)
pnpm docker:dev   # + playground HMR on :3333
pnpm docker:prod  # + playground production on :3333
pnpm build
pnpm test
pnpm dev          # playground on :3333 (you start this yourself)
```

## Related work (nestweaver-stack)

Parallel work in `/home/smaosa/nestweaver-stack` (different workspace):

- OracleDB support in Nodeweaver scaffolder
- Laravel-style multi-database connections in Loom (`ConnectionRegistry`, `createRoutedLoomAdapter`)
- `@nodeweaver/persistence` connection registry for domain stores

Shamar is intentionally **separate** from nestweaver-stack.

## Suggested resume prompt

> Open `/home/smaosa/shamar`, read `PROGRESS.md`, and continue with auth/policies + relation managers.
