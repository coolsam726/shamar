import {
  FormBuilder,
  TableBuilder,
  InfolistBuilder,
  Resource,
  Section,
  TextInput,
  Toggle,
  DatePicker,
  TextColumn,
  TextEntry,
} from '@shamar/core'
import Campaign from '#models/campaign'

/**
 * Demos: form columns(), dense/collapsed Section, columnStart/columnSpan, datalist, autocomplete.
 */
export default class CampaignResource extends Resource {
  static override model = Campaign
  static override slug = 'campaigns'
  static override label = 'Campaigns'
  static override singularLabel = 'Campaign'
  static override recordTitleField = 'name'
  static override navigationGroup = 'Ops'
  static override navigationSort = 30

  static override form(form: FormBuilder) {
    form.columns(3).schema([
      Section.make('Campaign')
        .columns(3)
        .collapsible()
        .collapsed()
        .dense()
        .description('Collapsed + dense section for compact editing.')
        .schema([
          TextInput.make('name')
            .required()
            .searchable()
            .autocomplete('organization')
            .columnSpan(2)
            .datalist(['Spring Launch', 'Black Friday', 'Partner Outreach']),
          TextInput.make('budget').numeric().min(0).step(100).prefix('$').columnStart(1),
          TextInput.make('channel')
            .datalist(['email', 'ads', 'social', 'events'])
            .placeholder('Channel'),
          DatePicker.make('startsOn').label('Starts'),
          DatePicker.make('endsOn').label('Ends'),
          Toggle.make('active').inline().default(true),
        ]),
    ])
    return form
  }

  static override table(table: TableBuilder) {
    table.defaultSort('startsOn', 'desc').schema([
      TextColumn.make('name').searchable().sortable(),
      TextColumn.make('channel').badge(),
      TextColumn.make('budget').sortable(),
      TextColumn.make('startsOn').date().sortable(),
      TextColumn.make('endsOn').date(),
      TextColumn.make('active').toggle(),
    ])
    return table
  }

  static override infolist(infolist: InfolistBuilder) {
    infolist.columns(3).schema([
      Section.make('Campaign')
        .columns(3)
        .schema([
          TextEntry.make('name').columnSpan(2),
          TextEntry.make('active').boolean().badge(),
          TextEntry.make('budget'),
          TextEntry.make('channel').badge(),
          TextEntry.make('startsOn').date(),
          TextEntry.make('endsOn').date(),
        ]),
    ])
    return infolist
  }
}
