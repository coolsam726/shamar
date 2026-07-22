import {
  Resource,
  form,
  table,
  infolist,
  Section,
  EmptyState,
  Hidden,
  TextInput,
  Select,
  Checkbox,
  Toggle,
  TextColumn,
  TextEntry,
  IconEntry,
} from '@shamar/core'
import Preference from '#models/preference'

/**
 * Demos: Select.multiple, Checkbox vs Toggle, Hidden + defaults,
 * visible/disabled closures, EmptyState.
 */
export default class PreferenceResource extends Resource {
  static override model = Preference
  static override slug = 'preferences'
  static override label = 'Preferences'
  static override singularLabel = 'Preference'
  static override recordTitleField = 'key'
  static override navigationGroup = 'Settings'
  static override navigationSort = 10

  static override form() {
    return form((f) => {
      f.schema([
        EmptyState.make('Notification preferences')
          .description('Keys are unique. SMS options unlock when SMS is enabled.'),
        Section.make('Preference')
          .columns(2)
          .schema([
            TextInput.make('key').required().unique().searchable().maxLength(64),
            TextInput.make('label').searchable(),
            Select.make('channels')
              .multiple()
              .options([
                { label: 'Email', value: 'email' },
                { label: 'SMS', value: 'sms' },
                { label: 'Push', value: 'push' },
                { label: 'In-app', value: 'in_app' },
              ])
              .columnSpanFull()
              .helperText('Multi-select combobox with chips.'),
            Toggle.make('notifyEmail').inline().default(true).label('Email alerts'),
            Checkbox.make('notifySms').inline().label('SMS alerts'),
            Select.make('theme')
              .options([
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ])
              .selectablePlaceholder(false)
              .default('system')
              .visible(({ get }) => get('notifyEmail') === true || get('notifySms') === true)
              .helperText('Single-select combobox (visible when any notification channel is on).'),
            Select.make('digest')
              .native()
              .dehydrated(false)
              .options([
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Never', value: 'never' },
              ])
              .default('weekly')
              .helperText('Native <select> via .native().'),
            TextInput.make('smsSender')
              .dehydrated(false)
              .disabled(({ get }) => !get('notifySms'))
              .placeholder('Sender ID')
              .helperText('Disabled unless SMS alerts are checked.'),
            Hidden.make('metaJson').default('{}'),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('key').searchable().sortable(),
        TextColumn.make('label').searchable(),
        TextColumn.make('theme').badge(),
        TextColumn.make('notifyEmail').toggle(),
        TextColumn.make('notifySms').boolean(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Preference')
          .columns(2)
          .schema([
            TextEntry.make('key').copyable(),
            TextEntry.make('label'),
            TextEntry.make('channels').badge().columnSpanFull(),
            IconEntry.make('notifyEmail').label('Email').boolean().icon('✓').falseIcon('✗'),
            IconEntry.make('notifySms').label('SMS').boolean().icon('✓').falseIcon('✗'),
            TextEntry.make('theme').badge(),
            TextEntry.make('metaJson').label('Meta').columnSpanFull(),
          ]),
      ])
    })
  }
}
