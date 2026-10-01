import {
  FormBuilder,
  TableBuilder,
  InfolistBuilder,
  ActionBuilder,
  Resource,
  Section,
  Grid,
  TextInput,
  Select,
  Toggle,
  DatePicker,
  TextColumn,
  TextEntry,
  IconEntry,
  type HandleActionContext,
  type HandleActionResult,
} from '@shamar/core'
import Ticket from '#models/ticket'

/**
 * Demos: custom unique message, table dateTime + badge, modal (confirm) quick actions.
 */
export default class TicketResource extends Resource {
  static override model = Ticket
  static override slug = 'tickets'
  static override label = 'Tickets'
  static override singularLabel = 'Ticket'
  static override recordTitleField = 'subject'
  static override navigationGroup = 'Ops'
  static override navigationSort = 10

  static override resourceActions(actions: ActionBuilder) {
    actions.create('New ticket')
    actions.view()
    actions.edit()
    actions.delete().confirm('Delete this ticket permanently?')
    actions.bulkDelete('Delete selected tickets').confirm('Delete all selected tickets?')
    actions
      .row('escalate', 'Escalate')
      .color('accent')
      .icon('arrow-up')
      .ability('edit')
      .ungrouped()
      .confirm('Escalate this ticket to urgent priority?')
    actions
      .row('resolve', 'Mark resolved')
      .color('primary')
      .icon('check')
      .ability('edit')
      .ungrouped()
      .confirm('Mark this ticket as resolved?')
    actions
      .header('export', 'Export CSV')
      .color('gray')
      .icon('download')
      .ability('viewAny')
      .confirm('Download a CSV export of all tickets? (Demo — no file is generated.)')
    actions
      .bulk('resolve', 'Resolve selected')
      .color('primary')
      .icon('check')
      .ability('edit')
      .confirm('Mark all selected tickets as resolved?')
    return actions
  }

  static override form(form: FormBuilder) {
    form.schema([
      Section.make('Ticket')
        .schema([
          Grid.make(2)
            .columnSpanFull()
            .schema([
              TextInput.make('code')
                .required()
                .unique({ message: 'That ticket code is already in use.' })
                .searchable()
                .prefix('#')
                .maxLength(24)
                .pattern('[A-Z0-9-]+'),
              Select.make('priority')
                .options([
                  { label: 'Low', value: 'low' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'High', value: 'high' },
                  { label: 'Urgent', value: 'urgent' },
                ])
                .selectablePlaceholder(false)
                .default('normal'),
              TextInput.make('subject').required().searchable().columnSpanFull().maxLength(200),
              TextInput.make('assigneeEmail').email().autocomplete('email'),
              DatePicker.make('dueOn').label('Due on'),
              Toggle.make('resolved').inline(),
            ]),
        ]),
    ])
    return form
  }

  static override table(table: TableBuilder) {
    table.defaultSort('createdAt', 'desc')
      .defaultFilters([{ field: 'resolved', value: false, label: 'Resolved: No' }])
      .schema([
      TextColumn.make('code').searchable().sortable(),
      TextColumn.make('subject').searchable().sortable(),
      TextColumn.make('priority').badge().sortable().filterable().groupable(),
      TextColumn.make('assigneeEmail').email().searchable(),
      TextColumn.make('dueOn').date().sortable(),
      TextColumn.make('resolved').toggle().filterable().groupable(),
      TextColumn.make('createdAt').dateTime().label('Opened').sortable(),
    ])
    return table
  }

  static override infolist(infolist: InfolistBuilder) {
    infolist.schema([
      Section.make('Ticket')
        .columns(2)
        .schema([
          TextEntry.make('code').copyable().badge(),
          TextEntry.make('priority').badge(),
          TextEntry.make('subject').columnSpanFull(),
          TextEntry.make('assigneeEmail').email(),
          TextEntry.make('dueOn').date(),
          IconEntry.make('resolved').boolean().icon('✓').falseIcon('○'),
          TextEntry.make('createdAt').dateTime().label('Opened'),
        ]),
    ])
    return infolist
  }

  static override async handleAction(
    action: string,
    records: Record<string, unknown>[],
    ctx: HandleActionContext,
  ): Promise<HandleActionResult | null> {
    if (action === 'export') {
      return {
        message: `CSV export queued for ${await Ticket.countDocuments()} ticket(s) (demo).`,
      }
    }

    if (action !== 'escalate' && action !== 'resolve') {
      return null
    }

    let changed = 0
    for (const record of records) {
      const id = String(record.id ?? record._id ?? '')
      if (!id) continue

      if (action === 'escalate') {
        if (String(record.priority ?? '') === 'urgent') continue
        await ctx.adapter.update(ctx.meta, id, { priority: 'urgent' })
        changed += 1
      } else {
        if (record.resolved === true || record.resolved === 'true') continue
        await ctx.adapter.update(ctx.meta, id, { resolved: true })
        changed += 1
      }
    }

    if (action === 'escalate') {
      return {
        message:
          changed === 1
            ? 'Ticket escalated to urgent.'
            : `${changed} ticket(s) escalated to urgent.`,
      }
    }

    return {
      message:
        changed === 1 ? 'Ticket marked resolved.' : `${changed} ticket(s) marked resolved.`,
    }
  }
}
