import {
  Resource,
  form,
  table,
  infolist,
  Section,
  Wizard,
  Step,
  Callout,
  TextInput,
  Radio,
  DateTimePicker,
  TextColumn,
  TextEntry,
} from '@shamar/core'
import Event from '#models/event'

/**
 * Demos: DateTimePicker, Radio, Wizard/Step, live debounce + afterStateUpdated, Callout.
 */
export default class EventResource extends Resource {
  static override model = Event
  static override slug = 'events'
  static override label = 'Events'
  static override singularLabel = 'Event'
  static override recordTitleField = 'title'
  static override navigationGroup = 'Content'
  static override navigationSort = 20

  static override form() {
    return form((f) => {
      f.schema([
        Callout.make('Scheduling')
          .warning()
          .description('Use the wizard steps to capture timing, capacity, and status.'),
        Wizard.make([
          Step.make('Basics').schema([
            TextInput.make('title').required().searchable().maxLength(120),
            TextInput.make('venue').placeholder('Venue or URL').datalist([
              'Main Hall',
              'Conference Room A',
              'Virtual — Zoom',
            ]),
          ]),
          Step.make('Schedule').schema([
            DateTimePicker.make('startsAt').required(),
            DateTimePicker.make('endsAt'),
          ]),
          Step.make('Capacity').schema([
            TextInput.make('capacity')
              .integer()
              .min(1)
              .max(5000)
              .live({ debounce: '400ms' })
              .afterStateUpdated(({ get, set }) => {
                const cap = Number(get('capacity') ?? 0)
                set(
                  'waitlistHint',
                  cap > 0 && cap < 50 ? 'Small room — enable waitlist.' : 'Standard capacity.',
                )
              })
              .helperText('Changing capacity updates the waitlist hint.'),
            TextInput.make('waitlistHint').readonly().dehydrated(false).label('Hint'),
            Radio.make('status')
              .options([
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' },
                { label: 'Cancelled', value: 'cancelled' },
              ])
              .inline()
              .default('draft'),
          ]),
        ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.defaultSort('startsAt', 'desc').schema([
        TextColumn.make('title').searchable().sortable(),
        TextColumn.make('startsAt').dateTime().sortable(),
        TextColumn.make('endsAt').dateTime(),
        TextColumn.make('capacity').sortable(),
        TextColumn.make('status').badge(),
        TextColumn.make('venue').searchable(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Event')
          .columns(2)
          .schema([
            TextEntry.make('title').columnSpanFull(),
            TextEntry.make('startsAt').dateTime(),
            TextEntry.make('endsAt').dateTime(),
            TextEntry.make('capacity'),
            TextEntry.make('status').badge(),
            TextEntry.make('venue').columnSpanFull(),
          ]),
      ])
    })
  }
}
