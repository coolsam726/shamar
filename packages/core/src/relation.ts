import type {
  FieldConfig,
  RelationConfig,
  RelationKind,
  RelationWidget,
} from './types.js';

export interface RelationshipOptions {
  kind?: RelationKind;
  foreignKey?: string;
  widget?: RelationWidget;
  createOption?: boolean;
  createAndEditOption?: boolean;
  preloadLimit?: number;
  groupBy?: string;
  checkboxColumns?: number;
  checkboxFramed?: boolean;
  cascadeWildcards?: boolean;
  /** Dehydrated value attribute (default `id`). Use `name` for ability keys. */
  valueAttribute?: string;
}

/** Default widget for each relation kind. */
export function defaultRelationWidget(kind: RelationKind): RelationWidget {
  switch (kind) {
    case 'hasMany':
      return 'table';
    case 'manyToMany':
      return 'combobox';
    case 'belongsTo':
    default:
      return 'combobox';
  }
}

/**
 * Build a normalized {@link RelationConfig} from Filament-style arguments.
 */
export function buildRelationConfig(
  resource: string,
  titleAttribute: string,
  options: RelationshipOptions = {},
): RelationConfig {
  const kind = options.kind ?? 'belongsTo';
  return {
    kind,
    resource,
    labelField: titleAttribute,
    titleAttribute,
    foreignKey: options.foreignKey,
    widget: options.widget ?? defaultRelationWidget(kind),
    createOption: options.createOption,
    createAndEditOption: options.createAndEditOption,
    preloadLimit: options.preloadLimit,
    groupBy: options.groupBy,
    checkboxColumns: options.checkboxColumns,
    checkboxFramed: options.checkboxFramed,
    cascadeWildcards: options.cascadeWildcards,
    valueAttribute: options.valueAttribute,
  };
}

/**
 * Apply relationship config onto a field, adjusting type/multiple/dehydrated defaults.
 */
export function applyRelationship(
  config: FieldConfig,
  resource: string,
  titleAttribute: string,
  options: RelationshipOptions = {},
): void {
  const relation = buildRelationConfig(resource, titleAttribute, options);
  config.relation = relation;
  config.searchable = config.searchable ?? true;

  if (relation.kind === 'manyToMany') {
    config.multiple = true;
  }

  if (relation.kind === 'hasMany') {
    // Children own the FK; parent field is managed via widgets, not dehydrated.
    config.dehydrated = false;
    config.multiple = true;
  }

  if (relation.widget === 'radio') {
    config.type = 'radio';
  } else if (relation.widget === 'checkboxList') {
    config.type = 'checkboxList';
    config.multiple = true;
  } else if (relation.widget === 'table') {
    config.type = 'relationTable';
    config.multiple = true;
  } else if (config.type !== 'radio' && config.type !== 'checkboxList') {
    config.type = 'relation';
  }
}

/** Title attribute used for labels / quick-create. */
export function relationTitleAttribute(relation: RelationConfig): string {
  return relation.titleAttribute ?? relation.labelField;
}
