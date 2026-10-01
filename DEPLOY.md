# Deploying Shamar

The landing page and the docs are static. The panel is the only piece that needs Node and MongoDB.

| Host | What |
|------|------|
| `https://shamar.dev/` | Marketing landing (Cloudflare Pages) |
| `https://shamar.dev/docs/` | Starlight docs (same Pages project) |
| `https://demo.shamar.dev/` | Admin panel, login, and `/api` (Render) |

Docs links written as `/demo/...` are rewritten to the demo host at build time. `/demo/products` becomes `https://demo.shamar.dev/products`.

## Build the docs site

From the monorepo root:

```bash
pnpm install
pnpm pages:build
# → apps/docs/dist, with demo links aimed at https://demo.shamar.dev
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

## Self-host behind nginx (optional)

This section is only if you run the panel yourself and point `demo` at that machine. The landing page and docs stay on Cloudflare Pages.

1. Install Node 22+, pnpm, MongoDB (or Atlas), nginx, certbot.
2. Clone the repo, create `apps/playground/.env` (production values):

```env
HOST=127.0.0.1
PORT=3333
NODE_ENV=production
APP_KEY=…          # openssl rand -base64 32
APP_URL=https://demo.shamar.dev
SESSION_DRIVER=cookie
MONGO_URI=mongodb://127.0.0.1:27017/shamar
SHAMAR_DEMO_MODE=true
DEMO_RESET_TOKEN=… # openssl rand -hex 24
DEMO_DOCS_ORIGIN=https://shamar.dev
```

3. Build & run (systemd example):

```bash
pnpm install --frozen-lockfile
pnpm --filter './packages/*' build
pnpm --filter @shamar/playground exec node ace build --ignore-ts-errors
cd apps/playground/build && node bin/server.js
```

4. nginx reverse proxy:

```nginx
server {
  server_name demo.shamar.dev;
  location / {
    proxy_pass http://127.0.0.1:3333;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Then `certbot --nginx -d demo.shamar.dev`.

## Manual DB wipe

```bash
curl -X POST https://demo.shamar.dev/demo-reset \
  -H "X-Demo-Reset-Token: $DEMO_RESET_TOKEN"
```

## Docker

The production image builds the packages and the playground only. It does not include the marketing site. The host must set `PORT` (Compose and Render do). `APP_URL` should be `https://demo.shamar.dev`.

## Cloudflare Pages

Create a Pages project from this repo.

| Setting | Value |
|---------|--------|
| Build command | `pnpm install --frozen-lockfile && pnpm pages:build` |
| Output directory | `apps/docs/dist` |
| Production branch | `main` |
| `NODE_VERSION` | `22` |

Custom domains: `shamar.dev` and `www.shamar.dev` if you want it. Pages is the origin for the apex, so the Cloudflare DNS records for `@` and `www` stay on Pages. The demo hostname is a separate record and does not get the orange cloud pointed at Pages.

## Render

[`render.yaml`](render.yaml) is a Blueprint for the panel at `demo.shamar.dev` on the Free plan. MongoDB is Atlas. Set `MONGO_URI` when Render asks. `APP_KEY` and `DEMO_RESET_TOKEN` are generated. `APP_URL` is `https://demo.shamar.dev`. `DEMO_DOCS_ORIGIN` is `https://shamar.dev` so the docs site can read `/demo-status`.

The Free plan is 512 MB and spins down after 15 minutes without traffic. The next visit to the panel waits about a minute while it starts. The marketing site on Pages stays up. A disk for uploads is not available on this plan.

1. In Render choose **New → Blueprint**.
2. Render adds `demo.shamar.dev` and shows the DNS target (the service’s `onrender.com` hostname).
3. In the `shamar.dev` zone, add:

   | Type | Name | Target | Proxy |
   |------|------|--------|-------|
   | CNAME | `demo` | the hostname Render shows | DNS only (grey cloud) |

   Leave that proxy off until Render reports the certificate as issued.
4. SSL/TLS for the zone is **Full (strict)**.

Health check: `GET https://demo.shamar.dev/health`. The panel is `GET /`. Sign-in is `/login`. Demo wipe is `POST /demo-reset` with `X-Demo-Reset-Token`.

Media uploads live on the container disk and disappear when the instance is replaced. The demo seed recreates records; it does not restore uploaded files.
