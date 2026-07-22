import {
  Resource,
  form,
  table,
  infolist,
  Section,
  Callout,
  TextInput,
  Textarea,
  Toggle,
  TextColumn,
  TextEntry,
  IconEntry,
  type ShamarUser,
} from '@shamar/core'
import LockedItem from '#models/locked_item'

/**
 * Demos: canEdit / canDelete policy hooks based on `locked`.
 */
export default class LockedItemResource extends Resource {
  static override model = LockedItem
  static override slug = 'locked-items'
  static override label = 'Locked items'
  static override singularLabel = 'Locked item'
  static override recordTitleField = 'title'
  static override navigationGroup = 'Settings'
  static override navigationSort = 20

  static override canEdit(_user: ShamarUser, record?: Record<string, unknown>): boolean {
    return !record?.locked
  }

  static override canDelete(_user: ShamarUser, record?: Record<string, unknown>): boolean {
    return !record?.locked
  }

  static override form() {
    return form((f) => {
      f.schema([
        Callout.make('Policy demo')
          .danger()
          .description('When Locked is on, edit and delete are denied by canEdit/canDelete.'),
        Section.make('Item')
          .columns(2)
          .schema([
            TextInput.make('title').required().searchable().columnSpanFull(),
            TextInput.make('ownerEmail').email().autocomplete('email'),
            Toggle.make('locked').inline().helperText('Locks the record against edit/delete.'),
            Textarea.make('notes').rows(3).columnSpanFull().maxLength(1000),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('title').searchable().sortable(),
        TextColumn.make('ownerEmail').email().searchable(),
        TextColumn.make('locked').toggle(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Item')
          .columns(2)
          .schema([
            TextEntry.make('title').columnSpanFull(),
            TextEntry.make('ownerEmail').email(),
            IconEntry.make('locked').boolean().icon('🔒').falseIcon('🔓'),
            TextEntry.make('notes').columnSpanFull(),
          ]),
      ])
    })
  }
}
