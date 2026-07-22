import type { FieldConfig, FormOperation, ResourceMeta } from '@shamar/core';
import { evaluateAfterStateUpdated, humanizeLabel, resolveClosure } from '@shamar/core';

export interface FormStateRequest {
  operation: FormOperation;
  changed?: string;
  state: Record<string, unknown>;
  record?: Record<string, unknown> | null;
}

export interface FormFieldClientMeta {
  name: string;
  live?: FieldConfig['live'];
  label?: string;
  help?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  visible?: boolean;
  value?: unknown;
  currency?: FieldConfig['currency'];
}

export interface FormStateResponse {
  state: Record<string, unknown>;
  fields: FormFieldClientMeta[];
}

/**
 * Run afterStateUpdated for the changed field, then resolve closure props
 * for all fields against the resulting state.
 */
export async function evaluateFormState(
  meta: ResourceMeta,
  request: FormStateRequest,
): Promise<FormStateResponse> {
  let state = { ...request.state };

  if (request.changed) {
    const field = meta.fields.find((f) => f.name === request.changed);
    if (field?.afterStateUpdated) {
      state = await evaluateAfterStateUpdated(field, {
        state,
        record: request.record,
        operation: request.operation,
      });
    }
  }

  const fields: FormFieldClientMeta[] = meta.fields
    .filter((f) => !f.hiddenOnForm)
    .map((field) => {
      const ctx = {
        get state() {
          return state[field.name];
        },
        record: request.record ?? null,
        operation: request.operation,
        get(name: string) {
          return state[name];
        },
        set(name: string, value: unknown) {
          state[name] = value;
        },
      };

      const visible = resolveClosure(field.visible, ctx, true) ?? true;
      const disabled = resolveClosure(field.disabled, ctx, false) ?? false;
      const label =
        resolveClosure(field.label, ctx) ?? humanizeLabel(field.name);
      const help = resolveClosure(field.help, ctx);
      const hint = resolveClosure(field.hint, ctx);
      const placeholder = resolveClosure(field.placeholder, ctx);

      return {
        name: field.name,
        live: field.live,
        label: typeof label === 'string' ? label : String(label ?? field.name),
        help: help != null ? String(help) : undefined,
        hint: hint != null ? String(hint) : undefined,
        placeholder: placeholder != null ? String(placeholder) : undefined,
        disabled: Boolean(disabled),
        visible: Boolean(visible),
        value: state[field.name],
        currency: field.currency,
      };
    });

  return { state, fields };
}

export function liveClientFields(meta: ResourceMeta): FormFieldClientMeta[] {
  return formClientFields(meta).filter((f) => f.live);
}

/**
 * Client meta for all form-visible fields (disabled/visible/live).
 * Passed into Alpine so static `.disabled()` is honored without a form-state roundtrip.
 */
export function formClientFields(
  meta: ResourceMeta,
  options: {
    state?: Record<string, unknown>;
    record?: Record<string, unknown> | null;
    operation?: FormOperation;
  } = {},
): FormFieldClientMeta[] {
  const state = options.state ?? {};
  const operation = options.operation ?? 'edit';

  return meta.fields
    .filter((f) => !f.hiddenOnForm)
    .map((field) => {
      const ctx = {
        get state() {
          return state[field.name];
        },
        record: options.record ?? null,
        operation,
        get(name: string) {
          return state[name];
        },
        set(name: string, value: unknown) {
          state[name] = value;
        },
      };

      const visible = resolveClosure(field.visible, ctx, true) ?? true;
      const disabled = resolveClosure(field.disabled, ctx, false) ?? false;
      const label =
        resolveClosure(field.label, ctx) ?? humanizeLabel(field.name);
      const help = resolveClosure(field.help, ctx);
      const hint = resolveClosure(field.hint, ctx);
      const placeholder = resolveClosure(field.placeholder, ctx);

      return {
        name: field.name,
        live: field.live,
        label: typeof label === 'string' ? label : String(label ?? field.name),
        help: help != null ? String(help) : undefined,
        hint: hint != null ? String(hint) : undefined,
        placeholder: placeholder != null ? String(placeholder) : undefined,
        disabled: Boolean(disabled),
        visible: Boolean(visible),
        value: state[field.name],
        currency: field.currency,
      };
    });
}
