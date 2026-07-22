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
  Textarea,
  Select,
  Toggle,
  TextColumn,
  TextEntry,
  IconEntry,
  RelationTable,
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
            Grid.make(2)
              .columnSpanFull()
              .schema([
                TextInput.make('id').disabled().label('ID').copyable(),
                TextInput.make('name')
                  .required()
                  .searchable()
                  .placeholder('Enter company name')
                  .hint('Required')
                  .helperText('Legal name as registered with the company registry.')
                  .maxLength(120)
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
                  .helperText('Short unique code used in references and URLs.')
                  .maxLength(32)
                  .pattern('[A-Za-z0-9_-]+'),
                TextInput.make('email')
                  .email()
                  .required()
                  .searchable()
                  .prefixIcon('envelope')
                  .autocomplete('email')
                  .helperText('Primary contact email for this company.'),
              ]),
          ]),
        Section.make('Contact')
          .schema([
            Grid.make(2)
              .columnSpanFull()
              .schema([
                TextInput.make('phone')
                  .tel()
                  .prefixIcon('phone')
                  .placeholder('+254 700 000 000')
                  .autocomplete('tel'),
                TextInput.make('website')
                  .url()
                  .prefixIcon('globe')
                  .placeholder('https://example.com')
                  .suffixIcon('link')
                  .datalist(['https://example.com', 'https://savannabits.com']),
                Select.make('industry')
                  .placeholder('Choose industry')
                  .selectablePlaceholder(false)
                  .options([
                    { label: 'Technology', value: 'technology' },
                    { label: 'Healthcare', value: 'healthcare' },
                    { label: 'Finance', value: 'finance' },
                    { label: 'Education', value: 'education' },
                    { label: 'Other', value: 'other' },
                  ])
                  .columnSpanFull(),
                Textarea.make('notes')
                  .rows(4)
                  .maxLength(500)
                  .placeholder('Internal notes…')
                  .columnSpanFull(),
              ]),
          ]),
        Tabs.make()
          .tabs([
            Tab.make('Status').schema([
              Toggle.make('active')
                .inline()
                .helperText('Inactive companies are hidden from most pickers.'),
            ]),
            Tab.make('Security').schema([
              TextInput.make('api_token')
                .password()
                .revealable()
                .dehydrated(false)
                .prefixIcon('lock')
                .helperText('Demo only — revealable password input; not saved.'),
              Fieldset.make('Flags').card(false).schema([
                Toggle.make('active').label('Active (fieldset)'),
              ]),
            ]),
          ]),
        Section.make('Products')
          .description('HasMany relationship table (edit after saving the company).')
          .schema([
            RelationTable.make('products')
              .relationship('products', 'name', { foreignKey: 'companyId' })
              .createAndEditOption()
              .columnSpanFull(),
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
            TextEntry.make('phone').label('Phone'),
            TextEntry.make('website').label('Website').url(),
            TextEntry.make('industry').label('Industry'),
            TextEntry.make('notes').label('Notes').columnSpanFull(),
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
