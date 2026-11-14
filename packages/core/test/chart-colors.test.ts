import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveChartSeriesColors } from '../src/widgets/chart-widget.js';

const PALETTE = ['#aaa', '#bbb', '#ccc', '#ddd'];

describe('resolveChartSeriesColors', () => {
  it('uses per-dataset color for line/bar/area', () => {
    assert.deepEqual(
      resolveChartSeriesColors({
        radial: false,
        palette: PALETTE,
        datasets: [{ data: [1, 2], color: '#111' }, { data: [3, 4] }],
      }),
      ['#111', '#bbb'],
    );
  });

  it('honors top-level colors for pie/donut slices', () => {
    assert.deepEqual(
      resolveChartSeriesColors({
        radial: true,
        palette: PALETTE,
        labels: ['Present', 'Absent'],
        colors: ['#2E7D32', '#B3261E'],
        datasets: [{ data: [12, 3], color: '#ignored' }],
      }),
      ['#2E7D32', '#B3261E'],
    );
  });

  it('honors datasets[0].colors for pie/donut', () => {
    assert.deepEqual(
      resolveChartSeriesColors({
        radial: true,
        palette: PALETTE,
        labels: ['Yes', 'No'],
        datasets: [{ data: [8, 2], colors: ['#0369a1', '#64748b'] }],
      }),
      ['#0369a1', '#64748b'],
    );
  });

  it('honors datasets[0].color string[] for pie/donut', () => {
    assert.deepEqual(
      resolveChartSeriesColors({
        radial: true,
        palette: PALETTE,
        labels: ['A', 'B'],
        datasets: [{ data: [1, 2], color: ['#111', '#222'] }],
      }),
      ['#111', '#222'],
    );
  });

  it('maps per-dataset color when each slice is its own dataset', () => {
    assert.deepEqual(
      resolveChartSeriesColors({
        radial: true,
        palette: PALETTE,
        labels: ['A', 'B'],
        datasets: [
          { data: [1], color: '#111' },
          { data: [2], color: '#222' },
        ],
      }),
      ['#111', '#222'],
    );
  });

  it('falls back to palette for multi-slice pie when only a single dataset.color string is set', () => {
    assert.deepEqual(
      resolveChartSeriesColors({
        radial: true,
        palette: PALETTE,
        labels: ['Present', 'Absent'],
        datasets: [{ data: [12, 3], color: '#2E7D32' }],
      }),
      ['#aaa', '#bbb'],
    );
  });

  it('uses single dataset.color for a one-slice pie', () => {
    assert.deepEqual(
      resolveChartSeriesColors({
        radial: true,
        palette: PALETTE,
        labels: ['Only'],
        datasets: [{ data: [1], color: '#2E7D32' }],
      }),
      ['#2E7D32'],
    );
  });

  it('pads short color lists with the palette', () => {
    assert.deepEqual(
      resolveChartSeriesColors({
        radial: true,
        palette: PALETTE,
        labels: ['A', 'B', 'C'],
        colors: ['#111'],
        datasets: [{ data: [1, 2, 3] }],
      }),
      ['#111', '#bbb', '#ccc'],
    );
  });
});
