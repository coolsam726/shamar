# Shamar Playground

Living demo app for the Shamar admin stack — **AdonisJS + Mongoose**, dual panels, session auth, Cherubim RBAC, and API credentials.

This is the reference integration for [`@shamar/adonis`](../../packages/adonis) with `orm: 'mongoose'`. Package docs live under [`packages/*/README.md`](../../packages).

## What you get

| Surface | Path | Notes |
|---------|------|--------|
| Admin panel | `/admin` | Full CRUD resources (companies, users, roles, permissions, products, API keys, …) |
| App panel | `/app` | Smaller end-user panel (e.g. profile) |
| JSON API | `/api/shamar` | Protected when `auth.apiKeys.protectApi` is enabled |
| Login | `/login` | Session guard (`web`) |

## Run locally

From the monorepo root:

```bash
pnpm install
pnpm docker:up    # MongoDB :27017 + Compass Web :8081 — see DOCKER.md
pnpm build        # build @shamar/* packages
pnpm dev          # ace serve — http://localhost:3333
```

Or run the app inside Docker (with Mongo):

```bash
pnpm docker:dev   # HMR on :3333
# pnpm docker:prod
```

Ensure `apps/playground/.env` points at Mongo (default `mongodb://127.0.0.1:27017/shamar_playground`).

## Seed login

On boot the Mongo provider seeds an admin user (if missing):

| Field | Value |
|-------|--------|
| Email | `admin@example.com` |
| Password | `password` |

## Try next

- Browse `/admin` — list filters, grouping, bulk actions, relation fields
- **Roles / permissions** — catalog + `PermissionsAssignment` on roles
- **API Keys** — create a PAT or machine key; secret shown once; dual headers `X-Api-Key` + `Authorization: Bearer`
- Soft-deleted / locked resources and policies under `app/policies`

## Layout

```
apps/playground/
  app/resources/admin/   # Admin panel resources
  app/resources/app/     # App panel resources
  app/models/            # Mongoose models
  app/auth/              # Session provider, API key store, role resolver
  config/shamar.ts       # panels + auth wiring
  providers/             # mongo connect + seed, RBAC boot
```

## Related

- [Root README](../../README.md)
- [DOCKER.md](../../DOCKER.md)
- [@shamar/adonis](../../packages/adonis) · [@shamar/mongoose](../../packages/mongoose) · [@shamar/cherubim](../../packages/cherubim)
