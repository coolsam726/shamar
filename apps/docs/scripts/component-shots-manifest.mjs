/**
 * Component screenshot targets for docs reference pages.
 * Captured to public/screenshots/components/{category}/{slug}.png
 * Variants append `-{variant}` to the filename (e.g. select-open.png).
 *
 * Form fields are captured from the playground gallery:
 *   GET /demo/form-components
 */

const FORM_GALLERY = '/demo/form-components'

/** @typedef {'field' | 'selector' | 'column' | 'detail' | 'widget' | 'action' | 'section' | 'field-open'} ShotKind */

/**
 * @typedef {Object} ComponentShot
 * @property {string} category
 * @property {string} slug
 * @property {string} [variant] open-state suffix for filename
 * @property {string} path
 * @property {ShotKind} kind
 * @property {string} [field] data-field-name
 * @property {string} [selector] CSS selector
 * @property {string} [openSelector] extra element when capturing open state
 * @property {string} [label] Column header or detail label
 * @property {string} [heading] Widget heading
 * @property {string} [before] Async hook name run before capture
 */

/** @type {ComponentShot[]} */
export const FORM_SHOTS = [
  { category: 'forms', slug: 'text-input', path: FORM_GALLERY, kind: 'field', field: 'textInput' },
  { category: 'forms', slug: 'textarea', path: FORM_GALLERY, kind: 'field', field: 'textarea' },
  { category: 'forms', slug: 'select', path: FORM_GALLERY, kind: 'field', field: 'select' },
  {
    category: 'forms',
    slug: 'select',
    variant: 'open',
    path: FORM_GALLERY,
    kind: 'field-open',
    field: 'select',
    openSelector: '.shamar-combobox__dropdown, .shamar-m2o__dropdown',
    before: 'openSelectCombobox',
  },
  { category: 'forms', slug: 'toggle', path: FORM_GALLERY, kind: 'field', field: 'toggle' },
  { category: 'forms', slug: 'checkbox', path: FORM_GALLERY, kind: 'field', field: 'checkbox' },
  { category: 'forms', slug: 'radio', path: FORM_GALLERY, kind: 'field', field: 'radio' },
  { category: 'forms', slug: 'checkbox-list', path: FORM_GALLERY, kind: 'field', field: 'checkboxList' },
  { category: 'forms', slug: 'date-pickers', path: FORM_GALLERY, kind: 'field', field: 'datePicker' },
  {
    category: 'forms',
    slug: 'date-pickers',
    variant: 'open',
    path: FORM_GALLERY,
    kind: 'field-open',
    field: 'datePicker',
    openSelector: '.datepicker-dropdown:not(.hidden)',
    before: 'openDatePicker',
  },
  {
    category: 'forms',
    slug: 'date-pickers',
    variant: 'datetime-open',
    path: FORM_GALLERY,
    kind: 'field-open',
    field: 'dateTimePicker',
    openSelector: '.datepicker-dropdown:not(.hidden)',
    before: 'openDateTimePicker',
  },
  { category: 'forms', slug: 'file-picker', path: FORM_GALLERY, kind: 'field', field: 'filePicker' },
  {
    category: 'forms',
    slug: 'file-picker',
    variant: 'open',
    path: FORM_GALLERY,
    kind: 'field-open',
    field: 'filePicker',
    openSelector: '.shamar-file-picker__dialog',
    before: 'openFilePickerModal',
  },
  { category: 'forms', slug: 'file-upload', path: FORM_GALLERY, kind: 'field', field: 'fileUpload' },
  { category: 'forms', slug: 'rich-editor', path: FORM_GALLERY, kind: 'field', field: 'richEditor' },
  { category: 'forms', slug: 'rich-editor-notion', path: FORM_GALLERY, kind: 'field', field: 'richEditorNotion' },
  { category: 'forms', slug: 'rich-editor-document', path: FORM_GALLERY, kind: 'field', field: 'richEditorDocument' },
  { category: 'forms', slug: 'markdown-editor', path: FORM_GALLERY, kind: 'field', field: 'markdownEditor' },
  { category: 'forms', slug: 'code-editor', path: FORM_GALLERY, kind: 'field', field: 'codeEditor' },
  { category: 'forms', slug: 'tags-input', path: FORM_GALLERY, kind: 'field', field: 'tagsInput' },
  { category: 'forms', slug: 'color-picker', path: FORM_GALLERY, kind: 'field', field: 'colorPicker' },
  { category: 'forms', slug: 'key-value', path: FORM_GALLERY, kind: 'field', field: 'keyValue' },
  { category: 'forms', slug: 'repeater', path: FORM_GALLERY, kind: 'field', field: 'repeater' },
  { category: 'forms', slug: 'slider', path: FORM_GALLERY, kind: 'field', field: 'slider' },
  { category: 'forms', slug: 'rating', path: FORM_GALLERY, kind: 'field', field: 'rating' },
  { category: 'forms', slug: 'toggle-buttons', path: FORM_GALLERY, kind: 'field', field: 'toggleButtons' },
  { category: 'forms', slug: 'relation-table', path: '/demo/companies', kind: 'field', field: 'products', before: 'openFirstCompanyEdit' },
  { category: 'forms', slug: 'schema-layouts', path: FORM_GALLERY, kind: 'selector', selector: '.shamar-tabs', before: 'openFormLayoutsTab' },
]

