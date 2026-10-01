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

**Public site:** `https://demo.shamar.dev`. The app runs on Render. DNS for `shamar.dev` stays in Cloudflare; only the `demo` record points at Render.

## Build the unified site

From the monorepo root:

```bash
pnpm install
pnpm --filter './packages/*' build
PUBLIC_SITE_URL=https://demo.shamar.dev pnpm site:build
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

## Self-host behind nginx (optional)

The public site is the Render service below. This section is only if you run the same process on your own machine and point `demo` at that machine instead.

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
DEMO_DOCS_ORIGIN=https://demo.shamar.dev
```

3. Build & run (systemd example):

```bash
pnpm install --frozen-lockfile
pnpm --filter './packages/*' build
PUBLIC_SITE_URL=https://demo.shamar.dev pnpm site:build
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

## Docker (optional)

The monorepo `Dockerfile` `production` stage builds packages, the Astro site, syncs into playground `public/`, then `ace build`. Point `APP_URL` / `PUBLIC_SITE_URL` at your domain. The production image does not pick a `PORT`; the host must set it (Compose, Fly, and Render all do).

## Render + Cloudflare

[`render.yaml`](render.yaml) is a Blueprint for one Docker web service at `demo.shamar.dev`. It serves `/`, `/docs`, and `/demo`. MongoDB is Atlas (or any URI you already have). Render does not run the database. Cloudflare only publishes the DNS record; it does not host the app.

1. Push the repo and in Render choose **New → Blueprint**. Set `MONGO_URI` when asked. `APP_KEY` and `DEMO_RESET_TOKEN` are generated and stored by Render. `APP_URL` is already `https://demo.shamar.dev`.
2. Render adds the custom domain and shows the CNAME target (the service’s `onrender.com` hostname).
3. In Cloudflare, for the `shamar.dev` zone, add:

   | Type | Name | Target | Proxy |
   |------|------|--------|-------|
   | CNAME | `demo` | the hostname Render shows | DNS only (grey cloud) |

   Leave the proxy off until Render reports the certificate as issued. Certificate checks fail while Cloudflare is answering on the name.
4. In Cloudflare SSL/TLS, set the zone encryption mode to **Full (strict)**. Flexible mode talks to Render over HTTP and the HTTPS redirect loops.
5. After the certificate is active you can turn the Cloudflare proxy on. The app still uses `APP_URL=https://demo.shamar.dev`, not the `onrender.com` hostname.

Health check: `GET /health`. Demo wipe: `POST /demo-reset` with `X-Demo-Reset-Token`. The Blueprint sets `SHAMAR_DEMO_MODE=true`.

Media uploads live on the container disk and disappear when the instance is replaced. The demo seed recreates records; it does not restore uploaded files.
