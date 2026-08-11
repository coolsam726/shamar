import {
  ListPage,
  table,
  TextColumn,
} from '@shamar/core'
import Product from '#models/product'

/**
 * Demo ListPage — read-only product catalog (no create/edit routes).
 */
export default class ProductCatalogPage extends ListPage {
  static override slug = 'product-catalog'
  static override label = 'Product catalog'
  static override navigationGroup = 'Catalog'
  static override navigationSort = 20
  static override icon = 'cube'
  static override model = Product
  static override recordTitleField = 'name'
  static override defaultPerPage = 20

  static override table() {
    return table((t) => {
      t.defaultSort('name', 'asc')
      t.schema([
        TextColumn.make('sku').label('SKU').searchable().sortable(),
        TextColumn.make('name').searchable().sortable(),
        TextColumn.make('price').currency('USD').sortable(),
        TextColumn.make('stock').sortable(),
        TextColumn.make('featured').boolean().label('Featured'),
      ])
    })
  }
}
