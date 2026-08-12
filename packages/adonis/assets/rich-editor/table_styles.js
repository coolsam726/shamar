/**
 * TipTap table cells/headers with background + border attrs (Word-like styling).
 */

import { TableCell, TableHeader } from 'https://esm.sh/@tiptap/extension-table@3.29.2'
import { CellSelection, TableMap, findTable } from 'https://esm.sh/@tiptap/pm@3.29.2/tables'

/** @param {string | null | undefined} raw */
export function normalizeCssColor(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || /^(auto|none|transparent)$/i.test(s)) return null
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s.toLowerCase()
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s.toLowerCase()}`
  if (/^[0-9a-f]{3}$/i.test(s)) return `#${s.toLowerCase()}`
  if (/^rgb/i.test(s)) return s
  return s
}

/** @param {HTMLElement} el */
export function parseBackgroundFromElement(el) {
  const fromStyle = el.style?.backgroundColor || el.style?.background || ''
  const fromAttr = el.getAttribute?.('bgcolor') || el.getAttribute?.('data-background-color')
  const raw = (fromStyle || fromAttr || '').replace(/!important/gi, '').trim()
  const colorMatch = raw.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|[a-z]+)/i)
  return normalizeCssColor(colorMatch?.[1] || raw || null)
}

/** @param {HTMLElement} el */
export function parseBorderColorFromElement(el) {
  const fromData = el.getAttribute?.('data-border-color')
  if (fromData) return normalizeCssColor(fromData)
  const border = el.style?.borderColor || el.style?.border || ''
  if (!border) return null
  const colorMatch = border.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\))/i)
  return normalizeCssColor(colorMatch?.[1] || null)
}

/** @param {HTMLElement} el */
export function parseBorderWidthFromElement(el) {
  const fromData = el.getAttribute?.('data-border-width')
  if (fromData) {
    const n = parseFloat(fromData)
    return Number.isFinite(n) ? n : null
  }
  const w = el.style?.borderWidth
  if (!w) return null
  const n = parseFloat(w)
  return Number.isFinite(n) ? n : null
}

function styleAttrs() {
  return {
    backgroundColor: {
      default: null,
      parseHTML: (element) => parseBackgroundFromElement(element),
      renderHTML: (attributes) => {
        if (!attributes.backgroundColor) return {}
        return {
          'data-background-color': attributes.backgroundColor,
          style: `background-color: ${attributes.backgroundColor}`,
        }
      },
    },
    borderColor: {
      default: null,
      parseHTML: (element) => parseBorderColorFromElement(element),
      renderHTML: (attributes) => {
        if (!attributes.borderColor) return {}
        const width =
          attributes.borderWidth != null && attributes.borderWidth !== ''
            ? `${attributes.borderWidth}px`
            : '1px'
        return {
          'data-border-color': attributes.borderColor,
          style: `border: ${width} solid ${attributes.borderColor}`,
        }
      },
    },
    borderWidth: {
      default: null,
      parseHTML: (element) => parseBorderWidthFromElement(element),
      renderHTML: (attributes) => {
        if (attributes.borderWidth == null || attributes.borderWidth === '') return {}
        if (attributes.borderColor) {
          return { 'data-border-width': String(attributes.borderWidth) }
        }
        return {
          'data-border-width': String(attributes.borderWidth),
          style: `border-width: ${attributes.borderWidth}px`,
        }
      },
    },
  }
}

export const StyledTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...styleAttrs(),
    }
  },
})

export const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...styleAttrs(),
    }
  },
})

/**
 * Select every cell in the current table so fill/border tools apply.
 * @param {import('@tiptap/core').Editor} editor
 */
export function selectEntireTable(editor) {
  if (!editor) return false
  const { state, view } = editor
  const found = findTable(state.selection.$anchor)
  if (!found) return false
  const map = TableMap.get(found.node)
  if (!map.map.length) return false
  const first = found.start + map.map[0]
  const last = found.start + map.map[map.map.length - 1]
  const selection = CellSelection.create(state.doc, first, last)
  view.dispatch(state.tr.setSelection(selection))
  editor.view.focus()
  return true
}

/** @param {import('@tiptap/core').Editor} editor */
export function isInTable(editor) {
  return !!editor && (editor.isActive('table') || !!findTable(editor.state.selection.$anchor))
}

/**
 * @param {import('@tiptap/core').Editor} editor
 * @param {string} name
 * @param {unknown} value
 */
export function setSelectedCellsAttribute(editor, name, value) {
  if (!editor) return false
  return editor.chain().focus().setCellAttribute(name, value).run()
}
