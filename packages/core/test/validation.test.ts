import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Resource,
  form,
  TextInput,
  Repeater,
  Slider,
  RichEditor,
  validateUniqueFields,
  validateFieldConstraints,
  validateFormData,
  ValidationException,
  type DataAdapter,
  type ResourceMeta,
} from '../src/index.js';

function stubAdapter(existing: Array<Record<string, unknown>>): DataAdapter {
  return {
    async list() {
      return { items: [], total: 0, page: 1, perPage: 15, pageCount: 1 };
    },
    async findOne() {
      return {};
    },
    async create(_meta, data) {
      return data;
    },
    async update(_meta, _id, data) {
      return data;
    },
    async delete() {},
    async exists(_meta, column, value, options) {
      return existing.some((row) => {
        if (row[column] !== value) return false;
        if (options?.excludeId && String(row.id) === String(options.excludeId)) {
          return false;
        }
        return true;
      });
    },
    async search() {
      return [];
    },
  };
}

class CompanyResource extends Resource {
  static override slug = 'companies';
  static override label = 'Companies';
  static override singularLabel = 'Company';
  static override model = 'Company';

  static override form() {
    return form((f) => {
      f.schema([
        TextInput.make('code').label('Code').unique(),
        TextInput.make('name'),
      ]);
    });
  }
}

describe('@shamar/core unique validation', () => {
  it('rejects duplicate values on create', async () => {
    const meta = CompanyResource.configure();
    const adapter = stubAdapter([{ id: '1', code: 'ACME' }]);

    await assert.rejects(
      () => validateUniqueFields(meta, { code: 'ACME', name: 'Acme' }, adapter),
      (error: unknown) => {
        assert.ok(error instanceof ValidationException);
        assert.match(error.errors.code ?? '', /already been taken/i);
        return true;
      },
    );
  });

  it('ignores the current record on edit by default', async () => {
    const meta = CompanyResource.configure();
    const adapter = stubAdapter([{ id: '1', code: 'ACME' }]);

    await validateUniqueFields(
      meta,
      { code: 'ACME', name: 'Acme' },
      adapter,
      { recordId: '1' },
    );
  });

  it('still rejects when another record owns the value', async () => {
    const meta = CompanyResource.configure();
    const adapter = stubAdapter([
      { id: '1', code: 'ACME' },
      { id: '2', code: 'BETA' },
    ]);

    await assert.rejects(
      () =>
        validateUniqueFields(
          meta,
          { code: 'BETA', name: 'Acme' },
          adapter,
          { recordId: '1' },
        ),
      ValidationException,
    );
  });

  it('skips blank values', async () => {
    const meta = CompanyResource.configure();
    const adapter = stubAdapter([{ id: '1', code: 'ACME' }]);
    await validateUniqueFields(meta, { code: '', name: 'Acme' }, adapter);
  });
});

describe('@shamar/core field constraints', () => {
  class ConstraintsResource extends Resource {
    static override slug = 'constraints';
    static override label = 'Constraints';
    static override singularLabel = 'Constraint';
    static override model = 'Constraint';

    static override form() {
      return form((f) => {
        f.schema([
          TextInput.make('name').required().minLength(3).maxLength(8),
          TextInput.make('code').length(4).pattern('[A-Z]+'),
          TextInput.make('qty').numeric().min(2).max(5),
          TextInput.make('site').url(),
          TextInput.make('secret').password().dehydrated(false),
        ]);
      });
    }
  }

  it('enforces required and length', () => {
    const meta = ConstraintsResource.configure();
    assert.throws(
      () => validateFieldConstraints(meta, { name: 'ab', code: 'ABCD', qty: 3, site: 'https://x.test' }),
      ValidationException,
    );
    assert.throws(
      () => validateFieldConstraints(meta, { name: 'abcdefghi', code: 'ABCD', qty: 3, site: 'https://x.test' }),
      ValidationException,
    );
    validateFieldConstraints(meta, {
      name: 'abcd',
      code: 'ABCD',
      qty: 3,
      site: 'https://x.test',
    });
  });

  it('enforces pattern and numeric bounds', () => {
    const meta = ConstraintsResource.configure();
    assert.throws(
      () => validateFieldConstraints(meta, { name: 'abcd', code: 'ab', qty: 3, site: 'https://x.test' }),
      ValidationException,
    );
    assert.throws(
      () => validateFieldConstraints(meta, { name: 'abcd', code: 'ABCD', qty: 9, site: 'https://x.test' }),
      ValidationException,
    );
  });

  it('accepts path-absolute media URLs on url fields', () => {
    const meta = ConstraintsResource.configure();
    validateFieldConstraints(meta, {
      name: 'abcd',
      code: 'ABCD',
      qty: 3,
      site: '/admin/media/files/abc/raw',
    });
    assert.throws(
      () =>
        validateFieldConstraints(meta, {
          name: 'abcd',
          code: 'ABCD',
          qty: 3,
          site: 'not a url',
        }),
      ValidationException,
    );
  });

  it('skips dehydrated(false) fields and validates via validateFormData', async () => {
    const meta = ConstraintsResource.configure();
    const adapter = stubAdapter([]);
    await validateFormData(
      meta,
      { name: 'abcd', code: 'ABCD', qty: 3, site: 'https://x.test', secret: 'x' },
      adapter,
    );
  });
});

describe('widget field constraints', () => {
  class WidgetResource extends Resource {
    static override slug = 'widgets';
    static override label = 'Widgets';
    static override singularLabel = 'Widget';
    static override model = 'Widget';

    static override form() {
      return form((f) => {
        f.schema([
          Repeater.make('items')
            .schema([TextInput.make('sku').required()])
            .minItems(1)
            .maxItems(2),
          Slider.make('volume').min(0).max(10),
          RichEditor.make('html').required(),
        ]);
      });
    }
  }

  it('enforces repeater item counts and nested required fields', () => {
    const meta = WidgetResource.configure();
    assert.throws(
      () => validateFieldConstraints(meta, { items: [], volume: 3, html: '<p>Hi</p>' }),
      ValidationException,
    );
    assert.throws(
      () =>
        validateFieldConstraints(meta, {
          items: [{ sku: '' }, { sku: 'A' }, { sku: 'B' }],
          volume: 3,
          html: '<p>Hi</p>',
        }),
      ValidationException,
    );
    assert.throws(
      () => validateFieldConstraints(meta, { items: [{ sku: '' }], volume: 3, html: '<p>Hi</p>' }),
      ValidationException,
    );
    validateFieldConstraints(meta, { items: [{ sku: 'A' }], volume: 3, html: '<p>Hi</p>' });
  });

  it('treats empty rich HTML as blank', () => {
    const meta = WidgetResource.configure();
    assert.throws(
      () => validateFieldConstraints(meta, { items: [{ sku: 'A' }], volume: 3, html: '<p></p>' }),
      ValidationException,
    );
  });
});

