#!/usr/bin/env node
/**
 * Generate Filament-style reference MDX pages.
 * Run: node apps/docs/scripts/generate-reference.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { componentShotPath, FORM_OPEN_DOC_SHOTS } from './component-shots-manifest.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../src/content/docs/docs/reference')

const cs = componentShotPath

const FORM_GALLERY = 'Form components gallery at `/demo/form-components`.'

const IMPORT =
  "import DocScreenshot from '../../../../../components/DocScreenshot.astro';\nimport DocApiTable from '../../../../../components/DocApiTable.astro';\n\n"

const SHARED_FORM = [
  { method: '.label(text)', description: 'Field label in the UI.' },
  { method: '.required()', description: 'Mark required on create/edit.' },
  { method: '.helperText(text)', description: 'Help text below the control.' },
  { method: '.default(value)', description: 'Default state when creating a record.' },
  { method: '.hiddenOnForm() / .hiddenOnDetail()', description: 'Hide on create/edit or show view.' },
  { method: '.columnSpan(n) / .columnSpanFull()', description: 'Grid span inside Section/Grid layouts.' },
  { method: '.live()', description: 'Re-render the form when this field changes.' },
]

function frontmatter(title, description) {
  return `---\ntitle: ${title}\ndescription: ${description}\n---\n\n`
}

function apiTable(rows, title = 'Methods') {
  const items = rows
    .map((r) => `    { method: '${r.method.replace(/'/g, "\\'")}', description: '${r.description.replace(/'/g, "\\'")}' },`)
    .join('\n')
  return `<DocApiTable\n  title="${title}"\n  rows={[\n${items}\n  ]}\n/>\n\n`
}

function shot(src, alt, caption, wide = false) {
  if (!src) return ''
  return `<DocScreenshot\n  src="${src}"\n  alt="${alt}"\n  caption="${caption.replace(/"/g, '&quot;')}"${wide ? '\n  wide' : ''}\n/>\n\n`
}

function openShots(category, slug) {
  const variants = FORM_OPEN_DOC_SHOTS[slug]
  if (!variants?.length) return ''
  return variants
    .map((v) => shot(cs(category, slug, v.variant), v.alt, v.caption))
    .join('')
}

function code(block, lang = 'ts') {
  return '```' + lang + '\n' + block + '\n```\n\n'
}

async function write(relativePath, content) {
  const file = join(ROOT, relativePath)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
}

async function writeForms() {
  const forms = [
    ['text-input', 'TextInput', 'Single-line text, email, URL, password, and numeric inputs.', '/screenshots/product-form.png',
      `TextInput.make('name').required().searchable()
TextInput.make('price').currency('KES').min(0)
TextInput.make('sku').unique().maxLength(32)`,
      [
        { method: '.email()', description: 'Email input.' },
        { method: '.password() / .revealable()', description: 'Password with optional reveal.' },
        { method: '.url() / .tel()', description: 'URL or tel keyboard hints.' },
        { method: '.numeric() / .integer()', description: 'Number input.' },
        { method: '.currency(code)', description: 'Currency prefix and formatting.' },
        { method: '.unique({ message })', description: 'Unique validation message.' },
        { method: '.prefix() / .suffix()', description: 'Affix text or icons.' },
        { method: '.maxLength(n) / .pattern(regex)', description: 'Length and pattern validation.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['textarea', 'Textarea', 'Multi-line plain text.', null,
      `Textarea.make('notes').rows(4).columnSpanFull()`,
      [{ method: '.rows(n)', description: 'Visible row count.' }, ...SHARED_FORM], FORM_GALLERY],
    ['select', 'Select', 'Single or multi select — static or relationship-driven.', '/screenshots/product-form.png',
      `Select.make('companyId')
  .relationship('companies', 'name')
  .createOption()
  .createAndEditOption()`,
      [
        { method: '.options([{ label, value }])', description: 'Static choices.' },
        { method: '.multiple()', description: 'Multi-select.' },
        { method: '.relationship(name, titleAttribute)', description: 'BelongsTo picker.' },
        { method: '.createOption() / .createAndEditOption()', description: 'Inline create modals.' },
        { method: '.native()', description: 'Native select element.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['toggle', 'Toggle', 'Boolean switch.', null, `Toggle.make('resolved').inline()`,
      [{ method: '.inline()', description: 'Label beside switch.' }, ...SHARED_FORM], FORM_GALLERY],
    ['checkbox', 'Checkbox', 'Single boolean checkbox.', null, `Checkbox.make('featured').label('Featured')`, SHARED_FORM, FORM_GALLERY],
    ['radio', 'Radio', 'Radio group for one choice.', null,
      `Radio.make('condition').options([{ label: 'New', value: 'new' }]).inline().buttons()`,
      [
        { method: '.options([])', description: 'Choices.' },
        { method: '.inline() / .buttons()', description: 'Layout variants.' },
        { method: '.relationship()', description: 'Options from relation.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['checkbox-list', 'CheckboxList', 'Multiple checkboxes — static or ManyToMany.', null,
      `CheckboxList.make('categoryIds').relationship('categories', 'name').checkboxColumns(3)`,
      [
        { method: '.options([])', description: 'Static choices.' },
        { method: '.relationship(name, titleAttribute)', description: 'ManyToMany relation.' },
        { method: '.checkboxColumns(n)', description: 'Multi-column layout.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['date-pickers', 'Date & time pickers', 'DatePicker, DateTimePicker, TimePicker, WeekPicker, MonthPicker.', '/screenshots/product-form.png',
      `DatePicker.make('launchDate')
DateTimePicker.make('launchAt').seconds()
TimePicker.make('restockAt').hours12()`,
      [
        { method: '.native()', description: 'Browser native picker.' },
        { method: '.minDate() / .maxDate()', description: 'Date bounds.' },
        { method: '.seconds() / .hours12() / .hours24()', description: 'DateTime/time format.' },
        { method: '.minuteStep(n)', description: 'Time step interval.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['file-picker', 'FilePicker', 'Media library picker with folder and public URL support.', null,
      `FilePicker.make('logoMediaId').image().makePublic()`,
      [
        { method: '.image()', description: 'Images only.' },
        { method: '.accept() / .multiple()', description: 'Type filter and multi-select.' },
        { method: '.folder() / .makePublic()', description: 'Media folder and public URL.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['file-upload', 'FileUpload', 'Native file input upload field.', null,
      `FileUpload.make('upload').accept('image/*,.pdf')`,
      [
        { method: '.accept() / .multiple()', description: 'Allowed types and multi-file.' },
        { method: '.image()', description: 'Image upload mode.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['rich-editor', 'RichEditor', 'WYSIWYG — simple, notion, and document modes.', null,
      `RichEditor.make('description').simple()
RichEditor.make('documentBody').document()`,
      [
        { method: '.simple() / .notion() / .document()', description: 'Editor modes.' },
        { method: '.toolbar([...])', description: 'Custom toolbar.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['markdown-editor', 'MarkdownEditor', 'Markdown with preview.', null, `MarkdownEditor.make('bodyMd').columnSpanFull()`,
      [{ method: '.toolbar(buttons)', description: 'Toolbar buttons.' }, ...SHARED_FORM], FORM_GALLERY],
    ['code-editor', 'CodeEditor', 'Syntax-highlighted code editor.', null,
      `CodeEditor.make('themeJson').language('json').languages(['json', 'css'])`,
      [
        { method: '.language(id)', description: 'Primary syntax.' },
        { method: '.languages([...])', description: 'Allowed modes.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['tags-input', 'TagsInput', 'Tokenized tags (Enter to add).', null, `TagsInput.make('tags')`, SHARED_FORM, FORM_GALLERY],
    ['color-picker', 'ColorPicker', 'Hex color with swatch.', null, `ColorPicker.make('color')`, SHARED_FORM, FORM_GALLERY],
    ['key-value', 'KeyValue', 'Editable key/value JSON map.', null,
      `KeyValue.make('meta').keyLabel('Name').valueLabel('Value').reorderable()`,
      [
        { method: '.keyLabel() / .valueLabel()', description: 'Column labels.' },
        { method: '.reorderable()', description: 'Drag reorder.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['repeater', 'Repeater', 'Repeatable sub-field rows (JSON array).', null,
      `Repeater.make('variants')
  .schema([TextInput.make('sku'), TextInput.make('label')])
  .defaultItems(1)`,
      [
        { method: '.schema([fields])', description: 'Row schema.' },
        { method: '.minItems() / .maxItems()', description: 'Bounds.' },
        { method: '.reorderable() / .addable() / .deletable()', description: 'Row actions.' },
        { method: '.defaultItems(n)', description: 'Initial empty rows.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['slider', 'Slider', 'Numeric range slider.', null, `Slider.make('quality').min(0).max(100).showValue()`,
      [
        { method: '.min() / .max() / .step()', description: 'Range.' },
        { method: '.showValue()', description: 'Show current value.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['rating', 'Rating', 'Star rating input.', null, `Rating.make('rating').allowZero()`,
      [{ method: '.allowZero()', description: 'Allow zero stars.' }, ...SHARED_FORM], FORM_GALLERY],
    ['toggle-buttons', 'ToggleButtons', 'Choice as button group.', null,
      `ToggleButtons.make('size').options([{ label: 'S', value: 's' }]).grouped(false)`,
      [
        { method: '.options([])', description: 'Choices.' },
        { method: '.grouped() / .colors()', description: 'Visual variants.' },
        { method: '.multiple()', description: 'Multi-select.' },
        ...SHARED_FORM,
      ], FORM_GALLERY],
    ['relation-table', 'RelationTable', 'Embedded HasMany table in a form.', null,
      `RelationTable.make('contacts').relationship('contacts', 'name').listTable().createOption()`,
      [
        { method: '.relationship(name, titleAttribute)', description: 'Related model.' },
        { method: '.listTable() / .simple()', description: 'Table chrome.' },
        { method: '.createOption()', description: 'Inline create.' },
        ...SHARED_FORM,
      ], 'Company resource.'],
    ['hidden', 'Hidden', 'Dehydrated field hidden from UI.', null, `Hidden.make('key')`, SHARED_FORM, 'Preference resource.'],
  ]

  for (const [slug, title, desc, , usage, methods, demo] of forms) {
    let body = IMPORT
    body += shot(cs('forms', slug), title, demo)
    body += openShots('forms', slug)
    body += code(usage)
    body += apiTable(methods)
    body += `## Playground\n\n${demo}\n`
    await write(`forms/${slug}.mdx`, frontmatter(title, desc) + body)
  }

  await write(
    'forms/index.mdx',
    frontmatter('Forms overview', 'Form schemas, shared field API, and layout components.') +
      IMPORT +
      shot(cs('forms', 'select'), 'Form fields gallery', 'All field types on one page — `/demo/form-components`.', true) +
      code(`static form() {
  return form((f) => {
    f.schema([
      Section.make('Basics').schema([
        TextInput.make('name').required(),
      ]),
    ])
  })
}`) +
      `Resources declare a \`form()\` builder. The Adonis host renders create/edit, hydrates payloads via the **field registry**, and validates required fields.

## Shared field API

All field builders extend \`FormComponent\`:

` +
      apiTable(SHARED_FORM, 'Common methods') +
      `Browse each field type in the sidebar, or see [Schema layouts](/docs/reference/forms/schema-layouts/).
`
  )

  await write(
    'forms/schema-layouts.mdx',
    frontmatter('Schema layouts', 'Section, Tabs, Grid, Wizard, and other form layout nodes.') +
      IMPORT +
      shot(cs('forms', 'schema-layouts'), 'Tabs layout', 'Section, Tabs, Grid, Wizard, and related layout nodes.', true) +
      code(`import { Section, Grid, Tabs, Tab, Wizard, Step, Fieldset, Callout } from '@shamar/core'

Section.make('Catalog').columns(2).schema([
  Grid.make(2).schema([/* fields */]),
])`) +
      `| Component | Purpose |
