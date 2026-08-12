/**
 * Shared codecs for field hydrate (stored → form) and dehydrate (request → stored).
 * Field types register their own lifecycle; these helpers keep that logic DRY.
 */

export function fieldInputRaw(
  field: { name: string },
  input: Record<string, unknown>,
): { present: boolean; raw: unknown } {
  if (field.name in input) return { present: true, raw: input[field.name] };
  const aliased = `${field.name}[]`;
  if (aliased in input) return { present: true, raw: input[aliased] };
  return { present: false, raw: undefined };
}

export function parseJsonValue(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function asNumber(raw: unknown): number | '' {
  if (raw == null || raw === '') return '';
  const num = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(num) ? num : '';
}

/** Parse currency-ish user input into a finite number (or empty string). */
export function parseCurrencyInput(value: unknown): number | '' {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return '';
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : '';
}

export function asBoolean(raw: unknown): boolean {
  return raw === true || raw === '1' || raw === 'on' || raw === 'true';
}

export function sanitizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const out = new Set<string>();
  for (const id of values) {
    if (id == null) continue;
    const value = String(id).trim();
    if (!value || value === 'null' || value === 'undefined') continue;
    out.add(value);
  }
  return [...out];
}

export function dehydrateStringList(raw: unknown, commaSplit = false): string[] {
  if (Array.isArray(raw)) return sanitizeStringList(raw);
  if (typeof raw === 'string' && raw.trim()) {
    const parts = commaSplit ? raw.split(',') : [raw];
    return sanitizeStringList(parts);
  }
  return [];
}

export function asRepeaterItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length > 0 && keys.every((key) => /^\d+$/.test(key))) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => record[key]);
    }
  }
  return [];
}

export function toKeyValuePairs(value: unknown): Array<{ key: string; value: string }> {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const row = item as { key?: unknown; value?: unknown };
        return { key: String(row.key ?? ''), value: row.value == null ? '' : String(row.value) };
      }
      return { key: '', value: item == null ? '' : String(item) };
    });
  }
  if (value && typeof value === 'object') {
    if (value instanceof Map) {
      return [...value.entries()].map(([key, val]) => ({
        key: String(key),
        value: val == null ? '' : String(val),
      }));
    }
    return Object.entries(value as Record<string, unknown>).map(([key, val]) => ({
      key,
      value: val == null ? '' : String(val),
    }));
  }
  return [];
}

export function keyValuePairsToRecord(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const key = String((item as { key?: unknown }).key ?? '').trim();
      if (!key) continue;
      const raw = (item as { value?: unknown }).value;
      out[key] = raw == null ? '' : String(raw);
    }
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!key.trim()) continue;
      out[key] = raw == null ? '' : String(raw);
    }
  }
  return out;
}

/** Parse Date, ISO strings, YYYY-MM-DD, epoch ms, and Luxon-like objects. */
export function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnly) {
      const date = new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (value && typeof value === 'object') {
    const object = value as {
      toJSDate?: () => Date;
      toISO?: () => string | null;
      toISOString?: () => string;
    };
    if (typeof object.toJSDate === 'function') {
      return parseDateValue(object.toJSDate());
    }
    if (typeof object.toISO === 'function') {
      return parseDateValue(object.toISO());
    }
    if (typeof object.toISOString === 'function') {
      return parseDateValue(object.toISOString());
    }
  }

  return null;
}

/** Normalize stored dates for native `date` / `datetime-local` / `time` inputs. */
export function toFormDateInputValue(
  value: unknown,
  mode: 'date' | 'datetime' | 'time',
): string {
  if (mode === 'time') {
    if (value == null || value === '') return '';
    const raw = String(value).trim();
    const timeOnly = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnly) {
      const hh = timeOnly[1]!.padStart(2, '0');
      const mm = timeOnly[2]!;
      return timeOnly[3] ? `${hh}:${mm}:${timeOnly[3]}` : `${hh}:${mm}`;
    }
  }

  const date = parseDateValue(value);
  if (!date) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (mode === 'date') return `${y}-${m}-${d}`;

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (mode === 'time') return `${hh}:${mm}`;
  return `${y}-${m}-${d}T${hh}:${mm}`;
}
