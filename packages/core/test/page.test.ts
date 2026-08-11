import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FormPage,
  ListPage,
  Page,
  PageRegistry,
  form,
  table,
  TextInput,
  TextColumn,
  isFormPage,
  isListPage,
} from '../src/index.js';

class WelcomePage extends Page {
  static override slug = 'welcome';
  static override label = 'Welcome';
  static override navigationGroup = 'General';
  static override navigationSort = 5;
}

class BrandingPage extends FormPage {
  static override slug = 'branding';
  static override label = 'Branding';
  static override navigationGroup = 'Settings';
  static override navigationSort = 1;

  static override form() {
    return form((f) => {
      f.schema([TextInput.make('logo')]);
    });
  }
}

class CatalogPage extends ListPage {
  static override slug = 'catalog';
  static override label = 'Catalog';
  static override navigationGroup = 'Content';
  static override model = 'Product';

  static override table() {
    return table((t) => {
      t.schema([TextColumn.make('name').searchable()]);
    });
  }
}

describe('Page.configure', () => {
  it('configures a custom page', () => {
    const meta = WelcomePage.configure();
    assert.equal(meta.kind, 'custom');
    assert.equal(meta.slug, 'welcome');
    assert.equal(meta.navigationGroup, 'General');
  });

  it('configures a form page with fields', () => {
    const meta = BrandingPage.configure();
    assert.equal(meta.kind, 'form');
    assert.ok(meta.form);
    assert.equal(meta.fields?.[0]?.name, 'logo');
    assert.equal(isFormPage(BrandingPage), true);
    assert.equal(isListPage(BrandingPage), false);
  });

  it('configures a list page with listResource meta', () => {
    const meta = CatalogPage.configure();
    assert.equal(meta.kind, 'list');
    assert.ok(meta.listResource);
    assert.equal(meta.listResource?.columns[0]?.name, 'name');
    assert.equal(isListPage(CatalogPage), true);
  });
});

describe('PageRegistry', () => {
  it('registers pages and exposes navigation items', () => {
    const registry = new PageRegistry([WelcomePage, BrandingPage, CatalogPage]);
    assert.equal(registry.has('branding'), true);
    assert.equal(registry.get('welcome')?.label, 'Welcome');
    const nav = registry.navigationItems();
    assert.deepEqual(
      nav.map((p) => p.slug),
      ['branding', 'welcome', 'catalog'],
    );
  });

  it('rejects duplicate slugs', () => {
    assert.throws(() => new PageRegistry([WelcomePage, WelcomePage]), /Duplicate/);
  });
});
