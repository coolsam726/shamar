import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createContext, runInContext } from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const shamarUiPath = join(here, '../assets/shamar-ui.js')

describe('dashboard chart pie/donut colors', () => {
  it('shamar-ui.js resolves top-level colors for radial charts', () => {
    const src = readFileSync(shamarUiPath, 'utf8')
    assert.match(src, /function resolveChartColors\(/)
    assert.match(src, /config\.data\?\.colors/)
    assert.match(src, /isRadial/)

    // Extract and unit-test color helpers without DOM / Apex.
    const start = src.indexOf('function readBrandColor()')
    const end = src.indexOf('function createApexChart(')
    assert.ok(start > 0 && end > start, 'expected color helpers in shamar-ui.js')
    const helpers = src.slice(start, end)
    const sandbox = createContext({
      document: {
        documentElement: {
          classList: { contains: () => false },
        },
      },
      getComputedStyle: () => ({
        getPropertyValue: () => '#f1511b',
      }),
    })
    runInContext(
      `${helpers}\nthis.resolveChartColors = resolveChartColors;`,
      sandbox,
    )
    const resolve = (sandbox as { resolveChartColors: Function }).resolveChartColors
    const asStrings = (value: unknown) => Array.from(value as string[])

    const pieColors = asStrings(
      resolve(
        {
          data: {
            labels: ['Present', 'Absent'],
            datasets: [{ label: 'Roll', data: [12, 3], color: '#2E7D32' }],
            colors: ['#2E7D32', '#B3261E'],
          },
        },
        {
          isRadial: true,
          labels: ['Present', 'Absent'],
          datasets: [{ label: 'Roll', data: [12, 3], color: '#2E7D32' }],
        },
      ),
    )
    assert.deepEqual(pieColors, ['#2E7D32', '#B3261E'])

    const fromDatasetArray = asStrings(
      resolve(
        {
          data: {
            labels: ['A', 'B'],
            datasets: [{ label: 'Mix', data: [1, 2], color: ['#111', '#222'] }],
          },
        },
        {
          isRadial: true,
          labels: ['A', 'B'],
          datasets: [{ label: 'Mix', data: [1, 2], color: ['#111', '#222'] }],
        },
      ),
    )
    assert.deepEqual(fromDatasetArray, ['#111', '#222'])

    const fromColorsProp = asStrings(
      resolve(
        {
          data: {
            labels: ['Yes', 'No'],
            datasets: [{ label: 'Mix', data: [8, 2], colors: ['#0369a1', '#64748b'] }],
          },
        },
        {
          isRadial: true,
          labels: ['Yes', 'No'],
          datasets: [{ label: 'Mix', data: [8, 2], colors: ['#0369a1', '#64748b'] }],
        },
      ),
    )
    assert.deepEqual(fromColorsProp, ['#0369a1', '#64748b'])

    const lineColors = asStrings(
      resolve(
        {
          data: {
            labels: ['Mon'],
            datasets: [
              { label: 'A', data: [1], color: '#aaa' },
              { label: 'B', data: [2] },
            ],
          },
        },
        {
          isRadial: false,
          labels: ['Mon'],
          datasets: [
            { label: 'A', data: [1], color: '#aaa' },
            { label: 'B', data: [2] },
          ],
        },
      ),
    )
    assert.equal(lineColors[0], '#aaa')
    assert.equal(typeof lineColors[1], 'string')
    assert.ok(lineColors[1].length > 0)
  })
})