|-----------|---------|
| \`Section\` | Card with heading, icon, collapsible |
| \`Fieldset\` | Lightweight section |
| \`Grid\` | Column layout for fields |
| \`Tabs\` / \`Tab\` | Tabbed sections |
| \`Wizard\` / \`Step\` | Multi-step create UI |
| \`Callout\` | info / success / warning / danger |
| \`Group\` / \`Flex\` | Inline grouping |

**Playground:** [Form components](/demo/form-components) gallery (all fields), Company (RelationTable), Settings (Tabs).
`
  )
}

async function writeResources() {
  await write(
    'resources/index.mdx',
    frontmatter('Resources overview', 'CRUD resources — form, table, infolist, actions, and navigation.') +
      IMPORT +
      shot('/screenshots/products-list.png', 'Products resource list', 'A resource is list + create + edit + show driven by builders.', true) +
      code(`export default class ProductResource extends Resource {
  static model = Product
  static slug = 'products'
  static label = 'Products'
  static navigationGroup = 'Content'

  static form() { /* … */ }
  static table() { /* … */ }
  static infolist() { /* … */ }
}`) +
      `A **resource** maps a model to admin CRUD routes. Shamar discovers \`*_resource.ts\` files under your panel path.

## Static configuration

| Property | Purpose |
|----------|---------|
| \`model\` | Lucid / Mongoose model class |
| \`slug\` | URL segment (\`/demo/products\`) |
| \`label\` / \`singularLabel\` | Navigation and headings |
| \`navigationGroup\` / \`navigationSubGroup\` | Sidebar grouping |
| \`navigationSort\` / \`navigationHidden\` | Order and visibility |
| \`recordTitleField\` | Display title for breadcrumbs |
| \`icon\` | Sidebar icon name |
| \`companyScoped\` | Scope lists to current company |
| \`softDelete\` | Soft-delete aware queries |
| \`contentMaxWidth\` | Page width token |
| \`defaultPerPage\` | Pagination default |

## Builders

| Method | Returns |
|--------|---------|
| \`form()\` | Create/edit schema |
| \`table()\` | List columns and defaults |
| \`infolist()\` / \`detail()\` | Show view (auto-derived if omitted) |
| \`resourceActions()\` | Header, row, bulk actions |

## Lifecycle hooks

| Method | When |
|--------|------|
| \`prepareCreate(data)\` | Before insert — mutate payload, flash messages |
| \`handleAction(name, ctx)\` | Custom row/bulk/header action handlers |
| \`configure()\` | Register callbacks on the resource class |

## Authorization

Override \`canViewAny\`, \`canCreate\`, \`canEdit\`, \`canDelete\`, or attach a \`policy\` class. See [Auth & RBAC](/docs/concepts/auth/).

## Related

- [Forms](/docs/reference/forms/)
- [Tables](/docs/reference/tables/)
- [Infolists](/docs/reference/infolists/)
- [Actions](/docs/reference/actions/)
`
  )

  await write(
    'resources/registration.mdx',
    frontmatter('Registering resources', 'Panel registration and auto-discovery.') +
      code(`// config/shamar.ts
panel('admin')
  .path('/demo')
  .discoverResources('app/resources/admin')
  .resources([UserResource])`) +
      `Use \`.discoverResources('app/resources/admin')\` to auto-load classes ending in \`Resource\`, or pass explicit classes to \`.resources([...])\`.

Generate a stub:

\`\`\`bash
node ace shamar:make-resource Product --group Catalog
\`\`\`
`
  )

  await write(
    'resources/navigation.mdx',
    frontmatter('Resource navigation', 'Sidebar groups, icons, and sort order.') +
      code(`static override navigationGroup = 'Content'
static override navigationSubGroup = 'Catalog'
static override navigationSort = 10
static override icon = 'cube'
static override navigationHidden = false`) +
      `Navigation items are merged with [Pages](/docs/reference/pages/) and media library entries. Groups can include icons via panel config.
`
  )
}

