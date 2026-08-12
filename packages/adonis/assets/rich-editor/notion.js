/**
 * Notion-style TipTap editor: slash commands + floating bubble toolbar.
 */
import { Editor, Extension } from 'https://esm.sh/@tiptap/core@3.29.2'
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@3.29.2'
import Underline from 'https://esm.sh/@tiptap/extension-underline@3.29.2'
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@3.29.2'
import { TextStyle } from 'https://esm.sh/@tiptap/extension-text-style@3.29.2'
import { Color } from 'https://esm.sh/@tiptap/extension-color@3.29.2'
import Highlight from 'https://esm.sh/@tiptap/extension-highlight@3.29.2'
import Placeholder from 'https://esm.sh/@tiptap/extension-placeholder@3.29.2'
import Link from 'https://esm.sh/@tiptap/extension-link@3.29.2'
import Image from 'https://esm.sh/@tiptap/extension-image@3.29.2'
import { Plugin, PluginKey } from 'https://esm.sh/@tiptap/pm@3.29.2/state'

const SLASH_ITEMS = [
  { id: 'text', label: 'Text', hint: 'Plain paragraph', keywords: 'paragraph', run: (ed) => ed.chain().focus().setParagraph().run() },
  { id: 'h1', label: 'Heading 1', hint: 'Large section title', keywords: 'h1 title', run: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: 'h2', label: 'Heading 2', hint: 'Medium section title', keywords: 'h2', run: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: 'h3', label: 'Heading 3', hint: 'Small section title', keywords: 'h3', run: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: 'bullet', label: 'Bulleted list', hint: 'Create a simple list', keywords: 'ul unordered', run: (ed) => ed.chain().focus().toggleBulletList().run() },
  { id: 'ordered', label: 'Numbered list', hint: 'Create a numbered list', keywords: 'ol ordered', run: (ed) => ed.chain().focus().toggleOrderedList().run() },
  { id: 'quote', label: 'Quote', hint: 'Capture a quote', keywords: 'blockquote', run: (ed) => ed.chain().focus().toggleBlockquote().run() },
  { id: 'code', label: 'Code block', hint: 'Capture a code snippet', keywords: 'code pre', run: (ed) => ed.chain().focus().toggleCodeBlock().run() },
  { id: 'hr', label: 'Divider', hint: 'Visually divide blocks', keywords: 'hr horizontal', run: (ed) => ed.chain().focus().setHorizontalRule().run() },
  {
    id: 'image',
    label: 'Image',
    hint: 'Embed from URL',
    keywords: 'img picture',
    run: (ed) => {
      const src = window.prompt('Image URL')
      if (src) ed.chain().focus().setImage({ src }).run()
    },
  },
  {
    id: 'emoji',
    label: 'Emoji',
    hint: 'Insert an emoji',
    keywords: 'emoji smile',
    run: (ed) => ed.chain().focus().insertContent('🙂 ').run(),
  },
]

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v
    else if (k === 'text') node.textContent = v
    else if (k === 'html') node.innerHTML = v
    else if (k === 'hidden') node.hidden = !!v
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v)
    else if (v != null) node.setAttribute(k, String(v))
  }
  for (const child of children.flat().filter(Boolean)) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child)
  }
  return node
}

