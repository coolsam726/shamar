import { acceptForm, FormBuilder } from './form.js';
import { acceptInfolist, InfolistBuilder } from './infolist.js';
import { acceptTable, TableBuilder } from './table.js';
import type {
  FieldConfig,
  FormSchema,
  InfolistSchema,
  ListQuery,
  ResourceMeta,
  ResourceModel,
  TableSchema,
} from './types.js';
import type { PageRequestContext, PageSaveResult } from './page.js';

export type PageSectionKind = 'edge' | 'form' | 'table' | 'infolist';

export type PageSectionData =
  | Record<string, unknown>
  | ((ctx: PageRequestContext) => Record<string, unknown> | Promise<Record<string, unknown>>);

export type PageSectionRecord =
  | Record<string, unknown>
  | ((ctx: PageRequestContext) => Record<string, unknown> | Promise<Record<string, unknown>>);

export interface PageSectionMeta {
  key: string;
  title?: string;
  kind: PageSectionKind;
  /** Edge view name (edge sections). */
  view?: string;
  /** Form schema (form sections). */
  form?: FormSchema;
  fields?: FieldConfig[];
  /** Resource-shaped meta for table sections. */
  listResource?: ResourceMeta;
  /** Resource-shaped meta for infolist sections. */
  infolistResource?: ResourceMeta;
  defaultPerPage?: number;
}

export interface PageEdgeSectionHandlers {
  data?: PageSectionData;
}

export interface PageFormSectionHandlers {
  fill?: (
    ctx: PageRequestContext,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  save: (
    data: Record<string, unknown>,
    ctx: PageRequestContext,
  ) => PageSaveResult | void | Promise<PageSaveResult | void>;
}

export interface PageTableSectionHandlers {
  query?:
    | Partial<ListQuery>
    | ((ctx: PageRequestContext) => Partial<ListQuery> | Promise<Partial<ListQuery>>);
}

export interface PageInfolistSectionHandlers {
  record: PageSectionRecord;
}

export interface PageSectionHandlers {
  edge?: PageEdgeSectionHandlers;
  form?: PageFormSectionHandlers;
  table?: PageTableSectionHandlers;
  infolist?: PageInfolistSectionHandlers;
}

export class PageSectionDefinition {
  constructor(
    readonly meta: PageSectionMeta,
    readonly handlers: PageSectionHandlers,
  ) {}
}

export interface PageEdgeSectionOptions {
  title?: string;
  view: string;
  data?: PageSectionData;
}

export interface PageFormSectionOptions {
  title?: string;
  /** Built schema, or `(form) => form.schema([...])`. */
  form: FormSchema | ((form: FormBuilder) => FormBuilder | FormSchema | void);
  fill?: (
    ctx: PageRequestContext,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  save: (
    data: Record<string, unknown>,
    ctx: PageRequestContext,
  ) => PageSaveResult | void | Promise<PageSaveResult | void>;
}

export interface PageTableSectionOptions {
  title?: string;
  model: ResourceModel;
  connection?: string;
  recordTitleField?: string;
  softDelete?: boolean | { field?: string };
  defaultPerPage?: number;
  /** Resource slug used for row links (defaults to section key). */
  linkResourceSlug?: string;
  /** Built schema, or `(table) => table.schema([...])`. */
  table: TableSchema | ((table: TableBuilder) => TableBuilder | TableSchema | void);
  query?: PageTableSectionHandlers['query'];
}

export interface PageInfolistSectionOptions {
  title?: string;
  /** Built schema, or `(infolist) => infolist.schema([...])`. */
  infolist: InfolistSchema | ((infolist: InfolistBuilder) => InfolistBuilder | InfolistSchema | void);
  record: PageSectionRecord;
}

function resolveFormSchema(
  value: PageFormSectionOptions['form'],
): FormSchema {
  if (typeof value !== 'function') return value;
  const builder = new FormBuilder();
  return acceptForm(value(builder), builder);
}

function resolveTableSchema(
  value: PageTableSectionOptions['table'],
): TableSchema {
  if (typeof value !== 'function') return value;
  const builder = new TableBuilder();
  return acceptTable(value(builder), builder);
}

function resolveInfolistSchema(
  value: PageInfolistSectionOptions['infolist'],
): InfolistSchema {
  if (typeof value !== 'function') return value;
  const builder = new InfolistBuilder();
  return acceptInfolist(value(builder)) ?? { entries: [], sections: [], schema: [] };
}

function buildTableListResource(
  sectionKey: string,
  options: PageTableSectionOptions,
  tableSchema: TableSchema,
): ResourceMeta {
  const searchableFields = tableSchema.columns
    .filter((column) => column.searchable)
    .map((column) => column.name);

  return {
    slug: options.linkResourceSlug ?? sectionKey,
    label: options.title ?? sectionKey,
    singularLabel: options.title ?? sectionKey,
    model: options.model,
    connection: options.connection,
    recordTitleField: options.recordTitleField ?? 'name',
    fields: [],
    form: { fields: [], sections: [], schema: [] },
    columns: tableSchema.columns,
    infolist: { entries: [], sections: [], schema: [] },
    hasExplicitInfolist: false,
    actions: [],
    searchableFields: [...new Set(searchableFields)],
    defaultSort: tableSchema.defaultSort,
    defaultFilters: tableSchema.defaultFilters,
    defaultGroupBy: tableSchema.defaultGroupBy,
    softDelete: options.softDelete,
    defaultPerPage: options.defaultPerPage,
  };
}

function buildInfolistResource(
  sectionKey: string,
  options: PageInfolistSectionOptions,
  schema: InfolistSchema,
): ResourceMeta {
  return {
    slug: sectionKey,
    label: options.title ?? sectionKey,
    singularLabel: options.title ?? sectionKey,
    model: 'PageRecord',
    recordTitleField: 'id',
    fields: [],
    form: { fields: [], sections: [], schema: [] },
    columns: [],
    infolist: schema,
    hasExplicitInfolist: true,
    actions: [],
    searchableFields: [],
  };
}

export class PageContentBuilder {
  private readonly sections: PageSectionDefinition[] = [];