async function writeTables() {
  await write(
    'tables/index.mdx',
    frontmatter('Tables overview', 'List tables, search, filters, grouping, and pagination.') +
      IMPORT +
      shot('/screenshots/products-list.png', 'Product list table', 'Table chrome is provided by the Adonis host.', true) +
      code(`static table() {
  return table((t) => {
    t.defaultSort('name', 'asc')
    t.defaultFilters([{ field: 'resolved', value: false, label: 'Resolved: No' }])
    t.schema([
      TextColumn.make('name').searchable().sortable(),
    ])
  })
}`) +
      `List routes render searchable, filterable, groupable tables with pagination, bulk actions, and sticky headings.

## TableBuilder

| Method | Purpose |
|--------|---------|
| \`.schema([columns])\` | Column list |
| \`.defaultSort(field, direction)\` | Initial sort |
| \`.defaultFilters([...])\` | Pre-applied filters |
| \`.defaultGroupBy(field)\` | Initial grouping |

See [TextColumn](/docs/reference/tables/text-column/) for all column format modifiers.
`
  )

  await write(
    'tables/text-column.mdx',
    frontmatter('TextColumn', 'The column builder — text, badges, dates, currency, booleans, and more.') +
      IMPORT +
      shot(cs('tables', 'text-column'), 'Table header row', 'Chain format modifiers on TextColumn.make().', true) +
      shot(cs('tables', 'column-currency'), 'Currency column', '`.currency()` formats with Intl and right-aligns by default.') +
      shot(cs('tables', 'column-boolean-badge'), 'Boolean badge column', '`.boolean().badge()` for yes/no chips.') +
      shot(cs('tables', 'column-date'), 'Date column', '`.date()` / `.dateTime()` format values.') +
      code(`TextColumn.make('sku').searchable().sortable()
TextColumn.make('price').currency('KES').alignRight()
TextColumn.make('featured').boolean().badge().filterable().groupable()
TextColumn.make('launchDate').date().sortable()
TextColumn.make('company.name').label('Company').filterable()`) +
      apiTable([
        { method: '.label(text)', description: 'Column header label.' },
        { method: '.searchable()', description: 'Global search column.' },
        { method: '.sortable()', description: 'Sortable header.' },
        { method: '.filterable()', description: 'Include in Filters menu.' },
        { method: '.groupable()', description: 'Allow grouping by this column.' },
        { method: '.boolean()', description: 'Yes/no icon display.' },
        { method: '.toggle()', description: 'Inline toggle (when supported).' },
        { method: '.badge()', description: 'Badge chips (great for booleans and enums).' },
        { method: '.date() / .dateTime()', description: 'Formatted dates.' },
        { method: '.currency(code)', description: 'Intl currency formatting.' },
        { method: '.email()', description: 'mailto link.' },
        { method: '.id()', description: 'Monospace ID styling.' },
        { method: '.alignment() / .alignRight() / …', description: 'Horizontal alignment.' },
        { method: '.verticalAlignment()', description: 'Vertical cell alignment.' },
      ]) +
      `Dot notation (\`company.name\`) resolves relationship attributes. **Playground:** Products, Tickets (defaultFilters + badge), Users.
`
  )
}

