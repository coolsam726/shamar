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
 * Admin CRUD for users — password createOnly + revealable, email unique.
 */
export default class UserResource extends Resource {
  static override model = User
  static override slug = 'users'
  static override label = 'Users'
  static override singularLabel = 'User'
  static override recordTitleField = 'email'
  static override navigationGroup = 'System'
  static override navigationSort = 5

  static override form() {
    return form((f) => {
      f.schema([
        Section.make('User')
          .columns(2)
          .schema([
            TextInput.make('fullName').label('Full name').searchable().columnSpanFull(),
            TextInput.make('email').email().required().unique().searchable().autocomplete('email'),
            TextInput.make('password')
              .password()
              .revealable()
              .createOnly()
              .required()
              .minLength(8)
              .autocomplete('new-password')
              .helperText('Required on create only; never shown after save.')
              .columnSpanFull(),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('fullName').label('Name').searchable().sortable(),
        TextColumn.make('email').email().searchable().sortable(),
        TextColumn.make('createdAt').dateTime().label('Joined').sortable(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('User')
          .columns(2)
          .schema([
            TextEntry.make('fullName').label('Full name').columnSpanFull(),
            TextEntry.make('email').email().copyable(),
            TextEntry.make('createdAt').dateTime().label('Joined'),
            TextEntry.make('updatedAt').dateTime().label('Updated'),
          ]),
      ])
    })
  }
}
