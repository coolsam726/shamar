import {
  Resource,
  form,
  table,
  infolist,
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

  static override form() {
    return form((f) => {
      f.schema([
        Section.make('Profile')
          .columns(2)
          .schema([
            TextInput.make('fullName').label('Full name').columnSpanFull(),
            TextInput.make('email').email().required().searchable(),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('fullName').label('Name').sortable().searchable(),
        TextColumn.make('email').email().sortable().searchable(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Profile')
          .columns(2)
          .schema([
            TextEntry.make('fullName').label('Full name').columnSpanFull(),
            TextEntry.make('email').label('Email'),
          ]),
      ])
    })
  }
}
