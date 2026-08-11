import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import edge from 'edge.js';
import { defaultActions, resolveAlignmentClass } from '@shamar/core';
import { partitionRowActions } from '../src/shamar/resource-actions.js';
import { recordNavQuery } from '../src/shamar/list-query.js';

const viewsPath = join(dirname(fileURLToPath(import.meta.url)), '../resources/views/shamar');

function mountShamarEdge() {
  edge.mount('shamar', viewsPath);
  edge.global('partitionRowActions', partitionRowActions);
  edge.global('recordNavQuery', recordNavQuery);
  edge.global('resolveAlignmentClass', resolveAlignmentClass);
  edge.global('cellValue', (record: Record<string, unknown>, column: { name: string }) =>
    String(record[column.name] ?? ''),
  );
  edge.global('badgeValues', () => []);
  edge.global('relatedListLink', () => null);
  edge.global('jsonAttr', (value: unknown) =>
    JSON.stringify(value ?? null).replace(/</g, '\\u003c'),
  );
}

describe('list-row edge template', () => {
  it('renders grouped row actions without crashing', async () => {
    mountShamarEdge();

    const html = await edge.render('shamar::partials/list-row', {
      record: { id: 'abc', name: 'Acme' },
      resource: {
        slug: 'companies',
        columns: [{ name: 'name', label: 'Name' }],
      },
      basePath: '/admin',
      query: {},
      rowActions: defaultActions().filter((action) => action.placement === 'row'),
      bulkActions: [],
      showEditButton: true,
      showDeleteButton: true,
    });

    assert.match(html, /shamar-row-actions__menu/);
    assert.match(html, /shamar-row-actions__trigger/);
    assert.match(html, /shamarFloatingMenu/);
    assert.match(html, /shamar-row-actions__item/);
    assert.match(html, /shamar-action-icon/);
    assert.match(html, /<span>View<\/span>/);
    assert.match(html, /<span>Edit<\/span>/);
    assert.match(html, /<span>Delete<\/span>/);
    assert.match(html, /\/admin\/companies\/abc/);
    assert.match(html, /\/admin\/companies\/abc\/edit/);
  });

  it('renders ungrouped actions inline and grouped actions in the menu', async () => {
    mountShamarEdge();

    const html = await edge.render('shamar::partials/list-row', {
      record: { id: '1', name: 'Item' },
      resource: {
        slug: 'items',
        columns: [{ name: 'name', label: 'Name' }],
      },
      basePath: '/admin',
      query: {},
      rowActions: [
        { name: 'view', label: 'View', placement: 'row', grouped: false, icon: 'eye' },
        { name: 'edit', label: 'Edit', placement: 'row', icon: 'pencil' },
        { name: 'delete', label: 'Delete', placement: 'row', icon: 'trash' },
      ],
      bulkActions: [],
      showEditButton: true,
      showDeleteButton: true,
    });

    assert.match(html, /shamar-row-actions__inline[\s\S]*?<span>View<\/span>/);
    assert.match(html, /shamar-row-actions__menu/);
    assert.match(html, /shamar-row-actions__item[\s\S]*?<span>Edit<\/span>/);
  });
});
