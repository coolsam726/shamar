import {
  Resource,
  form,
  table,
  infolist,
  Section,
  Grid,
  TextInput,
  Checkbox,
  TagsInput,
  ColorPicker,
  DatePicker,
  DateTimePicker,
  TimePicker,
  Select,
  CheckboxList,
  Radio,
  RichEditor,
  MarkdownEditor,
  CodeEditor,
  Repeater,
  KeyValue,
  Slider,
  Rating,
  ToggleButtons,
  TextColumn,
  TextEntry,
  ColorEntry,
  IconEntry,
} from '@shamar/core'
import Product from '#models/product'

/**
 * Demos: numeric/integer bounds, date/time pickers, tags, color, checkbox,
 * rich/markdown/code editors, repeater, key-value, slider, rating, toggle buttons.
 */
export default class ProductResource extends Resource {
  static override model = Product
  static override slug = 'products'
  static override label = 'Products'
  static override singularLabel = 'Product'
  static override recordTitleField = 'name'
  static override navigationGroup = 'Content'
  static override navigationSort = 10

  static override form() {
    return form((f) => {
      f.schema([
        Section.make('Catalog')
          .schema([
            Grid.make(2)
              .columnSpanFull()
              .schema([
                TextInput.make('sku').required().unique().searchable().maxLength(32),
                TextInput.make('name').required().searchable(),
                TextInput.make('price').currency('KES').min(0),
                TextInput.make('stock').integer().min(0).max(99999).default(0),
                DatePicker.make('launchDate').label('Launch date'),
                DateTimePicker.make('launchAt').label('Launch at').seconds(),
                TimePicker.make('restockAt').label('Restock time').hours12(),
                ColorPicker.make('color').helperText('Brand accent for this SKU.'),
                Select.make('companyId')
                  .label('Company')
                  .relationship('companies', 'name')
                  .createOption()
                  .createAndEditOption()
                  .helperText('BelongsTo via combobox with Create / Create & Edit.'),
                CheckboxList.make('categoryIds')
                  .label('Categories')
                  .relationship('categories', 'name')
                  .createOption()
                  .columnSpanFull()
                  .helperText('ManyToMany via checkbox list.'),
                TagsInput.make('tags').columnSpanFull().helperText('Press Enter to add a tag.'),
                Checkbox.make('featured').label('Featured on storefront'),
              ]),
          ]),
        Section.make('Merchandising')
          .schema([
            ToggleButtons.make('size')
              .label('Size')
              .options([
                { label: 'S', value: 's' },
                { label: 'M', value: 'm' },
                { label: 'L', value: 'l' },
                { label: 'XL', value: 'xl' },
              ])
              .grouped(false)
              .helperText('Radio rendered as toggle buttons.'),
            Radio.make('condition')
              .label('Condition')
              .options([
                { label: 'New', value: 'new' },
                { label: 'Refurbished', value: 'refurbished' },
              ])
              .inline()
              .helperText('Classic radio list. Use Radio.buttons() for the toggle style.'),
            CheckboxList.make('channels')
              .label('Channels')
              .options([
                { label: 'Online', value: 'online' },
                { label: 'Retail', value: 'retail' },
                { label: 'Wholesale', value: 'wholesale' },
              ])
              .checkboxColumns(3)
              .helperText('Static checkbox list (no relation).'),
            Slider.make('quality').label('Quality').min(0).max(100).step(5).showValue(),
            Rating.make('rating').label('Buyer rating').allowZero(),
            KeyValue.make('meta')
              .label('Metadata')
              .keyLabel('Name')
              .valueLabel('Value')
              .columnSpanFull(),
            Repeater.make('variants')
              .label('Variants')
              .itemLabel('Variant')
              .addActionLabel('Add variant')
              .schema([
                TextInput.make('sku').label('SKU').required(),
                TextInput.make('label').label('Label'),
                TextInput.make('price').label('Price').min(0),
              ])
              .defaultItems(1)
              .columnSpanFull(),
          ]),
        Section.make('Content')
          .schema([
            RichEditor.make('description').simple().label('Description').columnSpanFull(),
            RichEditor.make('documentBody').document().label('Document body').columnSpanFull(),
            MarkdownEditor.make('bodyMd').label('Markdown body').columnSpanFull(),
            CodeEditor.make('themeJson')
              .label('Theme JSON')
              .language('json')
              .languages(['json', 'css', 'javascript'])
              .columnSpanFull(),
          ]),
      ])
    })
  }

  static override table() {
    return table((t) => {
      t.defaultSort('name', 'asc').schema([
        TextColumn.make('sku').searchable().sortable(),
        TextColumn.make('name').searchable().sortable(),
        TextColumn.make('company.name').label('Company').filterable().groupable(),
        TextColumn.make('price').currency('KES').sortable().alignRight(),
        TextColumn.make('stock').alignCenter().sortable(),
        TextColumn.make('launchDate').date().sortable(),
        TextColumn.make('featured').boolean().badge().filterable().groupable(),
      ])
    })
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Product')
          .columns(3)
          .schema([
            TextEntry.make('sku').label('SKU').copyable(),
            TextEntry.make('name'),
            TextEntry.make('price').currency('KES'),
            TextEntry.make('stock'),
            TextEntry.make('company.name').label('Company'),
            TextEntry.make('categories.name').label('Categories').badge().columnSpanFull(),
            TextEntry.make('launchDate').label('Launch').date(),
            ColorEntry.make('color').label('Color'),
            TextEntry.make('tags').label('Tags').badge().columnSpanFull(),
            IconEntry.make('featured').label('Featured').boolean().icon('★').falseIcon('☆'),
            TextEntry.make('size').label('Size'),
            TextEntry.make('rating').label('Rating'),
            TextEntry.make('channels').label('Channels').badge().columnSpanFull(),
            TextEntry.make('meta').label('Metadata').columnSpanFull(),
            TextEntry.make('variants').label('Variants').columnSpanFull(),
          ]),
      ])
    })
  }
}
