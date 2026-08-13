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

Regenerate from a running playground:

```bash
pnpm --filter @shamar/docs screenshots          # full-page + cropped components
pnpm --filter @shamar/docs screenshots:components  # cropped components only
pnpm site:build
```

Component crops are saved under `public/screenshots/components/{category}/{slug}.png` and wired into reference MDX via `pnpm reference`.

Form field screenshots are captured from the playground gallery at `/demo/form-components` (Developer → Form components in the sidebar). RelationTable remains on company edit.

## Reference docs

Filament-style component reference lives under `src/content/docs/docs/reference/` — Resources, Forms (each field type), Tables, Infolists, Widgets, Actions, and Pages.

Regenerate reference pages after API changes:

```bash
pnpm --filter @shamar/docs reference
```

The sidebar (`sidebar.mjs`) reads titles from generated MDX frontmatter.

## Screenshots

Panel screenshots live in `public/screenshots/` and are referenced from MDX via `DocScreenshot` and on the landing page.

Regenerate from a running playground demo (default `http://localhost:3333`):

```bash
pnpm --filter @shamar/playground dev   # or docker compose --profile dev up
pnpm --filter @shamar/docs screenshots
pnpm site:build
```

Optional env: `BASE_URL`, `DEMO_EMAIL`, `DEMO_PASSWORD`.

Optional env for the Astro build:

```bash
PUBLIC_SITE_URL=https://shamar.savannabits.com
# leave PUBLIC_DEMO_URL empty for same-origin /demo-status
```

## Deploy

See [DEPLOY.md](../../DEPLOY.md) — single Debian host behind nginx.
