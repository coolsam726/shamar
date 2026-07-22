import {
  Resource,
  form,
  table,
  infolist,
  actions,
  Section,
  TextInput,
  Textarea,
  Select,
  DatePicker,
  AbilitiesAssignment,
  TextColumn,
  TextEntry,
  ValidationException,
  type PrepareCreateContext,
  type PrepareCreateResult,
  type HandleActionContext,
  type HandleActionResult,
  type ResourceModel,
  type ShamarUser,
} from '@shamar/core'
import { generateApiKey } from '@shamar/cherubim'

/**
 * ORM-agnostic API credentials resource (PATs + machine keys).
 *
 * Apps bind their model: `class AppApiKeyResource extends ApiKeyResource { static model = ApiKey }`
 *
 * Create generates a one-time secret (shown once). Editing credentials is disabled;
 * admins can deactivate / reactivate (and delete) instead.
 * Abilities are picked from the registered `permissions` catalog by name.
 */
export default class ApiKeyResource extends Resource {
  /** Keep as `ResourceModel` so apps can override with a Lucid/Mongoose model class. */
  static override model: ResourceModel = 'ApiKey'
  static override slug = 'api-keys'
  static override label = 'API Keys'
  static override singularLabel = 'API Key'
  static override recordTitleField = 'name'
  static override navigationGroup = 'System'
  static override navigationSort = 8
  static override icon = 'key'

  static override canAccess(_user: ShamarUser): boolean {
    return true
  }

  static override canViewAny(_user: ShamarUser): boolean {
    return true
  }

  static override canView(_user: ShamarUser, _record?: Record<string, unknown>): boolean {
    return true
  }

  static override canCreate(_user: ShamarUser): boolean {
    return true
  }

  /** Secrets are create-once — use Deactivate / Reactivate instead of edit. */
  static override canEdit(_user: ShamarUser, _record?: Record<string, unknown>): boolean {
    return false
  }

  static override canDelete(_user: ShamarUser, _record?: Record<string, unknown>): boolean {
    return true
  }

  static override resourceActions() {
    return actions((a) => {
      a.create()
      a.view()
      a.delete().confirm('Permanently delete this API key? This cannot be undone.')
      a.bulkDelete('Delete selected').confirm('Permanently delete %d selected API key(s)?')
      a
        .row('revoke', 'Deactivate')
        .color('danger')
        .confirm('Deactivate this API key? It will stop working immediately.')
        .ability('delete')
      a
        .row('reactivate', 'Reactivate')
        .confirm('Reactivate this API key?')
        .ability('delete')
      a
        .bulk('revoke', 'Deactivate selected')
        .color('danger')
        .confirm('Deactivate %d selected API key(s)?')
        .ability('delete')
    })
  }

