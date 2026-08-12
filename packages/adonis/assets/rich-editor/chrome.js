/**
 * Docx Editor chrome aligned with https://template.tiptap.dev/docx
 * Title strip + TipTap fixed toolbar (icons, active highlights, zoom, OL numbering).
 */

import { Editor } from 'https://esm.sh/@tiptap/core@3.29.2'
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@3.29.2'
import Underline from 'https://esm.sh/@tiptap/extension-underline@3.29.2'
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@3.29.2'
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@3.29.2'
import { icons } from './icons.js'
import { downloadDocx } from './export_docx.js'
import { pickAndImportOfficeFile } from './import_office.js'
import {
  NUMBERING_FORMAT_IDS,
  NUMBERING_FORMAT_PREVIEWS,
  ensureNumberingFormatCss,
} from './numbering.js'
import { isInTable, selectEntireTable, setSelectedCellsAttribute } from './table_styles.js'
const TOKEN_LABELS = {}

const FONTS = ['Carlito', 'Calibri', 'Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana']
const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24', '28', '32']
const ZOOM_PRESETS = [40, 50, 75, 90, 100, 125, 150, 200]
const PAGE_SIZES = {
  a4: { w: 210, h: 297, label: 'A4 (210 × 297 mm)' },
  letter: { w: 215.9, h: 279.4, label: 'US Letter' },
  legal: { w: 215.9, h: 355.6, label: 'US Legal' },
  a5: { w: 148, h: 210, label: 'A5' },
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v
    else if (k === 'text') node.textContent = v
    else if (k === 'html') node.innerHTML = v
    else if (v != null && v !== false) node.setAttribute(k, v === true ? '' : String(v))
  }
  for (const child of children) {
    if (child == null) continue
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return node
}

function btn(opts) {
  const node = el('button', {
    type: 'button',
    className: `shamar-re-doc-btn${opts.className ? ` ${opts.className}` : ''}`,
    title: opts.title || '',
    'aria-label': opts.title || opts.label || '',
    'data-cmd': opts.cmd || '',
    'data-style': opts.style || 'ghost',
    html: opts.html || opts.label || '',
  })
  if (opts.weight) node.setAttribute('data-weight', opts.weight)
  return node
}

function sep() {
  return el('span', { className: 'shamar-re-doc-sep', 'aria-hidden': 'true' })
}

function group(...children) {
  return el('div', { className: 'shamar-re-doc-toolbar-group' }, children.flat().filter(Boolean))
}

function closeAllPopovers(root) {
  root.querySelectorAll('.shamar-re-doc-popover').forEach((p) => {
    p.hidden = true
  })
  root.querySelectorAll('.shamar-re-doc-menu-panel').forEach((p) => {
    p.hidden = true
  })
  root.querySelectorAll('[data-state="open"]').forEach((n) => {
    n.setAttribute('data-state', 'closed')
  })
}

/** Position a popover in the viewport so toolbar overflow cannot clip it. */
function placePopover(popover, anchor, { align = 'start' } = {}) {
  const rect = anchor.getBoundingClientRect()
  const pad = 8
  popover.hidden = false
  popover.removeAttribute('hidden')
  popover.style.position = 'fixed'
  popover.style.top = `${Math.round(rect.bottom + 6)}px`
  popover.style.left = '0'
  popover.style.right = 'auto'
  popover.style.transform = 'none'
  popover.style.zIndex = '1000'
  popover.style.visibility = 'hidden'
  const width = Math.max(popover.offsetWidth || 0, 176)
  let left = align === 'center' ? rect.left + rect.width / 2 - width / 2 : rect.left
  left = Math.max(pad, Math.min(left, window.innerWidth - width - pad))
  popover.style.left = `${Math.round(left)}px`
  popover.style.visibility = 'visible'
}

function makeMenu(label, items) {
  const rootEl = el('div', { className: 'shamar-re-doc-menu' })
  const trigger = el('button', { type: 'button', className: 'shamar-re-doc-menu-trigger', text: label })
  const panel = el(
    'div',
    { className: 'shamar-re-doc-menu-panel', hidden: true },
    items.map((item) => {
      if (item.divider) return el('div', { className: 'shamar-re-doc-menu-divider' })
      return el('button', {
        type: 'button',
        className: 'shamar-re-doc-menu-item',
        text: item.label,
        'data-cmd': item.action,
      })
    }),
  )
  trigger.addEventListener('click', (ev) => {
    ev.stopPropagation()
    const open = panel.hidden
    document.querySelectorAll('.shamar-re-doc-menu-panel').forEach((p) => {
      p.hidden = true
    })
    panel.hidden = !open
  })
  rootEl.append(trigger, panel)
  return { root: rootEl }
}

function field(label, control) {
  return el('label', { className: 'shamar-re-doc-field' }, [el('span', { text: label }), control])
}

function numberingPreview(formatId) {
  const rows = NUMBERING_FORMAT_PREVIEWS[formatId] || []
  return el(
    'div',
    { className: 'shamar-re-doc-nf-preview' },
    rows.map((row) =>
      el('div', { className: `shamar-re-doc-nf-preview__item shamar-re-doc-nf-preview__item--l${row.level}` }, [
        el('span', { className: 'shamar-re-doc-nf-preview__marker', text: row.marker }),
        el('span', { className: 'shamar-re-doc-nf-preview__line' }),
      ]),
    ),
  )
}

