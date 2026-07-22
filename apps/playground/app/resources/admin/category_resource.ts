import {
  Resource,
  form,
  table,
  infolist,
  Section,
  TextInput,
  Textarea,
  TextColumn,
  TextEntry,
} from '@shamar/core'
import Category from '#models/category'

export default class CategoryResource extends Resource {
  static override model = Category
  static override slug = 'categories'
  static override label = 'Categories'
  static override singularLabel = 'Category'
  static override recordTitleField = 'name'
  static override navigationGroup = 'Content'
  static override navigationSort = 12

  static override form() {
    return form((f) => {
      f.schema([
        Section.make('Category')
          .schema([
            TextInput.make('name').required().unique().searchable().live(),
            TextInput.make('slug').helperText('Optional URL slug.'),
            Textarea.make('description').rows(3).columnSpanFull(),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.defaultSort('name', 'asc').schema([
        TextColumn.make('name').searchable().sortable(),
        TextColumn.make('slug').searchable(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Category')
          .columns(2)
          .schema([
            TextEntry.make('name'),
            TextEntry.make('slug'),
            TextEntry.make('description').columnSpanFull(),
          ]),
      ])
    })
  }
}