  edge(key: string, options: PageEdgeSectionOptions): this {
    this.sections.push(
      new PageSectionDefinition(
        {
          key,
          title: options.title,
          kind: 'edge',
          view: options.view,
        },
        { edge: { data: options.data } },
      ),
    );
    return this;
  }

  form(key: string, options: PageFormSectionOptions): this {
    const formSchema = resolveFormSchema(options.form);
    this.sections.push(
      new PageSectionDefinition(
        {
          key,
          title: options.title,
          kind: 'form',
          form: formSchema,
          fields: formSchema.fields,
        },
        {
          form: {
            fill: options.fill,
            save: options.save,
          },
        },
      ),
    );
    return this;
  }

  table(key: string, options: PageTableSectionOptions): this {
    const tableSchema = resolveTableSchema(options.table);
    this.sections.push(
      new PageSectionDefinition(
        {
          key,
          title: options.title,
          kind: 'table',
          listResource: buildTableListResource(key, options, tableSchema),
          defaultPerPage: options.defaultPerPage,
        },
        {
          table: options.query ? { query: options.query } : undefined,
        },
      ),
    );
    return this;
  }

  infolist(key: string, options: PageInfolistSectionOptions): this {
    const schema = resolveInfolistSchema(options.infolist);
    this.sections.push(
      new PageSectionDefinition(
        {
          key,
          title: options.title,
          kind: 'infolist',
          infolistResource: buildInfolistResource(key, options, schema),
        },
        {
          infolist: { record: options.record },
        },
      ),
    );
    return this;
  }

  build(): PageSectionDefinition[] {
    return [...this.sections];
  }
}

/**
 * Declarative page sections — forms, tables, infolists, and Edge blocks on one `Page`.
 */
export function pageContent(fn: (builder: PageContentBuilder) => void): PageSectionDefinition[] {
  const builder = new PageContentBuilder();
  fn(builder);
  return builder.build();
}
