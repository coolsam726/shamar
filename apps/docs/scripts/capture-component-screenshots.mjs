#!/usr/bin/env node
/**
 * Capture cropped component screenshots for docs reference pages.
 *
 * Usage:
 *   node apps/docs/scripts/capture-component-screenshots.mjs
 *   BASE_URL=http://localhost:3333 node apps/docs/scripts/capture-component-screenshots.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { ALL_COMPONENT_SHOTS } from './component-shots-manifest.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(__dirname, '../public/screenshots/components')
const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3333').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL ?? 'admin@example.com'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'password'
const SHOT_PADDING = Number(process.env.SHOT_PADDING ?? 14)

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 })
}

async function settle(page) {
  await page.waitForLoadState('load')
  await page.waitForTimeout(250)
  await page.evaluate(() => document.fonts?.ready)
}

async function ensureLoggedIn(page) {
  if (page.url().includes('/login')) {
    await login(page)
  }
}

async function dismissOverlays(page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(120)
}

async function firstRowHref(page) {
  const row = page.locator('[data-shamar-row-href]').first()
  await row.waitFor({ timeout: 15_000 })
  return row.getAttribute('data-shamar-row-href')
}

function unionBoxes(...boxes) {
  const valid = boxes.filter(Boolean)
  if (!valid.length) return null
  const x = Math.min(...valid.map((b) => b.x))
  const y = Math.min(...valid.map((b) => b.y))
  const x2 = Math.max(...valid.map((b) => b.x + b.width))
  const y2 = Math.max(...valid.map((b) => b.y + b.height))
  return { x, y, width: x2 - x, height: y2 - y }
}

function clipWithPadding(box, viewport, padding = SHOT_PADDING) {
  const x = Math.max(0, box.x - padding)
  const y = Math.max(0, box.y - padding)
  const width = Math.min(viewport.width - x, box.width + padding * 2)
  const height = Math.min(viewport.height - y, box.height + padding * 2)
  return { x, y, width, height }
}

async function screenshotBox(page, box, outFile) {
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Missing viewport')
  await page.screenshot({
    path: outFile,
    clip: clipWithPadding(box, viewport),
    animations: 'disabled',
  })
}

async function screenshotLocator(page, locator, outFile) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Element has no bounding box')
  await screenshotBox(page, box, outFile)
}

const BEFORE_HOOKS = {
  async openFormLayoutsTab(page) {
    await page.locator('.shamar-tabs__tab', { hasText: 'Layouts' }).click()
    await page.waitForTimeout(200)
  },

  async openCompanyStatusTab(page) {
    await page.locator('.shamar-tabs__tab', { hasText: 'Status' }).click()
    await page.waitForTimeout(200)
  },

  async openFirstCompanyEdit(page) {
    const href = await firstRowHref(page)
    if (!href) throw new Error('No company row')
    await page.goto(`${BASE_URL}${href}/edit`, { waitUntil: 'domcontentloaded' })
    await settle(page)
    await page.locator('[data-field-name="products"]').scrollIntoViewIfNeeded()
  },

  async openFirstProductShow(page) {
    const href = await firstRowHref(page)
    if (!href) throw new Error('No product row')
    await page.goto(`${BASE_URL}${href}`, { waitUntil: 'domcontentloaded' })
    await settle(page)
  },

  async openFirstArticleShow(page) {
    const href = await firstRowHref(page)
    if (!href) throw new Error('No article row')
    await page.goto(`${BASE_URL}${href}`, { waitUntil: 'domcontentloaded' })
    await settle(page)
  },

  async waitForChart(page) {
    await page.waitForSelector('.shamar-dashboard-chart svg, .shamar-dashboard-chart canvas', {
      timeout: 12_000,
    }).catch(() => {})
    await page.waitForTimeout(500)
  },

  async openFirstRowMenu(page) {
    await page.locator('.shamar-row-actions__trigger').first().click()
    await page.waitForTimeout(200)
  },

  async selectFirstBulkRow(page) {
    await page.locator('tbody input[type="checkbox"]').first().check()
    await page.waitForTimeout(250)
  },

  async openSelectCombobox(page, shot) {
    const field = page.locator(`[data-field-name="${shot.field}"]`)
    await field.scrollIntoViewIfNeeded()
    const trigger = field.locator('.shamar-m2o__input, .shamar-combobox__toggle, .shamar-combobox__search--single').first()
    await trigger.click()
    await field.locator('.shamar-m2o__dropdown, .shamar-combobox__dropdown').first().waitFor({
      state: 'visible',
      timeout: 8000,
    })
    await page.waitForTimeout(150)
  },

  async openDatePicker(page, shot) {
    const field = page.locator(`[data-field-name="${shot.field}"]`)
    await field.scrollIntoViewIfNeeded()
    await field.locator('.shamar-flowbite-picker__input').click()
    await page.locator('.datepicker-dropdown:not(.hidden)').last().waitFor({ state: 'visible', timeout: 8000 })
    await page.waitForTimeout(200)
  },

  async openDateTimePicker(page, shot) {
    const field = page.locator(`[data-field-name="${shot.field}"]`)
    await field.scrollIntoViewIfNeeded()
    await field.locator('.shamar-flowbite-picker__input').click()
    await page.locator('.datepicker-dropdown:not(.hidden)').last().waitFor({ state: 'visible', timeout: 8000 })
    await page.waitForTimeout(200)
  },

  async openFilePickerModal(page, shot) {
    const field = page.locator(`[data-field-name="${shot.field}"]`)
    await field.getByRole('button', { name: /Choose/i }).first().click()
    await page.waitForSelector('.shamar-file-picker__dialog', { state: 'visible', timeout: 8000 })
    await page.waitForTimeout(300)
  },
}

async function resolveLocator(page, shot) {
  switch (shot.kind) {
    case 'field':
      return page.locator(`[data-field-name="${shot.field}"]`).first()
    case 'field-open': {
      const field = page.locator(`[data-field-name="${shot.field}"]`).first()
      const openEl = shot.openSelector
        ? page.locator(shot.openSelector).first()
        : field
      return { fieldOpen: true, field, openEl }
    }
    case 'selector':
      return page.locator(shot.selector).first()
    case 'heading':
      return page
        .locator('.shamar-dashboard-widget')
        .filter({ has: page.getByRole('heading', { name: shot.heading, exact: true }) })
        .first()
    case 'column': {
      const headers = page.locator('table thead th')
      const count = await headers.count()
      let index = -1
      for (let i = 0; i < count; i++) {
        const text = (await headers.nth(i).innerText()).trim()
        if (text.toLowerCase().includes(shot.label.toLowerCase())) {
          index = i
          break
        }
      }
      if (index < 0) throw new Error(`Column not found: ${shot.label}`)
      const cell = page.locator('tbody tr').first().locator('td').nth(index)
      const header = headers.nth(index)
      const headerBox = await header.boundingBox()
      const cellBox = await cell.boundingBox()
      if (!headerBox || !cellBox) throw new Error(`Column box missing: ${shot.label}`)
      return { composite: true, header, cell }
    }
    case 'detail':
      return page
        .locator('.shamar-detail-cell')
        .filter({ has: page.locator('.shamar-detail__label', { hasText: shot.label }) })
        .first()
    case 'action':
      return page.locator('.shamar-row-actions__panel, .shamar-bulk-bar').first()
    default:
      throw new Error(`Unknown kind: ${shot.kind}`)
  }
}

async function captureShot(page, shot) {
  const outDir = join(OUT_ROOT, shot.category)
  await mkdir(outDir, { recursive: true })
  const fileName = shot.variant ? `${shot.slug}-${shot.variant}` : shot.slug
  const outFile = join(outDir, `${fileName}.png`)

  await dismissOverlays(page)
  await ensureLoggedIn(page)

  await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('form, table, main, .shamar-dashboard-grid', {
    timeout: 20_000,
  }).catch(() => {})
  await settle(page)

  if (shot.before && BEFORE_HOOKS[shot.before]) {
    await BEFORE_HOOKS[shot.before](page, shot)
  }

  const locator = await resolveLocator(page, shot)

  if (locator?.composite) {
    await locator.header.scrollIntoViewIfNeeded()
    const hb = await locator.header.boundingBox()
    const cb = await locator.cell.boundingBox()
    if (!hb || !cb) throw new Error(`Column capture failed: ${shot.slug}`)
    await screenshotBox(
      page,
      { x: hb.x, y: hb.y, width: hb.width, height: cb.y + cb.height - hb.y },
      outFile,
    )
    return outFile
  }

  if (locator?.fieldOpen) {
    await locator.field.scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    const fieldBox = await locator.field.boundingBox()
    let openBox = await locator.openEl.boundingBox()
    if (!openBox && shot.openSelector?.includes('datepicker')) {
      openBox = await page.locator('.datepicker-dropdown:not(.hidden)').last().boundingBox()
    }
    const merged = unionBoxes(fieldBox, openBox)
    if (!merged) throw new Error(`Open-state capture failed: ${shot.slug}`)
    await screenshotBox(page, merged, outFile)
    return outFile
  }

  await locator.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  await screenshotLocator(page, locator, outFile)
  return outFile
}

async function main() {
  try {
    const statusRes = await fetch(`${BASE_URL}/demo-status`)
    if (!statusRes.ok) throw new Error(`Demo unavailable (${statusRes.status})`)
  } catch (error) {
    throw new Error(`Cannot reach demo at ${BASE_URL}: ${error.message}`)
  }

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  })
  const page = await context.newPage()
  await login(page)

  const captured = []
  const failed = []

  for (const shot of ALL_COMPONENT_SHOTS) {
    try {
      captured.push(await captureShot(page, shot))
      process.stdout.write('.')
    } catch (error) {
      failed.push({ shot: `${shot.category}/${shot.slug}${shot.variant ? `-${shot.variant}` : ''}`, error: error.message })
      process.stdout.write('x')
    }
  }

  await browser.close()
  console.log('')

  const manifest = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    padding: SHOT_PADDING,
    count: captured.length,
    failed,
    files: captured.map((f) => f.replace(join(__dirname, '../public/'), '')),
  }
  await writeFile(join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(`Captured ${captured.length}/${ALL_COMPONENT_SHOTS.length} component screenshots → ${OUT_ROOT}`)
  if (failed.length) {
    console.warn('Failed:')
    for (const f of failed) console.warn(`  ${f.shot}: ${f.error}`)
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
