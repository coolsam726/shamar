import {
  Resource,
  form,
  table,
  infolist,
  Section,
  Flex,
  Group,
  Placeholder,
  TextInput,
  Textarea,
  Toggle,
  DatePicker,
  FileUpload,
  TextColumn,
  TextEntry,
  ImageEntry,
} from '@shamar/core'
import Article from '#models/article'

function slugify(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Demos: createOnly slug, length(), markdown body, FileUpload/ImageEntry,
 * softDelete, Flex/Group/Placeholder, live slug generation.
 */
export default class ArticleResource extends Resource {
  static override model = Article
  static override slug = 'articles'
  static override label = 'Articles'
  static override singularLabel = 'Article'
  static override recordTitleField = 'title'
  static override navigationGroup = 'Content'
  static override navigationSort = 30
  static override softDelete = true

  /**
   * Extra verbs beyond CRUD — synced into the permissions catalog on app boot.
   * Assign them to roles via the Roles resource checkbox list.
   */
  static override permissions() {
    return [
      { name: 'approve', label: 'Approve articles' },
      { name: 'publish', label: 'Publish articles' },
    ]
  }

  static override form() {
    return form((f) => {
      f.schema([
        Flex.make([
          Group.make().schema([
            TextInput.make('title')
              .required()
              .searchable()
              .maxLength(160)
              .live({ onBlur: true })
              .afterStateUpdated(({ get, set, operation }) => {
                if (operation === 'create') set('slug', slugify(get('title')))
              }),
            TextInput.make('slug')
              .required()
              .unique()
              .createOnly()
              .minLength(3)
              .maxLength(80)
              .pattern('[a-z0-9-]+')
              .helperText('Set once on create; generated from the title.'),
            DatePicker.make('publishedAt').label('Publish date'),
            Toggle.make('draft').inline().default(true),
          ]),
          Group.make()
            .grow(false)
            .schema([
              Placeholder.make('cover')
                .label('Cover')
                .content('Optional cover image URL or upload for the detail view.'),
              TextInput.make('coverUrl').url().placeholder('https://…/cover.jpg'),
              FileUpload.make('coverFile')
                .image()
                .dehydrated(false)
                .helperText('Demo upload control — filename is not persisted yet.'),
            ]),
        ]).columnSpanFull(),
        Section.make('Body').schema([
          Textarea.make('body')
            .rows(10)
            .maxLength(8000)
            .columnSpanFull()
            .helperText('Markdown supported on the detail page.'),
        ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.defaultSort('updatedAt', 'desc').schema([
        TextColumn.make('title').searchable().sortable(),
        TextColumn.make('slug').searchable(),
        TextColumn.make('publishedAt').date().sortable(),
        TextColumn.make('draft').toggle(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Article')
          .columns(2)
          .schema([
            TextEntry.make('title').columnSpanFull(),
            TextEntry.make('slug').copyable(),
            TextEntry.make('publishedAt').date(),
            TextEntry.make('draft').boolean().badge(),
            ImageEntry.make('coverUrl').label('Cover'),
            TextEntry.make('body').markdown().columnSpanFull(),
          ]),
      ])
    })
  }
}
