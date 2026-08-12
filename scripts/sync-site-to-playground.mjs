#!/usr/bin/env node
/**
 * Copy the Astro static site into the playground `public/` folder so Adonis
 * can serve landing + /docs from the same process as /demo.
 */
import { cp, mkdir, rm, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'apps/docs/dist')
const pub = join(root, 'apps/playground/public')

const SITE_ENTRIES = [
  'index.html',
  '404.html',
  'docs',
  '_astro',
  'pagefind',
  'favicon.svg',
  'branding',
  'sitemap-index.xml',
  'sitemap-0.xml',
]

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

if (!(await exists(dist))) {
  console.error(`[site:sync] Missing ${dist}. Run pnpm docs:build first.`)
  process.exit(1)
}

await mkdir(pub, { recursive: true })

for (const name of SITE_ENTRIES) {
  const from = join(dist, name)
  const to = join(pub, name)
  if (!(await exists(from))) continue
  await rm(to, { recursive: true, force: true })
  await cp(from, to, { recursive: true })
  console.log(`[site:sync] ${name}`)
}

// Never ship the Astro /demo hub — the Adonis panel owns /demo.
await rm(join(pub, 'demo'), { recursive: true, force: true })

console.log(`[site:sync] Site assets synced → ${pub}`)
