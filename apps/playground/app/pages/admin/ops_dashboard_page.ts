import {
  Page,
  pageContent,
  form,
  table,
  infolist,
  Section,
  TextColumn,
  TextEntry,
  Select,
} from '@shamar/core'
import Product from '#models/product'
import { getAppSettings, upsertAppSettings } from '#models/app_settings'

/**
 * Demo composite Page — Edge block, form, table, and infolist in one screen.
 */
export default class OpsDashboardPage extends Page {
  static override slug = 'ops-dashboard'
  static override label = 'Ops dashboard'
  static override navigationGroup = 'System'
  static override navigationSort = 15
  static override icon = 'squares-2x2'

  static override content() {
    return pageContent((p) => {
      p.edge('banner', {
        view: 'pages/admin/ops_banner',
        data: async (ctx) => ({
          userName: ctx.user?.name ?? 'Admin',
          orderCount: await Product.countDocuments(),
        }),
      })

      p.form('quick-settings', {
        title: 'Quick settings',
        form: () =>
          form((f) => {
            f.schema([
              Section.make('Preferences').schema([
                Select.make('theme')
                  .label('Default theme')
                  .options([
                    { label: 'System', value: 'system' },
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                  ])
                  .selectablePlaceholder(false)
                  .default('system'),
              ]),
            ])
          }),
        fill: async () => {
          const settings = await getAppSettings()
          return { theme: settings?.theme ?? 'system' }
        },
        save: async (data) => {
          await upsertAppSettings({
            theme: String(data.theme ?? 'system').trim() || 'system',
          })
          return { message: 'Quick settings saved' }
        },
      })

      p.table('recent-products', {
        title: 'Recent products',
        model: Product,
        linkResourceSlug: 'products',
        defaultPerPage: 10,
        table: () =>
          table((t) => {
            t.defaultSort('name', 'asc')
            t.schema([
              TextColumn.make('sku').label('SKU').searchable().sortable(),
              TextColumn.make('name').searchable().sortable(),
              TextColumn.make('price').currency('USD').sortable(),
              TextColumn.make('stock').sortable(),
            ])
          }),
      })

      p.infolist('environment', {
        title: 'Environment',
        record: () => ({
          nodeEnv: process.env.NODE_ENV ?? 'development',
          appVersion: '0.2.0',
        }),
        infolist: () =>
          infolist((i) => {
            i.schema([
              Section.make('Runtime').schema([
                TextEntry.make('nodeEnv').label('NODE_ENV'),
                TextEntry.make('appVersion').label('Version'),
              ]),
            ])
          }),
      })
    })
  }
}