async function writeInfolists() {
  const entries = [
    ['text-entry', 'TextEntry', 'Default show entry — text, badges, dates, markdown, copyable.', '/screenshots/product-form.png',
      `TextEntry.make('name')
TextEntry.make('price').currency('KES')
TextEntry.make('tags').badge().columnSpanFull()
TextEntry.make('sku').copyable()`,
      [
        { method: '.boolean()', description: 'Yes/no display.' },
        { method: '.badge()', description: 'Badge list (arrays/enums).' },
        { method: '.date() / .dateTime()', description: 'Formatted dates.' },
        { method: '.currency(code)', description: 'Money formatting.' },
        { method: '.email() / .url()', description: 'Linked values.' },
        { method: '.markdown() / .textarea()', description: 'Rich text display modes.' },
        { method: '.copyable()', description: 'Copy-to-clipboard button.' },
        { method: '.label() / .columnSpanFull()', description: 'Layout options.' },
      ]],
    ['icon-entry', 'IconEntry', 'Icon or boolean icon display.', null,
      `IconEntry.make('featured').boolean().icon('★').falseIcon('☆')`,
      [
        { method: '.boolean()', description: 'Map true/false to icons.' },
        { method: '.icon(name) / .falseIcon(name)', description: 'Icon names when true/false.' },
      ]],
    ['color-entry', 'ColorEntry', 'Color swatch with hex value.', null, `ColorEntry.make('color')`, []],
    ['image-entry', 'ImageEntry', 'Thumbnail from URL or media id.', null, `ImageEntry.make('coverMediaId')`, []],
  ]

  for (const [slug, title, desc, , usage, methods] of entries) {
    let body = IMPORT
    body += shot(cs('infolists', slug), title, 'Cropped from a live resource show view.')
    body += code(usage)
    if (methods.length) body += apiTable(methods)
    body += `Define \`static infolist()\` on a resource, or let Shamar derive show fields from \`form()\` automatically.\n`
    await write(`infolists/${slug}.mdx`, frontmatter(title, desc) + body)
  }

  await write(
    'infolists/index.mdx',
    frontmatter('Infolists overview', 'Show/detail views for resources and pages.') +
      IMPORT +
      code(`static infolist() {
  return infolist((i) => {
    i.schema([
      Section.make('Product').columns(3).schema([
        TextEntry.make('name'),
        IconEntry.make('featured').boolean(),
        ColorEntry.make('color'),
      ]),
    ])
  })
}`) +
      `Infolists power resource **show** pages and can be composed on [ListPage](/docs/reference/pages/list-page/) rows.

## Entry types

| Entry | Use |
|-------|-----|
| [TextEntry](/docs/reference/infolists/text-entry/) | Text, badges, dates, currency, markdown |
| [IconEntry](/docs/reference/infolists/icon-entry/) | Icons and boolean icons |
| [ColorEntry](/docs/reference/infolists/color-entry/) | Color swatches |
| [ImageEntry](/docs/reference/infolists/image-entry/) | Thumbnails |

## Auto-derivation

If you omit \`infolist()\`, Shamar builds a show view from \`form()\` via \`formSchemaToInfolistSchema()\`.

**Playground:** Products — explicit infolist with all entry types.
`
  )
}

