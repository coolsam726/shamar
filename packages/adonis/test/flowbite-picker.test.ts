import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  applyTimeMaskKey,
  assertFlowbitePickerOptions,
  buildFlowbitePickerOptions,
  formatPickerState,
  formatTimeDisplay,
  formatTimeMaskDraft,
  formatTimeParts,
  isoWeekNumber,
  isoWeekStart,
  nudgeTimePart,
  parseFlexibleTimeInput,
  parsePickerBounds,
  parsePickerValue,
  parseTimeMaskState,
  parseTimeParts,
  rangeInts,
  resolveMinuteStep,
  resolveTimeDisplayFormat,
  timeMaskFromParts,
  type FlowbitePickerMode,
} from '../src/shamar/flowbite-picker.js';
import {
  shamarFlowbiteDatepickerCssPath,
  shamarFlowbiteDatepickerJsPath,
} from '../src/shamar/paths.js';

const here = dirname(fileURLToPath(import.meta.url));
const shamarUiPath = join(here, '../assets/shamar-ui.js');

/**
 * Mirrors Flowbite 1.3.x container resolution from Datepicker constructor:
 * `const i = t.container ? document.querySelector(t.container) : null`
 */
function resolveFlowbiteContainer(
  document: Document,
  container: unknown,
): Element | null {
  return container ? document.querySelector(container as string) : null;
}

describe('flowbite picker value codecs', () => {
  it('parses and formats date / datetime / time / week / month states', () => {
    assert.deepEqual(parsePickerValue('2024-03-15', 'date'), {
      year: 2024,
      month: 3,
      day: 15,
      hour: 0,
      minute: 0,
      second: 0,
    });
    assert.equal(
      formatPickerState(parsePickerValue('2024-03-15T09:05:07', 'datetime'), 'datetime', true),
      '2024-03-15T09:05:07',
    );
    assert.equal(
      formatPickerState(parsePickerValue('2024-03-15T09:05', 'datetime'), 'datetime', false),
      '2024-03-15T09:05',
    );
    assert.equal(formatPickerState(parsePickerValue('9:05', 'time'), 'time', false), '09:05');
    assert.equal(formatPickerState(parsePickerValue('2024-03-15', 'week'), 'week'), '2024-03-15');
    assert.equal(formatPickerState(parsePickerValue('2024-03-01', 'month'), 'month'), '2024-03-01');
  });

  it('computes ISO week start/number for Monday weeks', () => {
    // 2024-01-03 is Wednesday → week start Monday 2024-01-01, ISO week 1
    const start = isoWeekStart(new Date(2024, 0, 3), 1);
    assert.equal(start.getFullYear(), 2024);
    assert.equal(start.getMonth(), 0);
    assert.equal(start.getDate(), 1);
    assert.equal(isoWeekNumber(start), 1);
  });

  it('parses bounds for min/max date strings', () => {
    const day = parsePickerBounds('2024-06-01');
    assert.ok(day);
    assert.equal(day.getFullYear(), 2024);
    assert.equal(day.getMonth(), 5);
    assert.equal(day.getDate(), 1);
    assert.ok(parsePickerBounds('2024-06'));
    assert.equal(parsePickerBounds('nope'), null);
  });

  it('formats and parses custom time-picker parts', () => {
    assert.equal(formatTimeParts(9, 5), '09:05');
    assert.equal(formatTimeParts(9, 5, 7, true), '09:05:07');
    assert.deepEqual(parseTimeParts('09:05'), { hour: 9, minute: 5, second: 0 });
    assert.deepEqual(parseTimeParts('9:05:07'), { hour: 9, minute: 5, second: 7 });
    assert.equal(parseTimeParts('25:00'), null);
    assert.deepEqual(rangeInts(3), [0, 1, 2]);
  });

  it('formats and parses 12h / 24h display times while storing 24h', () => {
    assert.equal(resolveTimeDisplayFormat('12'), '12');
    assert.equal(resolveTimeDisplayFormat('24'), '24');
    assert.equal(formatTimeDisplay({ hour: 14, minute: 5 }, '24'), '14:05');
    assert.equal(formatTimeDisplay({ hour: 14, minute: 5 }, '12'), '02:05 PM');
    assert.equal(formatTimeDisplay({ hour: 0, minute: 15 }, '12'), '12:15 AM');
    assert.equal(formatTimeDisplay({ hour: 12, minute: 0 }, '12'), '12:00 PM');
    assert.deepEqual(parseFlexibleTimeInput('2:30pm', '12'), {
      hour: 14,
      minute: 30,
      second: 0,
    });
    assert.deepEqual(parseFlexibleTimeInput('2:30p', '12'), {
      hour: 14,
      minute: 30,
      second: 0,
    });
    assert.deepEqual(parseFlexibleTimeInput('14:30', '24'), {
      hour: 14,
      minute: 30,
      second: 0,
    });
    assert.deepEqual(parseFlexibleTimeInput('930', '24'), {
      hour: 9,
      minute: 30,
      second: 0,
    });
    assert.equal(resolveMinuteStep({ seconds: true }), 1);
    assert.equal(resolveMinuteStep({}), 5);
    assert.equal(resolveMinuteStep({ minuteStep: 15 }), 15);
    assert.deepEqual(
      nudgeTimePart({ hour: 14, minute: 55, second: 0 }, 'minute', 1, 5),
      { hour: 15, minute: 0, second: 0 },
    );
    assert.deepEqual(
      nudgeTimePart({ hour: 10, minute: 0, second: 0 }, 'meridiem', 1),
      { hour: 22, minute: 0, second: 0 },
    );
  });

  it('masks typed time input like a native time field', () => {
    let result = applyTimeMaskKey({ digits: '', meridiem: '' }, '2', '12');
    assert.equal(result.digits, '02');
    assert.equal(result.draft, '02');
    result = applyTimeMaskKey(result, '3', '12');
    assert.equal(result.digits, '023');
    assert.equal(result.draft, '02:3');
    result = applyTimeMaskKey(result, '0', '12');
    assert.equal(result.draft, '02:30');
    result = applyTimeMaskKey(result, 'p', '12');
    assert.equal(result.draft, '02:30 PM');
    assert.deepEqual(parseTimeMaskState(result, '12'), {
      hour: 14,
      minute: 30,
      second: 0,
    });

    result = applyTimeMaskKey({ digits: '', meridiem: '' }, '9', '24');
    assert.equal(result.digits, '09');
    assert.equal(result.draft, '09');
    result = applyTimeMaskKey(result, '4', '24');
    result = applyTimeMaskKey(result, '5', '24');
    assert.equal(result.draft, '09:45');
    assert.deepEqual(parseTimeMaskState(result, '24'), {
      hour: 9,
      minute: 45,
      second: 0,
    });

    const fromParts = timeMaskFromParts({ hour: 14, minute: 5 }, '12');
    assert.deepEqual(fromParts, { digits: '0205', meridiem: 'PM' });
    assert.equal(formatTimeMaskDraft(fromParts.digits, fromParts.meridiem, '12'), '02:05 PM');
  });
});

