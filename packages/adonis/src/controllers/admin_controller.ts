import type { ShamarHttpContext } from '../context.js';
import type { ResourceRegistry, ResourceMeta } from '@shamar/core';
import { resolveGridItemStyle, isValidationException, relationUsesListTable } from '@shamar/core';
import { sanitizeStringIds } from '@shamar/cherubim';
import type { Authorizer } from '@shamar/cherubim';
import { Authorizer as AuthorizerClass } from '@shamar/cherubim';
import type { AuthorizationContext, ResourceAction } from '@shamar/cherubim';
import type { ShamarConfig } from '../config.js';
import type { PanelRuntime } from '../runtime.js';
import { ResourceController } from '../controller.js';
import {
  authRequired,
  assertResourceAccess,
  buildAuthContext,
  canAccessPanel,
  ForbiddenError,
  PANEL_ACCESS_DENIED_MESSAGE,
  resourcePolicyFlags,
  respondForbidden,
  respondUnauthorized,
  UnauthorizedError,
} from '../shamar/auth.js';
import {
  buildListContext,
  buildShellContext,
  readFlash,
} from '../shamar/view-context.js';
import { isMasqueradeSession } from '../auth/masquerade.js';
import {
  decorateRevokedStatus,
  resourceActionsFor,
  visibleRowActions,
} from '../shamar/resource-actions.js';
import {
  buildListHeaders,
  groupRecordsForDisplay,
  labelListFilters,
  resolveDefaultFilters,
} from '../shamar/list-headers.js';
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
import {
  buildRelationTableRows,
  relationTableListMeta,
} from '../shamar/relation-table.js';

export class AdminController {
  private readonly resources: ResourceController;
  private readonly basePath: string;
  private readonly registry: ResourceRegistry;
  private readonly panelBranding: ShamarConfig['branding'];
  private readonly panelContentMaxWidth?: string;
  private readonly authorizer: Authorizer;

  constructor(
    private readonly panel: PanelRuntime,
    private readonly config: ShamarConfig,
    authorizer?: Authorizer,
  ) {
    this.registry = panel.registry;
    this.basePath = panel.path;
    this.panelBranding = panel.config.branding ?? config.branding;
    this.panelContentMaxWidth = panel.config.contentMaxWidth;
    this.resources = new ResourceController(panel.adapter);
    this.authorizer = authorizer ?? new AuthorizerClass();
  }

  private isAuthContext(
    value: AuthorizationContext | unknown,
  ): value is AuthorizationContext {
    return typeof value === 'object' && value !== null && 'user' in value;
  }

  private async resolveAuth(ctx: ShamarHttpContext): Promise<AuthorizationContext> {
    return buildAuthContext(ctx, this.config, this.panel.id);
  }

  private async ensureAuthenticated(
    ctx: ShamarHttpContext,
    asJson = false,
  ): Promise<AuthorizationContext | unknown> {
    const authCtx = await this.resolveAuth(ctx);
    const json = asJson || this.wantsJson(ctx);

    if (authRequired(this.config) && !authCtx.user) {
      return respondUnauthorized(ctx, this.config, json);
    }

    if (
      authRequired(this.config) &&
      authCtx.user &&
      !canAccessPanel(authCtx.user, this.panel.config)
    ) {
      return respondForbidden(
        ctx,
        PANEL_ACCESS_DENIED_MESSAGE,
        json,
        this.config.auth?.loginPath ?? '/login',
      );
    }

    return authCtx;
  }

  private async ensureResourceAction(
    ctx: ShamarHttpContext,
    meta: ResourceMeta,
    action: ResourceAction,
    record?: Record<string, unknown>,
    asJson = false,
  ): Promise<AuthorizationContext | unknown> {
    const authResult = await this.ensureAuthenticated(ctx, asJson);
    if (!this.isAuthContext(authResult)) return authResult;
    const authCtx = authResult;

    if (!authRequired(this.config)) return authCtx;

    try {
      assertResourceAccess(this.authorizer, authCtx, this.registry, meta, action, record);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return respondForbidden(
          ctx,
          error.message,
          asJson || this.wantsJson(ctx),
          this.basePath,
        );
      }
      if (error instanceof UnauthorizedError) {
        return respondUnauthorized(ctx, this.config, asJson || this.wantsJson(ctx));
      }
      throw error;
    }