async function writeWidgets() {
  const widgets = [
    ['stat', 'Stat', 'Single stat descriptor used inside StatsOverviewWidget.', '/screenshots/dashboard.png',
      `Stat.make('Total products', total)
  .description('In catalog')
  .color('primary')
  .url('/demo/products')
  .chart([12, 9, 11, 8, 10])`,
      [
        { method: '.description(text)', description: 'Subtitle under the value.' },
        { method: '.descriptionIcon(name)', description: 'Icon beside description.' },
        { method: '.color(token)', description: 'primary / success / warning / danger / info / gray.' },
        { method: '.url(href)', description: 'Make the stat clickable.' },
        { method: '.chart([numbers])', description: 'Sparkline data.' },
      ]],
    ['stats-overview', 'StatsOverviewWidget', 'Row of stat cards on the dashboard.', '/screenshots/dashboard.png',
      `export class ProductStatsWidget extends StatsOverviewWidget {
  static override sort = 10
  static override columnSpan = 'full'

  static override async stats(ctx) {
    return [
      Stat.make('Total products', count).description('In catalog').color('primary'),
    ]
  }
}`,
      [
        { method: 'static sort', description: 'Grid order.' },
        { method: 'static columnSpan', description: '1–4 or full width.' },
        { method: 'static stats(ctx)', description: 'Returns Stat[] (async).' },
      ]],
    ['chart', 'ChartWidget', 'ApexCharts or Chart.js line, bar, area, pie, donut.', '/screenshots/dashboard.png',
      `export class VisitsChartWidget extends ChartWidget {
  static override heading = 'Daily visits (30 days)'
  static override type = 'line'
  static override library = 'apex'

  static override async data(ctx) {
    return { labels: ['Mon', 'Tue'], series: [{ name: 'Visits', data: [12, 19] }] }
  }
}`,
      [
        { method: 'static type', description: 'line | bar | area | pie | donut.' },
        { method: 'static library', description: 'apex (default) or chartjs.' },
        { method: 'static data(ctx)', description: 'Chart payload (async).' },
        { method: 'static columnSpan / heading', description: 'Layout.' },
      ]],
    ['list', 'ListWidget', 'Compact table widget with links.', '/screenshots/dashboard.png',
      `export class RecentProductsWidget extends ListWidget {
  static override heading = 'Recent products'
  static override columns() {
    return [{ label: 'SKU', attribute: 'sku' }, { label: 'Name', attribute: 'name' }]
  }
  static override async records(ctx) {
    return items.map((i) => ({ ...i, url: '/demo/products/' + i.id }))
  }
}`,
      [
        { method: 'static columns()', description: 'Column definitions.' },
        { method: 'static records(ctx)', description: 'Row data with optional url per row.' },
        { method: 'static limit', description: 'Max rows (default 5).' },
      ]],
    ['card', 'CardWidget', 'Custom Edge view or HTML card.', null,
      `export class PromoCardWidget extends CardWidget {
  static override content(ctx) {
    return { view: 'widgets/promo', data: { title: 'Hello' } }
  }
}`,
      [{ method: 'static content(ctx)', description: 'View name, HTML string, or data object.' }]],
    ['navigation-cards', 'NavigationCardsWidget', 'Quick links to sidebar roots.', '/screenshots/dashboard.png',
      `export class QuickLinksWidget extends NavigationCardsWidget {
  static override sort = 50
}`,
      [{ method: '(auto)', description: 'Injects panel navigation groups as cards.' }]],
  ]

  for (const [slug, title, desc, , usage, methods] of widgets) {
    let body = IMPORT
    if (slug !== 'card') {
      body += shot(cs('widgets', slug), title, 'From the /demo dashboard widget grid.')
    }
    body += code(usage)
    body += apiTable(methods)
    await write(`widgets/${slug}.mdx`, frontmatter(title, desc) + body)
  }

  await write(
    'widgets/index.mdx',
    frontmatter('Widgets overview', 'Dashboard widgets — stats, charts, lists, and cards.') +
      IMPORT +
      shot(cs('widgets', 'stats-overview'), 'Dashboard widgets', 'Register widget classes on a DashboardPage.', true) +
      code(`// config/shamar.ts
panel('admin').dashboardPage(AdminDashboard)

// dashboard_page.ts
export default class AdminDashboard extends DashboardPage {
  static override columns = 3
  static widgets() {
    return [ProductStatsWidget, RecentProductsWidget, ProductStockChartWidget]
  }
}`) +
      `Widgets are classes extending \`Widget\` with \`static sort\`, \`static columnSpan\`, and \`static heading\`.

| Widget | Doc |
|--------|-----|
| Stat | [Stat](/docs/reference/widgets/stat/) (building block) |
| StatsOverviewWidget | [Stats overview](/docs/reference/widgets/stats-overview/) |
| ChartWidget | [Chart](/docs/reference/widgets/chart/) |
| ListWidget | [List](/docs/reference/widgets/list/) |
| CardWidget | [Card](/docs/reference/widgets/card/) |
| NavigationCardsWidget | [Navigation cards](/docs/reference/widgets/navigation-cards/) |

\`\`\`bash
node ace shamar:make-widget ProductStats --type stats
\`\`\`
`
  )
}

