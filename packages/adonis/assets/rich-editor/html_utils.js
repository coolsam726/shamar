/** HTML helpers for the document editor ↔ PDF / plain merge path. */

export function plainTextToHtml(text) {
  const raw = String(text ?? '').replace(/\r\n/g, '\n').trim()
  if (!raw) return '<p></p>'
  const html = raw
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((l) => escapeHtml(l)).join('<br>')
      return `<p>${lines || '<br>'}</p>`
    })
    .join('')
  return wrapTokens(html)
}

function wrapTokens(html) {
  return String(html || '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, name) => {
    const key = String(name).toLowerCase()
    return `<span class="shamar-re-merge-token" data-token="${key}">{{${key}}}</span>`
  })
}

export function htmlToPlainText(html) {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null
  if (div) {
    div.innerHTML = String(html ?? '')
    // Prefer block breaks
    div.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
    div.querySelectorAll('p, div, h1, h2, h3, li').forEach((el) => {
      el.append('\n')
    })
    return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
  }
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
