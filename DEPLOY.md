# Deploying Shamar

The landing page and the docs are static. The panel is the only piece that needs Node and MongoDB.

| Host | What |
|------|------|
| `https://shamar.dev/` | Marketing landing (Cloudflare Workers static assets) |
| `https://shamar.dev/docs/` | Starlight docs (same Worker) |
| `https://demo.shamar.dev/` | Admin panel, login, and `/api` (private VPS) |

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
# → http://localhost:3333/       panel (path `/`)
```

Optional: `pnpm docs:dev` on `:4321` only while editing MDX (then re-run `pnpm site:build`).

## Demo panel on a private VPS

Preferred production path. Cloudflare Pages keeps `shamar.dev`; the VPS only runs the panel image from GHCR.

### One-time VPS setup

1. Install Docker Engine + Compose plugin, and a reverse proxy (Caddy or nginx + certbot).
2. Create the deploy directory and copy the Compose stack from this repo:

```bash
sudo mkdir -p /opt/shamar
sudo chown "$USER:$USER" /opt/shamar
# From a machine with the repo:
scp deploy/demo/docker-compose.yml deploy/demo/deploy.sh deploy/demo/.env.example user@vps:/opt/shamar/
ssh user@vps 'cd /opt/shamar && cp .env.example .env && chmod +x deploy.sh'
```

3. Edit `/opt/shamar/.env` — set `APP_KEY`, `DEMO_RESET_TOKEN`, and confirm `APP_URL` / `DEMO_DOCS_ORIGIN`. Leave `MONGO_URI` unset to use the Compose Mongo service, or set an Atlas URI.
4. Pull and start once:

```bash
cd /opt/shamar
# If the GHCR package is private, set GHCR_TOKEN (read:packages) in .env first.
./deploy.sh
```

5. Point Cloudflare DNS for `demo` at the VPS (A/AAAA, grey cloud until the certificate works), then reverse-proxy to `127.0.0.1:3333`:

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

Then `certbot --nginx -d demo.shamar.dev` (or use Caddy’s automatic HTTPS). Zone SSL/TLS mode: **Full (strict)**.

Health check: `GET https://demo.shamar.dev/health`. Panel: `GET /`. Sign-in: `/login`.

### Deploy on every GitHub Release

[`.github/workflows/deploy-demo.yml`](.github/workflows/deploy-demo.yml) runs when you publish a release (or via **Actions → Deploy demo → Run workflow**):

1. Builds `Dockerfile` target `production`.
2. Pushes `ghcr.io/coolsam726/shamar-demo:<tag>` and `:latest`.
3. SSHs to the VPS, sets `IMAGE_TAG`, and runs `/opt/shamar/deploy.sh`.

Repo secrets (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|--------|---------|
| `DEMO_VPS_HOST` | VPS hostname or IP |
| `DEMO_VPS_USER` | SSH user |
| `DEMO_VPS_SSH_KEY` | Private key (ed25519 recommended) |
| `DEMO_VPS_PORT` | Optional SSH port (default 22) |

Optional repo variable: set `DEMO_VPS_DEPLOY=false` to build/push images without SSHing (useful until the VPS is ready).

Make the GHCR package public (**Packages → shamar-demo → Package settings → Change visibility**), or leave it private and put `GHCR_TOKEN` / `GHCR_USER` in `/opt/shamar/.env`.

Release flow: tag and publish as usual (`gh release create v0.x.y`). npm packages still publish via [`publish.yml`](.github/workflows/publish.yml); the demo image deploys in parallel.

### Manual DB wipe

```bash
curl -X POST https://demo.shamar.dev/demo-reset \
  -H "X-Demo-Reset-Token: $DEMO_RESET_TOKEN"
```

Media uploads persist in the `shamar_media` Docker volume. A demo reset reseeds DB records; it does not wipe that volume.

## Cloudflare Workers (static site)

Create a Worker named **`shamar`** from this repo (Workers & Pages → Create → Connect to Git). Project name must match [`apps/docs/wrangler.toml`](apps/docs/wrangler.toml).

Workers Builds uses `wrangler deploy` with static assets (`[assets] directory = "./dist"`), not the older Pages `pages_build_output_dir` flow.

Because this is a pnpm monorepo, set **Root directory** to `apps/docs` and run the install/build from the repo root:

| Setting | Value |
|---------|--------|
| Root directory | `apps/docs` |
| Build command | `cd ../.. && pnpm install --frozen-lockfile && pnpm pages:build` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |
| `NODE_VERSION` | `22` |

Custom domains: `shamar.dev` and `www.shamar.dev`. The Worker is the origin for the apex; DNS for `@` and `www` stay on that Worker. The demo hostname is a separate record pointed at the VPS.

Optional: add a Cloudflare Redirect Rule so `docs.shamar.dev/*` → `https://shamar.dev/docs/$1` (301).

## GitHub Pages (legacy redirect)

`https://coolsam726.github.io/shamar/` still deploys from [`.github/workflows/pages.yml`](.github/workflows/pages.yml), but only as a client-side redirect to `https://shamar.dev/` (path under `/shamar` is preserved). Do **not** set a GitHub Pages custom domain to `shamar.dev` — Cloudflare already serves that hostname.

In the repo: **Settings → Pages → Source: GitHub Actions**, Custom domain empty.

The production image builds the packages and the playground only. It does not include the marketing site. The host must set `PORT`. Set `APP_URL` to `https://demo.shamar.dev`.

```bash
docker build --target production -t shamar-demo .
```

## Self-host without Docker (optional)

1. Install Node 22+, pnpm, MongoDB (or Atlas), nginx, certbot.
2. Clone the repo, create `apps/playground/.env` (production values from `deploy/demo/.env.example`).
3. Build & run:

```bash
pnpm install --frozen-lockfile
pnpm --filter './packages/*' build
pnpm --filter @shamar/playground exec node ace build --ignore-ts-errors
cd apps/playground/build && node bin/server.js
```

## Render (legacy)

[`render.yaml`](render.yaml) remains as an optional Blueprint. Prefer the VPS path above if Free-tier cold starts are painful.
