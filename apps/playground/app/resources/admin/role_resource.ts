import {
  FormBuilder,
  TableBuilder,
  InfolistBuilder,
  Resource,
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
  /** Demo: resource override of panel defaultPerPage (25). */
  static override defaultPerPage = 10

  static override form(form: FormBuilder) {
    form.schema([
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
    return form
  }

  static override table(table: TableBuilder) {
    table.defaultSort('name', 'asc').schema([
      TextColumn.make('name').searchable().sortable(),
      TextColumn.make('slug').searchable().sortable(),
      TextColumn.make('active').boolean().sortable(),
    ])
    return table
  }

  static override infolist(infolist: InfolistBuilder) {
    infolist.schema([
      Section.make('Role')
        .columns(2)
        .schema([
          TextEntry.make('name'),
          TextEntry.make('slug'),
          TextEntry.make('description').columnSpanFull(),
          // Same field name as form PermissionsAssignment — show page renders
          // the readonly checkbox matrix (labels/names), not raw ids.
          TextEntry.make('permissionIds').label('Permissions').columnSpanFull(),
          TextEntry.make('active').boolean(),
        ]),
    ])
    return infolist
  }
}
