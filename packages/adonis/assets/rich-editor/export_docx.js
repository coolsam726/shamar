import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  PageNumber,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'https://esm.sh/docx@9.5.1'

/**
 * Export editor HTML (+ header/footer) as a .docx Blob using the `docx` library.
 * @param {{ title: string, bodyHtml: string, headerHtml?: string, footerHtml?: string, pageSize?: string, orientation?: string }} opts
 */
export async function exportDocxBlob(opts) {
  const title = opts.title || 'document'
  const orientation = opts.orientation === 'landscape' ? 'landscape' : 'portrait'
  const size = pageSizeTwips(opts.pageSize || 'a4', orientation)

  const body = htmlToParagraphs(opts.bodyHtml || '')
  const headerParas = htmlToParagraphs(opts.headerHtml || '', { muted: true })
  const footerParas = htmlToParagraphs(opts.footerHtml || '', { muted: true })

  if (!footerParas.length) {
    footerParas.push(
      new Paragraph({
        children: [
          new TextRun({ text: title, size: 18, color: '666666' }),
          new TextRun({ text: '  ·  ', size: 18, color: '999999' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '666666' }),
        ],
      }),
    )
  }

  const doc = new Document({
    creator: 'PnC',
    title,
    sections: [
      {
        properties: {
          page: {
            size,
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        headers: {
          default: new Header({
            children: headerParas.length
              ? headerParas
              : [new Paragraph({ children: [new TextRun({ text: 'Private & confidential', italics: true, size: 18, color: '666666' })] })],
          }),
        },
        footers: {
          default: new Footer({ children: footerParas }),
        },
        children: body.length ? body : [new Paragraph({ children: [new TextRun('')] })],
      },
    ],
  })

  return Packer.toBlob(doc)
}

export async function downloadDocx(opts) {
  const blob = await exportDocxBlob(opts)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${sanitizeFilename(opts.title || 'document')}.docx`
  a.click()
  URL.revokeObjectURL(a.href)
}

function pageSizeTwips(key, orientation) {
  // Word uses twips (1/20 pt); width/height for portrait
  const sizes = {
    a4: { width: 11906, height: 16838 },
    letter: { width: 12240, height: 15840 },
    legal: { width: 12240, height: 20160 },
    a5: { width: 8391, height: 11906 },
  }
  const s = sizes[key] || sizes.a4
  if (orientation === 'landscape') return { width: s.height, height: s.width }
  return s
}

function sanitizeFilename(name) {
  return String(name).replace(/[^\w.\- ]+/g, '').trim() || 'document'
}

function htmlToParagraphs(html, opts = {}) {
  const wrap = document.createElement('div')
  wrap.innerHTML = String(html || '')
  const blocks = []
  const nodes = wrap.childNodes.length ? [...wrap.childNodes] : []

  const pushText = (text, style = {}) => {
    const t = String(text || '').replace(/\u00a0/g, ' ')
    if (!t.trim() && !style.force) return
    blocks.push(
      new Paragraph({
        spacing: { after: 120 },
        alignment: style.align,
        heading: style.heading,
        children: [
          new TextRun({
            text: t,
            bold: style.bold,
            italics: style.italics || opts.muted,
            underline: style.underline ? {} : undefined,
            strike: style.strike,
            size: style.size || (opts.muted ? 18 : 24),
            color: opts.muted ? '666666' : '111111',
            font: 'Calibri',
          }),
        ],
      }),
    )
  }

  function walkBlock(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const tag = node.tagName.toLowerCase()
    if (tag === 'br') {
      pushText('', { force: true })
      return
    }
    if (tag === 'table') {
      blocks.push(htmlTableToDocx(node, opts))
      return
    }
    const text = node.innerText || node.textContent || ''
    if (tag === 'h1') pushText(text, { heading: HeadingLevel.HEADING_1, bold: true, size: 32 })
    else if (tag === 'h2') pushText(text, { heading: HeadingLevel.HEADING_2, bold: true, size: 28 })
    else if (tag === 'h3') pushText(text, { heading: HeadingLevel.HEADING_3, bold: true, size: 26 })
    else if (tag === 'li') pushText(`• ${text}`)
    else if (tag === 'blockquote') pushText(text, { italics: true })
    else if (tag === 'p' || tag === 'div') {
      const align = node.style?.textAlign
      pushText(text, {
        align:
          align === 'center'
            ? AlignmentType.CENTER
            : align === 'right'
              ? AlignmentType.RIGHT
              : align === 'justify'
                ? AlignmentType.BOTH
                : AlignmentType.LEFT,
        bold: !!node.querySelector('strong,b'),
        italics: !!node.querySelector('em,i'),
      })
    } else if (tag === 'ul' || tag === 'ol') {
      ;[...node.children].forEach(walkBlock)
    } else {
      pushText(text)
    }
  }

  if (!nodes.length) {
    pushText(wrap.textContent || '')
  } else {
    nodes.forEach(walkBlock)
  }
  return blocks
}

function htmlTableToDocx(tableEl, opts = {}) {
  const rows = [...tableEl.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr')]
  const defaultBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'CBD5E1',
  }
  const docRows = rows.map((tr) => {
    const cells = [...tr.querySelectorAll(':scope > th, :scope > td')]
    return new TableRow({
      children: cells.map((cell) => {
        const isHeader = cell.tagName.toLowerCase() === 'th'
        const text = (cell.innerText || cell.textContent || '').replace(/\u00a0/g, ' ').trim()
        const fill = cellFillHex(cell)
        const borderColor = cellBorderHex(cell) || defaultBorder.color
        const border = {
          style: BorderStyle.SINGLE,
          size: 4,
          color: borderColor,
        }
        const borders = { top: border, bottom: border, left: border, right: border }
        return new TableCell({
          borders,
          width: { size: Math.floor(9000 / Math.max(cells.length, 1)), type: WidthType.DXA },
          shading: fill
            ? { type: ShadingType.CLEAR, fill, color: 'auto' }
            : isHeader
              ? { type: ShadingType.CLEAR, fill: 'F8FAFC', color: 'auto' }
              : undefined,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: text || ' ',
                  bold: isHeader || !!cell.querySelector('strong,b'),
                  italics: opts.muted || !!cell.querySelector('em,i'),
                  size: opts.muted ? 18 : 22,
                  font: 'Calibri',
                  color: opts.muted ? '666666' : '111111',
                }),
              ],
            }),
          ],
        })
      }),
    })
  })
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: docRows.length
      ? docRows
      : [
          new TableRow({
            children: [
              new TableCell({
                borders: {
                  top: defaultBorder,
                  bottom: defaultBorder,
                  left: defaultBorder,
                  right: defaultBorder,
                },
                children: [new Paragraph({ children: [new TextRun('')] })],
              }),
            ],
          }),
        ],
  })
}

/** @param {HTMLElement} cell */
function cellFillHex(cell) {
  const raw =
    cell.getAttribute('data-background-color') ||
    cell.style?.backgroundColor ||
    cell.getAttribute('bgcolor') ||
    ''
  return cssColorToDocxHex(raw)
}

/** @param {HTMLElement} cell */
function cellBorderHex(cell) {
  const raw =
    cell.getAttribute('data-border-color') ||
    cell.style?.borderColor ||
    ''
  return cssColorToDocxHex(raw)
}

/** @param {string} raw @returns {string | null} */
function cssColorToDocxHex(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.slice(1).toUpperCase()
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return `${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toUpperCase()
  }
  if (/^[0-9a-f]{6}$/i.test(s)) return s.toUpperCase()
  const rgb = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgb) {
    return [rgb[1], rgb[2], rgb[3]]
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  }
  return null
}
