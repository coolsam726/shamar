/**
 * Pure helpers for Flowbite / vanillajs-datepicker integration.
 * Kept separate from shamar-ui.js so option contracts can be tested against the real library.
 *
 * Flowbite 1.3.x notes:
 * - `container` is resolved with `document.querySelector(...)` — must be a CSS selector string, never an Element.
 * - Week numbers use `calendarWeeks` (not `weekNumbers` from newer vanillajs-datepicker).
 */

export type FlowbitePickerMode = 'date' | 'datetime' | 'time' | 'week' | 'month';

export type FlowbitePickerParts = {
  year: number | null;
  month: number | null;
  day: number | null;
  hour: number;
  minute: number;
  second: number;
};

export type BuildFlowbitePickerOptionsInput = {
  mode: FlowbitePickerMode;
  min?: string | null;
  max?: string | null;
  /** CSS selector only — Flowbite does not accept HTMLElement here. */
  container?: string;
  weekStart?: number;
  selectedWeekStart?: Date | null;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function dateOnlyStamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function isoWeekStart(date: Date, weekStart = 1): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function isoWeekNumber(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

export function parsePickerBounds(raw: unknown): Date | null {
  if (raw == null || raw === '') return null;
  const str = String(raw).trim();
  const ym = /^(\d{4})-(\d{2})$/.exec(str);
  if (ym) return new Date(Number(ym[1]), Number(ym[2]) - 1, 1);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  const dt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
  if (dt) {
    return new Date(
      Number(dt[1]),
      Number(dt[2]) - 1,
      Number(dt[3]),
      Number(dt[4]),
      Number(dt[5]),
      dt[6] != null ? Number(dt[6]) : 0,
    );
  }
  const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(str);
  if (timeOnly) {
    const d = new Date();
    d.setHours(
      Number(timeOnly[1]),
      Number(timeOnly[2]),
      timeOnly[3] != null ? Number(timeOnly[3]) : 0,
      0,
    );
    return d;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parsePickerValue(raw: unknown, mode: FlowbitePickerMode): FlowbitePickerParts | null {
  if (raw == null || raw === '') return null;
  const str = String(raw).trim();
  if (mode === 'time') {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(str);
    if (!m) return null;
    return {
      year: null,
      month: null,
      day: null,
      hour: Number(m[1]),
      minute: Number(m[2]),
      second: m[3] != null ? Number(m[3]) : 0,
    };
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (dateOnly) {
    return {
      year: Number(dateOnly[1]),
      month: Number(dateOnly[2]),
      day: Number(dateOnly[3]),
      hour: 0,
      minute: 0,
      second: 0,
    };
  }
  const dt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
  if (dt) {
    return {
      year: Number(dt[1]),
      month: Number(dt[2]),
      day: Number(dt[3]),
      hour: Number(dt[4]),
      minute: Number(dt[5]),
      second: dt[6] != null ? Number(dt[6]) : 0,
    };
  }
  const parsed = parsePickerBounds(str);
  if (!parsed) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
    hour: parsed.getHours(),
    minute: parsed.getMinutes(),
    second: parsed.getSeconds(),
  };
}

export function formatPickerState(
  parts: FlowbitePickerParts | null | undefined,
  mode: FlowbitePickerMode,
  withSeconds = false,
): string {
  if (!parts) return '';
  if (mode === 'time') {
    return withSeconds
      ? `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
      : `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  }
  if (parts.year == null || parts.month == null || parts.day == null) return '';
  const date = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  if (mode === 'date' || mode === 'week' || mode === 'month') return date;
  const time = withSeconds
    ? `T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
    : `T${pad2(parts.hour)}:${pad2(parts.minute)}`;
  return date + time;
}

export function buildDisplayFormat(mode: FlowbitePickerMode) {
  return {
    toValue(date: Date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;
      if (mode === 'month') {
        return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      }
      if (mode === 'week') {
        return isoWeekStart(date, 1).getTime();
      }
      return dateOnlyStamp(date);
    },
    toDisplay(date: Date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
      if (mode === 'week') {
        const start = isoWeekStart(date, 1);
        return `Week ${isoWeekNumber(start)}, ${start.getFullYear()}`;
      }
      if (mode === 'month') {
        return new Intl.DateTimeFormat(undefined, {
          year: 'numeric',
          month: 'long',
        }).format(date);
      }
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
    },
  };
}

/**
 * Options passed to `new Datepicker(input, options)`.
 * Never pass an HTMLElement as `container` — Flowbite stringifies it and querySelector fails.
 */
export function buildFlowbitePickerOptions(input: BuildFlowbitePickerOptionsInput): Record<string, unknown> {
  const mode = input.mode;
  const opts: Record<string, unknown> = {
    autohide: mode === 'date' || mode === 'week' || mode === 'month',
    todayBtn: true,
    todayBtnMode: 1,
    todayHighlight: true,
    clearBtn: true,
    format: buildDisplayFormat(mode),
    orientation: 'bottom',
    weekStart: input.weekStart ?? 1,
    // Append to body so overflow:hidden ancestors do not clip the popup.
    // Must be a selector string for Flowbite 1.3.x.
    container: input.container ?? 'body',
  };

  if (input.min) opts.minDate = input.min;
  if (input.max) opts.maxDate = input.max;

  if (mode === 'month') {
    opts.pickLevel = 1;
    opts.startView = 1;
  }

  if (mode === 'week') {
    opts.calendarWeeks = true;
    const selectedWeekStart = input.selectedWeekStart ?? null;
    opts.beforeShowDay = (date: Date) => {
      if (!selectedWeekStart) return undefined;
      const start = dateOnlyStamp(selectedWeekStart);
      const end = start + 6 * 86400000;
      const stamp = dateOnlyStamp(date);
      if (stamp >= start && stamp <= end) {
        return { classes: 'range bg-gray-200 dark:bg-gray-600' };
      }
      return undefined;
    };
  }

  return opts;
}

/** Runtime guard used by tests and (optionally) the UI wrapper. */
export function assertFlowbitePickerOptions(options: Record<string, unknown>): void {
  if (options.container != null && typeof options.container !== 'string') {
    throw new TypeError(
      `Flowbite datepicker "container" must be a CSS selector string, got ${typeof options.container}`,
    );
  }
  if ('weekNumbers' in options) {
    throw new TypeError(
      'Flowbite 1.3.x does not support "weekNumbers"; use "calendarWeeks" instead',
    );
  }
  if (options.todayHighlight !== true) {
    throw new TypeError('Flowbite datepicker should enable todayHighlight');
  }
}

export function formatTimeParts(
  hour: number,
  minute: number,
  second = 0,
  withSeconds = false,
): string {
  const base = `${pad2(hour)}:${pad2(minute)}`;
  return withSeconds ? `${base}:${pad2(second)}` : base;
}

export type TimeDisplayFormat = '12' | '24';

export function resolveTimeDisplayFormat(preferred?: string | null): TimeDisplayFormat {
  if (preferred === '12' || preferred === '24') return preferred;
  try {
    const hour12 = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions()
      .hour12;
    return hour12 ? '12' : '24';
  } catch {
    return '24';
  }
}

export function resolveMinuteStep(options: {
  minuteStep?: number | null;
  seconds?: boolean;
  step?: number | string | null;
}): number {
  if (options.minuteStep != null && Number.isFinite(Number(options.minuteStep))) {
    return Math.max(1, Math.min(30, Math.floor(Number(options.minuteStep))));
  }
  if (options.seconds) return 1;
  const step = Number(options.step);
  if (Number.isFinite(step) && step > 0 && step < 60) {
    return Math.max(1, Math.floor(step));
  }
  return 5;
}

/** 24h parts → display string (`14:05` or `2:05 PM`). */
export function formatTimeDisplay(
  parts: { hour: number; minute: number; second?: number } | null | undefined,
  format: TimeDisplayFormat,
  withSeconds = false,
): string {
  if (!parts) return '';
  const minute = pad2(parts.minute);
  const second = pad2(parts.second ?? 0);
  if (format === '24') {
    const base = `${pad2(parts.hour)}:${minute}`;
    return withSeconds ? `${base}:${second}` : base;
  }
  const hour24 = ((parts.hour % 24) + 24) % 24;
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const base = `${pad2(hour12)}:${minute}`;
  return withSeconds ? `${base}:${second} ${meridiem}` : `${base} ${meridiem}`;
}

export type TimeMaskMeridiem = '' | 'AM' | 'PM';

export type TimeMaskState = {
  digits: string;
  meridiem: TimeMaskMeridiem;
};

export function timeMaskDigitCapacity(withSeconds: boolean): number {
  return withSeconds ? 6 : 4;
}

/** Progressive masked draft from digit buffer + optional AM/PM. */
export function formatTimeMaskDraft(
  digits: string,
  meridiem: TimeMaskMeridiem,
  format: TimeDisplayFormat,
  withSeconds = false,
): string {
  const raw = String(digits || '').replace(/\D/g, '');
  let result = '';
  if (raw.length <= 2) {
    result = raw;
  } else if (raw.length <= 4) {
    result = `${raw.slice(0, 2)}:${raw.slice(2)}`;
  } else {
    const capped = raw.slice(0, timeMaskDigitCapacity(withSeconds));
    result = `${capped.slice(0, 2)}:${capped.slice(2, 4)}:${capped.slice(4)}`;
  }
  if (format === '12' && meridiem) {
    return result ? `${result} ${meridiem}` : meridiem;
  }
  return result;
}

export function timeMaskFromParts(
  parts: { hour: number; minute: number; second?: number },
  format: TimeDisplayFormat,
  withSeconds = false,
): TimeMaskState {
  const hour24 = ((parts.hour % 24) + 24) % 24;
  const hour =
    format === '12' ? (hour24 % 12 === 0 ? 12 : hour24 % 12) : hour24;
  let digits = `${pad2(hour)}${pad2(parts.minute)}`;
  if (withSeconds) digits += pad2(parts.second ?? 0);
  const meridiem: TimeMaskMeridiem =
    format === '12' ? (hour24 >= 12 ? 'PM' : 'AM') : '';
  return { digits, meridiem };
}

export function parseTimeMaskState(
  state: TimeMaskState,
  format: TimeDisplayFormat,
  withSeconds = false,
): { hour: number; minute: number; second: number } | null {
  const need = timeMaskDigitCapacity(withSeconds);
  const digits = String(state.digits || '').replace(/\D/g, '');
  if (digits.length < need) return null;
  if (format === '12' && !state.meridiem) return null;
  const hour = Number(digits.slice(0, 2));
  const minute = Number(digits.slice(2, 4));
  const second = withSeconds ? Number(digits.slice(4, 6)) : 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
    return null;
  }
  if (minute > 59 || second > 59) return null;
  if (format === '12') {
    if (hour < 1 || hour > 12) return null;
    const meridiem = state.meridiem;
    const hour24 =
      meridiem === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
    return { hour: hour24, minute, second };
  }
  if (hour > 23) return null;
  return { hour, minute, second };
}

/**
 * Apply one keystroke to a time mask (digits auto-segment; A/P set AM/PM).
 * Returns `handled: true` when the key should not reach the native input.
 */
export function applyTimeMaskKey(
  state: TimeMaskState,
  key: string,
  format: TimeDisplayFormat,
  withSeconds = false,
): TimeMaskState & { draft: string; handled: boolean } {
  const max = timeMaskDigitCapacity(withSeconds);
  const digits = String(state.digits || '').replace(/\D/g, '').slice(0, max);
  let meridiem: TimeMaskMeridiem = state.meridiem || '';
  const draftOf = (nextDigits: string, nextMeridiem: TimeMaskMeridiem) =>
    formatTimeMaskDraft(nextDigits, nextMeridiem, format, withSeconds);

  if (/^[0-9]$/.test(key)) {
    if (digits.length >= max) {
      return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
    }
    const pos = digits.length;
    const d = Number(key);
    let next = digits;

    if (pos === 0) {
      if (format === '24' && d > 2) next = `0${key}`;
      else if (format === '12' && d > 1) next = `0${key}`;
      else next = key;
    } else if (pos === 1) {
      const hour = Number(`${digits[0]}${key}`);
      if (format === '24' && hour > 23) {
        return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
      }
      if (format === '12' && (hour > 12 || hour === 0)) {
        // `2` then `3` → treat as hour 2, start minutes with 3 → `023`
        if (digits.length + 2 > max) {
          return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
        }
        next = `0${digits[0]}${key}`;
      } else {
        next = `${digits}${key}`;
      }
    } else if (pos === 2 || pos === 4) {
      if (d > 5) {
        if (digits.length + 2 > max) {
          return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
        }
        next = `${digits}0${key}`;
      } else {
        next = `${digits}${key}`;
      }
    } else {
      next = `${digits}${key}`;
    }

    next = next.slice(0, max);
    return { digits: next, meridiem, draft: draftOf(next, meridiem), handled: true };
  }

  if (format === '12' && (key === 'a' || key === 'A' || key === 'p' || key === 'P')) {
    meridiem = key === 'a' || key === 'A' ? 'AM' : 'PM';
    return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
  }

  if (key === 'Backspace' || key === 'Delete') {
    if (format === '12' && meridiem) {
      meridiem = '';
      return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
    }
    const next = digits.slice(0, -1);
    return { digits: next, meridiem, draft: draftOf(next, meridiem), handled: true };
  }

  if (key === ':' || key === ' ') {
    return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
  }

  // Swallow other printable characters so the field stays masked.
  if (key.length === 1) {
    return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
  }

  return { digits, meridiem, draft: draftOf(digits, meridiem), handled: false };
}

/**
 * Parse typed time input in 12h or 24h style into 24h parts.
 * Accepts `14:30`, `2:30pm`, `2:30 PM`, `930`, `930pm`, `2:30p`, etc.
 */
export function parseFlexibleTimeInput(
  raw: string,
  format: TimeDisplayFormat = '24',
): { hour: number; minute: number; second: number } | null {
  const str = String(raw || '').trim();
  if (!str) return null;

  const meridiemMatch = /(a\.?m\.?|p\.?m\.?|[ap])\s*$/i.exec(str);
  const hasMeridiem = Boolean(meridiemMatch);
  const meridiemToken = meridiemMatch ? meridiemMatch[1]!.toLowerCase().replace(/\./g, '') : null;
  const meridiem =
    meridiemToken == null
      ? null
      : meridiemToken.startsWith('a')
        ? 'am'
        : 'pm';
  const cleaned = str
    .replace(/(a\.?m\.?|p\.?m\.?|[ap])\s*$/i, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '');

  let hour = 0;
  let minute = 0;
  let second = 0;

  const colon = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(cleaned);
  if (colon) {
    hour = Number(colon[1]);
    minute = Number(colon[2]);
    second = colon[3] != null ? Number(colon[3]) : 0;
  } else if (/^\d{3,6}$/.test(cleaned)) {
    // 930 → 9:30, 0930 → 09:30, 93045 → 9:30:45
    if (cleaned.length <= 4) {
      const padded = cleaned.padStart(4, '0');
      hour = Number(padded.slice(0, 2));
      minute = Number(padded.slice(2, 4));
    } else {
      const padded = cleaned.padStart(6, '0');
      hour = Number(padded.slice(0, 2));
      minute = Number(padded.slice(2, 4));
      second = Number(padded.slice(4, 6));
    }
  } else {
    return null;
  }

  if (minute > 59 || second > 59) return null;

  if (hasMeridiem || format === '12') {
    if (hour < 0 || hour > 12) return null;
    let hour24: number;
    if (meridiem === 'am') {
      hour24 = hour === 12 ? 0 : hour;
    } else if (meridiem === 'pm') {
      hour24 = hour === 12 ? 12 : hour + 12;
    } else {
      // No meridiem in 12h mode: 12 → noon, 0 → midnight, 1–11 → morning.
      hour24 = hour === 12 ? 12 : hour;
    }
    return { hour: hour24, minute, second };
  }

  if (hour > 23) return null;
  return { hour, minute, second };
}

export function parseTimeParts(
  raw: string,
): { hour: number; minute: number; second: number } | null {
  return parseFlexibleTimeInput(raw, '24');
}

export function nudgeTimePart(
  parts: { hour: number; minute: number; second: number },
  unit: 'hour' | 'minute' | 'second' | 'meridiem',
  delta: number,
  minuteStep = 5,
): { hour: number; minute: number; second: number } {
  let { hour, minute, second } = parts;
  if (unit === 'meridiem') {
    hour = (hour + 12) % 24;
    return { hour, minute, second };
  }
  if (unit === 'hour') {
    hour = (hour + delta + 24) % 24;
    return { hour, minute, second };
  }
  if (unit === 'second') {
    second = (second + delta + 60) % 60;
    return { hour, minute, second };
  }
  const step = Math.max(1, minuteStep);
  const next = minute + delta * step;
  if (next >= 60) {
    minute = next % 60;
    hour = (hour + Math.floor(next / 60)) % 24;
  } else if (next < 0) {
    const borrow = Math.ceil(-next / 60);
    minute = ((next % 60) + 60) % 60;
    hour = (hour - borrow + 24 * 10) % 24;
  } else {
    minute = next;
  }
  return { hour, minute, second };
}

export function rangeInts(end: number, start = 0): number[] {
  const out: number[] = [];
  for (let i = start; i < end; i += 1) out.push(i);
  return out;
}
