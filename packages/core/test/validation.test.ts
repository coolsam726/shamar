import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Resource,
  form,
  TextInput,
  validateUniqueFields,
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
