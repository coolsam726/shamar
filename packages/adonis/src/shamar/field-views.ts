/**
 * Map field types to Edge views.
 *
 * Hosts can register additional types:
 *
 * ```ts
 * import { registerFieldView } from '@shamar/adonis'
 * registerFieldView('signature', 'views/fields/signature')
 * ```
 *
 * Pair with `registerFieldType()` from `@shamar/core` so payloads and
 * validation know the value kind. Custom types should register `hydrate`,
 * `dehydrate`, and `empty` so hosts never switch on field type.
 */

const views = new Map<string, string>();

function shamarField(name: string): string {
  return `shamar::partials/fields/${name}`;
}

/** Register or replace the Edge view used for a field type. */
export function registerFieldView(type: string, view: string): void {
  const key = String(type ?? '').trim();
  const name = String(view ?? '').trim();
  if (!key) throw new Error('registerFieldView: type is required');
  if (!name) throw new Error('registerFieldView: view is required');
  views.set(key, name);
}

export function getFieldView(type: string): string | undefined {
  return views.get(type);
}

/** Edge helper: view name for `field.type`, or empty string. */
export function fieldView(type: string | { type?: string } | null | undefined): string {
  const key = typeof type === 'string' ? type : String(type?.type ?? '');
  return views.get(key) ?? '';
}

export function listFieldViews(): Array<{ type: string; view: string }> {
  return [...views.entries()].map(([type, view]) => ({ type, view }));
}

registerFieldView('date', shamarField('date'));
registerFieldView('datetime', shamarField('date'));
registerFieldView('time', shamarField('date'));
registerFieldView('week', shamarField('date'));
registerFieldView('month', shamarField('date'));
registerFieldView('tags', shamarField('tags'));
registerFieldView('color', shamarField('color'));
registerFieldView('radio', shamarField('radio'));
registerFieldView('checkboxList', shamarField('checkbox-list'));
registerFieldView('richEditor', shamarField('rich-editor'));
registerFieldView('markdownEditor', shamarField('markdown-editor'));
registerFieldView('codeEditor', shamarField('code-editor'));
registerFieldView('repeater', shamarField('repeater'));
registerFieldView('keyValue', shamarField('key-value'));
registerFieldView('slider', shamarField('slider'));
registerFieldView('rating', shamarField('rating'));
