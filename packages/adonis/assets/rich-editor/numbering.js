/**
 * Ordered-list numbering formats matching TipTap Docx Editor
 * (numbering-format-dropdown-menu presets).
 */
import { Extension } from 'https://esm.sh/@tiptap/core@3.29.2'

export const NUMBERING_FORMAT_IDS = [
  'decimal',
  'decimal-paren',
  'decimal-nested',
  'upper-alpha',
  'lower-alpha',
  'upper-roman',
  'lower-roman',
  'decimal-zero',
]

/** Short labels shown in the picker grid (TipTap sample). */
export const NUMBERING_FORMAT_LABELS = {
  decimal: '1. 2. 3.',
  'decimal-paren': '1) 2) 3)',
  'decimal-nested': '1. 1.1. 1.1.1.',
  'upper-alpha': 'A. B. C.',
  'lower-alpha': 'a. b. c.',
  'upper-roman': 'I. II. III.',
  'lower-roman': 'i. ii. iii.',
  'decimal-zero': '01. 02. 03.',
}

/** Preview rows for the numbering format dropdown (TipTap sample). */
export const NUMBERING_FORMAT_PREVIEWS = {
  decimal: [
    { level: 1, marker: '1.' },
    { level: 2, marker: 'a.' },
    { level: 2, marker: 'b.' },
    { level: 3, marker: 'i.' },
    { level: 1, marker: '2.' },
  ],
  'decimal-paren': [
    { level: 1, marker: '1)' },
    { level: 2, marker: 'a)' },
    { level: 2, marker: 'b)' },
    { level: 3, marker: 'i)' },
    { level: 1, marker: '2)' },
  ],
  'decimal-nested': [
    { level: 1, marker: '1.' },
    { level: 2, marker: '1.1.' },
    { level: 2, marker: '1.2.' },
    { level: 3, marker: '1.2.1.' },
    { level: 1, marker: '2.' },
  ],
  'upper-alpha': [
    { level: 1, marker: 'A.' },
    { level: 2, marker: 'a.' },
    { level: 2, marker: 'b.' },
    { level: 3, marker: 'i.' },
    { level: 1, marker: 'B.' },
  ],
  'lower-alpha': [
    { level: 1, marker: 'a.' },
    { level: 2, marker: '1.' },
    { level: 2, marker: '2.' },
    { level: 3, marker: 'i.' },
    { level: 1, marker: 'b.' },
  ],
  'upper-roman': [
    { level: 1, marker: 'I.' },
    { level: 2, marker: 'A.' },
    { level: 2, marker: 'B.' },
    { level: 3, marker: '1.' },
    { level: 1, marker: 'II.' },
  ],
  'lower-roman': [
    { level: 1, marker: 'i.' },
    { level: 2, marker: '1.' },
    { level: 2, marker: '2.' },
    { level: 3, marker: 'a.' },
    { level: 1, marker: 'ii.' },
  ],
  'decimal-zero': [
    { level: 1, marker: '01.' },
    { level: 2, marker: 'a.' },
    { level: 2, marker: 'b.' },
    { level: 3, marker: 'i.' },
    { level: 1, marker: '02.' },
  ],
}

/** Multilevel format defs (same cycling as TipTap Docx Editor). */
export function buildNumberingFormats() {
  const cycle = (id, styles, suffix) => ({
    id,
    levels: Array.from({ length: 9 }, (_, n) => ({
      baseStyle: styles[n % styles.length] ?? 'decimal',
      textTemplate: `%${n + 1}${suffix}`,
    })),
  })
  return [
    cycle('decimal', ['decimal', 'lowerLetter', 'lowerRoman'], '.'),
    cycle('decimal-paren', ['decimal', 'lowerLetter', 'lowerRoman'], ')'),
    {
      id: 'decimal-nested',
      levels: Array.from({ length: 9 }, (_, t) => ({
        baseStyle: 'decimal',
        textTemplate: `${Array.from({ length: t + 1 }, (_, i) => `%${i + 1}`).join('.')}.`,
      })),
    },
    cycle('upper-alpha', ['upperLetter', 'decimal', 'lowerLetter'], '.'),
    cycle('lower-alpha', ['lowerLetter', 'decimal', 'lowerRoman'], '.'),
    cycle('upper-roman', ['upperRoman', 'upperLetter', 'decimal'], '.'),
    cycle('lower-roman', ['lowerRoman', 'decimal', 'lowerLetter'], '.'),
    cycle('decimal-zero', ['decimalZero', 'lowerLetter', 'lowerRoman'], '.'),
  ]
}

const STYLE_TO_CSS = {
  decimal: 'decimal',
  decimalZero: 'decimal-leading-zero',
  lowerLetter: 'lower-alpha',
  upperLetter: 'upper-alpha',
  lowerRoman: 'lower-roman',
  upperRoman: 'upper-roman',
}

