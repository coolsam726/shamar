# Docker

## Infrastructure only (Mongo + Compass Web)

```bash
pnpm docker:up
```

| Service | Address |
|---------|---------|
| MongoDB | `mongodb://127.0.0.1:27017` |
| Compass Web | http://127.0.0.1:8081 |
| Database | `shamar_playground` |

## Playground app container

Run the app **inside Docker** (with Mongo + Compass):

```bash
pnpm docker:dev    # HMR / ace serve — http://localhost:3333
pnpm docker:prod   # production build — http://localhost:3333
```

Only one of `app-dev` / `app-prod` should be up (both bind port `3333`).

Stop everything:

```bash
pnpm docker:down
```

Rebuild / follow logs:

```bash
pnpm docker:dev --build   # or: docker compose --profile dev up -d --build
pnpm docker:logs
```

`pnpm docker:dev` mounts package `src` **and** `dist`. After changing `@shamar/*` packages on the host, run `pnpm --filter './packages/*' build` (or the specific package), then restart the app container so the provider reloads:

```bash
pnpm --filter @shamar/adonis build
docker compose --profile dev restart app-dev
```


Compose overrides these for the app containers:

- `HOST=0.0.0.0` (listen outside the container)
- `MONGO_URI=mongodb://mongo:27017/shamar_playground`
- `APP_URL=http://localhost:3333`

Other values come from `apps/playground/.env`.

When developing on the **host** instead of in Docker, keep using:

```env
MONGO_URI=mongodb://127.0.0.1:27017/shamar_playground
```

with `pnpm docker:up` for Mongo only, then `pnpm --filter @shamar/playground dev` on the host.

## Wipe Mongo data

```bash
docker compose down -v
```
