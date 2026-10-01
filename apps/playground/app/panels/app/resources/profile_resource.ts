import {
  FormBuilder,
  TableBuilder,
  InfolistBuilder,
  Resource,
  Section,
  TextInput,
  TextColumn,
  TextEntry,
} from '@shamar/core'
import User from '#models/user'

/**
 * Thin second-panel resource for `/app` discovery demo.
 */
export default class ProfileResource extends Resource {
  static override model = User
  static override slug = 'profiles'
  static override label = 'Profiles'
  static override singularLabel = 'Profile'
  static override recordTitleField = 'email'
  static override navigationSort = 1
  static override navigationGroup = 'Account'

  static override form(form: FormBuilder) {
    form.schema([
      Section.make('Profile')
        .columns(2)
        .schema([
          TextInput.make('fullName').label('Full name').columnSpanFull(),
          TextInput.make('email').email().required().searchable(),
        ]),
    ])
    return form
  }

  static override table(table: TableBuilder) {
    table.schema([
      TextColumn.make('fullName').label('Name').sortable().searchable(),
      TextColumn.make('email').email().sortable().searchable(),
    ])
    return table
  }

  static override infolist(infolist: InfolistBuilder) {
    infolist.schema([
      Section.make('Profile')
        .columns(2)
        .schema([
          TextEntry.make('fullName').label('Full name').columnSpanFull(),
          TextEntry.make('email').label('Email'),
        ]),
    ])
    return infolist
  }
}
