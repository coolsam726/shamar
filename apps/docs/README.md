# Shamar documentation (Astro + Starlight)

Built as a static site, then **synced into the playground** so one Adonis server serves:

| Path | What |
|------|------|
| `/` | Landing |
| `/docs/` | This documentation |
| `/demo` | Live admin panel (Adonis) |

## Unified local server (recommended)

```bash
# from monorepo root
pnpm site:build          # Astro build → apps/playground/public/
pnpm --filter @shamar/playground dev
# http://localhost:3333
```

## Docs-only (HMR while writing MDX)

```bash
pnpm docs:dev
# http://localhost:4321
```

Then re-run `pnpm site:build` before using the unified playground.

Optional env for the Astro build:

```bash
PUBLIC_SITE_URL=https://shamar.savannabits.com
# leave PUBLIC_DEMO_URL empty for same-origin /demo-status
```

## Deploy

See [DEPLOY.md](../../DEPLOY.md) — single Debian host behind nginx.
