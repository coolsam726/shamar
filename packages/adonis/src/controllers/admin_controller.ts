import type { ShamarHttpContext } from '../context.js';
import type { ResourceRegistry, ResourceMeta } from '@shamar/core';
import { resolveGridItemStyle, ValidationException } from '@shamar/core';
import type { ShamarConfig } from '../config.js';
import type { PanelRuntime } from '../runtime.js';
import { ResourceController } from '../controller.js';
import {
  buildListContext,
  buildShellContext,
  readFlash,
} from '../shamar/view-context.js';
import {
  formSections,
  formSchemaTree,
  detailSections,
  detailSchemaTree,
  normalizeListQuery,
  recordTitle,
  LIST_ALL_RECORDS_PER_PAGE,
  RECORD_NAV_CAP,
  recordNavQuery,
  buildRecordPager,
  toFormControlValue,
  parseCurrencyInput,
  type ListViewQuery,
  type RecordPager,
} from '../shamar/list-query.js';
import { evaluateFormState, formClientFields } from '../form-state.js';
import {
  buildRelationUiConfig,
  collectRelationIds,
  isRelationField,
  recordSummaryLabel,
  resolveRelatedMeta,
  relationTitleAttribute,
  type RelationUiConfig,
} from '../shamar/relation-fields.js';
import { hydrateRecordsForDisplay } from '../shamar/display-relations.js';

export class AdminController {
  private readonly resources: ResourceController;
  private readonly basePath: string;
  private readonly registry: ResourceRegistry;
  private readonly panelBranding: ShamarConfig['branding'];

  constructor(
    private readonly panel: PanelRuntime,
    private readonly config: ShamarConfig,
  ) {
    this.registry = panel.registry;
    this.basePath = panel.path;
    this.panelBranding = panel.config.branding ?? config.branding;
    this.resources = new ResourceController(panel.adapter);
  }

  private shellOpts(ctx: ShamarHttpContext, extras: {
    meta?: ResourceMeta;
    pageTitle: string;
    showCreateButton?: boolean;
    showEditButton?: boolean;
    showBackToList?: boolean;
    recordBreadcrumb?: {
      mode?: 'create' | 'edit' | 'show';
      recordTitle?: string;
      recordHref?: string;
    };
  }) {
    return buildShellContext({
      config: this.config,
      registry: this.registry,
      basePath: this.basePath,
      branding: this.panelBranding,
      flash: readFlash(ctx),
      ...extras,
    });
  }

  async dashboard(ctx: ShamarHttpContext) {
    const shell = this.shellOpts(ctx, { pageTitle: 'Dashboard' });
    const dashboardCards = shell.menuRoots.filter((root) => root.label !== 'Dashboard');

    return ctx.view.render('shamar::dashboard', {
      ...shell,
      dashboardCards,
    });
  }

  async index(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const rawQuery = this.listQuery(ctx);
    const query = normalizeListQuery(rawQuery);

    if (this.wantsJson(ctx, options?.asJson)) {
      const result = await this.resources.index(meta, query);
      await hydrateRecordsForDisplay(meta, result.items, this.registry, this.panel.adapter);
      return ctx.response.json(result);
    }

    const result = await this.resources.index(meta, query);
    await hydrateRecordsForDisplay(meta, result.items, this.registry, this.panel.adapter);
    const { query: viewQuery, pagination, perPageValue } = buildListContext({
      basePath: this.basePath,
      meta,
      query: rawQuery,
      result,
    });

    const shell = this.shellOpts(ctx, {
      meta,
      pageTitle: meta.label,
      showCreateButton: true,
    });

    return ctx.view.render('shamar::index', {
      ...shell,
      meta,
      resource: meta,
      result,
      query: { ...viewQuery, perPage: perPageValue },
      pagination,
      listHeaders: [],
      listAllPerPage: LIST_ALL_RECORDS_PER_PAGE,
    });
  }

  async create(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.json({ meta, fields: meta.fields });
    }

    const embed = this.isEmbed(ctx);
    const shell = this.shellOpts(ctx, {
      meta,
      pageTitle: `New ${meta.singularLabel}`,
      showBackToList: false,
      recordBreadcrumb: { mode: 'create' },
    });

