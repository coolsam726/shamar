/**
 * Import DOCX / ODT / ODS into TipTap-friendly HTML (client-side).
 * - .docx → mammoth (+ optional OOXML table style restore)
 * - .odt → odf-kit/reader
 * - .ods → odf-kit/ods-reader (tables)
 */

import mammoth from 'https://esm.sh/mammoth@1.12.0'
import { odtToHtml } from 'https://esm.sh/odf-kit@0.13.13/reader'
import { odsToHtml } from 'https://esm.sh/odf-kit@0.13.13/ods-reader'
import { applyDocxTableStylesToHtml } from './docx_table_styles.js'

const ACCEPT =
  '.docx,.odt,.ods,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet'

/**
 * @param {File} file
 * @returns {Promise<{ html: string, title: string, filename: string, warnings?: string[] }>}
 */
export async function importOfficeFile(file) {
  const filename = file.name || 'document'
  const ext = extensionOf(filename)
  const title = filename.replace(/\.[^.]+$/, '') || 'Imported document'

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      { convertImage: mammoth.images.dataUri },
    )
    let html = result.value
    try {
      html = await applyDocxTableStylesToHtml(arrayBuffer, result.value)
    } catch (err) {
      console.warn('DOCX table style restore skipped:', err)
    }
    return {
      html: normalizeImportedHtml(html),
      title,
      filename,
      warnings: (result.messages || []).map((m) => m.message).filter(Boolean),
    }
  }

  if (ext === 'odt') {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const html = odtToHtml(bytes, { fragment: true })
    return {
      html: normalizeImportedHtml(html),
      title,
      filename,
    }
  }

  if (ext === 'ods') {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const html = odsToHtml(bytes, { fragment: true })
    return {
      html: normalizeImportedHtml(html),
      title,
      filename,
    }
  }

  if (ext === 'doc' || ext === 'rtf') {
    throw new Error('Legacy .doc/.rtf import is not supported in the browser. Save as .docx or .odt and try again.')
  }

  throw new Error('Unsupported file type. Choose a .docx, .odt, or .ods file.')
}

/**
 * Open a hidden file picker and import the selected office file.
 * @returns {Promise<{ html: string, title: string, filename: string, warnings?: string[] } | null>}
 */
export function pickAndImportOfficeFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ACCEPT
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      input.remove()
      if (!file) {
        resolve(null)
        return
      }
      try {
        resolve(await importOfficeFile(file))
      } catch (err) {
        reject(err)
      }
    })
    input.addEventListener('cancel', () => {
      input.remove()
      resolve(null)
    })
    input.click()
  })
}

function extensionOf(name) {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)
  return m?.[1] || ''
}

/** Strip scripts/styles and unwrap a full HTML document to a TipTap fragment. */
export function normalizeImportedHtml(html) {
  if (typeof document === 'undefined') {
    return String(html || '').trim() || '<p></p>'
  }
  const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html')
  parsed.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((n) => n.remove())
  parsed.querySelectorAll('font').forEach((font) => {
    const parent = font.parentNode
    if (!parent) return
    while (font.firstChild) parent.insertBefore(font.firstChild, font)
    parent.removeChild(font)
  })
  normalizeTablesForTiptap(parsed)
  const fragment = (parsed.body?.innerHTML || '').trim()
  return fragment || '<p></p>'
}

function normalizeTablesForTiptap(doc) {
  doc.querySelectorAll('table').forEach((table) => {
    table.classList.add('shamar-re-doc-table')

    const directRows = [...table.children].filter((el) => el.tagName === 'TR')
    if (directRows.length) {
      let tbody = table.querySelector(':scope > tbody')
      if (!tbody) {
        tbody = doc.createElement('tbody')
        table.appendChild(tbody)
      }
      directRows.forEach((row) => tbody.appendChild(row))
    }

    table.querySelectorAll('td, th').forEach((cell) => {
      const bgcolor = cell.getAttribute('bgcolor')
      if (bgcolor && !cell.style.backgroundColor) {
        cell.style.backgroundColor = bgcolor.startsWith('#') ? bgcolor : `#${bgcolor}`
        cell.setAttribute('data-background-color', cell.style.backgroundColor)
      }
      if (cell.style.backgroundColor && !cell.getAttribute('data-background-color')) {
        cell.setAttribute('data-background-color', cell.style.backgroundColor)
      }

      const hasBlock = [...cell.childNodes].some(
        (n) =>
          n.nodeType === Node.ELEMENT_NODE &&
          /^(P|DIV|UL|OL|H[1-6]|TABLE|BLOCKQUOTE)$/i.test(n.tagName),
      )
      if (!hasBlock) {
        const p = doc.createElement('p')
        while (cell.firstChild) p.appendChild(cell.firstChild)
        if (!p.textContent?.trim() && !p.querySelector('img,br')) {
          p.appendChild(doc.createElement('br'))
        }
        cell.appendChild(p)
      } else {
        ;[...cell.childNodes].forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) {
            const p = doc.createElement('p')
            p.textContent = n.textContent
            cell.replaceChild(p, n)
          }
        })
      }
    })
  })
}