/**
 * Inject editor-preview CSS for numbering formats (scoped under `.shamar-re-doc`).
 */
export function ensureNumberingFormatCss(formats = buildNumberingFormats()) {
  const id = 'shamar-re-doc-numbering-css'
  if (typeof document === 'undefined') return
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = generateNumberingFormatCss(formats)
  document.head.appendChild(style)
}

export function generateNumberingFormatCss(formats, scope = '.shamar-re-doc .tiptap') {
  const rules = []
  for (const fmt of formats) {
    const attr = `[data-numbering-format="${fmt.id}"]`
    const isParen = fmt.id === 'decimal-paren'
    const isNested = fmt.id === 'decimal-nested'
    const isZero = fmt.id === 'decimal-zero'

    rules.push(`${scope} ol${attr}{list-style:none;padding-left:1.5em;}`)
    rules.push(`${scope} ol${attr} ol{list-style:none;padding-left:1.5em;}`)

    for (let depth = 0; depth < Math.min(fmt.levels.length, 6); depth++) {
      const level = fmt.levels[depth]
      const counter = `pnc-ol-${fmt.id.replace(/[^a-z0-9]/gi, '')}-d${depth}`
      const sel =
        depth === 0
          ? `${scope} ol${attr}`
          : `${scope} ol${attr}${(' ol').repeat(depth)}`
      const itemSel = `${sel} > li`
      rules.push(`${sel}{counter-reset:${counter};}`)
      rules.push(`${itemSel}{counter-increment:${counter};}`)

      let content
      if (isNested) {
        const parts = Array.from({ length: depth + 1 }, (_, i) => {
          const c = `pnc-ol-${fmt.id.replace(/[^a-z0-9]/gi, '')}-d${i}`
          return `counter(${c})`
        })
        content = `${parts.join(' "." ')}"." "\\00a0"`
      } else if (isParen) {
        const cssStyle = STYLE_TO_CSS[level.baseStyle] || 'decimal'
        content = `counter(${counter}, ${cssStyle})")" "\\00a0"`
      } else if (isZero && depth === 0) {
        content = `counter(${counter}, decimal-leading-zero)"." "\\00a0"`
      } else {
        const cssStyle = STYLE_TO_CSS[level.baseStyle] || 'decimal'
        content = `counter(${counter}, ${cssStyle})"." "\\00a0"`
      }
      rules.push(
        `${itemSel}::before{content:${content};display:inline-block;min-width:1.5em;margin-left:-1.5em;padding-right:0.35em;box-sizing:border-box;font-variant-numeric:tabular-nums;}`,
      )
    }
  }
  return rules.join('\n')
}

/**
 * TipTap extension: `numberingFormat` on orderedList + picker commands.
 */
export const OrderedListNumbering = Extension.create({
  name: 'orderedListNumbering',

  addOptions() {
    return {
      defaultFormat: 'decimal',
      formats: buildNumberingFormats(),
    }
  },

  addStorage() {
    return {
      activeNumberingFormat: null,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: ['orderedList'],
        attributes: {
          numberingFormat: {
            default: this.options.defaultFormat,
            parseHTML: (element) =>
              element.getAttribute('data-numbering-format') || this.options.defaultFormat,
            renderHTML: (attributes) => {
              if (!attributes.numberingFormat) return {}
              return { 'data-numbering-format': attributes.numberingFormat }
            },
          },
        },
      },
    ]
  },

  onSelectionUpdate() {
    this.storage.activeNumberingFormat = this.editor.isActive('orderedList')
      ? this.editor.getAttributes('orderedList').numberingFormat || this.options.defaultFormat
      : null
  },

  onUpdate() {
    this.storage.activeNumberingFormat = this.editor.isActive('orderedList')
      ? this.editor.getAttributes('orderedList').numberingFormat || this.options.defaultFormat
      : null
  },

  addCommands() {
    return {
      setOrderedListNumberingFormat:
        (formatId) =>
        ({ chain, state }) => {
          const { $from } = state.selection
          let depth = null
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'orderedList') depth = d
          }
          if (depth == null) return false
          const pos = $from.before(depth)
          return chain()
            .command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, {
                ...$from.node(depth).attrs,
                numberingFormat: formatId,
              })
              return true
            })
            .run()
        },

      toggleOrderedListWithFormat:
        (formatId) =>
        ({ editor, chain }) => {
          const format = formatId || this.options.defaultFormat
          if (editor.isActive('orderedList')) {
            return chain().focus().toggleOrderedList().run()
          }
          return chain()
            .focus()
            .toggleOrderedList()
            .updateAttributes('orderedList', { numberingFormat: format })
            .run()
        },
    }
  },
})
