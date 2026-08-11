import type { ActionConfig } from './types.js';

abstract class ActionBase<T extends ActionConfig> {
  protected config: T;

  protected constructor(config: T) {
    this.config = config;
  }

  label(value: string): this {
    this.config.label = value;
    return this;
  }

  color(value: ActionConfig['color']): this {
    this.config.color = value;
    return this;
  }

  icon(value: string): this {
    this.config.icon = value;
    return this;
  }

  confirm(value: string): this {
    this.config.confirm = value;
    return this;
  }

  ability(value: string): this {
    this.config.ability = value;
    return this;
  }

  /**
   * Row actions: include in the ⋮ menu (default) or show inline.
   * Pass `false` (or use {@link ungrouped}) for a visible toolbar button.
   */
  grouped(value = true): this {
    this.config.grouped = value;
    return this;
  }

  /** Shorthand: show this row action outside the ⋮ menu. */
  ungrouped(): this {
    return this.grouped(false);
  }

  build(): T {
    return { ...this.config };
  }
}

class HeaderAction extends ActionBase<ActionConfig> {
  constructor(name: string, label: string) {
    super({ name, label, placement: 'header' });
  }
}

class RowAction extends ActionBase<ActionConfig> {
  constructor(name: string, label: string) {
    super({ name, label, placement: 'row' });
  }
}

class BulkAction extends ActionBase<ActionConfig> {
  constructor(name: string, label: string) {
    super({ name, label, placement: 'bulk' });
  }
}

/** Filament-style action registry for a resource. */
export class ActionBuilder {
  private readonly actionInstances: ActionBase<ActionConfig>[] = [];

  private track<T extends ActionBase<ActionConfig>>(action: T): T {
    this.actionInstances.push(action);
    return action;
  }

  view(label = 'View'): RowAction {
    return this.track(new RowAction('view', label).icon('eye'));
  }

  edit(label = 'Edit'): RowAction {
    return this.track(new RowAction('edit', label).icon('pencil'));
  }

  delete(label = 'Delete'): RowAction {
    return this.track(new RowAction('delete', label).color('danger').icon('trash'));
  }

  bulkDelete(label = 'Delete selected'): BulkAction {
    return this.track(
      new BulkAction('delete', label)
        .color('danger')
        .icon('trash')
        .confirm('Delete selected records?'),
    );
  }

  create(label = 'Create'): HeaderAction {
    return this.track(new HeaderAction('create', label).icon('plus'));
  }

  header(name: string, label: string): HeaderAction {
    return this.track(new HeaderAction(name, label));
  }

  row(name: string, label: string): RowAction {
    return this.track(new RowAction(name, label));
  }

  bulk(name: string, label: string): BulkAction {
    return this.track(new BulkAction(name, label));
  }

  build(): ActionConfig[] {
    return this.actionInstances.map((action) => action.build());
  }
}

export function actions(
  callback: (builder: ActionBuilder) => ActionBuilder | void,
): ActionConfig[] {
  const builder = new ActionBuilder();
  callback(builder);
  return builder.build();
}

/** Default CRUD actions (Filament defaults). */
export function defaultActions(): ActionConfig[] {
  return actions((a) => {
    a.create();
    a.view();
    a.edit();
    a.delete();
    a.bulkDelete();
  });
}