async function writeActions() {
  await write(
    'actions/index.mdx',
    frontmatter('Actions overview', 'Header, row, and bulk actions on resources and pages.') +
      IMPORT +
      shot(cs('actions', 'header-create'), 'Header actions', 'Create, export, and custom header buttons.', true) +
      shot(cs('actions', 'row-menu'), 'Row action menu', 'Per-record actions in the ⋮ menu.') +
      code(`static resourceActions() {
  return actions((a) => {
    a.create('New product')
    a.view()
    a.edit()
    a.delete().confirm('Delete this product?')
    a.bulkDelete()
    a.row('duplicate', 'Duplicate').icon('copy')
    a.header('export', 'Export CSV').icon('download')
  })
}`) +
      `## Placements

| Placement | Where |
|-----------|--------|
| **header** | List/create toolbar (+ New, Export) |
| **row** | Per-record ⋮ menu (or inline via \`.ungrouped()\`) |
| **bulk** | Selection bar (Delete selected, …) |

## Modifiers

${apiTable([
  { method: '.label(text)', description: 'Button label.' },
  { method: '.color(token)', description: 'primary, danger, gray, accent, …' },
  { method: '.icon(name)', description: 'Icon id.' },
  { method: '.confirm(message)', description: 'Confirmation dialog.' },
  { method: '.ability(name)', description: 'Permission gate.' },
  { method: '.grouped() / .ungrouped()', description: 'Row action menu vs inline.' },
], 'Action modifiers')}

See [Built-in actions](/docs/reference/actions/built-in/) and [Custom actions](/docs/reference/actions/custom/).
`
  )

  await write(
    'actions/built-in.mdx',
    frontmatter('Built-in actions', 'Default CRUD action set.') +
      code(`import { defaultActions } from '@shamar/core'

static resourceActions() {
  return defaultActions() // create, view, edit, delete, bulkDelete
}`) +
      `| Action | Placement | Default |
|--------|-----------|---------|
| \`create()\` | header | + New |
| \`view()\` | row | View |
| \`edit()\` | row | Edit |
| \`delete()\` | row | Delete (danger) |
| \`bulkDelete()\` | bulk | Delete selected |

Customize labels: \`a.create('New ticket')\`, \`a.delete().confirm('…')\`.
`
  )

  await write(
    'actions/custom.mdx',
    frontmatter('Custom actions', 'handleAction and page-level actions.') +
      code(`static resourceActions() {
  return actions((a) => {
    a.row('escalate', 'Escalate').color('accent').icon('arrow-up')
    a.header('export', 'Export CSV')
  })
}

static override async handleAction(name, ctx) {
  if (name === 'escalate') {
    // mutate record, flash message
    return { redirect: ctx.backUrl }
  }
}`) +
      `**Playground:** Tickets — escalate row action + export header; API keys — revoke/reactivate.

Pages use \`headerActions()\` and \`handleAction()\` with the same action builder API.
`
  )
}