  static override form() {
    return form((f) => {
      f.schema([
        Section.make('Credential')
          .columns(2)
          .schema([
            TextInput.make('name').required().searchable().columnSpanFull(),
            Textarea.make('description')
              .rows(3)
              .columnSpanFull()
              .helperText('Optional note about what this credential is for.'),
            Select.make('kind')
              .label('Type')
              .options([
                { label: 'Machine API key', value: 'machine' },
                { label: 'Personal access token', value: 'pat' },
              ])
              .default('machine')
              .required()
              .live()
              .helperText(
                'Machine keys are standalone principals. PATs act as the selected user.',
              ),
            Select.make('userId')
              .label('User')
              .relationship('users', 'email')
              .visible(({ get }) => get('kind') === 'pat')
              .required(({ get }) => get('kind') === 'pat')
              .helperText('Required for personal access tokens.'),
            AbilitiesAssignment.make('abilities').helperText(
              'Machine: permissions for the key (default * when empty). PAT: optional narrow of the user’s permissions.',
            ),
            DatePicker.make('expiresAt').label('Expires at (optional)'),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.defaultSort('createdAt', 'desc')
        .defaultFilters([{ field: 'kind', value: 'machine' }])
        .schema([
        TextColumn.make('name').searchable().sortable(),
        TextColumn.make('description'),
        TextColumn.make('kind').label('Type').sortable().filterable().groupable(),
        TextColumn.make('tokenPrefix').label('Prefix'),
        TextColumn.make('status').label('Status').badge(),
        TextColumn.make('user.email').label('User'),
        TextColumn.make('lastUsedAt').dateTime().label('Last used'),
        TextColumn.make('expiresAt').dateTime().label('Expires'),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Credential')
          .columns(2)
          .schema([
            TextEntry.make('name').columnSpanFull(),
            TextEntry.make('description').columnSpanFull(),
            TextEntry.make('kind').label('Type'),
            TextEntry.make('status').label('Status').badge(),
            TextEntry.make('tokenPrefix').label('Prefix').copyable(),
            TextEntry.make('user.email').label('User'),
            TextEntry.make('abilities').badge().label('Abilities').columnSpanFull(),
            TextEntry.make('lastUsedAt').dateTime().label('Last used'),
            TextEntry.make('expiresAt').dateTime().label('Expires'),
            TextEntry.make('revokedAt').dateTime().label('Revoked'),
            TextEntry.make('createdAt').dateTime().label('Created'),
          ]),
      ])
    })
  }

  static override async prepareCreate(
    data: Record<string, unknown>,
    ctx: PrepareCreateContext,
  ): Promise<PrepareCreateResult> {
    const name = String(data.name ?? '').trim()
    const descriptionRaw = data.description
    const description =
      descriptionRaw != null && String(descriptionRaw).trim() !== ''
        ? String(descriptionRaw).trim()
        : null
    const kind = String(data.kind ?? 'machine').trim()
    const userIdRaw = data.userId
    const userId =
      userIdRaw != null && String(userIdRaw).trim() !== ''
        ? String(userIdRaw).trim()
        : null

    const errors: Record<string, string> = {}
    if (!name) errors.name = 'Name is required.'
    if (kind !== 'pat' && kind !== 'machine') {
      errors.kind = 'Choose Machine API key or Personal access token.'
    }
    if (kind === 'pat' && !userId) {
      errors.userId = 'Personal access tokens require a user.'
    }
    if (Object.keys(errors).length > 0) {
      throw new ValidationException(errors)
    }

    let abilities = Array.isArray(data.abilities)
      ? data.abilities.map(String).map((entry) => entry.trim()).filter(Boolean)
      : []

    if (kind === 'machine' && abilities.length === 0) {
      abilities = ['*']
    }

    const generated = generateApiKey()
    const expiresRaw = data.expiresAt
    const expiresAt =
      expiresRaw != null && String(expiresRaw).trim() !== ''
        ? new Date(String(expiresRaw))
        : null

    const payload: Record<string, unknown> = {
      name,
      description,
      kind,
      abilities,
      userId: kind === 'pat' ? userId : null,
      tokenHash: generated.tokenHash,
      tokenPrefix: generated.prefix,
      createdByUserId: ctx.userId ?? null,
      expiresAt:
        expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      revokedAt: null,
      lastUsedAt: null,
    }

    const label = kind === 'pat' ? 'Personal access token' : 'Machine API key'

    return {
      data: payload,
      flashPlainText: generated.plainText,
      flashMessage: `${label} "${name}" created. Copy it now — it will not be shown again:\n${generated.plainText}`,
    }
  }

  static override async handleAction(
    action: string,
    records: Record<string, unknown>[],
    ctx: HandleActionContext,
  ): Promise<HandleActionResult | null> {
    if (action !== 'revoke' && action !== 'reactivate') {
      return null
    }

    let changed = 0
    for (const record of records) {
      const id = String(record.id ?? record._id ?? '')
      if (!id) continue
      const revokedAt = record.revokedAt
      const isRevoked = revokedAt != null && String(revokedAt).trim() !== ''

      if (action === 'revoke') {
        if (isRevoked) continue
        await ctx.adapter.update(ctx.meta, id, { revokedAt: new Date() })
        changed += 1
      } else {
        if (!isRevoked) continue
        await ctx.adapter.update(ctx.meta, id, { revokedAt: null })
        changed += 1
      }
    }

    if (action === 'revoke') {
      return {
        message:
          changed === 1
            ? 'API key deactivated'
            : `${changed} API key(s) deactivated`,
      }
    }

    return {
      message:
        changed === 1
          ? 'API key reactivated'
          : `${changed} API key(s) reactivated`,
    }
  }
}
