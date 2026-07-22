import {
  Resource,
  form,
  table,
  infolist,
  Section,
  Fieldset,
  TextInput,
  Toggle,
  TextColumn,
  TextEntry,
} from '@shamar/core'
import Company from '#models/company'

function acronymCode(value: unknown): string {
  // e.g if I have SavannaBiotech, the acronym should be SB
  return String(value ?? '')
    .split(' ')
    .map(word => word[0])
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
        Section.make()
          // .icon('building')
          .columns(2)
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
              .hint('Auto-filled')
              .helperText('Short unique code used in references and URLs.'),
            TextInput.make('email')
              .email()
              .required()
              .searchable()
              .helperText('Primary contact email for this company.'),
            Toggle.make('active')
              .helperText('Inactive companies are hidden from most pickers.'),
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
            TextEntry.make('id').label('ID'),
            TextEntry.make('name')
              .label('Name')
              .hint('Legal')
              .helperText('Legal name as registered with the company registry.'),
            TextEntry.make('code')
              .label('Code')
              .hint('Unique')
              .helperText('Short unique code used in references and URLs.'),
            TextEntry.make('email')
              .label('Email')
              .helperText('Primary contact email for this company.'),
            TextEntry.make('active')
              .boolean()
              .label('Active')
              .hint('Status')
              .helperText('Inactive companies are hidden from most pickers.'),
          ]),
        Fieldset.make("Metadata").card().schema([
          TextEntry.make('createdAt')
            .label('Created At')
            .dateTime()
            .helperText('The date and time the company was created.'),
          TextEntry.make('updatedAt')
            .label('Updated At')
            .dateTime()
            .helperText('The date and time the company was last updated.'),
        ]),
      ])
    })
  }
}