/** @type {ComponentShot[]} */
export const TABLE_SHOTS = [
  { category: 'tables', slug: 'text-column', path: '/demo/products', kind: 'selector', selector: 'table thead tr' },
  { category: 'tables', slug: 'column-text', path: '/demo/products', kind: 'column', label: 'Name' },
  { category: 'tables', slug: 'column-currency', path: '/demo/products', kind: 'column', label: 'Price' },
  { category: 'tables', slug: 'column-boolean-badge', path: '/demo/products', kind: 'column', label: 'Featured' },
  { category: 'tables', slug: 'column-date', path: '/demo/products', kind: 'column', label: 'Launch date' },
]

/** @type {ComponentShot[]} */
export const INFOLIST_SHOTS = [
  { category: 'infolists', slug: 'text-entry', path: '/demo/products', kind: 'detail', label: 'Name', before: 'openFirstProductShow' },
  { category: 'infolists', slug: 'icon-entry', path: '/demo/products', kind: 'detail', label: 'Featured', before: 'openFirstProductShow' },
  { category: 'infolists', slug: 'color-entry', path: '/demo/products', kind: 'detail', label: 'Color', before: 'openFirstProductShow' },
  { category: 'infolists', slug: 'image-entry', path: '/demo/articles', kind: 'detail', label: 'Cover', before: 'openFirstArticleShow' },
]

/** @type {ComponentShot[]} */
export const WIDGET_SHOTS = [
  { category: 'widgets', slug: 'stats-overview', path: '/demo', kind: 'selector', selector: '.shamar-stats-overview' },
  { category: 'widgets', slug: 'stat', path: '/demo', kind: 'selector', selector: '.shamar-stat-card' },
  { category: 'widgets', slug: 'chart', path: '/demo', kind: 'heading', heading: 'Stock by product', before: 'waitForChart' },
  { category: 'widgets', slug: 'list', path: '/demo', kind: 'heading', heading: 'Recent products' },
  { category: 'widgets', slug: 'navigation-cards', path: '/demo', kind: 'selector', selector: '.shamar-dashboard-widget:last-child .shamar-dashboard-card' },
]

/** @type {ComponentShot[]} */
export const ACTION_SHOTS = [
  { category: 'actions', slug: 'header-create', path: '/demo/products', kind: 'selector', selector: '.shamar-page-heading' },
  { category: 'actions', slug: 'row-menu', path: '/demo/tickets', kind: 'action', before: 'openFirstRowMenu' },
  { category: 'actions', slug: 'bulk-bar', path: '/demo/products', kind: 'action', before: 'selectFirstBulkRow' },
]

/** @type {ComponentShot[]} */
export const PAGE_SHOTS = [
  { category: 'pages', slug: 'settings-page', path: '/demo/settings', kind: 'selector', selector: '#shamar-form' },
  { category: 'pages', slug: 'list-page', path: '/demo/product-catalog', kind: 'selector', selector: 'table' },
  { category: 'pages', slug: 'dashboard-page', path: '/demo', kind: 'selector', selector: '.shamar-dashboard-grid' },
  { category: 'pages', slug: 'form-page', path: FORM_GALLERY, kind: 'selector', selector: '.shamar-tabs' },
  { category: 'pages', slug: 'composite-page', path: '/demo/ops-dashboard', kind: 'selector', selector: 'main .space-y-8' },
]

export const ALL_COMPONENT_SHOTS = [
  ...FORM_SHOTS,
  ...TABLE_SHOTS,
  ...INFOLIST_SHOTS,
  ...WIDGET_SHOTS,
  ...ACTION_SHOTS,
  ...PAGE_SHOTS,
]

/** Docs reference paths for open-state variants in generate-reference.mjs */
export const FORM_OPEN_DOC_SHOTS = {
  select: [{ variant: 'open', alt: 'Select combobox open', caption: 'Static combobox with search and keyboard navigation.' }],
  'date-pickers': [
    { variant: 'open', alt: 'Date picker calendar', caption: 'Flowbite calendar dropdown on focus.' },
    { variant: 'datetime-open', alt: 'DateTime picker open', caption: 'Calendar plus time controls on the same field row.' },
  ],
  'file-picker': [{ variant: 'open', alt: 'File picker modal', caption: 'Browse folders and upload from the media library.' }],
}

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../public')

/**
 * Public URL for a captured component shot, or `null` when the PNG is missing
 * (so reference pages skip broken embeds until capture catches up).
 * @param {string} category
 * @param {string} slug
 * @param {string} [variant]
 */
export function componentShotPath(category, slug, variant) {
  const name = variant ? `${slug}-${variant}` : slug
  const rel = `screenshots/components/${category}/${name}.png`
  if (!existsSync(join(PUBLIC_ROOT, rel))) return null
  return `/${rel}`
}
