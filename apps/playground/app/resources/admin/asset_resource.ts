import {
  Resource,
  form,
  table,
  infolist,
  Section,
  TextInput,
  FileUpload,
  Toggle,
  TextColumn,
  TextEntry,
  ImageEntry,
} from '@shamar/core'
import Asset from '#models/asset'

/**
 * Demos: FileUpload accept/multiple, readonly fields, copyable checksum, ImageEntry.
 * Slug is `files` (not `assets`) — `/admin/assets/*` is reserved for panel static assets.
 */
export default class AssetResource extends Resource {
  static override model = Asset
  static override slug = 'files'
  static override label = 'Files'
  static override singularLabel = 'File'
  static override recordTitleField = 'name'
  static override navigationGroup = 'Ops'
  static override navigationSort = 20

  static override form() {
    return form((f) => {
      f.schema([
        Section.make('Asset')
          .columns(2)
          .schema([
            TextInput.make('name').required().searchable().columnSpanFull(),
            FileUpload.make('upload')
              .accept('image/*,.pdf,.zip')
              .dehydrated(false)
              .helperText('Native file input demo — pick a file to see the filename in state.')
              .columnSpanFull()
              .live()
              .afterStateUpdated(({ get, set }) => {
                const name = String(get('upload') ?? '')
                if (!name) return
                set('path', `/uploads/${name}`)
                set('isImage', /\.(png|jpe?g|gif|webp|svg)$/i.test(name))
                set('mime', name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
                set('checksum', `demo-${name.length}-${name.slice(0, 8)}`)
              }),
            TextInput.make('path').readonly(),
            TextInput.make('mime').readonly(),
            TextInput.make('size').numeric().min(0).disabled().helperText('Size is not filled by the demo uploader.'),
            TextInput.make('checksum').copyable().readonly(),
            Toggle.make('isImage').inline().label('Treat as image'),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('name').searchable().sortable(),
        TextColumn.make('mime').searchable(),
        TextColumn.make('size').sortable(),
        TextColumn.make('isImage').boolean().badge(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Asset')
          .columns(2)
          .schema([
            TextEntry.make('name').columnSpanFull(),
            TextEntry.make('path').copyable(),
            TextEntry.make('mime'),
            TextEntry.make('size'),
            TextEntry.make('checksum').copyable(),
            TextEntry.make('isImage').boolean().badge(),
            ImageEntry.make('path').label('Preview'),
          ]),
      ])
    })
  }
}