function createSlashMenu() {
  const root = el('div', { className: 'shamar-re-notion__slash', hidden: true, role: 'listbox' })
  let query = ''
  let activeIndex = 0
  let editor = null
  let range = null

  function filtered() {
    const q = query.toLowerCase().trim()
    if (!q) return SLASH_ITEMS
    return SLASH_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q) ||
        item.keywords.includes(q),
    )
  }

  function render() {
    const items = filtered()
    root.innerHTML = ''
    if (!items.length) {
      root.appendChild(el('div', { className: 'shamar-re-notion__slash-empty', text: 'No results' }))
      return
    }
    activeIndex = Math.max(0, Math.min(activeIndex, items.length - 1))
    items.forEach((item, i) => {
      const row = el(
        'button',
        {
          type: 'button',
          className: `shamar-re-notion__slash-item${i === activeIndex ? ' is-active' : ''}`,
          role: 'option',
          onClick: (e) => {
            e.preventDefault()
            pick(item)
          },
        },
        [
          el('span', { className: 'shamar-re-notion__slash-label', text: item.label }),
          el('span', { className: 'shamar-re-notion__slash-hint', text: item.hint }),
        ],
      )
      root.appendChild(row)
    })
  }

  function pick(item) {
    if (!editor || !range) return
    editor.chain().focus().deleteRange(range).run()
    item.run(editor)
    hide()
  }

  function placeNearCursor() {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    const parent = root.offsetParent || document.body
    const parentRect = parent.getBoundingClientRect()
    root.style.top = `${rect.bottom - parentRect.top + parent.scrollTop + 8}px`
    root.style.left = `${Math.max(8, rect.left - parentRect.left + parent.scrollLeft)}px`
  }

  function show(ed, from, to, q) {
    editor = ed
    range = { from, to }
    query = q
    activeIndex = 0
    root.hidden = false
    render()
    placeNearCursor()
  }

  function hide() {
    root.hidden = true
    editor = null
    range = null
    query = ''
  }

  function onKeyDown(event) {
    if (root.hidden) return false
    const items = filtered()
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      activeIndex = (activeIndex + 1) % Math.max(items.length, 1)
      render()
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      activeIndex = (activeIndex - 1 + items.length) % Math.max(items.length, 1)
      render()
      return true
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (items[activeIndex]) pick(items[activeIndex])
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      hide()
      return true
    }
    return false
  }

  return { root, show, hide, onKeyDown, isOpen: () => !root.hidden }
}

function createBubbleToolbar() {
  const root = el('div', { className: 'shamar-re-notion__bubble', hidden: true })

  function btn(title, html, run, isActive) {
    const b = el('button', {
      type: 'button',
      className: 'shamar-re-notion__bubble-btn',
      title,
      html,
      onClick: (e) => {
        e.preventDefault()
        run()
        sync(editorRef)
      },
    })
    b._isActive = isActive
    return b
  }

  let editorRef = null
  const buttons = [
    btn('Bold', '<b>B</b>', () => editorRef?.chain().focus().toggleBold().run(), (ed) => ed.isActive('bold')),
    btn('Italic', '<i>I</i>', () => editorRef?.chain().focus().toggleItalic().run(), (ed) => ed.isActive('italic')),
    btn('Underline', '<u>U</u>', () => editorRef?.chain().focus().toggleUnderline().run(), (ed) => ed.isActive('underline')),
    btn('Strike', '<s>S</s>', () => editorRef?.chain().focus().toggleStrike().run(), (ed) => ed.isActive('strike')),
    btn('Highlight', 'H', () => editorRef?.chain().focus().toggleHighlight().run(), (ed) => ed.isActive('highlight')),
    btn('Code', '</>', () => editorRef?.chain().focus().toggleCode().run(), (ed) => ed.isActive('code')),
    btn('Link', '🔗', () => {
      const prev = editorRef?.getAttributes('link').href || ''
      const href = window.prompt('URL', prev)
      if (href === null) return
      if (!href) editorRef?.chain().focus().unsetLink().run()
      else editorRef?.chain().focus().extendMarkRange('link').setLink({ href }).run()
    }, (ed) => ed.isActive('link')),
    btn('Align left', '⫷', () => editorRef?.chain().focus().setTextAlign('left').run(), (ed) => ed.isActive({ textAlign: 'left' })),
    btn('Align center', '☰', () => editorRef?.chain().focus().setTextAlign('center').run(), (ed) => ed.isActive({ textAlign: 'center' })),
    btn('Align right', '⫸', () => editorRef?.chain().focus().setTextAlign('right').run(), (ed) => ed.isActive({ textAlign: 'right' })),
  ]
  buttons.forEach((b) => root.appendChild(b))

  function sync(ed) {
    editorRef = ed
    if (!ed || ed.state.selection.empty) {
      root.hidden = true
      return
    }
    const { from, to } = ed.state.selection
    const start = ed.view.coordsAtPos(from)
    const end = ed.view.coordsAtPos(to)
    const parent = root.offsetParent || document.body
    const parentRect = parent.getBoundingClientRect()
    const mid = (start.left + end.right) / 2
    root.hidden = false
    root.style.top = `${start.top - parentRect.top + parent.scrollTop - 44}px`
    root.style.left = `${mid - parentRect.left + parent.scrollLeft}px`
    root.style.transform = 'translateX(-50%)'
    buttons.forEach((b) => {
      b.classList.toggle('is-active', !!(b._isActive && ed && b._isActive(ed)))
    })
  }

  return { root, sync }
}

