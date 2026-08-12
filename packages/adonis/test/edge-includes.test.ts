import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import edge from 'edge.js';

const viewsRoot = join(dirname(fileURLToPath(import.meta.url)), '../resources/views/shamar');

const INCLUDE_RE =
  /@(?:include|!component)\(\s*['"]shamar::([^'"]+)['"]/g;

async function listEdgeFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listEdgeFiles(full)));
    } else if (entry.name.endsWith('.edge')) {
      files.push(full);
    }
  }
  return files;
}

function templatePathFromInclude(includePath: string): string {
  // `partials/flash` → `partials/flash.edge`
  return join(viewsRoot, `${includePath}.edge`);
}

describe('shamar edge templates', () => {
  it('resolves every shamar:: include / component to an existing file', async () => {
    const files = await listEdgeFiles(viewsRoot);
    assert.ok(files.length > 0, 'expected Edge templates under resources/views/shamar');

    const missing: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(INCLUDE_RE)) {
        const includePath = match[1]!;
        const resolved = templatePathFromInclude(includePath);
        try {
          await access(resolved, fsConstants.F_OK);
        } catch {
          missing.push(
            `${relative(viewsRoot, file)} → shamar::${includePath} (missing ${relative(viewsRoot, resolved)})`,
          );
        }
      }
    }

    assert.deepEqual(missing, [], missing.join('\n'));
  });

  it('smoke-renders the media manager page', async () => {
    edge.mount('shamar', viewsRoot);
    edge.global('jsonAttr', (value: unknown) =>
      JSON.stringify(value ?? null).replace(/</g, '\\u003c'),
    );

    const html = await edge.render('shamar::media/manager', {
      pageTitle: 'Files',
      panelTitle: 'Admin',
      branding: {
        name: 'Shamar',
        logoUrl: null,
        logoDarkUrl: null,
        logoHeight: '2rem',
        showLogo: false,
        showName: true,
        fontPreconnect: false,
        fontUrl: null,
        cssVars: '',
      },
      basePath: '/admin',
      menuRoots: [],
      menuActiveRoot: null,
      menuSecondary: [],
      breadcrumbs: [{ label: 'Files', href: null }],
      user: { name: 'Admin', email: 'admin@example.com' },
      userInitial: 'A',
      logoutPath: '/logout',
      profilePath: null,
      masquerade: null,
      csrfToken: 'test-csrf',
      flashJson: null,
      contentMaxWidthClass: 'max-w-screen-2xl',
      folder: null,
      mediaBreadcrumbs: [],
      folders: [{ id: 'f1', name: 'Branding', parentId: null }],
      folderTree: [{ id: 'f1', name: 'Branding', parentId: null }],
      files: [
        {
          id: 'file1',
          name: 'welcome.txt',
          mime: 'text/plain',
          url: '/admin/media/files/file1/raw',
          isImage: false,
        },
      ],
      mediaApiBase: '/admin/media',
    });

    assert.match(html, /shamar-media/);
    assert.match(html, /shamarMediaManager/);
    assert.match(html, /shamar-media__sidebar/);
    assert.match(html, /shamar-media__tree-twist|toggleExpand/);
    assert.match(html, /shamar-media__props|shamar-media__details-hero/);
    assert.match(html, /formatDate|detailsLocation/);
    assert.match(html, /openDetails/);
    assert.match(html, /Branding/);
    assert.match(html, /welcome\.txt/);
    assert.match(html, /\/admin\/media/);
    assert.match(html, /shamar-media__view-modes|setViewMode/);
    assert.match(html, /shamar-media__bulk|bulkDelete/);
    assert.match(html, /shamar-media__list|shamar-media__table/);
    assert.match(html, /toggleSort|sortedBrowseItems/);
    assert.match(html, /shamar-media__grid--tiles|setViewMode\('tiles'\)/);
    assert.match(html, /x-teleport="body"|teleport/);
    assert.match(html, /@contextmenu|contextmenu/);
    assert.match(html, /draggable="true"/);
    assert.match(html, /pasteHere|Cut|Copy|Paste/);
    assert.doesNotMatch(html, /Cannot resolve/);
  });
});
