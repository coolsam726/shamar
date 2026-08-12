/**
 * Shamar document (Word / TipTap Docx–style) rich editor mount.
 */
import { Editor } from 'https://esm.sh/@tiptap/core@3.29.2'
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@3.29.2'
import Underline from 'https://esm.sh/@tiptap/extension-underline@3.29.2'
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@3.29.2'
import { TextStyle } from 'https://esm.sh/@tiptap/extension-text-style@3.29.2'
import { Color } from 'https://esm.sh/@tiptap/extension-color@3.29.2'
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@3.29.2'
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@3.29.2'
import Link from 'https://esm.sh/@tiptap/extension-link@3.29.2'
import { TableKit } from 'https://esm.sh/@tiptap/extension-table@3.29.2'
import { buildChrome } from './chrome.js'
import { FontSize } from './font_size.js'
import { OrderedListNumbering, ensureNumberingFormatCss } from './numbering.js'
import { StyledTableCell, StyledTableHeader } from './table_styles.js'

const bodyExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false, HTMLAttributes: { class: 'shamar-re-doc-link' } }),
  TableKit.configure({
    table: {
      resizable: true,
      allowTableNodeSelection: true,
      HTMLAttributes: { class: 'shamar-re-doc-table' },
    },
    tableCell: false,
    tableHeader: false,
  }),
  StyledTableCell,
  StyledTableHeader,
  OrderedListNumbering,
]

/**
 * @param {HTMLElement} root
 * @param {{
 *   brandLabel?: string,
 *   documentTitle?: string,
 *   initialHtml?: string,
 *   placeholder?: string,
 *   editable?: boolean,
 *   onChange?: (html: string) => void,
 * }} [options]
 */
export function mountDocumentEditor(root, options = {}) {
  if (!root) throw new Error('mountDocumentEditor: root element required')

  const brandLabel = options.brandLabel || 'Shamar'
  const documentTitle = options.documentTitle || 'Untitled document'
  const initialHtml = (options.initialHtml || '').trim() || '<p></p>'
  const editable = options.editable !== false

  root.classList.add('shamar-re-doc')
  root.innerHTML = ''
  ensureNumberingFormatCss()

  const chrome = buildChrome({
    brandLabel,
    documentTitle,
    tokens: [],
    initialHeader: options.initialHeader,
    initialFooter: options.initialFooter,
  })
  root.appendChild(chrome.root)

  const { headerEditor, footerEditor } = chrome.mountHeaderFooterEditors()

  const editor = new Editor({
    element: chrome.editorHost,
    editable,
    extensions: [
      ...bodyExtensions,
      Placeholder.configure({
        placeholder: options.placeholder || 'Start typing your document…',
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: { class: 'shamar-re-doc-prose', spellcheck: 'true' },
    },
    onFocus: () => {
      root.querySelector('.shamar-re-doc-page-header')?.classList.remove('is-editing')
      root.querySelector('.shamar-re-doc-page-footer')?.classList.remove('is-editing')
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      options.onChange?.(html)
      chrome.syncActive(ed)
    },
    onSelectionUpdate: ({ editor: ed }) => chrome.syncActive(ed),
  })

  chrome.bindEditor(editor)
  chrome.bindHeaderFooter(headerEditor, footerEditor)
  chrome.syncActive(editor)
  requestAnimationFrame(() => chrome.applyZoom())

  return {
    editor,
    headerEditor,
    footerEditor,
    getHTML: () => editor.getHTML(),
    setHTML: (html) => editor.commands.setContent(html || '<p></p>'),
    destroy: () => {
      editor.destroy()
      chrome.destroyExtras?.()
      root.innerHTML = ''
    },
  }
}
