import {
  Resource,
  form,
  table,
  infolist,
  Section,
  TextInput,
  Textarea,
  Toggle,
  PermissionsAssignment,
  TextColumn,
  TextEntry,
} from '@shamar/core'
import Role from '#models/role'

export default class RoleResource extends Resource {
  static override model = Role
  static override slug = 'roles'
  static override label = 'Roles'
  static override singularLabel = 'Role'
  static override recordTitleField = 'name'
  static override navigationGroup = 'System'
  static override navigationSort = 6
  static override icon = 'shield'

  static override form() {
    return form((f) => {
      f.schema([
        Section.make('Role')
          .columns(2)
          .schema([
            TextInput.make('name').required().searchable(),
            TextInput.make('slug')
              .required()
              .searchable()
              .helperText('Stable key, e.g. editor'),
            Textarea.make('description').columnSpanFull(),
            PermissionsAssignment.make('permissionIds'),
            Toggle.make('active').label('Active').default(true),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.defaultSort('name', 'asc').schema([
        TextColumn.make('name').searchable().sortable(),
        TextColumn.make('slug').searchable().sortable(),
        TextColumn.make('active').boolean().sortable(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Role')
          .columns(2)
          .schema([
            TextEntry.make('name'),
            TextEntry.make('slug'),
            TextEntry.make('description').columnSpanFull(),
            TextEntry.make('permissionIds').label('Permissions').columnSpanFull(),
            TextEntry.make('active').boolean(),
          ]),
      ])
    })
  }
}
