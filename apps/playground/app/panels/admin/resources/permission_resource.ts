import {
  FormBuilder,
  TableBuilder,
  InfolistBuilder,
  Resource,
  Section,
  TextInput,
  TextColumn,
  TextEntry,
  type ShamarUser,
} from '@shamar/core'
import Permission from '#models/permission'

/** Synced permission catalog — read-only; rows are upserted on app boot from resources. */
export default class PermissionResource extends Resource {
  static override model = Permission
  static override slug = 'permissions'
  static override label = 'Permissions'
  static override singularLabel = 'Permission'
  static override recordTitleField = 'name'
  static override navigationGroup = 'System'
  static override navigationSort = 7
  static override icon = 'key'

  static override canCreate(_user: ShamarUser): boolean {
    return false
  }

  static override canEdit(_user: ShamarUser, _record?: Record<string, unknown>): boolean {
    return false
  }

  static override canDelete(_user: ShamarUser, _record?: Record<string, unknown>): boolean {
    return false
  }

  static override form(form: FormBuilder) {
    form.schema([
      Section.make('Permission')
        .columns(2)
        .schema([
          TextInput.make('name').readonly().searchable().columnSpanFull(),
          TextInput.make('resource').readonly(),
          TextInput.make('ability').readonly(),
          TextInput.make('label').readonly().columnSpanFull(),
        ]),
    ])
    return form
  }

  static override table(table: TableBuilder) {
    table.defaultSort('name', 'asc').schema([
      TextColumn.make('name').searchable().sortable(),
      TextColumn.make('resource').searchable().sortable(),
      TextColumn.make('ability').sortable(),
      TextColumn.make('label'),
    ])
    return table
  }

  static override infolist(infolist: InfolistBuilder) {
    infolist.schema([
      Section.make('Permission')
        .columns(2)
        .schema([
          TextEntry.make('name').copyable().columnSpanFull(),
          TextEntry.make('resource'),
          TextEntry.make('ability'),
          TextEntry.make('label').columnSpanFull(),
        ]),
    ])
    return infolist
  }
}