describe('flowbite picker options contract', () => {
  const modes: FlowbitePickerMode[] = ['date', 'datetime', 'week', 'month'];

  it('never uses an Element as container and uses calendarWeeks for week mode', () => {
    for (const mode of modes) {
      const opts = buildFlowbitePickerOptions({ mode });
      assertFlowbitePickerOptions(opts);
      assert.equal(typeof opts.container, 'string');
      assert.equal(opts.container, 'body');
      assert.equal(opts.todayHighlight, true);
      assert.equal(opts.todayBtn, true);
      assert.ok(!('weekNumbers' in opts));
      if (mode === 'week') assert.equal(opts.calendarWeeks, true);
      if (mode === 'month') {
        assert.equal(opts.pickLevel, 1);
        assert.equal(opts.startView, 1);
      }
    }
  });

  it('rejects HTMLElement container the way Flowbite would', () => {
    const fakeHost = { nodeType: 1 } as unknown as HTMLElement;
    assert.throws(
      () =>
        assertFlowbitePickerOptions({
          container: fakeHost as unknown as string,
        }),
      /CSS selector string/,
    );
  });

  it('shamar-ui.js mirrors the Flowbite 1.3 container/week contracts', () => {
    const src = readFileSync(shamarUiPath, 'utf8');
    assert.doesNotMatch(src, /container:\s*this\.\$refs/);
    assert.doesNotMatch(src, /container:\s*document\.body\b/);
    assert.match(src, /container:\s*['"]body['"]/);
    assert.doesNotMatch(src, /weekNumbers/);
    assert.match(src, /calendarWeeks/);
    assert.match(src, /todayHighlight:\s*true/);
    assert.match(src, /bindOutsideClose/);
    assert.match(src, /pointerdown/);
    assert.match(src, /toggleTime/);
    assert.doesNotMatch(src, /type=["']time["']/);
  });

  it('vendor assets exist on disk for the asset routes', () => {
    const css = readFileSync(shamarFlowbiteDatepickerCssPath(), 'utf8');
    const js = readFileSync(shamarFlowbiteDatepickerJsPath(), 'utf8');
    assert.ok(css.length > 1000);
    assert.match(css, /\.grid-cols-7|\.datepicker/i);
    assert.match(js, /Datepicker/);
    assert.match(js, /document\.querySelector\(t\.container\)/);
  });

  it('date field template uses custom timepicker instead of native time input', () => {
    const edge = readFileSync(join(here, '../resources/views/shamar/partials/fields/date.edge'), 'utf8');
    assert.match(edge, /shamar-timepicker/);
    assert.match(edge, /toggleTime\(\)/);
    assert.match(edge, /timeDraft/);
    assert.match(edge, /nudge\(/);
    assert.match(edge, /timeFormat/);
    // Non-native branch must not use <input type="time">
    const nonNative = edge.split('@else')[1] ?? '';
    assert.doesNotMatch(nonNative, /type="time"/);
  });

  it('shell loads Flowbite CSS before admin.css so responsive nav is not overridden', () => {
    const shell = readFileSync(
      join(here, '../resources/views/shamar/partials/shell-open.edge'),
      'utf8',
    );
    // Datepicker CSS is bundled into admin.css via @import layer(utilities) — no separate link.
    assert.doesNotMatch(shell, /flowbite-datepicker\.min\.css/);
    assert.match(shell, /\/assets\/admin\.css/);
    const inputCss = readFileSync(join(here, '../assets/input.css'), 'utf8');
    assert.match(
      inputCss,
      /@import "\.\/vendor\/flowbite-datepicker\.min\.css" layer\(utilities\);/,
    );
  });

  it('sidebar uses dedicated roots/mobile classes for sidebar-topbar layout', () => {
    const nav = readFileSync(join(here, '../resources/views/shamar/partials/nav.edge'), 'utf8');
    const topbar = readFileSync(join(here, '../resources/views/shamar/partials/topbar.edge'), 'utf8');
    assert.match(nav, /shamar-sidebar__roots/);
    assert.match(nav, /shamar-sidebar__mobile/);
    assert.match(nav, /shamar-sidebar__user/);
    assert.match(nav, /menuRoots/);
    assert.doesNotMatch(nav, /@each\(group in navGroups\)/);
    assert.match(topbar, /shamar-topbar__menu/);
    assert.doesNotMatch(topbar, /class="hidden md:flex/);
    assert.match(nav, /shamar-brand-logo--light/);
    assert.match(nav, /shamar-brand-logo--dark/);
    assert.doesNotMatch(nav, /dark:hidden|dark:block/);
  });

  it('file picker confirms single selection on double-click', () => {
    const ui = readFileSync(shamarUiPath, 'utf8');
    const edge = readFileSync(
      join(here, '../resources/views/shamar/partials/field-input.edge'),
      'utf8',
    );
    assert.match(ui, /pickOnDoubleClick/);
    assert.match(ui, /Single-select: double-click confirms/);
    assert.match(edge, /@dblclick="pickOnDoubleClick\(item\)"/);
  });
});

describe('flowbite container resolution (Flowbite 1.3 path)', () => {
  const { document } = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>')
    .window;

  it('throws the production querySelector error when container is an Element', () => {
    const host = document.getElementById('host');
    assert.ok(host);
    assert.throws(
      () => resolveFlowbiteContainer(document as unknown as Document, host),
      /not a valid selector|Invalid selector|querySelector/i,
    );
  });

  it('resolves Shamar options container "body" to document.body', () => {
    for (const mode of ['date', 'datetime', 'week', 'month'] as FlowbitePickerMode[]) {
      const opts = buildFlowbitePickerOptions({ mode });
      const el = resolveFlowbiteContainer(document as unknown as Document, opts.container);
      assert.equal(el, document.body);
    }
  });

  it('vendor script still uses querySelector for container (API contract)', () => {
    const js = readFileSync(shamarFlowbiteDatepickerJsPath(), 'utf8');
    // Guard against upgrading Flowbite without re-checking Element support.
    assert.match(js, /t\.container\?document\.querySelector\(t\.container\)/);
  });
});
