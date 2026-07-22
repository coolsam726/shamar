import {
  Resource,
  form,
  table,
  infolist,
  actions,
  Section,
  Grid,
  TextInput,
  Select,
  Toggle,
  DatePicker,
  TextColumn,
  TextEntry,
  IconEntry,
} from '@shamar/core'
import Ticket from '#models/ticket'

/**
 * Demos: custom unique message, table dateTime + badge, custom resourceActions.
 */
export default class TicketResource extends Resource {
  static override model = Ticket
  static override slug = 'tickets'
  static override label = 'Tickets'
  static override singularLabel = 'Ticket'
  static override recordTitleField = 'subject'
  static override navigationGroup = 'Ops'
  static override navigationSort = 10

  static override resourceActions() {
    return actions((a) => {
      a.create('New ticket')
      a.view()
      a.edit()
      a.delete().confirm('Delete this ticket permanently?')
      a.bulkDelete('Delete selected tickets').confirm('Delete all selected tickets?')
      a.row('escalate', 'Escalate').color('accent').icon('arrow-up')
      a.header('export', 'Export CSV').color('gray').icon('download')
    })
  }

  static override form() {
    return form((f) => {
      f.schema([
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
    })
  }

  static override table() {
    return table((t) => {
      t.defaultSort('createdAt', 'desc').schema([
        TextColumn.make('code').searchable().sortable(),
        TextColumn.make('subject').searchable().sortable(),
        TextColumn.make('priority').badge().sortable(),
        TextColumn.make('assigneeEmail').email().searchable(),
        TextColumn.make('dueOn').date().sortable(),
        TextColumn.make('resolved').toggle(),
        TextColumn.make('createdAt').dateTime().label('Opened').sortable(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
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
    })
  }
}
