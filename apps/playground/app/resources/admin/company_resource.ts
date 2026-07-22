import {
  Resource,
  form,
  table,
  infolist,
  Section,
  Fieldset,
  Grid,
  Tabs,
  Tab,
  Callout,
  TextInput,
  Toggle,
  TextColumn,
  TextEntry,
  IconEntry,
} from '@shamar/core'
import Company from '#models/company'

function acronymCode(value: unknown): string {
  return String(value ?? '')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export default class CompanyResource extends Resource {
  static override model = Company
  static override slug = 'companies'
  static override label = 'Companies'
  static override singularLabel = 'Company'
  static override recordTitleField = 'name'
  static override navigationSort = 1
  static override navigationGroup = 'System'

  static override form() {
    return form((f) => {
      f.schema([
        Callout.make('Tip')
          .info()
          .description('Code is generated from the company name when you leave the name field.'),
        Section.make('Company')
          .icon('building')
          .collapsible()
          .schema([
            Grid.make(4)
            .columnSpanFull()
            .schema([
              TextInput.make('id').disabled().label('ID'),
              TextInput.make('name')
                .required()
                .searchable()
                .placeholder('Enter company name')
                .hint('Required')
                .helperText('Legal name as registered with the company registry.')
                .live({ onBlur: true })
                .afterStateUpdated(({ get, set }) => {
                  set('code', acronymCode(get('name')))
                }),
              TextInput.make('code')
                .required()
                .searchable()
                .unique()
                .prefix('#')
                .hint('Auto-filled')
                .helperText('Short unique code used in references and URLs.'),
              TextInput.make('email')
                .email()
                .required()
                .searchable()
                .helperText('Primary contact email for this company.'),
            ]),
          ]),
        Tabs.make()
          .tabs([
            Tab.make('Status').schema([
              Toggle.make('active')
                .inline()
                .helperText('Inactive companies are hidden from most pickers.'),
            ]),
            Tab.make('Notes').schema([
              Fieldset.make('Flags').card(false).schema([
                Toggle.make('active').label('Active (fieldset)'),
              ]),
            ]),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('id').id().label('ID').sortable(),
        TextColumn.make('name').sortable().searchable(),
        TextColumn.make('code'),
        TextColumn.make('email').email().searchable(),
        TextColumn.make('active').toggle(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Company')
          .columns(3)
          .schema([
            TextEntry.make('id').label('ID').copyable(),
            TextEntry.make('name').label('Name').hint('Legal').badge(),
            TextEntry.make('code').label('Code').hint('Unique'),
            TextEntry.make('email').label('Email').columnSpanFull(),
            IconEntry.make('active').label('Active').boolean().icon('✓').falseIcon('✗'),
          ]),
        Fieldset.make('Metadata').card().schema([
          TextEntry.make('createdAt').label('Created At').dateTime(),
          TextEntry.make('updatedAt').label('Updated At').dateTime(),
        ]),
      ])
    })
  }
}