function SlashCommands(slash) {
  return Extension.create({
    name: 'shamarSlashCommands',
    addProseMirrorPlugins() {
      const editor = this.editor
      return [
        new Plugin({
          key: new PluginKey('shamarSlashCommands'),
          props: {
            handleKeyDown: (_view, event) => {
              if (slash.onKeyDown(event)) return true
              return false
            },
          },
          view: () => ({
            update: (view) => {
              const { state } = view
              const { from, empty } = state.selection
              if (!empty) {
                slash.hide()
                return
              }
              const textBefore = state.doc.textBetween(Math.max(0, from - 64), from, '\n', '\0')
              const match = /(?:^|\s)\/([^\s/]*)$/.exec(textBefore)
              if (!match) {
                slash.hide()
                return
              }
              const query = match[1] || ''
              const deleteFrom = from - query.length - 1
              slash.show(editor, deleteFrom, from, query)
            },
          }),
        }),
      ]
    },
  })
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   initialHtml?: string,
 *   placeholder?: string,
 *   editable?: boolean,
 *   onChange?: (html: string) => void,
 * }} [options]
 */
export function mountNotionEditor(root, options = {}) {
  if (!root) throw new Error('mountNotionEditor: root element required')
  const editable = options.editable !== false
  root.classList.add('shamar-re-notion')
  root.innerHTML = ''

  const surface = el('div', { className: 'shamar-re-notion__surface' })
  const editorHost = el('div', { className: 'shamar-re-notion__editor' })
  const plusBtn = el('button', {
    type: 'button',
    className: 'shamar-re-notion__plus',
    title: 'Insert block',
    text: '+',
    hidden: true,
  })
  const slash = createSlashMenu()
  const bubble = createBubbleToolbar()

  surface.appendChild(plusBtn)
  surface.appendChild(editorHost)
  surface.appendChild(slash.root)
  surface.appendChild(bubble.root)
  root.appendChild(surface)

  const editor = new Editor({
    element: editorHost,
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'shamar-re-notion__link' } }),
      Image.configure({ HTMLAttributes: { class: 'shamar-re-notion__image' } }),
      Placeholder.configure({
        placeholder: options.placeholder || "Type '/' for commands…",
      }),
      SlashCommands(slash),
    ],
    content: (options.initialHtml || '').trim() || '<p></p>',
    editorProps: {
      attributes: { class: 'shamar-re-notion__prose', spellcheck: 'true' },
    },
    onUpdate: ({ editor: ed }) => {
      options.onChange?.(ed.getHTML())
    },
    onSelectionUpdate: ({ editor: ed }) => {
      bubble.sync(ed)
      positionPlus(ed)
    },
    onFocus: ({ editor: ed }) => positionPlus(ed),
    onBlur: () => {
      // Delay so slash/bubble clicks still register
      setTimeout(() => {
        if (!root.contains(document.activeElement)) {
          plusBtn.hidden = true
        }
      }, 150)
    },
  })

  function positionPlus(ed) {
    if (!ed || !ed.isFocused) {
      plusBtn.hidden = true
      return
    }
    const { $from } = ed.state.selection
    const coords = ed.view.coordsAtPos($from.start())
    const parentRect = surface.getBoundingClientRect()
    plusBtn.hidden = false
    plusBtn.style.top = `${coords.top - parentRect.top + surface.scrollTop - 2}px`
    plusBtn.style.left = `4px`
  }

  plusBtn.addEventListener('click', (e) => {
    e.preventDefault()
    editor.chain().focus().insertContent('/').run()
  })

  document.addEventListener(
    'mousedown',
    (e) => {
      if (!slash.isOpen()) return
      if (slash.root.contains(e.target) || plusBtn.contains(e.target)) return
      // keep open while typing in editor
    },
    true,
  )

  return {
    editor,
    getHTML: () => editor.getHTML(),
    setHTML: (html) => editor.commands.setContent(html || '<p></p>'),
    destroy: () => {
      editor.destroy()
      root.innerHTML = ''
    },
  }
}
