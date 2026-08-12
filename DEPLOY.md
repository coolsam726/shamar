# Deploying Shamar (single host)

One Adonis process serves everything under one domain:

| Path | What |
|------|------|
| `/` | Marketing landing (Astro → `public/index.html`) |
| `/docs/*` | Starlight docs (static) |
| `/demo` | Live admin panel |
| `/login` | Session auth |
| `/demo-status` | Sandbox credentials + reset countdown JSON |
| `/api/docs` | OpenAPI / Scalar |

**Target:** `https://shamar.savannabits.com` on your Debian box (nginx → Node).

## Build the unified site

From the monorepo root:

```bash
pnpm install
pnpm --filter './packages/*' build
PUBLIC_SITE_URL=https://shamar.savannabits.com pnpm site:build
# → builds Astro, syncs into apps/playground/public/
```

## Local (one server)

```bash
pnpm docker:up   # Mongo
# apps/playground/.env:
#   SHAMAR_DEMO_MODE=true
#   DEMO_DOCS_ORIGIN=http://localhost:3333
#   APP_URL=http://localhost:3333
PUBLIC_SITE_URL=http://localhost:3333 pnpm site:build
pnpm --filter @shamar/playground dev
# → http://localhost:3333/       landing
# → http://localhost:3333/docs/  docs
# → http://localhost:3333/demo   panel
```

Optional: `pnpm docs:dev` on `:4321` only while editing MDX (then re-run `pnpm site:build`).

## Debian + nginx

1. Install Node 22+, pnpm, MongoDB (or Atlas), nginx, certbot.
2. Clone the repo, create `apps/playground/.env` (production values):

```env
HOST=127.0.0.1
PORT=3333
NODE_ENV=production
APP_KEY=…          # openssl rand -base64 32
APP_URL=https://shamar.savannabits.com
SESSION_DRIVER=cookie
MONGO_URI=mongodb://127.0.0.1:27017/shamar
SHAMAR_DEMO_MODE=true
DEMO_RESET_TOKEN=… # openssl rand -hex 24
DEMO_DOCS_ORIGIN=https://shamar.savannabits.com
```

3. Build & run (systemd example):

```bash
pnpm install --frozen-lockfile
pnpm --filter './packages/*' build
PUBLIC_SITE_URL=https://shamar.savannabits.com pnpm site:build
pnpm --filter @shamar/playground exec node ace build --ignore-ts-errors
cd apps/playground/build && node bin/server.js
```

4. nginx reverse proxy:

```nginx
server {
  server_name shamar.savannabits.com;
  location / {
    proxy_pass http://127.0.0.1:3333;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then `certbot --nginx -d shamar.savannabits.com`.

## Manual DB wipe

```bash
curl -X POST https://shamar.savannabits.com/demo-reset \
  -H "X-Demo-Reset-Token: $DEMO_RESET_TOKEN"
```

## Docker (optional)

The monorepo `Dockerfile` `production` stage builds packages, the Astro site, syncs into playground `public/`, then `ace build`. Point `APP_URL` / `PUBLIC_SITE_URL` at your domain.
