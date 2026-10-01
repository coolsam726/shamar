/**
 * Starlight sidebar — generated alongside reference docs.
 * Regenerate: pnpm --filter @shamar/docs reference
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'src/content/docs/docs/reference')

async function titlesIn(dir) {
  const abs = join(ROOT, dir)
  const files = (await readdir(abs, { withFileTypes: true }))
    .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
    .map((e) => e.name.replace(/\.mdx$/, ''))
    .sort((a, b) => {
      if (a === 'index') return -1
      if (b === 'index') return 1
      return a.localeCompare(b)
    })

  const items = []
  for (const file of files) {
    const raw = await readFile(join(abs, `${file}.mdx`), 'utf8')
    const match = raw.match(/^title:\s*(.+)$/m)
    const label = match ? match[1].trim() : file
    const slug = file === 'index' ? `docs/reference/${dir}` : `docs/reference/${dir}/${file}`
    items.push({ label, slug })
  }
  return items
}

function group(label, items, collapsed = false) {
  return collapsed ? { label, collapsed: true, items } : { label, items }
}

export async function buildSidebar() {
  const [forms, schemas, infolists, widgets, pages, actions] = await Promise.all([
    titlesIn('forms'),
    titlesIn('schemas'),
    titlesIn('infolists'),
    titlesIn('widgets'),
    titlesIn('pages'),
    titlesIn('actions'),
  ])

  return [
    {
      label: 'Getting started',
      items: [
        { label: 'Introduction', slug: 'docs/guides/introduction' },
        { label: 'Installation', slug: 'docs/guides/installation' },
        { label: 'Using MongoDB', slug: 'docs/guides/mongodb' },
        { label: 'Your first resource', slug: 'docs/guides/first-resource' },
        { label: 'Live demo', slug: 'docs/guides/live-demo' },
        { label: 'Changelog', slug: 'docs/guides/changelog' },
      ],
    },
    {
      label: 'Wire',
      items: [
        { label: 'Overview', slug: 'docs/wire' },
        { label: 'Install', slug: 'docs/wire/install' },
        { label: 'Components', slug: 'docs/wire/adonis' },
        { label: 'SPA navigation', slug: 'docs/wire/spa' },
        { label: 'Without Adonis', slug: 'docs/wire/node' },
        { label: 'Kernel', slug: 'docs/wire/components' },
        { label: 'Browser', slug: 'docs/wire/browser' },
        { label: 'Nesting', slug: 'docs/wire/nesting' },
      ],
    },
    group('Resources', [
      { label: 'Overview', slug: 'docs/reference/resources' },
      { label: 'Registration', slug: 'docs/reference/resources/registration' },
      { label: 'Navigation', slug: 'docs/reference/resources/navigation' },
    ]),
    group('Schemas', schemas),
    group('Forms', forms, true),
    group('Tables', [
      { label: 'Overview', slug: 'docs/reference/tables' },
      { label: 'TextColumn', slug: 'docs/reference/tables/text-column' },
    ]),
    group('Infolists', infolists, true),
    group('Widgets', widgets, true),
    group('Actions', actions),
    group('Pages', pages, true),
    {
      label: 'Concepts',
      items: [
        { label: 'Auth & RBAC', slug: 'docs/concepts/auth' },
        { label: 'Media library', slug: 'docs/concepts/media' },
      ],
    },
    {
      label: 'Packages',
      items: [
        { label: 'Overview', slug: 'docs/packages' },
        { label: 'Core', slug: 'docs/packages/core' },
        { label: 'Adonis host', slug: 'docs/packages/adonis' },
        { label: 'SQL (Lucid)', slug: 'docs/packages/lucid' },
        { label: 'MongoDB', slug: 'docs/packages/mongoose' },
        { label: 'Cherubim', slug: 'docs/packages/cherubim' },
        { label: 'REST', slug: 'docs/packages/rest' },
      ],
    },
    {
      label: 'Recipes',
      items: [
        { label: 'Settings page', slug: 'docs/recipes/settings-page' },
        { label: 'Branding', slug: 'docs/recipes/branding' },
      ],
    },
  ]
}
