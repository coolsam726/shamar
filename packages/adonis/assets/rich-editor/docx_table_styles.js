/**
 * Mammoth drops DOCX table shading/borders. Re-apply them from OOXML onto HTML tables.
 */

import JSZip from 'https://esm.sh/jszip@3.10.1'
import { normalizeCssColor } from './table_styles.js'

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} html
 * @returns {Promise<string>}
 */
export async function applyDocxTableStylesToHtml(arrayBuffer, html) {
  let tables
  try {
    tables = await extractDocxTableCellStyles(arrayBuffer)
  } catch (err) {
    console.warn('DOCX table style extract failed:', err)
    return html
  }
  if (!tables.length) return html

  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html')
  const root = doc.getElementById('root')
  if (!root) return html

  const htmlTables = [...root.querySelectorAll('table')]
  tables.forEach((tableStyles, ti) => {
    const tableEl = htmlTables[ti]
    if (!tableEl || !tableStyles?.length) return
    const rows = [...tableEl.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr')]
    tableStyles.forEach((rowStyles, ri) => {
      const rowEl = rows[ri]
      if (!rowEl || !rowStyles?.length) return
      const cells = [...rowEl.querySelectorAll(':scope > th, :scope > td')]
      rowStyles.forEach((cellStyle, ci) => {
        const cell = cells[ci]
        if (!cell || !cellStyle) return
        applyCellStyle(cell, cellStyle)
      })
    })
  })

  return root.innerHTML
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<Array<Array<Array<{ backgroundColor?: string, borderColor?: string, borderWidth?: number } | null>>>>}
 */
async function extractDocxTableCellStyles(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) return []

  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) return []

  const tbls = [...doc.getElementsByTagNameNS(W_NS, 'tbl')]
  return tbls.map((tbl) => {
    const defaultBorder = readTblBorders(tbl)
    const rows = [...tbl.getElementsByTagNameNS(W_NS, 'tr')]
    return rows.map((tr) => {
      const cells = [...tr.children].filter((n) => n.localName === 'tc')
      return cells.map((tc) => readCellStyle(tc, defaultBorder))
    })
  })
}

/** @param {Element} tbl */
function readTblBorders(tbl) {
  const tblPr = firstChildNS(tbl, 'tblPr')
  const borders = tblPr && firstChildNS(tblPr, 'tblBorders')
  if (!borders) return null
  return borderFromSides(borders)
}

/**
 * @param {Element} tc
 * @param {{ color?: string, width?: number } | null} defaultBorder
 */
function readCellStyle(tc, defaultBorder) {
  const tcPr = firstChildNS(tc, 'tcPr')
  if (!tcPr && !defaultBorder) return null

  let backgroundColor = null
  let borderColor = defaultBorder?.color || null
  let borderWidth = defaultBorder?.width ?? null

  if (tcPr) {
    const shd = firstChildNS(tcPr, 'shd')
    if (shd) {
      backgroundColor =
        normalizeCssColor(attr(shd, 'fill')) ||
        normalizeCssColor(attr(shd, 'themeFill')) ||
        null
    }
    const tcBorders = firstChildNS(tcPr, 'tcBorders')
    if (tcBorders) {
      const b = borderFromSides(tcBorders)
      if (b?.color) borderColor = b.color
      if (b?.width != null) borderWidth = b.width
    }
  }

  if (!backgroundColor && !borderColor && borderWidth == null) return null
  return { backgroundColor, borderColor, borderWidth }
}

/** @param {Element} bordersEl */
function borderFromSides(bordersEl) {
  const sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
  for (const side of sides) {
    const el = firstChildNS(bordersEl, side)
    if (!el) continue
    const val = (attr(el, 'val') || '').toLowerCase()
    if (!val || val === 'nil' || val === 'none') continue
    const color = normalizeCssColor(attr(el, 'color'))
    const sz = parseInt(attr(el, 'sz') || '', 10)
    // OOXML sz is eighths of a point
    const width = Number.isFinite(sz) ? Math.max(1, Math.round(sz / 8)) : 1
    if (color || width) return { color: color || '#000000', width }
  }
  return null
}

/**
 * @param {HTMLElement} cell
 * @param {{ backgroundColor?: string | null, borderColor?: string | null, borderWidth?: number | null }} style
 */
function applyCellStyle(cell, style) {
  const parts = []
  if (style.backgroundColor) {
    cell.setAttribute('data-background-color', style.backgroundColor)
    parts.push(`background-color: ${style.backgroundColor}`)
  }
  if (style.borderColor) {
    cell.setAttribute('data-border-color', style.borderColor)
    const w = style.borderWidth != null ? `${style.borderWidth}px` : '1px'
    if (style.borderWidth != null) cell.setAttribute('data-border-width', String(style.borderWidth))
    parts.push(`border: ${w} solid ${style.borderColor}`)
  } else if (style.borderWidth != null) {
    cell.setAttribute('data-border-width', String(style.borderWidth))
    parts.push(`border-width: ${style.borderWidth}px`)
  }
  if (parts.length) {
    const prev = cell.getAttribute('style') || ''
    cell.setAttribute('style', [prev, ...parts].filter(Boolean).join('; '))
  }
}

/** @param {Element} parent @param {string} local */
function firstChildNS(parent, local) {
  for (const child of parent.children) {
    if (child.localName === local) return child
  }
  return null
}

/** @param {Element} el @param {string} name */
function attr(el, name) {
  return (
    el.getAttributeNS(W_NS, name) ||
    el.getAttribute(`w:${name}`) ||
    el.getAttribute(name) ||
    ''
  )
}