async function writePages() {
  const pages = [
    ['form-page', 'FormPage', 'Single form without SettingsPage defaults.', '/screenshots/settings.png',
      `export default class ProfilePage extends FormPage {
  static slug = 'profile'
  static form() { return form(/* … */) }
  static async fill() { return {} }
  static async save(data) { return { message: 'Saved' } }
}`],
    ['settings-page', 'SettingsPage', 'Singleton settings with tabs and sticky Save.', '/screenshots/settings.png',
      `export default class AppSettingsPage extends SettingsPage {
  static slug = 'settings'
  static form() { /* Tabs + sections */ }
  static async fill() { /* load singleton */ }
  static async save(data) { /* persist */ }
}`],
    ['list-page', 'ListPage', 'Read-heavy table without full CRUD.', '/screenshots/product-catalog.png',
      `export default class ProductCatalogPage extends ListPage {
  static slug = 'product-catalog'
  static model = Product
  static table() { return table(/* … */) }
}`],
    ['dashboard-page', 'DashboardPage', 'Panel home with widget grid.', '/screenshots/dashboard.png',
      `export default class AdminDashboard extends DashboardPage {
  static columns = 3
  static widgets() { return [ProductStatsWidget] }
}`],
    ['composite-page', 'Composite Page', 'Mix forms, tables, infolists, and Edge sections.', null,
      `export default class OpsDashboardPage extends Page {
  static slug = 'ops-dashboard'
  static content() {
    return pageContent((p) => {
      p.table(/* … */)
      p.edge('pages/ops-extra')
    })
  }
}`],
  ]

  for (const [slug, title, desc, , usage] of pages) {
    let body = IMPORT
    body += shot(cs('pages', slug), title, `Playground /demo — ${slug.replace('-page', '')}.`)
    body += code(usage)
    await write(`pages/${slug}.mdx`, frontmatter(title, desc) + body)
  }

  await write(
    'pages/index.mdx',
    frontmatter('Pages overview', 'Custom admin pages beyond resources.') +
      IMPORT +
      code(`panel('admin').discoverPages('app/pages/admin')`) +
      `| Page type | Class | Use |
|-----------|-------|-----|
| [FormPage](/docs/reference/pages/form-page/) | \`FormPage\` | One-off form |
| [SettingsPage](/docs/reference/pages/settings-page/) | \`SettingsPage\` | App settings singleton |
| [ListPage](/docs/reference/pages/list-page/) | \`ListPage\` | Standalone table |
| [DashboardPage](/docs/reference/pages/dashboard-page/) | \`DashboardPage\` | Widget grid home |
| [Composite Page](/docs/reference/pages/composite-page/) | \`Page\` + \`pageContent()\` | Mixed sections |

Shared static props: \`slug\`, \`label\`, \`navigationGroup\`, \`icon\`, \`canAccess()\`.

\`\`\`bash
node ace shamar:make-page Settings --type settings
\`\`\`
`
  )
}

async function main() {
  await writeForms()
  await writeResources()
  await writeTables()
  await writeInfolists()
  await writeWidgets()
  await writeActions()
  await writePages()
  console.log('Reference docs generated under', ROOT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
