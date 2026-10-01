#!/usr/bin/env node
/**
 * Capture admin panel screenshots from the live playground demo.
 *
 * Usage:
 *   node apps/docs/scripts/capture-screenshots.mjs
 *   BASE_URL=http://localhost:3333 node apps/docs/scripts/capture-screenshots.mjs
 *   SHOT_THEME=light|dark|both (default both)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../public/screenshots')
const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3333').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL ?? 'admin@example.com'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'password'
const THEME_MODE = (process.env.SHOT_THEME ?? 'both').toLowerCase()
const THEMES = THEME_MODE === 'both' ? ['light', 'dark'] : [THEME_MODE === 'dark' ? 'dark' : 'light']

/** @type {{ name: string; path: string; auth?: boolean; waitFor?: string }[]} */
const SHOTS = [
  { name: 'login', path: '/login', auth: false },
  { name: 'dashboard', path: '/', waitFor: '[data-shamar-page]' },
  { name: 'products-list', path: '/products', waitFor: 'table' },
  { name: 'product-form', path: '/products/create', waitFor: 'form' },
  { name: 'media-library', path: '/media', waitFor: '[data-shamar-media]' },
  { name: 'settings', path: '/settings', waitFor: 'form' },
  { name: 'product-catalog', path: '/product-catalog', waitFor: 'table' },
]

function shotFilename(name, theme) {
  return theme === 'dark' ? `${name}-dark.png` : `${name}.png`
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 })
}

async function settle(page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
  await page.evaluate(() => document.fonts?.ready)
}

/**
 * @param {import('playwright').Browser} browser
 * @param {'light' | 'dark'} theme
 */
async function themedContext(browser, theme) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  })
  await context.addInitScript((t) => {
    try {
      localStorage.setItem('shamar-theme', t)
    } catch {
      /* ignore */
    }
  }, theme)
  return context
}

async function capture(page, shot, theme) {
  await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'domcontentloaded' })
  if (shot.waitFor) {
    await page.waitForSelector(shot.waitFor, { timeout: 20_000 }).catch(() => {})
  }
  await settle(page)

  const file = join(OUT_DIR, shotFilename(shot.name, theme))
  await page.screenshot({
    path: file,
    fullPage: false,
    animations: 'disabled',
  })
  return file
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const captured = []

  try {
    const statusRes = await fetch(`${BASE_URL}/demo-status`)
    if (!statusRes.ok) {
      throw new Error(`Demo unavailable at ${BASE_URL} (${statusRes.status})`)
    }
  } catch (error) {
    await browser.close()
    throw new Error(`Cannot reach demo at ${BASE_URL}: ${error.message}`)
  }

  for (const theme of THEMES) {
    const context = await themedContext(browser, theme)
    const page = await context.newPage()
    await login(page)

    for (const shot of SHOTS) {
      if (shot.auth === false) {
        const guest = await themedContext(browser, theme)
        const guestPage = await guest.newPage()
        captured.push(await capture(guestPage, shot, theme))
        await guest.close()
        continue
      }
      captured.push(await capture(page, shot, theme))
    }

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-shamar-page]', { timeout: 20_000 }).catch(() => {})
    await settle(page)
    const heroFile = join(OUT_DIR, shotFilename('hero-panel', theme))
    await page.screenshot({
      path: heroFile,
      clip: { x: 0, y: 0, width: 1440, height: 820 },
      animations: 'disabled',
    })
    captured.push(heroFile)

    await context.close()
  }

  await browser.close()

  const manifest = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    themes: THEMES,
    files: captured.map((f) => f.replace(OUT_DIR + '/', '')),
  }
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`Captured ${captured.length} screenshots → ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