export function buildChrome({ brandLabel, documentTitle, tokens, initialHeader, initialFooter }) {
  ensureNumberingFormatCss()

  let editor = null
  let headerEditor = null
  let footerEditor = null
  let titleChangeCb = null
  let sidebarOpen = false
  let fullscreen = false
  /** @type {'fit-width' | 'fit-page' | number} */
  let zoomMode = 'fit-width'
  let zoomPercent = 100

  const settings = {
    pageSize: 'a4',
    orientation: 'portrait',
    marginMm: 22,
    pageGapMm: 16,
    pageBg: '#ffffff',
  }

  const titleInput = el('input', {
    type: 'text',
    className: 'shamar-re-doc-doc-name',
    value: documentTitle,
    spellcheck: 'false',
    placeholder: 'Document name',
  })
  titleInput.addEventListener('input', () => titleChangeCb?.(titleInput.value))

  const menuFile = makeMenu('File', [
    { label: 'New', action: 'file-new' },
    { label: 'Import Document', action: 'file-import' },
    { label: 'Export DOCX…', action: 'file-docx' },
    { label: 'Download as HTML', action: 'file-html' },
    { divider: true },
    { label: 'Print…', action: 'file-print' },
  ])
  const menuFormat = makeMenu('Format', [
    { label: 'Bold', action: 'bold' },
    { label: 'Italic', action: 'italic' },
    { label: 'Underline', action: 'underline' },
    { label: 'Strikethrough', action: 'strike' },
    { divider: true },
    { label: 'Align left', action: 'align-left' },
    { label: 'Align center', action: 'align-center' },
    { label: 'Align right', action: 'align-right' },
    { label: 'Justify', action: 'align-justify' },
    { divider: true },
    { label: 'Select table', action: 'table-select' },
    { label: 'Add column', action: 'table-col-after' },
    { label: 'Add row', action: 'table-row-after' },
    { label: 'Delete table', action: 'table-delete' },
  ])
  const menuInsert = makeMenu('Insert', [
    { label: 'Table (3×3)', action: 'table' },
    { label: 'Horizontal rule', action: 'hr' },
    { label: 'Bullet list', action: 'bullet' },
    { label: 'Numbered list', action: 'ordered' },
    { label: 'Link…', action: 'link' },
    { label: 'Edit header', action: 'focus-header' },
    { label: 'Edit footer', action: 'focus-footer' },
    ...(tokens.length
      ? [
          { divider: true },
          { label: 'Placeholders…', action: 'focus-placeholders' },
          ...tokens.map((t) => ({ label: `{{${t}}}`, action: `token:${t}` })),
        ]
      : []),
  ])

  const logo = el('div', { className: 'shamar-re-doc-logo', title: brandLabel }, [
    el('span', { className: 'shamar-re-doc-logo-mark', text: 'W' }),
    el('div', { className: 'shamar-re-doc-logo-meta' }, [
      el('span', { className: 'shamar-re-doc-logo-text', text: brandLabel }),
      el('span', { className: 'shamar-re-doc-logo-sub', text: 'Documents' }),
    ]),
  ])

  const titleBar = el('div', { className: 'shamar-re-doc-titlebar' }, [
    logo,
    el('div', { className: 'shamar-re-doc-title-center' }, [
      titleInput,
      el('div', { className: 'shamar-re-doc-menubar' }, [menuFile.root, menuFormat.root, menuInsert.root]),
    ]),
  ])

  const fontSelect = el(
    'select',
    { className: 'shamar-re-doc-select', title: 'Font', 'data-ctrl': 'font' },
    FONTS.map((f) => el('option', { value: f, text: f })),
  )
  const sizeSelect = el(
    'select',
    { className: 'shamar-re-doc-select shamar-re-doc-select-sm', title: 'Font size', 'data-ctrl': 'size' },
    FONT_SIZES.map((s) => el('option', { value: s, text: s })),
  )
  sizeSelect.value = '12'

  const styleSelect = el('select', { className: 'shamar-re-doc-select', title: 'Styles', 'data-ctrl': 'style' }, [
    el('option', { value: 'paragraph', text: 'Normal text' }),
    el('option', { value: 'h1', text: 'Heading 1' }),
    el('option', { value: 'h2', text: 'Heading 2' }),
    el('option', { value: 'h3', text: 'Heading 3' }),
  ])

  const colorInput = el('input', {
    type: 'color',
    className: 'shamar-re-doc-color',
    title: 'Text color',
    value: '#111827',
    'data-ctrl': 'color',
  })

  const zoomLabel = el('button', {
    type: 'button',
    className: 'shamar-re-doc-btn shamar-re-doc-zoom-label',
    title: 'Zoom level',
    'aria-label': 'Zoom level',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'data-state': 'closed',
    'data-zoom-trigger': 'true',
    html: `<span class="shamar-re-doc-zoom-label-text">100%</span>${icons.chevronDown}`,
  })

  const zoomPopover = el('div', {
    className: 'shamar-re-doc-popover shamar-re-doc-zoom-popover',
    role: 'menu',
    hidden: true,
  })
  const zoomInput = el('input', {
    type: 'text',
    className: 'shamar-re-doc-zoom-input',
    inputmode: 'numeric',
    'aria-label': 'Zoom percentage',
    value: '100',
  })
  zoomPopover.append(
    zoomInput,
    el('div', { className: 'shamar-re-doc-popover-sep' }),
    el('button', {
      type: 'button',
      className: 'shamar-re-doc-popover-item',
      role: 'menuitem',
      'data-cmd': 'zoom-fit-width',
      html: `${icons.alignJustify}<span class="shamar-re-doc-popover-item-text">Fit Width</span>`,
    }),
    el('button', {
      type: 'button',
      className: 'shamar-re-doc-popover-item',
      role: 'menuitem',
      'data-cmd': 'zoom-fit-page',
      html: `${icons.fitPage}<span class="shamar-re-doc-popover-item-text">Fit to Page</span>`,
    }),
    el('div', { className: 'shamar-re-doc-popover-sep' }),
    ...ZOOM_PRESETS.map((z) =>
      el('button', {
        type: 'button',
        className: 'shamar-re-doc-popover-item',
        role: 'menuitem',
        'data-cmd': `zoom-set:${z}`,
        html: `<span class="shamar-re-doc-popover-item-text">${z}%</span>`,
      }),
    ),
  )

  const zoomWrap = el('div', { className: 'shamar-re-doc-zoom-control', 'data-zoom-anchor': 'true' }, [
    group(btn({ title: 'Zoom out', html: icons.minus, cmd: 'zoom-out', weight: 'small' })),
    el('div', { className: 'shamar-re-doc-zoom-trigger-wrap' }, [zoomLabel]),
    group(btn({ title: 'Zoom in', html: icons.plus, cmd: 'zoom-in', weight: 'small' })),
  ])

  function setZoomMenuOpen(open) {
    if (open) {
      placePopover(zoomPopover, zoomLabel, { align: 'center' })
      zoomLabel.setAttribute('data-state', 'open')
      zoomLabel.setAttribute('aria-expanded', 'true')
      zoomInput.value = String(zoomPercent)
      requestAnimationFrame(() => {
        zoomInput.focus()
        zoomInput.select()
      })
    } else {
      zoomPopover.hidden = true
      zoomLabel.setAttribute('data-state', 'closed')
      zoomLabel.setAttribute('aria-expanded', 'false')
    }
  }

  function toggleZoomPopover(ev) {
    ev.preventDefault()
    ev.stopPropagation()
    const willOpen = zoomPopover.hidden
    closeAllPopovers(root)
    if (willOpen) setZoomMenuOpen(true)
  }

  zoomLabel.addEventListener('mousedown', toggleZoomPopover)
  zoomLabel.addEventListener('click', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
  })
  zoomPopover.addEventListener('mousedown', (ev) => ev.stopPropagation())
  zoomPopover.addEventListener('click', (ev) => {
    ev.stopPropagation()
    const item = ev.target.closest('[data-cmd]')
    if (!item || !zoomPopover.contains(item)) return
    run(item.getAttribute('data-cmd') || '')
  })
  zoomInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault()
      const n = Number.parseInt(zoomInput.value, 10)
      if (!Number.isNaN(n)) {
        zoomMode = Math.min(200, Math.max(40, n))
        applyZoom()
      }
      setZoomMenuOpen(false)
    } else if (ev.key === 'Escape') {
      setZoomMenuOpen(false)
    }
  })
  zoomInput.addEventListener('mousedown', (ev) => ev.stopPropagation())
  zoomInput.addEventListener('click', (ev) => ev.stopPropagation())

  const nfPopover = el('div', {
    className: 'shamar-re-doc-popover shamar-re-doc-nf-popover',
    hidden: true,
  })
  const nfGrid = el(
    'div',
    { className: 'shamar-re-doc-nf-grid' },
    NUMBERING_FORMAT_IDS.map((id) =>
      el(
        'button',
        {
          type: 'button',
          className: 'shamar-re-doc-nf-option',
          title: id,
          'data-cmd': `numbering:${id}`,
          'data-format': id,
        },
        [numberingPreview(id)],
      ),
    ),
  )
  nfPopover.append(nfGrid)

  const nfChevron = btn({
    title: 'Numbering format',
    html: icons.chevronDown,
    className: 'shamar-re-doc-btn-chevron',
  })
  nfChevron.removeAttribute('data-cmd')
  nfChevron.setAttribute('data-nf-trigger', 'true')
  nfChevron.setAttribute('aria-haspopup', 'menu')
  nfChevron.setAttribute('aria-expanded', 'false')

  function toggleNumberingPopover(ev) {
    ev.preventDefault()
    ev.stopPropagation()
    const open = nfPopover.hidden
    closeAllPopovers(root)
    if (open) {
      placePopover(nfPopover, numberingGroup, { align: 'start' })
      nfChevron.setAttribute('data-state', 'open')
      nfChevron.setAttribute('aria-expanded', 'true')
    } else {
      nfChevron.setAttribute('aria-expanded', 'false')
    }
  }

  nfChevron.addEventListener('mousedown', toggleNumberingPopover)
  nfChevron.addEventListener('click', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
  })
  nfPopover.addEventListener('mousedown', (ev) => ev.stopPropagation())
  nfPopover.addEventListener('click', (ev) => {
    ev.stopPropagation()
    const item = ev.target.closest('[data-cmd]')
    if (!item || !nfPopover.contains(item)) return
    run(item.getAttribute('data-cmd') || '')
  })

  const orderedBtn = btn({ title: 'Numbered list', html: icons.listOrdered, cmd: 'ordered' })
  const numberingGroup = el('div', { className: 'shamar-re-doc-numbering-group' }, [
    group(orderedBtn, nfChevron),
  ])
  // Keep a data attribute so outside-click logic ignores this control
  numberingGroup.setAttribute('data-nf-anchor', 'true')

  const fullscreenBtn = btn({
    title: 'Full screen',
    html: icons.fitPage,
    cmd: 'toggle-fullscreen',
  })
  const settingsBtn = btn({
    title: 'Document settings',
    html: icons.settings,
    cmd: 'toggle-sidebar',
  })
  const exportBtn = btn({
    title: 'Export DOCX',
    html: icons.download,
    cmd: 'file-docx',
  })

  const formatBar = el('div', { className: 'shamar-re-doc-toolbar', 'data-variant': 'fixed' }, [
    el('div', { className: 'shamar-re-doc-toolbar-scroll' }, [
      group(
        btn({ title: 'Undo', html: icons.undo, cmd: 'undo' }),
        btn({ title: 'Redo', html: icons.redo, cmd: 'redo' }),
      ),
      sep(),
      zoomWrap,
      sep(),
      group(styleSelect, fontSelect),
      sep(),
      group(sizeSelect),
      sep(),
      group(
        btn({ title: 'Bold', html: icons.bold, cmd: 'bold' }),
        btn({ title: 'Italic', html: icons.italic, cmd: 'italic' }),
        btn({ title: 'Underline', html: icons.underline, cmd: 'underline' }),
        btn({ title: 'Strikethrough', html: icons.strike, cmd: 'strike' }),
        colorInput,
      ),
      sep(),
      group(
        btn({ title: 'Align left', html: icons.alignLeft, cmd: 'align-left' }),
        btn({ title: 'Align center', html: icons.alignCenter, cmd: 'align-center' }),
        btn({ title: 'Align right', html: icons.alignRight, cmd: 'align-right' }),
        btn({ title: 'Justify', html: icons.alignJustify, cmd: 'align-justify' }),
      ),
      sep(),
      group(btn({ title: 'Bullet list', html: icons.list, cmd: 'bullet' })),
      numberingGroup,
      sep(),
      group(
        btn({ title: 'Blockquote', html: icons.quote, cmd: 'quote' }),
        btn({ title: 'Insert link', html: icons.link, cmd: 'link' }),
        btn({ title: 'Insert table', html: icons.table, cmd: 'table' }),
      ),
    ]),
    el('div', { className: 'shamar-re-doc-toolbar-reserved' }, [
      sep(),
      group(fullscreenBtn, settingsBtn, exportBtn),
    ]),
  ])

  const cellFillInput = el('input', {
    type: 'color',
    className: 'shamar-re-doc-color shamar-re-doc-cell-fill',
    title: 'Cell fill',
    value: '#f8fafc',
    'data-ctrl': 'cell-fill',
  })
  const cellBorderInput = el('input', {
    type: 'color',
    className: 'shamar-re-doc-color shamar-re-doc-cell-border',
    title: 'Cell border',
    value: '#cbd5e1',
    'data-ctrl': 'cell-border',
  })
  const tableBar = el('div', {
    className: 'shamar-re-doc-table-bar',
    hidden: true,
    role: 'toolbar',
    'aria-label': 'Table tools',
  }, [
    el('span', { className: 'shamar-re-doc-table-bar-label', text: 'Table' }),
    btn({ title: 'Select entire table', html: icons.tableSelect, cmd: 'table-select' }),
    cellFillInput,
    cellBorderInput,
    sep(),
    btn({ title: 'Add column after', html: icons.colAfter, cmd: 'table-col-after' }),
    btn({ title: 'Add row after', html: icons.rowAfter, cmd: 'table-row-after' }),
    btn({ title: 'Delete column', html: icons.minus, cmd: 'table-col-delete' }),
    btn({ title: 'Delete row', html: icons.minus, cmd: 'table-row-delete', className: 'shamar-re-doc-btn-row-del' }),
    sep(),
    btn({ title: 'Delete table', html: icons.trash, cmd: 'table-delete' }),
  ])

  const headerHost = el('div', { className: 'shamar-re-doc-hf-host shamar-re-doc-header-host' })
  const footerHost = el('div', { className: 'shamar-re-doc-hf-host shamar-re-doc-footer-host' })
  const editorHost = el('div', { className: 'shamar-re-doc-editor-host' })

  const headerZone = el('div', { className: 'shamar-re-doc-page-header', 'data-zone': 'header' }, [
    el('div', { className: 'shamar-re-doc-hf-label', text: 'Header — click to edit' }),
    headerHost,
  ])
  const footerZone = el('div', { className: 'shamar-re-doc-page-footer', 'data-zone': 'footer' }, [
    el('div', { className: 'shamar-re-doc-hf-label', text: 'Footer — click to edit' }),
    footerHost,
  ])

  const page = el('div', { className: 'shamar-re-doc-page' }, [headerZone, editorHost, footerZone])
  const canvas = el('div', { className: 'shamar-re-doc-canvas' }, [page])

  const pageSizeSelect = el(
    'select',
    { 'data-setting': 'pageSize' },
    Object.entries(PAGE_SIZES).map(([k, v]) => el('option', { value: k, text: v.label })),
  )
  const orientationSelect = el('select', { 'data-setting': 'orientation' }, [
    el('option', { value: 'portrait', text: 'Portrait' }),
    el('option', { value: 'landscape', text: 'Landscape' }),
  ])
  const marginInput = el('input', {
    type: 'number',
    min: '10',
    max: '40',
    step: '1',
    value: String(settings.marginMm),
    'data-setting': 'marginMm',
  })
  const gapInput = el('input', {
    type: 'number',
    min: '0',
    max: '40',
    step: '1',
    value: String(settings.pageGapMm),
    'data-setting': 'pageGapMm',
  })
  const bgInput = el('input', {
    type: 'color',
    value: settings.pageBg,
    'data-setting': 'pageBg',
  })

  const tokenChips = (extraClass = '') =>
    tokens.map((t) => {
      const label = TOKEN_LABELS[t] || t.replace(/_/g, ' ')
      return btn({
        title: `Insert {{${t}}}`,
        className: `shamar-re-doc-token-chip${extraClass ? ` ${extraClass}` : ''}`,
        html: `<span class="shamar-re-doc-token-chip-code">{{${t}}}</span><span class="shamar-re-doc-token-chip-label">${label}</span>`,
        cmd: `token:${t}`,
      })
    })

  const placeholdersStrip =
    tokens.length > 0
      ? el('div', { className: 'shamar-re-doc-placeholders-strip', 'aria-label': 'Merge placeholders' }, [
          el('div', { className: 'shamar-re-doc-placeholders-strip-head' }, [
            el('strong', { text: 'Placeholders' }),
            el('span', {
              className: 'shamar-re-doc-placeholders-hint',
              text: 'Click to insert at the cursor — filled per employee when you generate',
            }),
          ]),
          el('div', { className: 'shamar-re-doc-token-list shamar-re-doc-token-list-strip' }, tokenChips()),
        ])
      : null

  const sidebar = el('aside', { className: 'shamar-re-doc-sidebar' }, [
    el('div', { className: 'shamar-re-doc-sidebar-head' }, [
      el('strong', { text: 'Document settings' }),
      btn({ title: 'Close', html: '×', cmd: 'toggle-sidebar', className: 'shamar-re-doc-btn-ghost' }),
    ]),
    el('div', { className: 'shamar-re-doc-sidebar-tabs' }, [
      tokens.length
        ? el('button', {
            type: 'button',
            className: 'is-active',
            text: 'Placeholders',
            'data-tab': 'tokens',
          })
        : null,
      el('button', {
        type: 'button',
        className: tokens.length ? '' : 'is-active',
        text: 'Page',
        'data-tab': 'page',
      }),
      el('button', { type: 'button', text: 'Header & footer', 'data-tab': 'hf' }),
    ].filter(Boolean)),
    tokens.length
      ? el('div', { className: 'shamar-re-doc-sidebar-body', 'data-panel': 'tokens' }, [
          el('p', {
            className: 'shamar-re-doc-sidebar-note',
            text: 'Click a placeholder to insert it into the letter. Values are filled for each person when you generate PDFs.',
          }),
          el('div', { className: 'shamar-re-doc-token-panel' }, [
            el('strong', { text: 'Available tokens' }),
            el('div', { className: 'shamar-re-doc-token-list shamar-re-doc-token-list-stack' }, tokenChips('is-stack')),
          ]),
        ])
      : null,
    el('div', {
      className: 'shamar-re-doc-sidebar-body',
      'data-panel': 'page',
      hidden: tokens.length > 0,
    }, [
      field('Page size', pageSizeSelect),
      field('Orientation', orientationSelect),
      field('Margins (mm)', marginInput),
      field('Page gap (mm)', gapInput),
      field('Page background', bgInput),
      el('p', {
        className: 'shamar-re-doc-sidebar-note',
        text: 'Layout updates the live page canvas. Export DOCX uses the same size/orientation and header/footer content.',
      }),
    ]),
    el('div', { className: 'shamar-re-doc-sidebar-body', 'data-panel': 'hf', hidden: true }, [
      el('p', {
        className: 'shamar-re-doc-sidebar-note',
        text: 'Click the header or footer on the page to edit. Double-click a zone to focus that editor.',
      }),
      btn({ title: 'Focus header', label: 'Edit header', cmd: 'focus-header', className: 'shamar-re-doc-btn-block' }),
      btn({ title: 'Focus footer', label: 'Edit footer', cmd: 'focus-footer', className: 'shamar-re-doc-btn-block' }),
    ]),
  ])

  sidebar.hidden = true
  const stage = el('div', { className: 'shamar-re-doc-stage' }, [canvas, sidebar])
  const root = el(
    'div',
    { className: 'shamar-re-doc-shell' },
    [titleBar, formatBar, tableBar, placeholdersStrip, stage].filter(Boolean),
  )
  // Portal popovers onto the shell so toolbar overflow cannot clip them
  root.append(zoomPopover, nfPopover)

  function hostEl() {
    return root.closest('.shamar-re-doc') || root
  }

  function setFullscreen(next) {
    fullscreen = Boolean(next)
    const host = hostEl()
    host.classList.toggle('is-fullscreen', fullscreen)
    root.classList.toggle('is-fullscreen', fullscreen)
    fullscreenBtn.innerHTML = fullscreen ? icons.exitFullscreen : icons.fitPage
    fullscreenBtn.title = fullscreen ? 'Exit full screen' : 'Full screen'
    fullscreenBtn.setAttribute('aria-label', fullscreenBtn.title)
    fullscreenBtn.setAttribute('data-active-state', fullscreen ? 'on' : 'off')
    document.documentElement.classList.toggle('shamar-re-doc-fs-lock', fullscreen)
    document.body.classList.toggle('shamar-re-doc-fs-lock', fullscreen)
    requestAnimationFrame(() => {
      applyZoom()
      requestAnimationFrame(applyZoom)
    })
  }

  function updateZoomLabel() {
    const textEl = zoomLabel.querySelector('.shamar-re-doc-zoom-label-text')
    if (textEl) textEl.textContent = `${zoomPercent}%`
    else zoomLabel.childNodes[0] && (zoomLabel.childNodes[0].textContent = `${zoomPercent}%`)
    zoomPopover.querySelectorAll('[data-cmd]').forEach((b) => {
      const cmd = b.getAttribute('data-cmd')
      let on = false
      if (cmd === 'zoom-fit-width') on = zoomMode === 'fit-width'
      else if (cmd === 'zoom-fit-page') on = zoomMode === 'fit-page'
      else if (cmd?.startsWith('zoom-set:')) on = zoomMode === Number(cmd.slice(9))
      b.classList.toggle('is-active', on)
    })
  }

  function applyPageGeometry() {
    const spec = PAGE_SIZES[settings.pageSize] || PAGE_SIZES.a4
    const portrait = settings.orientation !== 'landscape'
    const w = portrait ? spec.w : spec.h
    const h = portrait ? spec.h : spec.w
    page.style.setProperty('--shamar-re-doc-page-w', `${w}mm`)
    page.style.setProperty('--shamar-re-doc-page-h', `${h}mm`)
    page.style.setProperty('--shamar-re-doc-margin', `${settings.marginMm}mm`)
    page.style.background = settings.pageBg
    canvas.style.setProperty('--shamar-re-doc-page-gap', `${settings.pageGapMm}mm`)
    applyZoom()
  }

  function naturalPageSize() {
    page.style.setProperty('--shamar-re-doc-zoom', '1')
    const rect = page.getBoundingClientRect()
    return { w: rect.width, h: rect.height }
  }

  function applyZoom() {
    const pad = 48
    const availW = Math.max(120, canvas.clientWidth - pad)
    const availH = Math.max(120, canvas.clientHeight - pad)
    const natural = naturalPageSize()

    if (zoomMode === 'fit-width') {
      const z = natural.w > 0 ? Math.min(1.5, Math.max(0.4, availW / natural.w)) : 1
      zoomPercent = Math.round(z * 100)
      page.style.setProperty('--shamar-re-doc-zoom', String(z))
    } else if (zoomMode === 'fit-page') {
      const zx = natural.w > 0 ? availW / natural.w : 1
      const zy = natural.h > 0 ? availH / natural.h : 1
      const z = Math.min(1, Math.max(0.4, Math.min(zx, zy)))
      zoomPercent = Math.round(z * 100)
      page.style.setProperty('--shamar-re-doc-zoom', String(z))
    } else {
      zoomPercent = Number(zoomMode) || 100
      page.style.setProperty('--shamar-re-doc-zoom', String(zoomPercent / 100))
    }
    updateZoomLabel()
  }

  function activeEditor() {
    if (headerEditor?.isFocused) return headerEditor
    if (footerEditor?.isFocused) return footerEditor
    return editor
  }

  function run(action) {
    const ed = activeEditor()
    if (
      !ed &&
      !action.startsWith('file-') &&
      !action.startsWith('zoom-') &&
      action !== 'toggle-sidebar' &&
      action !== 'toggle-fullscreen'
    ) {
      return
    }
    const chain = () => ed.chain().focus()

    if (action.startsWith('token:')) {
      const name = action.slice(6)
      ;(ed || editor)?.chain().focus().insertMergeToken(name).run()
      return
    }

    if (action.startsWith('numbering:')) {
      const formatId = action.slice(10)
      const target = ed || editor
      if (!target) return
      if (target.isActive('orderedList')) {
        target.chain().focus().setOrderedListNumberingFormat(formatId).run()
      } else {
        target.chain().focus().toggleOrderedListWithFormat(formatId).run()
      }
      nfPopover.hidden = true
      nfChevron.setAttribute('data-state', 'closed')
      syncActive(target)
      return
    }

    if (action.startsWith('zoom-set:')) {
      zoomMode = Number(action.slice(9))
      applyZoom()
      setZoomMenuOpen(false)
      return
    }

    switch (action) {
      case 'zoom-in':
        zoomMode = Math.min(200, (typeof zoomMode === 'number' ? zoomMode : zoomPercent) + 10)
        applyZoom()
        break
      case 'zoom-out':
        zoomMode = Math.max(40, (typeof zoomMode === 'number' ? zoomMode : zoomPercent) - 10)
        applyZoom()
        break
      case 'zoom-fit-width':
        zoomMode = 'fit-width'
        applyZoom()
        setZoomMenuOpen(false)
        break
      case 'zoom-fit-page':
        zoomMode = 'fit-page'
        applyZoom()
        setZoomMenuOpen(false)
        break
      case 'undo':
        chain().undo().run()
        break
      case 'redo':
        chain().redo().run()
        break
      case 'bold':
        chain().toggleBold().run()
        break
      case 'italic':
        chain().toggleItalic().run()
        break
      case 'underline':
        chain().toggleUnderline().run()
        break
      case 'strike':
        chain().toggleStrike().run()
        break
      case 'align-left':
        chain().setTextAlign('left').run()
        break
      case 'align-center':
        chain().setTextAlign('center').run()
        break
      case 'align-right':
        chain().setTextAlign('right').run()
        break
      case 'align-justify':
        chain().setTextAlign('justify').run()
        break
      case 'bullet':
        chain().toggleBulletList().run()
        break
      case 'ordered':
        if (ed.isActive('orderedList')) chain().toggleOrderedList().run()
        else chain().toggleOrderedListWithFormat('decimal').run()
        break
      case 'quote':
        chain().toggleBlockquote().run()
        break
      case 'hr':
        chain().setHorizontalRule().run()
        break
      case 'table':
        chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        break
      case 'table-select':
        selectEntireTable(ed)
        break
      case 'table-col-after':
        chain().addColumnAfter().run()
        break
      case 'table-col-delete':
        chain().deleteColumn().run()
        break
      case 'table-row-after':
        chain().addRowAfter().run()
        break
      case 'table-row-delete':
        chain().deleteRow().run()
        break
      case 'table-delete':
        chain().deleteTable().run()
        break
      case 'link': {
        const prev = ed.getAttributes('link').href
        const url = window.prompt('Link URL', prev || 'https://')
        if (url === null) break
        if (url === '') chain().extendMarkRange('link').unsetLink().run()
        else chain().extendMarkRange('link').setLink({ href: url }).run()
        break
      }
      case 'toggle-sidebar':
        sidebarOpen = !sidebarOpen
        stage.classList.toggle('is-sidebar-open', sidebarOpen)
        sidebar.hidden = !sidebarOpen
        settingsBtn.setAttribute('data-active-state', sidebarOpen ? 'on' : 'off')
        requestAnimationFrame(applyZoom)
        break
      case 'toggle-fullscreen':
        setFullscreen(!fullscreen)
        break
      case 'focus-header':
        headerEditor?.commands.focus('end')
        headerZone.classList.add('is-editing')
        footerZone.classList.remove('is-editing')
        break
      case 'focus-footer':
        footerEditor?.commands.focus('end')
        footerZone.classList.add('is-editing')
        headerZone.classList.remove('is-editing')
        break
      case 'focus-placeholders':
        sidebarOpen = true
        stage.classList.add('is-sidebar-open')
        sidebar.hidden = false
        settingsBtn.setAttribute('data-active-state', 'on')
        sidebar.querySelectorAll('[data-tab]').forEach((t) => {
          t.classList.toggle('is-active', t.getAttribute('data-tab') === 'tokens')
        })
        sidebar.querySelectorAll('[data-panel]').forEach((p) => {
          p.hidden = p.getAttribute('data-panel') !== 'tokens'
        })
        requestAnimationFrame(applyZoom)
        break
      case 'file-new':
        if (window.confirm('Clear the document body?')) editor?.commands.setContent('<p></p>')
        break
      case 'file-import':
        pickAndImportOfficeFile()
          .then((result) => {
            if (!result || !editor) return
            const hasContent =
              editor.getText().trim().length > 0 ||
              /<(img|table|ul|ol|h[1-6])\b/i.test(editor.getHTML())
            if (hasContent) {
              const ok = window.confirm(
                `Import “${result.filename}” and replace the current body?`,
              )
              if (!ok) return
            }
            editor.commands.setContent(result.html || '<p></p>')
            if (result.title && (!titleInput.value || titleInput.value === documentTitle)) {
              titleInput.value = result.title
              titleChangeCb?.(result.title)
            }
            if (result.warnings?.length) {
              console.info('Office import warnings:', result.warnings)
            }
            syncActive(editor)
          })
          .catch((err) => {
            console.error(err)
            window.alert('Import failed: ' + (err?.message || err))
          })
        break
      case 'file-html': {
        const blob = new Blob([editor?.getHTML() || ''], { type: 'text/html' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${titleInput.value || 'document'}.html`
        a.click()
        URL.revokeObjectURL(a.href)
        break
      }
      case 'file-docx':
        downloadDocx({
          title: titleInput.value || 'document',
          bodyHtml: editor?.getHTML() || '',
          headerHtml: headerEditor?.getHTML() || '',
          footerHtml: footerEditor?.getHTML() || '',
          pageSize: settings.pageSize,
          orientation: settings.orientation,
        }).catch((err) => {
          console.error(err)
          window.alert('DOCX export failed: ' + (err?.message || err))
        })
        break
      case 'file-print':
        window.print()
        break
      default:
        break
    }
  }

  root.addEventListener('click', (ev) => {
    const target = ev.target.closest('[data-cmd]')
    if (!target || !root.contains(target)) return
    ev.preventDefault()
    run(target.getAttribute('data-cmd') || '')
  })

  sidebar.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      sidebar.querySelectorAll('[data-tab]').forEach((t) => t.classList.remove('is-active'))
      tab.classList.add('is-active')
      const id = tab.getAttribute('data-tab')
      sidebar.querySelectorAll('[data-panel]').forEach((p) => {
        p.hidden = p.getAttribute('data-panel') !== id
      })
    })
  })

  sidebar.querySelectorAll('[data-setting]').forEach((ctrl) => {
    ctrl.addEventListener('change', () => {
      const key = ctrl.getAttribute('data-setting')
      if (key === 'marginMm' || key === 'pageGapMm') settings[key] = Number(ctrl.value) || settings[key]
      else settings[key] = ctrl.value
      applyPageGeometry()
    })
  })

  fontSelect.addEventListener('change', () => {
    activeEditor()?.chain().focus().setFontFamily(fontSelect.value).run()
  })
  sizeSelect.addEventListener('change', () => {
    activeEditor()?.chain().focus().setMark('textStyle', { fontSize: `${sizeSelect.value}pt` }).run()
  })
  colorInput.addEventListener('input', () => {
    activeEditor()?.chain().focus().setColor(colorInput.value).run()
  })
  cellFillInput.addEventListener('input', () => {
    const ed = activeEditor()
    if (!ed || !isInTable(ed)) return
    setSelectedCellsAttribute(ed, 'backgroundColor', cellFillInput.value)
  })
  cellBorderInput.addEventListener('input', () => {
    const ed = activeEditor()
    if (!ed || !isInTable(ed)) return
    setSelectedCellsAttribute(ed, 'borderColor', cellBorderInput.value)
    setSelectedCellsAttribute(ed, 'borderWidth', 1)
  })
  styleSelect.addEventListener('change', () => {
    const v = styleSelect.value
    const ed = activeEditor()
    if (!ed) return
    if (v === 'paragraph') ed.chain().focus().setParagraph().run()
    else if (v === 'h1') ed.chain().focus().toggleHeading({ level: 1 }).run()
    else if (v === 'h2') ed.chain().focus().toggleHeading({ level: 2 }).run()
    else if (v === 'h3') ed.chain().focus().toggleHeading({ level: 3 }).run()
  })

  headerZone.addEventListener('dblclick', () => run('focus-header'))
  footerZone.addEventListener('dblclick', () => run('focus-footer'))

  document.addEventListener('mousedown', (ev) => {
    if (
      ev.target.closest?.(
        '.shamar-re-doc-popover, .shamar-re-doc-zoom-label, [data-zoom-trigger], [data-zoom-anchor], [data-nf-trigger], [data-nf-anchor], .shamar-re-doc-menu',
      )
    ) {
      return
    }
    closeAllPopovers(root)
  })

  function onKeydown(ev) {
    if (ev.key === 'Escape' && fullscreen) {
      ev.preventDefault()
      setFullscreen(false)
    }
  }
  document.addEventListener('keydown', onKeydown)

  const ro = new ResizeObserver(() => {
    if (zoomMode === 'fit-width' || zoomMode === 'fit-page') applyZoom()
  })
  ro.observe(canvas)

  function syncActive(ed) {
    const target = ed || activeEditor()
    if (!target) return
    root.querySelectorAll('.shamar-re-doc-toolbar [data-cmd]').forEach((b) => {
      const cmd = b.getAttribute('data-cmd')
      let active = false
      if (cmd === 'bold') active = target.isActive('bold')
      else if (cmd === 'italic') active = target.isActive('italic')
      else if (cmd === 'underline') active = target.isActive('underline')
      else if (cmd === 'strike') active = target.isActive('strike')
      else if (cmd === 'bullet') active = target.isActive('bulletList')
      else if (cmd === 'ordered') active = target.isActive('orderedList')
      else if (cmd === 'quote') active = target.isActive('blockquote')
      else if (cmd === 'align-left') active = target.isActive({ textAlign: 'left' })
      else if (cmd === 'align-center') active = target.isActive({ textAlign: 'center' })
      else if (cmd === 'align-right') active = target.isActive({ textAlign: 'right' })
      else if (cmd === 'align-justify') active = target.isActive({ textAlign: 'justify' })
      b.setAttribute('data-active-state', active ? 'on' : 'off')
      b.classList.toggle('is-active', active)
    })

    const activeFormat = target.isActive('orderedList')
      ? target.getAttributes('orderedList').numberingFormat || 'decimal'
      : null
    nfGrid.querySelectorAll('.shamar-re-doc-nf-option').forEach((opt) => {
      opt.classList.toggle('is-active', opt.getAttribute('data-format') === activeFormat)
    })

    syncTableBar(target)
  }

  function syncTableBar(target) {
    const inTable = isInTable(target) && target === editor
    tableBar.hidden = !inTable
    if (!inTable) return

    const cellAttrs = target.isActive('tableHeader')
      ? target.getAttributes('tableHeader')
      : target.getAttributes('tableCell')
    if (cellAttrs?.backgroundColor) {
      const v = toColorInputValue(cellAttrs.backgroundColor)
      if (/^#[0-9a-f]{6}$/i.test(v)) cellFillInput.value = v
    }
    if (cellAttrs?.borderColor) {
      const v = toColorInputValue(cellAttrs.borderColor)
      if (/^#[0-9a-f]{6}$/i.test(v)) cellBorderInput.value = v
    }
  }

  /** @param {string} cssColor */
  function toColorInputValue(cssColor) {
    const hex = cssColor.trim()
    if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toLowerCase()
    if (/^#[0-9a-f]{3}$/i.test(hex)) {
      const r = hex[1]
      const g = hex[2]
      const b = hex[3]
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
    }
    const rgb = hex.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
    if (rgb) {
      return (
        '#' +
        [rgb[1], rgb[2], rgb[3]]
          .map((n) => Number(n).toString(16).padStart(2, '0'))
          .join('')
      )
    }
    return cellFillInput.value
  }

  function mountZoneEditor(host, content, placeholder) {
    return new Editor({
      element: host,
      extensions: [
        StarterKit.configure({ heading: false }),
        Underline,
        TextAlign.configure({ types: ['paragraph'] }),
        Placeholder.configure({ placeholder }),
      ],
      content: content || '<p></p>',
      editorProps: { attributes: { class: 'shamar-re-doc-hf-prose' } },
      onFocus: () => {
        if (host === headerHost) {
          headerZone.classList.add('is-editing')
          footerZone.classList.remove('is-editing')
        } else {
          footerZone.classList.add('is-editing')
          headerZone.classList.remove('is-editing')
        }
      },
      onSelectionUpdate: ({ editor: ed }) => syncActive(ed),
      onUpdate: ({ editor: ed }) => syncActive(ed),
    })
  }

  settingsBtn.setAttribute('data-active-state', 'off')
  applyPageGeometry()

  return {
    root,
    editorHost,
    headerHost,
    footerHost,
    bindEditor(ed) {
      editor = ed
    },
    bindHeaderFooter(h, f) {
      headerEditor = h
      footerEditor = f
    },
    mountHeaderFooterEditors() {
      headerEditor = mountZoneEditor(
        headerHost,
        initialHeader || '<p>Private &amp; confidential</p>',
        'Header…',
      )
      footerEditor = mountZoneEditor(
        footerHost,
        initialFooter || '<p>Document</p>',
        'Footer…',
      )
      return { headerEditor, footerEditor }
    },
    getHeaderHTML: () => headerEditor?.getHTML() || '',
    getFooterHTML: () => footerEditor?.getHTML() || '',
    syncActive,
    setTitle(t) {
      titleInput.value = t
    },
    onTitleChange(cb) {
      titleChangeCb = cb
    },
    applyZoom,
    destroyExtras() {
      setFullscreen(false)
      document.removeEventListener('keydown', onKeydown)
      headerEditor?.destroy()
      footerEditor?.destroy()
      ro.disconnect()
    },
  }
}
