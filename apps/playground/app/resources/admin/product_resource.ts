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
  Select,
  CheckboxList,
  TextColumn,
  TextEntry,
  ColorEntry,
  IconEntry,
} from '@shamar/core'
import Product from '#models/product'

/**
 * Demos: numeric/integer bounds, DatePicker, TagsInput, ColorPicker, Checkbox,
 * ColorEntry, defaultSort, table badges, BelongsTo + ManyToMany relations.
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
          ]),
      ])
    })
  }
}
