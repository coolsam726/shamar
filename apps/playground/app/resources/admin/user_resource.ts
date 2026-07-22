import {
  Resource,
  form,
  table,
  infolist,
  Section,
  TextInput,
  CheckboxList,
  TagsInput,
  TextColumn,
  TextEntry,
} from '@shamar/core'
import User from '#models/user'

/**
 * Admin CRUD for users — manyToMany Roles, optional direct permissions.
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
            CheckboxList.make('roleIds')
              .label('Roles')
              .relationship('roles', 'name')
              .required()
              .columnSpanFull()
              .helperText('Users may belong to multiple roles; permissions are merged.'),
            TagsInput.make('permissions')
              .label('Direct permissions')
              .helperText('Optional extra grants like products:create or *.')
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
        TextColumn.make('roles.name').label('Roles'),
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
            TextEntry.make('roles.name').label('Roles').badge().columnSpanFull(),
            TextEntry.make('permissions').badge().label('Direct permissions').columnSpanFull(),
            TextEntry.make('createdAt').dateTime().label('Joined'),
            TextEntry.make('updatedAt').dateTime().label('Updated'),
          ]),
      ])
    })
  }
}
