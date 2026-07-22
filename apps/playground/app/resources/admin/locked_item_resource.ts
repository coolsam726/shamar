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
} from '@shamar/core'
import LockedItem from '#models/locked_item'
import LockedItemPolicy from '#policies/locked_item_policy'

/**
 * Demos: `LockedItemPolicy` denies edit/delete when `locked` is true.
 */
export default class LockedItemResource extends Resource {
  static override model = LockedItem
  static override slug = 'locked-items'
  static override label = 'Locked items'
  static override singularLabel = 'Locked item'
  static override recordTitleField = 'title'
  static override navigationGroup = 'Settings'
  static override navigationSort = 20
  static override policy = LockedItemPolicy

  static override form() {
    return form((f) => {
      f.schema([
        Callout.make('Policy demo')
          .danger()
          .description('When Locked is on, edit and delete are denied by LockedItemPolicy.'),
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