    return authCtx;
  }

  private shellOpts(
    ctx: ShamarHttpContext,
    authCtx: AuthorizationContext,
    extras: {
    meta?: ResourceMeta;
    pageTitle: string;
    showCreateButton?: boolean;
    showEditButton?: boolean;
    showDeleteButton?: boolean;
    showBackToList?: boolean;
    record?: Record<string, unknown> | null;
    recordBreadcrumb?: {
      mode?: 'create' | 'edit' | 'show';
      recordTitle?: string;
      recordHref?: string;
    };
  }) {
    const policy =
      extras.meta && authCtx.user
        ? resourcePolicyFlags(
            this.authorizer,
            authCtx,
            this.registry,
            extras.meta,
            extras.record,
          )
        : null;

    const {
      showCreateButton,
      showEditButton,
      showDeleteButton,
      record,
      ...rest
    } = extras;

    return buildShellContext({
      config: this.config,
      registry: this.registry,
      basePath: this.basePath,
      branding: this.panelBranding,
      panelContentMaxWidth: this.panelContentMaxWidth,
      authorizer: this.authorizer,
      authCtx,
      flash: readFlash(ctx),
      masquerade: isMasqueradeSession(ctx.session) ? { active: true } : undefined,
      showCreateButton:
        showCreateButton === true ? policy?.create ?? true : showCreateButton,
      showEditButton:
        showEditButton === true ? policy?.update ?? true : showEditButton,
      showDeleteButton:
        showDeleteButton === true ? policy?.delete ?? true : showDeleteButton,
      ...rest,
    });
  }

  async dashboard(ctx: ShamarHttpContext) {
    const authResult = await this.ensureAuthenticated(ctx);
    if (!this.isAuthContext(authResult)) return authResult;
    const authCtx = authResult;

    const shell = this.shellOpts(ctx, authCtx, { pageTitle: 'Dashboard' });
    const dashboardCards = shell.menuRoots.filter((root) => root.label !== 'Dashboard');

    return ctx.view.render('shamar::dashboard', {
      ...shell,
      dashboardCards,
    });
  }

  async index(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const authResult = await this.ensureResourceAction(ctx, meta, 'viewAny', undefined, options?.asJson);
    if (!this.isAuthContext(authResult)) return authResult;
    const authCtx = authResult;

    const rawQuery = this.listQuery(ctx);
    const listHeaders = buildListHeaders(meta);
    const filtersParam = ctx.request.input('filters');
    const groupByParam = ctx.request.input('groupBy');
    const hasFiltersParam = filtersParam !== undefined && filtersParam !== null;
    const hasGroupByParam = groupByParam !== undefined && groupByParam !== null;

    const normalized = normalizeListQuery(rawQuery);

    if (!hasFiltersParam && meta.defaultFilters?.length) {
      normalized.filters = resolveDefaultFilters(meta, listHeaders);
    } else if (normalized.filters?.length) {
      normalized.filters = labelListFilters(normalized.filters, listHeaders);
    }

    if (!hasGroupByParam && meta.defaultGroupBy) {
      normalized.groupBy = meta.defaultGroupBy;
    } else if (hasGroupByParam && String(groupByParam).trim() === '') {
      normalized.groupBy = undefined;
    }

    // Adapter sorts/filters on FK fields; display grouping uses the column path.
    const displayGroupBy = normalized.groupBy;
    const groupHeader = listHeaders.find(
      (header) => header.name === displayGroupBy || header.filterField === displayGroupBy,
    );
    const adapterGroupBy = groupHeader?.filterField || displayGroupBy;
    const query = this.withPolicyScope(authCtx, meta, {
      ...normalized,
      groupBy: adapterGroupBy,
    });

    if (this.wantsJson(ctx, options?.asJson)) {
      const result = await this.resources.index(meta, query);
      await hydrateRecordsForDisplay(meta, result.items, this.registry, this.panel.adapter);
      decorateRevokedStatus(result.items);
      return ctx.response.json(result);
    }

    const result = await this.resources.index(meta, query);
    await hydrateRecordsForDisplay(meta, result.items, this.registry, this.panel.adapter);
    decorateRevokedStatus(result.items);
    const { query: viewQuery, pagination, perPageValue } = buildListContext({
      basePath: this.basePath,
      meta,
      query: rawQuery,
      result,
    });

    const policy = resourcePolicyFlags(this.authorizer, authCtx, this.registry, meta);
    const shell = this.shellOpts(ctx, authCtx, {
      meta,
      pageTitle: meta.label,
      showCreateButton: policy.create,
      showEditButton: policy.update,
      showDeleteButton: policy.delete,
    });

    const groups = groupRecordsForDisplay(
      result.items,
      displayGroupBy,
      listHeaders,
    );

    return ctx.view.render('shamar::index', {
      ...shell,
      meta,
      resource: meta,
      result,
      groups,
      query: {
        ...viewQuery,
        perPage: perPageValue,
        filters: normalized.filters ?? [],
        groupBy: displayGroupBy ?? null,
      },
      pagination,
      listHeaders,
      listAllPerPage: LIST_ALL_RECORDS_PER_PAGE,
      filtersLockedEmpty: hasFiltersParam && !(normalized.filters?.length),
      groupLockedEmpty: hasGroupByParam && !displayGroupBy,
      bulkActions: resourceActionsFor(meta, 'bulk', policy),
      rowActions: resourceActionsFor(meta, 'row', policy),
    });
  }

  async create(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const authResult = await this.ensureResourceAction(ctx, meta, 'create', undefined, options?.asJson);
    if (!this.isAuthContext(authResult)) return authResult;
    const authCtx = authResult;

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.json({ meta, fields: meta.fields });
    }

    const embed = this.isEmbed(ctx);
    const policy = resourcePolicyFlags(this.authorizer, authCtx, this.registry, meta);
    const shell = this.shellOpts(ctx, authCtx, {
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
      /** Create-once resources (canEdit false) redirect to show after AJAX create. */
      redirectAfterCreateToShow: !policy.update,
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
    const authResult = await this.ensureResourceAction(ctx, meta, 'create', undefined, options?.asJson);
    if (!this.isAuthContext(authResult)) return authResult;

    let data = this.resourcePayload(meta, ctx, 'create');
    let flashPlainText: string | undefined;
    let flashMessage: string | undefined;

    try {
      const ResourceClass = this.registry.resourceClass(meta.slug);
      if (ResourceClass?.prepareCreate) {
        const prepared = await ResourceClass.prepareCreate(data, {
          adapter: this.panel.adapter,
          meta,
          userId: authResult.user?.id ?? null,
        });
        data = prepared.data;
        flashPlainText = prepared.flashPlainText;
        flashMessage = prepared.flashMessage;
      }

      const record = await this.resources.store(meta, data);

      if (this.wantsJson(ctx, options?.asJson)) {
        // AJAX create shows a copy-and-confirm modal; only flash a short success for after.
        if (flashPlainText) {
          ctx.session.flash('success', `${meta.singularLabel} created`);
        }
        return ctx.response.created({
          ...record,
          ...(flashPlainText ? { plainText: flashPlainText } : {}),
        });
      }

      return this.redirectAfterSave(ctx, meta, String(record.id), 'created', {
        flashPlainText,
        flashMessage,
        authCtx: authResult,
      });
    } catch (error) {
      return this.handleFormValidationError(ctx, meta, error, {
        mode: 'create',
        record: null,
        data,
        asJson: options?.asJson,
        authCtx: authResult,
      });
    }
  }

  async show(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const { id } = ctx.params;
    const record = await this.resources.show(meta, id);
    const authResult = await this.ensureResourceAction(ctx, meta, 'view', record, options?.asJson);
    if (!this.isAuthContext(authResult)) return authResult;
    const authCtx = authResult;

    await hydrateRecordsForDisplay(meta, [record], this.registry, this.panel.adapter);
    decorateRevokedStatus([record]);

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.json(record);
    }

    const embed = this.isEmbed(ctx);
    const title = recordTitle(meta, record);
    const policy = resourcePolicyFlags(this.authorizer, authCtx, this.registry, meta, record);
    const shell = this.shellOpts(ctx, authCtx, {
      meta,
      record,
      pageTitle: title,
      showEditButton: policy.update,
      showDeleteButton: policy.delete,
      showBackToList: false,
      recordBreadcrumb: {
        mode: 'show',
        recordTitle: title,
      },
    });

    const relationUi = await this.buildRelationUiMap(meta, record, 'show', record);

    return ctx.view.render('shamar::show', {
      ...shell,
      meta,
      resource: meta,
      record,
      id: record.id,
      embed,
      detailSchema: detailSchemaTree(meta),
      detailSections: detailSections(meta),
      relationUi,
      formErrors: {},
      recordPager: embed
        ? null
        : await this.resolveRecordPager(ctx, meta, String(record.id), 'show'),
      resolveGridItemStyle,
      recordActions: visibleRowActions(meta, policy, record),
    });
  }

  async edit(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const { id } = ctx.params;
    const record = await this.resources.show(meta, id);
    const authResult = await this.ensureResourceAction(ctx, meta, 'update', record, options?.asJson);
    if (!this.isAuthContext(authResult)) return authResult;
    const authCtx = authResult;

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.json(record);
    }

    const embed = this.isEmbed(ctx);
    const title = recordTitle(meta, record);
    const navQuery = recordNavQuery(this.listQuery(ctx));
    const policy = resourcePolicyFlags(this.authorizer, authCtx, this.registry, meta, record);
    const shell = this.shellOpts(ctx, authCtx, {
      meta,
      record,
      pageTitle: `Edit ${title}`,
      showDeleteButton: policy.delete,
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

    const action: ResourceAction =
      operation === 'create' ? 'create' : operation === 'view' ? 'view' : 'update';
    const authResult = await this.ensureResourceAction(
      ctx,
      meta,
      action,
      record ?? undefined,
      true,
    );
    if (!this.isAuthContext(authResult)) return authResult;

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
    const authResult = await this.ensureResourceAction(ctx, meta, 'view', record, true);
    if (!this.isAuthContext(authResult)) return authResult;

    return ctx.response.json({
      id: String(record.id),
      label: recordSummaryLabel(meta, record),
    });
  }

  async relationSearch(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const authResult = await this.ensureResourceAction(ctx, meta, 'viewAny', undefined, true);
    if (!this.isAuthContext(authResult)) return authResult;

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

  async relationTable(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const authResult = await this.ensureResourceAction(ctx, meta, 'viewAny', undefined, true);
    if (!this.isAuthContext(authResult)) return authResult;
    const authCtx = authResult;

    const fieldName = String(ctx.request.input('field') ?? '');
    const field = meta.fields.find((entry) => entry.name === fieldName);
    if (!field?.relation || field.relation.kind !== 'hasMany' || !field.relation.foreignKey) {
      return ctx.response.badRequest({ message: 'Relation table requires a hasMany field' });
    }

    const parentId = ctx.request.input('parentId');
    if (!parentId) {
      return ctx.response.badRequest({ message: 'parentId is required' });
    }

    const related = resolveRelatedMeta(this.registry, field.relation);
    const relatedAuth = await this.ensureResourceAction(ctx, related, 'viewAny', undefined, true);
    if (!this.isAuthContext(relatedAuth)) return relatedAuth;

    const { columnConfigs, columns, listHeaders } = relationTableListMeta(
      related,
      field.relation.foreignKey,
    );

    const rawQuery = this.listQuery(ctx);
    const hasFiltersParam =
      ctx.request.input('filters') !== undefined && ctx.request.input('filters') !== null;
    const normalized = normalizeListQuery(rawQuery, { perPage: 10 });

    if (!hasFiltersParam && related.defaultFilters?.length) {
      normalized.filters = resolveDefaultFilters(related, listHeaders);
    } else if (normalized.filters?.length) {
      normalized.filters = labelListFilters(normalized.filters, listHeaders);
    }

    if (!normalized.sort && related.defaultSort) {
      normalized.sort = related.defaultSort.field;
      normalized.direction = related.defaultSort.direction;
    }

    const query = this.withPolicyScope(authCtx, related, {
      ...normalized,
      scope: {
        ...(normalized.scope ?? {}),
        [field.relation.foreignKey]: String(parentId),
      },
    });

    const result = await this.resources.index(related, query);
    await hydrateRecordsForDisplay(related, result.items, this.registry, this.panel.adapter);
    decorateRevokedStatus(result.items);

    const titleAttribute = relationTitleAttribute(field.relation);
    const rows = buildRelationTableRows(
      related,
      columnConfigs,
      result.items,
      this.basePath,
      (record) => recordSummaryLabel(related, record, titleAttribute),
    );

    return ctx.response.json({
      items: result.items,
      rows,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      pageCount: result.pageCount,
      columns,
      listHeaders,
      filters: normalized.filters ?? [],
      sort: normalized.sort ?? null,
      direction: normalized.direction ?? null,
      search: normalized.search ?? '',
    });
  }

  async relationQuickCreate(ctx: ShamarHttpContext) {
    const meta = this.requireResource(ctx);
    const authResult = await this.ensureResourceAction(ctx, meta, 'create', undefined, true);
    if (!this.isAuthContext(authResult)) return authResult;

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

    let parentRecord: Record<string, unknown> | undefined;
    if (body.parentId) {
      try {
        parentRecord = await this.resources.show(meta, String(body.parentId));
      } catch {
        parentRecord = undefined;
      }
    }

    const authResult = await this.ensureResourceAction(
      ctx,
      meta,
      'update',
      parentRecord,
      true,
    );
    if (!this.isAuthContext(authResult)) return authResult;

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
      parentId?: string;
    };

    let parentRecord: Record<string, unknown> | undefined;
    if (body.parentId) {
      try {
        parentRecord = await this.resources.show(meta, String(body.parentId));
      } catch {
        parentRecord = undefined;
      }
    }

    const authResult = await this.ensureResourceAction(
      ctx,
      meta,
      'update',
      parentRecord,
      true,
    );
    if (!this.isAuthContext(authResult)) return authResult;

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

    let existing: Record<string, unknown> | null = null;
    try {
      existing = await this.resources.show(meta, id);
    } catch {
      existing = null;
    }

    const authResult = await this.ensureResourceAction(
      ctx,
      meta,
      'update',
      existing ?? undefined,
      options?.asJson,
    );
    if (!this.isAuthContext(authResult)) return authResult;

    const data = this.resourcePayload(meta, ctx, 'update');

    try {
      const record = await this.resources.update(meta, id, data);

      if (this.wantsJson(ctx, options?.asJson)) {
        return ctx.response.json(record);
      }

      return this.redirectAfterSave(ctx, meta, String(record.id), 'updated');
    } catch (error) {
      let record: Record<string, unknown> | null = existing;
      if (!record) {
        try {
          record = await this.resources.show(meta, id);
        } catch {
          record = { id, ...data };
        }
      }
      return this.handleFormValidationError(ctx, meta, error, {
        mode: 'edit',
        record,
        data,
        asJson: options?.asJson,
        authCtx: authResult,
      });
    }
  }

  async destroy(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const { id } = ctx.params;
    const record = await this.resources.show(meta, id);
    const authResult = await this.ensureResourceAction(
      ctx,
      meta,
      'delete',
      record,
      options?.asJson,
    );
    if (!this.isAuthContext(authResult)) return authResult;

    await this.resources.destroy(meta, id);

    if (this.wantsJson(ctx, options?.asJson)) {
      return ctx.response.noContent();
    }

    ctx.session.flash('success', `${meta.singularLabel} deleted`);
    return ctx.response.redirect(`${this.basePath}/${meta.slug}`);
  }

  /** POST /:slug/bulk — bulk delete or custom bulk actions. */
  async bulk(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const action = String(ctx.request.input('action') ?? '').trim();
    if (!action) {
      return ctx.response.badRequest({ message: 'Missing action.' });
    }

    const authGate = this.actionAuthGate(meta, action);
    const authResult = await this.ensureAuthenticated(ctx, options?.asJson);
    if (!this.isAuthContext(authResult)) return authResult;
    const authCtx = authResult;

    const ids = this.collectBulkIds(ctx);
    if (ids.length === 0 && !ctx.request.input('selectAll')) {
      ctx.session.flash('error', 'No records selected.');
      return ctx.response.redirect(`${this.basePath}/${meta.slug}`);
    }

    let records: Record<string, unknown>[] = [];
    if (ctx.request.input('selectAll')) {
      const query = this.withPolicyScope(authCtx, meta, normalizeListQuery(this.listQuery(ctx)));
      const result = await this.resources.index(meta, {
        ...query,
        page: 1,
        perPage: LIST_ALL_RECORDS_PER_PAGE,
      });
      records = result.items;
    } else {
      for (const id of ids) {
        try {
          records.push(await this.resources.show(meta, id));
        } catch {
          /* skip missing */
        }
      }
    }

    if (records.length === 0) {
      ctx.session.flash('error', 'No matching records found.');
      return ctx.response.redirect(`${this.basePath}/${meta.slug}`);
    }

    if (action === 'delete') {
      for (const record of records) {
        try {
          assertResourceAccess(
            this.authorizer,
            authCtx,
            this.registry,
            meta,
            'delete',
            record,
          );
        } catch (error) {
          if (error instanceof ForbiddenError) {
            return respondForbidden(
              ctx,
              error.message,
              options?.asJson || this.wantsJson(ctx),
              this.basePath,
            );
          }
          throw error;
        }
        await this.resources.destroy(meta, String(record.id));
      }
      const message =
        records.length === 1
          ? `${meta.singularLabel} deleted`
          : `${records.length} ${meta.label.toLowerCase()} deleted`;
      if (this.wantsJson(ctx, options?.asJson)) {
        return ctx.response.json({ message, count: records.length });
      }
      ctx.session.flash('success', message);
      return ctx.response.redirect(`${this.basePath}/${meta.slug}`);
    }

    return this.runCustomAction(ctx, meta, authCtx, action, records, authGate, options?.asJson);
  }

  /** POST /:slug/:id/action/:action — single-record custom action. */
  async recordAction(ctx: ShamarHttpContext, options?: { asJson?: boolean }) {
    const meta = this.requireResource(ctx);
    const { id, action: actionParam } = ctx.params;
    const action = String(actionParam ?? ctx.request.input('action') ?? '').trim();
    if (!action) {
      return ctx.response.badRequest({ message: 'Missing action.' });
    }

    const record = await this.resources.show(meta, id);
    const authGate = this.actionAuthGate(meta, action);
    const authResult = await this.ensureResourceAction(
      ctx,
      meta,
      authGate,
      record,
      options?.asJson,
    );
    if (!this.isAuthContext(authResult)) return authResult;

    if (action === 'delete') {
      await this.resources.destroy(meta, id);
      if (this.wantsJson(ctx, options?.asJson)) {
        return ctx.response.noContent();
      }
      ctx.session.flash('success', `${meta.singularLabel} deleted`);
      return ctx.response.redirect(`${this.basePath}/${meta.slug}`);
    }

    return this.runCustomAction(
      ctx,
      meta,
      authResult,
      action,
      [record],
      authGate,
      options?.asJson,
      String(record.id),
    );
  }

  private actionAuthGate(meta: ResourceMeta, action: string): ResourceAction {
    const config = (meta.actions ?? []).find((entry) => entry.name === action);
    const gate = config?.ability ?? action;
    if (gate === 'create') return 'create';
    if (gate === 'edit' || gate === 'update') return 'update';
    if (gate === 'view') return 'view';
    if (gate === 'viewAny') return 'viewAny';
    return 'delete';
  }

  private collectBulkIds(ctx: ShamarHttpContext): string[] {
    const raw = ctx.request.input('ids');
    if (Array.isArray(raw)) {
      return sanitizeStringIds(raw);
    }
    if (raw != null && String(raw).trim() !== '') {
      return sanitizeStringIds([raw]);
    }
    return [];
  }

  private async runCustomAction(
    ctx: ShamarHttpContext,
    meta: ResourceMeta,
    authCtx: AuthorizationContext,
    action: string,
    records: Record<string, unknown>[],
    authGate: ResourceAction,
    asJson?: boolean,
    redirectId?: string,
  ) {
    for (const record of records) {
      try {
        assertResourceAccess(this.authorizer, authCtx, this.registry, meta, authGate, record);
      } catch (error) {
        if (error instanceof ForbiddenError) {
          return respondForbidden(
            ctx,
            error.message,
            asJson || this.wantsJson(ctx),
            this.basePath,
          );
        }
        throw error;
      }
    }

    const ResourceClass = this.registry.resourceClass(meta.slug);
    if (!ResourceClass?.handleAction) {
      return ctx.response.badRequest({ message: `Unknown action: ${action}` });
    }

    const result = await ResourceClass.handleAction(action, records, {
      adapter: this.panel.adapter,
      meta,
      userId: authCtx.user?.id ?? null,
      user: authCtx.user ?? null,
    });

    if (result == null) {
      return ctx.response.badRequest({ message: `Unknown action: ${action}` });
    }

    const message =
      result.message ??
      `${meta.singularLabel} ${action}${records.length > 1 ? ` (${records.length})` : ''}`;

    if (this.wantsJson(ctx, asJson)) {
      return ctx.response.json({ message, count: records.length });
    }

    ctx.session.flash('success', message);
    if (redirectId) {
      return ctx.response.redirect(`${this.basePath}/${meta.slug}/${redirectId}`);
    }
    return ctx.response.redirect(`${this.basePath}/${meta.slug}`);
  }

  private requireResource(ctx: ShamarHttpContext): ResourceMeta {
    return this.registry.require(ctx.params.slug);
  }

  private withPolicyScope(
    authCtx: AuthorizationContext,
    meta: ResourceMeta,
    query: ReturnType<typeof normalizeListQuery>,
  ): ReturnType<typeof normalizeListQuery> {
    const ResourceClass = this.registry.resourceClass(meta.slug);
    if (!ResourceClass) return query;
    const scope = this.authorizer.listScope(authCtx, ResourceClass);
    if (!scope) return query;
    return {
      ...query,
      scope: { ...(query.scope ?? {}), ...scope },
    };
  }

  private listQuery(ctx: ShamarHttpContext): ListViewQuery {
    return {
      page: ctx.request.input('page'),
      perPage: ctx.request.input('perPage'),
      search: ctx.request.input('search'),
      sort: ctx.request.input('sort'),
      direction: ctx.request.input('direction'),
      filters: ctx.request.input('filters'),
      groupBy: ctx.request.input('groupBy'),
      trashed: ctx.request.input('trashed'),
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
    options?: {
      flashPlainText?: string;
      flashMessage?: string;
      authCtx?: AuthorizationContext;
    },
  ) {
    if (this.isEmbed(ctx)) {
      return ctx.response.redirect(
        `${this.basePath}/${meta.slug}/${recordId}?success=${action}&embed=1`,
      );
    }

    if (options?.flashPlainText) {
      ctx.session.flash(
        'success',
        options.flashMessage ??
          `${meta.singularLabel} created. Copy it now — it will not be shown again:\n${options.flashPlainText}`,
      );
      ctx.session.flash('apiKeyPlainText', options.flashPlainText);
    } else {
      ctx.session.flash(
        'success',
        options?.flashMessage ??
          (action === 'created'
            ? `${meta.singularLabel} created`
            : `${meta.singularLabel} updated`),
      );
    }

    const navQuery = recordNavQuery(this.listQuery(ctx));

    // Create-once resources (canEdit false) land on show, not edit.
    if (action === 'created' && options?.authCtx) {
      const ResourceClass = this.registry.resourceClass(meta.slug);
      const editable =
        !ResourceClass ||
        ResourceClass.canEdit(options.authCtx.user ?? { id: '', name: '' });
      if (!editable) {
        return ctx.response.redirect(
          `${this.basePath}/${meta.slug}/${recordId}${navQuery}`,
        );
      }
    }

    // Stay on the edit form so Ctrl+S / continued editing keeps context.
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
      authCtx?: AuthorizationContext;
    },
  ) {
    if (!isValidationException(error)) {
      throw error;
    }

    if (this.wantsJson(ctx, options.asJson)) {
      return ctx.response.status(422).json({
        message: error.message,
        errors: error.errors,
      });
    }

    const authCtx = options.authCtx ?? (await this.resolveAuth(ctx));

    return this.renderForm(ctx, meta, {
      mode: options.mode,
      record: options.record,
      authCtx,
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
      authCtx?: AuthorizationContext;
      formErrors?: Record<string, string>;
      formInitialState?: Record<string, unknown>;
    },
  ) {
    const authCtx = options.authCtx ?? (await this.resolveAuth(ctx));
    const embed = this.isEmbed(ctx);
    const title =
      options.mode === 'create'
        ? `New ${meta.singularLabel}`
        : `Edit ${recordTitle(meta, options.record ?? {})}`;

    const navQuery = recordNavQuery(this.listQuery(ctx));
    const recordId = options.record?.id;
    const policy = resourcePolicyFlags(
      this.authorizer,
      authCtx,
      this.registry,
      meta,
      options.record,
    );
    const shell = this.shellOpts(ctx, authCtx, {
      meta,
      record: options.record,
      pageTitle: title,
      showDeleteButton: options.mode === 'edit' ? policy.delete : undefined,
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
      /** Create-once resources (canEdit false) redirect to show after AJAX create. */
      redirectAfterCreateToShow: options.mode === 'create' && !policy.update,
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
    operation: 'create' | 'edit' | 'show',
    state: Record<string, unknown>,
  ): Promise<Record<string, RelationUiConfig>> {
    const map: Record<string, RelationUiConfig> = {};

    for (const field of meta.fields) {
      if (!isRelationField(field) || !field.relation) continue;

      const related = resolveRelatedMeta(this.registry, field.relation);
      const titleAttribute = relationTitleAttribute(field.relation);
      const widget = field.relation.widget ?? 'combobox';

      let initialItems: Awaited<ReturnType<typeof this.panel.adapter.search>> = [];

      const skipPreload =
        field.relation.kind === 'hasMany' &&
        widget === 'table' &&
        record?.id != null &&
        !!field.relation.foreignKey &&
        relationUsesListTable(field.relation);

      if (skipPreload) {
        // RelationTable loads linked rows via GET relation-table (search/page/filters).
        initialItems = [];
      } else if (field.relation.kind === 'hasMany' && record?.id != null && field.relation.foreignKey) {
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
          data[field.name] = sanitizeStringIds(raw);
        } else if (typeof raw === 'string' && raw.trim()) {
          data[field.name] =
            field.type === 'tags'
              ? sanitizeStringIds(raw.split(','))
              : sanitizeStringIds([raw]);
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
