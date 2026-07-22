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
  detailSections,
  normalizeListQuery,
  recordTitle,
  LIST_ALL_RECORDS_PER_PAGE,
  RECORD_NAV_CAP,
  recordNavQuery,
  buildRecordPager,
  type ListViewQuery,
  type RecordPager,
} from '../shamar/list-query.js';
import { evaluateFormState, formClientFields } from '../form-state.js';

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
      return ctx.response.json(await this.resources.index(meta, query));
    }

    const result = await this.resources.index(meta, query);
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
    });

    const initialState = this.initialFormState(meta, null, 'create');

    return ctx.view.render('shamar::form', {
      ...shell,
      meta,
      resource: meta,
      record: null,
      mode: 'create',
      embed,
      formSections: formSections(meta),
      formLiveFields: formClientFields(meta, {
        state: initialState,
        record: null,
        operation: 'create',
      }),
      formStateEndpoint: `${this.basePath}/${meta.slug}/form-state`,
      formInitialState: initialState,
      formErrors: {},
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

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.json(record);
    }

    const title = recordTitle(meta, record);
    const shell = this.shellOpts(ctx, {
      meta,
      pageTitle: title,
      showEditButton: false,
      showBackToList: false,
    });

    return ctx.view.render('shamar::show', {
      ...shell,
      meta,
      resource: meta,
      record,
      id: record.id,
      detailSections: detailSections(meta),
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
    const shell = this.shellOpts(ctx, {
      meta,
      pageTitle: `Edit ${recordTitle(meta, record)}`,
      showBackToList: false,
    });

    const formInitialState = this.initialFormState(meta, record, 'edit');

    return ctx.view.render('shamar::form', {
      ...shell,
      meta,
      resource: meta,
      record,
      id: record.id,
      mode: 'edit',
      embed,
      formSections: formSections(meta),
      formLiveFields: formClientFields(meta, {
        state: formInitialState,
        record,
        operation: 'edit',
      }),
      formStateEndpoint: `${this.basePath}/${meta.slug}/form-state`,
      formInitialState,
      formErrors: {},
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
      return ctx.response.redirect(`${this.basePath}/${meta.slug}?success=${action}`);
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

    const shell = this.shellOpts(ctx, {
      meta,
      pageTitle: title,
      showBackToList: false,
    });

    const formInitialState =
      options.formInitialState ??
      this.initialFormState(meta, options.record, options.mode);

    return ctx.view.render('shamar::form', {
      ...shell,
      meta,
      resource: meta,
      record: options.record,
      id: options.record?.id,
      mode: options.mode,
      embed,
      formSections: formSections(meta),
      formLiveFields: formClientFields(meta, {
        state: formInitialState,
        record: options.record,
        operation: options.mode,
      }),
      formStateEndpoint: `${this.basePath}/${meta.slug}/form-state`,
      formInitialState,
      formErrors: options.formErrors ?? {},
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

  private initialFormState(
    meta: ResourceMeta,
    record: Record<string, unknown> | null,
    operation: 'create' | 'edit',
  ): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    for (const field of meta.fields) {
      if (record && field.name in record) {
        state[field.name] = record[field.name];
      } else if (field.default !== undefined && typeof field.default !== 'function') {
        state[field.name] = field.default;
      } else if (field.type === 'boolean') {
        state[field.name] = false;
      } else {
        state[field.name] = '';
      }
    }
    void operation;
    return state;
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

      if (field.type === 'boolean') {
        data[field.name] =
          input[field.name] === true ||
          input[field.name] === '1' ||
          input[field.name] === 'on' ||
          input[field.name] === 'true';
        continue;
      }

      if (field.name in input) {
        data[field.name] = input[field.name];
      }
    }

    return data;
  }
}