    const initialState = this.initialFormState(meta, null, 'create');
    this.applyCreateQueryDefaults(ctx, meta, initialState);
    const relationUi = await this.buildRelationUiMap(meta, null, 'create', initialState);

    return ctx.view.render('shamar::form', {
      ...shell,
      meta,
      resource: meta,
      record: null,
      mode: 'create',
      embed,
      formSchema: formSchemaTree(meta),
      formSections: formSections(meta),
      formLiveFields: formClientFields(meta, {
        state: initialState,
        record: null,
        operation: 'create',
      }),
      formStateEndpoint: `${this.basePath}/${meta.slug}/form-state`,
      formInitialState: initialState,
      formErrors: {},
      relationUi,
      recordPager: null,
      resolveGridItemStyle,
    });
  }

  async store(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const data = this.resourcePayload(meta, ctx, 'create');

    try {
      const record = await this.resources.store(meta, data);

      if (this.wantsJson(ctx, options?.asJson)) {
        return ctx.response.created(record);
      }

      return this.redirectAfterSave(ctx, meta, String(record.id), 'created');
    } catch (error) {
      return this.handleFormValidationError(ctx, meta, error, {
        mode: 'create',
        record: null,
        data,
        asJson: options?.asJson,
      });
    }
  }

  async show(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const { id } = ctx.params;
    const record = await this.resources.show(meta, id);
    await hydrateRecordsForDisplay(meta, [record], this.registry, this.panel.adapter);

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.json(record);
    }

    const title = recordTitle(meta, record);
    const shell = this.shellOpts(ctx, {
      meta,
      pageTitle: title,
      showEditButton: false,
      showBackToList: false,
      recordBreadcrumb: {
        mode: 'show',
        recordTitle: title,
      },
    });

    return ctx.view.render('shamar::show', {
      ...shell,
      meta,
      resource: meta,
      record,
      id: record.id,
      detailSchema: detailSchemaTree(meta),
      detailSections: detailSections(meta),
      formErrors: {},
      recordPager: await this.resolveRecordPager(ctx, meta, String(record.id), 'show'),
      resolveGridItemStyle,
    });
  }

  async edit(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const { id } = ctx.params;
    const record = await this.resources.show(meta, id);

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.json(record);
    }

    const embed = this.isEmbed(ctx);
    const title = recordTitle(meta, record);
    const navQuery = recordNavQuery(this.listQuery(ctx));
    const shell = this.shellOpts(ctx, {
      meta,
      pageTitle: `Edit ${title}`,
      showBackToList: false,
      recordBreadcrumb: {
        mode: 'edit',
        recordTitle: title,
        recordHref: `${this.basePath}/${meta.slug}/${record.id}${navQuery}`,
      },
    });

    const formInitialState = this.initialFormState(meta, record, 'edit');
    const relationUi = await this.buildRelationUiMap(meta, record, 'edit', formInitialState);

    return ctx.view.render('shamar::form', {
      ...shell,
      meta,
      resource: meta,
      record,
      id: record.id,
      mode: 'edit',
      embed,
      formSchema: formSchemaTree(meta),
      formSections: formSections(meta),
      formLiveFields: formClientFields(meta, {
        state: formInitialState,
        record,
        operation: 'edit',
      }),
      formStateEndpoint: `${this.basePath}/${meta.slug}/form-state`,
      formInitialState,
      formErrors: {},
      relationUi,
      recordPager: embed
        ? null
        : await this.resolveRecordPager(ctx, meta, String(record.id), 'edit'),
      resolveGridItemStyle,
    });
  }

  async formState(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const body = ctx.request.body() as {
      operation?: string;
      changed?: string;
      state?: Record<string, unknown>;
      id?: string;
    };

    const operation =
      body.operation === 'edit' || body.operation === 'view' || body.operation === 'create'
        ? body.operation
        : 'edit';

    let record: Record<string, unknown> | null = null;
    if (body.id) {
      try {
        record = await this.resources.show(meta, String(body.id));
      } catch {
        record = null;
      }
    }

    const result = await evaluateFormState(meta, {
      operation,
      changed: body.changed,
      state: body.state ?? {},
      record,
    });

    return ctx.response.json(result);
  }

  async summary(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const { id } = ctx.params;
    const record = await this.resources.show(meta, id);
    return ctx.response.json({
      id: String(record.id),
      label: recordSummaryLabel(meta, record),
    });
  }

  async relationSearch(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const fieldName = String(ctx.request.input('field') ?? '');
    const field = meta.fields.find((entry) => entry.name === fieldName);
    if (!field?.relation) {
      return ctx.response.badRequest({ message: 'Unknown relation field' });
    }

    const related = resolveRelatedMeta(this.registry, field.relation);
    const titleAttribute = relationTitleAttribute(field.relation);
    const q = ctx.request.input('q');
    const limitRaw = Number(ctx.request.input('limit') ?? field.relation.preloadLimit ?? 25);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 25;
    const parentId = ctx.request.input('parentId');
    const linkedOnly =
      ctx.request.input('linked') === '1' ||
      ctx.request.input('linked') === 1 ||
      ctx.request.input('linked') === true;

    const scope: Record<string, unknown> = {};
    if (
      linkedOnly &&
      field.relation.kind === 'hasMany' &&
      field.relation.foreignKey &&
      parentId
    ) {
      scope[field.relation.foreignKey] = String(parentId);
    }

    const results = await this.panel.adapter.search(related, {
      q: q != null ? String(q) : undefined,
      limit,
      titleAttribute,
      scope: Object.keys(scope).length ? scope : undefined,
    });

    return ctx.response.json({ results });
  }

  async relationQuickCreate(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const body = ctx.request.body() as {
      field?: string;
      name?: string;
      parentId?: string;
    };
    const fieldName = String(body.field ?? '');
    const field = meta.fields.find((entry) => entry.name === fieldName);
    if (!field?.relation) {
      return ctx.response.badRequest({ message: 'Unknown relation field' });
    }
    if (!field.relation.createOption) {
      return ctx.response.badRequest({ message: 'Inline create is not enabled for this field' });
    }

    const name = String(body.name ?? '').trim();
    if (!name) {
      return ctx.response.badRequest({ message: 'Name is required' });
    }

    const related = resolveRelatedMeta(this.registry, field.relation);
    const titleAttribute = relationTitleAttribute(field.relation);
    const payload: Record<string, unknown> = { [titleAttribute]: name };

    if (
      field.relation.kind === 'hasMany' &&
      field.relation.foreignKey &&
      body.parentId
    ) {
      payload[field.relation.foreignKey] = String(body.parentId);
    }

    try {
      const record = await this.panel.adapter.create(related, payload);
      return ctx.response.json({
        id: String(record.id),
        label: recordSummaryLabel(related, record, titleAttribute),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Cannot create this record inline.';
      return ctx.response.badRequest({ message });
    }
  }

  async relationAttach(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const body = ctx.request.body() as {
      field?: string;
      relatedId?: string;
      parentId?: string;
    };
    const field = meta.fields.find((entry) => entry.name === String(body.field ?? ''));
    if (!field?.relation || field.relation.kind !== 'hasMany' || !field.relation.foreignKey) {
      return ctx.response.badRequest({ message: 'Attach requires a hasMany relation field' });
    }
    if (!body.relatedId || !body.parentId) {
      return ctx.response.badRequest({ message: 'relatedId and parentId are required' });
    }

    const related = resolveRelatedMeta(this.registry, field.relation);
    const titleAttribute = relationTitleAttribute(field.relation);
    const record = await this.panel.adapter.update(related, String(body.relatedId), {
      [field.relation.foreignKey]: String(body.parentId),
    });
    return ctx.response.json({
      id: String(record.id),
      label: recordSummaryLabel(related, record, titleAttribute),
    });
  }

  async relationDetach(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const body = ctx.request.body() as {
      field?: string;
      relatedId?: string;
    };
    const field = meta.fields.find((entry) => entry.name === String(body.field ?? ''));
    if (!field?.relation || field.relation.kind !== 'hasMany' || !field.relation.foreignKey) {
      return ctx.response.badRequest({ message: 'Detach requires a hasMany relation field' });
    }
    if (!body.relatedId) {
      return ctx.response.badRequest({ message: 'relatedId is required' });
    }

    const related = resolveRelatedMeta(this.registry, field.relation);
    await this.panel.adapter.update(related, String(body.relatedId), {
      [field.relation.foreignKey]: null,
    });
    return ctx.response.json({ ok: true });
  }

  async update(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const { id } = ctx.params;
    const data = this.resourcePayload(meta, ctx, 'update');

    try {
      const record = await this.resources.update(meta, id, data);

      if (this.wantsJson(ctx, options?.asJson)) {
        return ctx.response.json(record);
      }

      return this.redirectAfterSave(ctx, meta, String(record.id), 'updated');
    } catch (error) {
      let record: Record<string, unknown> | null = null;
      try {
        record = await this.resources.show(meta, id);
      } catch {
        record = { id, ...data };
      }
      return this.handleFormValidationError(ctx, meta, error, {
        mode: 'edit',
        record,
        data,
        asJson: options?.asJson,
      });
    }
  }

  async destroy(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const { id } = ctx.params;
    await this.resources.destroy(meta, id);

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.noContent();
    }

    ctx.session.flash('success', `${meta.singularLabel} deleted`);
    return ctx.response.redirect(`${this.basePath}/${meta.slug}`);
  }

  private requireResource(ctx: ShamarHttpContext): ResourceMeta {
    return this.registry.require(ctx.params.slug);
  }

  private listQuery(ctx: ShamarHttpContext): ListViewQuery {
    return {
      page: ctx.request.input('page'),
      perPage: ctx.request.input('perPage'),
      search: ctx.request.input('search'),
      sort: ctx.request.input('sort'),
      direction: ctx.request.input('direction'),
    };
  }

  private wantsJson(ctx: ShamarHttpContext, force = false) {
    if (force) {
      return true;
    }

    const accept = ctx.request.header('accept') ?? '';
    return accept.includes('application/json');
  }

  private isEmbed(ctx: ShamarHttpContext): boolean {
    const query = ctx.request.input('embed');
    if (query === '1' || query === 1 || query === true) return true;
    const body = ctx.request.input('_shamar_embed');
    return body === '1' || body === 1 || body === true;
  }

  private redirectAfterSave(
    ctx: ShamarHttpContext,
    meta: ResourceMeta,
    recordId: string | number,
    action: 'created' | 'updated',
  ) {
    if (this.isEmbed(ctx)) {
      return ctx.response.redirect(
        `${this.basePath}/${meta.slug}/${recordId}?success=${action}&embed=1`,
      );
    }

    ctx.session.flash(
      'success',
      action === 'created'
        ? `${meta.singularLabel} created`
        : `${meta.singularLabel} updated`,
    );

    // Stay on the edit form so Ctrl+S / continued editing keeps context.
    const navQuery = recordNavQuery(this.listQuery(ctx));
    return ctx.response.redirect(
      `${this.basePath}/${meta.slug}/${recordId}/edit${navQuery}`,
    );
  }

  private async handleFormValidationError(
    ctx: ShamarHttpContext,
    meta: ResourceMeta,
    error: unknown,
    options: {
      mode: 'create' | 'edit';
      record: Record<string, unknown> | null;
      data: Record<string, unknown>;
      asJson?: boolean;
    },
  ) {
    if (!(error instanceof ValidationException)) {
      throw error;
    }

    if (this.wantsJson(ctx, options.asJson)) {
      return ctx.response.status(422).json({ errors: error.errors });
    }

    return this.renderForm(ctx, meta, {
      mode: options.mode,
      record: options.record,
      formErrors: error.errors,
      formInitialState: {
        ...this.initialFormState(meta, options.record, options.mode),
        ...options.data,
      },
    });
  }

  private async renderForm(
    ctx: ShamarHttpContext,
    meta: ResourceMeta,
    options: {
      mode: 'create' | 'edit';
      record: Record<string, unknown> | null;
      formErrors?: Record<string, string>;
      formInitialState?: Record<string, unknown>;
    },
  ) {
    const embed = this.isEmbed(ctx);
    const title =
      options.mode === 'create'
        ? `New ${meta.singularLabel}`
        : `Edit ${recordTitle(meta, options.record ?? {})}`;

    const navQuery = recordNavQuery(this.listQuery(ctx));
    const recordId = options.record?.id;
    const shell = this.shellOpts(ctx, {
      meta,
      pageTitle: title,
      showBackToList: false,
      recordBreadcrumb:
        options.mode === 'create'
          ? { mode: 'create' }
          : {
              mode: 'edit',
              recordTitle: recordTitle(meta, options.record ?? {}),
              recordHref:
                recordId != null
                  ? `${this.basePath}/${meta.slug}/${recordId}${navQuery}`
                  : undefined,
            },
    });

    const formInitialState =
      options.formInitialState ??
      this.initialFormState(meta, options.record, options.mode);
    const relationUi = await this.buildRelationUiMap(
      meta,
      options.record,
      options.mode,
      formInitialState,
    );

    return ctx.view.render('shamar::form', {
      ...shell,
      meta,
      resource: meta,
      record: options.record,
      id: options.record?.id,
      mode: options.mode,
      embed,
      formSchema: formSchemaTree(meta),
      formSections: formSections(meta),
      formLiveFields: formClientFields(meta, {
        state: formInitialState,
        record: options.record,
        operation: options.mode,
      }),
      formStateEndpoint: `${this.basePath}/${meta.slug}/form-state`,
      formInitialState,
      formErrors: options.formErrors ?? {},
      relationUi,
      recordPager:
        !embed && options.mode === 'edit' && options.record?.id != null
          ? await this.resolveRecordPager(ctx, meta, String(options.record.id), 'edit')
          : null,
      resolveGridItemStyle,
    });
  }

  private async resolveRecordPager(
    ctx: ShamarHttpContext,
    meta: ResourceMeta,
    recordId: string,
    mode: 'show' | 'edit',
  ): Promise<RecordPager | null> {
    const raw = this.listQuery(ctx);
    const navQuery = recordNavQuery(raw);
    const listQuery = normalizeListQuery({
      search: raw.search,
      sort: raw.sort,
      direction: raw.direction,
      page: 1,
      perPage: RECORD_NAV_CAP,
    });
    // Bypass the list UI cap so neighbors follow the full filtered set.
    listQuery.perPage = RECORD_NAV_CAP;

    try {
      const result = await this.panel.adapter.list(meta, listQuery);
      const ids = result.items
        .map((item) => (item.id != null ? String(item.id) : ''))
        .filter(Boolean);
      return buildRecordPager({
        basePath: this.basePath,
        slug: meta.slug,
        recordId,
        mode,
        ids,
        navQuery,
      });
    } catch {
      return null;
    }
  }

  private applyCreateQueryDefaults(
    ctx: ShamarHttpContext,
    meta: ResourceMeta,
    state: Record<string, unknown>,
  ): void {
    const qs = ctx.request.qs() as Record<string, unknown>;
    for (const field of meta.fields) {
      if (!(field.name in qs)) continue;
      const raw = qs[field.name];
      if (raw == null || raw === '') continue;
      state[field.name] = toFormControlValue(raw, field);
    }
    // Create & Edit often passes `?name=` for the title attribute.
    if ('name' in qs && qs.name != null && qs.name !== '') {
      const titleField =
        meta.recordTitleField ??
        meta.fields.find((field) => field.name === 'name')?.name ??
        null;
      if (titleField && (state[titleField] === '' || state[titleField] == null)) {
        state[titleField] = String(qs.name);
      }
    }
  }

  private initialFormState(
    meta: ResourceMeta,
    record: Record<string, unknown> | null,
    operation: 'create' | 'edit',
  ): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    for (const field of meta.fields) {
      if (record && field.name in record) {
        state[field.name] = toFormControlValue(record[field.name], field);
      } else if (field.default !== undefined && typeof field.default !== 'function') {
        state[field.name] = toFormControlValue(field.default, field);
      } else if (field.type === 'boolean' || field.type === 'checkbox') {
        state[field.name] = false;
      } else if (field.type === 'color') {
        state[field.name] = '#000000';
      } else if (field.type === 'relation' && field.relation?.kind === 'belongsTo') {
        // BelongsTo values are owned by the M2O combobox widget, not form state.
      } else if (
        field.multiple ||
        field.type === 'tags' ||
        field.type === 'checkboxList' ||
        field.type === 'relationTable' ||
        (field.type === 'relation' && field.relation?.kind !== 'belongsTo')
      ) {
        state[field.name] = [];
      } else if (field.type === 'select' && field.multiple) {
        state[field.name] = [];
      } else {
        state[field.name] = '';
      }
    }
    void operation;
    return state;
  }

  private async buildRelationUiMap(
    meta: ResourceMeta,
    record: Record<string, unknown> | null,
    operation: 'create' | 'edit',
    state: Record<string, unknown>,
  ): Promise<Record<string, RelationUiConfig>> {
    const map: Record<string, RelationUiConfig> = {};

    for (const field of meta.fields) {
      if (!isRelationField(field) || !field.relation) continue;

      const related = resolveRelatedMeta(this.registry, field.relation);
      const titleAttribute = relationTitleAttribute(field.relation);
      const widget = field.relation.widget ?? 'combobox';

      let initialItems: Awaited<ReturnType<typeof this.panel.adapter.search>> = [];

      if (field.relation.kind === 'hasMany' && record?.id != null && field.relation.foreignKey) {
        initialItems = await this.panel.adapter.search(related, {
          titleAttribute,
          limit: field.relation.preloadLimit ?? 100,
          scope: { [field.relation.foreignKey]: String(record.id) },
        });
      } else {
        const ids = collectRelationIds(field, {
          ...(record ?? {}),
          ...state,
        });
        if (ids.length > 0) {
          initialItems = await this.panel.adapter.search(related, {
            ids,
            titleAttribute,
            limit: Math.max(ids.length, 25),
          });
        }
      }

      let preloadedOptions: typeof initialItems | undefined;
      if (widget === 'radio' || widget === 'checkboxList') {
        preloadedOptions = await this.panel.adapter.search(related, {
          titleAttribute,
          limit: field.relation.preloadLimit ?? 100,
          q: '',
        });
        // Ensure selected items appear in the option list.
        const seen = new Set(preloadedOptions.map((item) => item.id));
        for (const item of initialItems) {
          if (!seen.has(item.id)) {
            preloadedOptions = [item, ...preloadedOptions];
          }
        }
      }

      map[field.name] = buildRelationUiConfig({
        field,
        parentMeta: meta,
        relatedMeta: related,
        basePath: this.basePath,
        record,
        initialItems,
        preloadedOptions,
        operation,
      });
    }

    return map;
  }

  private resourcePayload(
    meta: ResourceMeta,
    ctx: ShamarHttpContext,
    action: 'create' | 'update',
  ): Record<string, unknown> {
    const input = ctx.request.all();
    const data: Record<string, unknown> = {};

    for (const field of meta.fields) {
      if (field.hiddenOnForm) continue;
      if (field.dehydrated === false) continue;
      if (action === 'update' && field.createOnly) continue;

      if (field.type === 'boolean' || field.type === 'checkbox') {
        data[field.name] =
          input[field.name] === true ||
          input[field.name] === '1' ||
          input[field.name] === 'on' ||
          input[field.name] === 'true';
        continue;
      }

      if (field.currency) {
        const raw = field.name in input ? input[field.name] : undefined;
        if (raw !== undefined) {
          data[field.name] = parseCurrencyInput(raw);
        }
        continue;
      }

      if (
        field.type === 'tags' ||
        field.type === 'checkboxList' ||
        (field.relation &&
          (field.relation.kind === 'manyToMany' || field.multiple))
      ) {
        const raw = input[field.name] ?? input[`${field.name}[]`];
        if (Array.isArray(raw)) {
          data[field.name] = raw.map((item) => String(item)).filter(Boolean);
        } else if (typeof raw === 'string' && raw.trim()) {
          data[field.name] =
            field.type === 'tags'
              ? raw.split(',').map((item) => item.trim()).filter(Boolean)
              : [raw.trim()];
        } else if (field.name in input || `${field.name}[]` in input) {
          data[field.name] = [];
        }
        continue;
      }

      if (field.name in input) {
        data[field.name] = input[field.name];
      } else if (`${field.name}[]` in input) {
        data[field.name] = input[`${field.name}[]`];
      }
    }

    return data;
  }
}
