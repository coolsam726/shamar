import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Resource,
  form,
  table,
  panel,
  infolist,
  resolveGridItemStyle,
  evaluateAfterStateUpdated,
  TextInput,
  Section,
  Fieldset,
  TextEntry,
  TextColumn,
} from '../src/index.js';

class DemoResource extends Resource {
  static override slug = 'demos';
  static override label = 'Demos';
  static override singularLabel = 'Demo';
  static override model = 'Demo';

  static override form() {
    return form((f) => {
      f.schema([
        Section.make('Main')
          .description('Primary fields')
          .icon('cube')
          .columns(2)
          .schema([
            TextInput.make('name')
              .required()
              .columnSpan(1)
              .live({ debounce: '750ms' })
              .afterStateUpdated(({ get, set }) => {
                set('code', String(get('name') ?? '').toUpperCase());
              }),
            TextInput.make('code').columnSpanFull().unique(),
          ]),
        Fieldset.make('Meta').card().schema([TextInput.make('notes')]),
      ]);
    });
  }

  static override table() {
    return table((t) => {
      t.schema([
        TextColumn.make('id').id().label('ID'),
        TextColumn.make('email').email(),
        TextColumn.make('createdAt').date(),
      ]);
    });
  }

  static override infolist() {
    return infolist((i) => {
      i.columns(2).schema([
        TextEntry.make('name'),
        TextEntry.make('code').columnSpanFull(),
      ]);
    });
  }
}

class FallbackResource extends Resource {
  static override slug = 'fallback';
  static override label = 'Fallback';
  static override singularLabel = 'Fallback';
  static override model = 'Fallback';

  static override form() {
    return form((f) => {
      f.schema([TextInput.make('title')]);
    });
  }

  static override table() {
    return table((t) => {
      t.schema([TextColumn.make('title')]);
    });
  }
}

class NestedInfolistResource extends Resource {
  static override slug = 'nested';
  static override label = 'Nested';
  static override singularLabel = 'Nested';
  static override model = 'Nested';

  static override form() {
    return form((f) => {
      f.schema([TextInput.make('x')]);
    });
  }

  static override table() {
    return table((t) => {
      t.schema([TextColumn.make('x')]);
    });
  }

  static override infolist() {
    return infolist((i) => {
      i.schema([
        Section.make('Company')
          .columns(3)
          .schema([
            TextEntry.make('name').columnSpanFull(),
            TextEntry.make('email').label('Email Address'),
            TextEntry.make('active').boolean().columnSpan(2),
          ]),
      ]);
    });
  }
}

describe('@shamar/core Filament-style builders', () => {
  it('builds a panel config', () => {
    const config = panel('admin')
      .path('/admin')
      .branding({ name: 'Admin' })
      .discoverResources('app/resources/admin')
      .resources([DemoResource])
      .build();

    assert.equal(config.id, 'admin');
    assert.equal(config.path, '/admin');
  });

  it('configures form Section.schema + TextInput.make', () => {
    const meta = DemoResource.configure();
    assert.equal(meta.form.sections.length, 2);
    assert.equal(meta.form.sections[0]!.columns, 2);
    assert.equal(meta.form.sections[0]!.kind, 'section');
    assert.equal(meta.form.sections[0]!.description, 'Primary fields');
    assert.equal(meta.form.sections[0]!.icon, 'cube');
    assert.deepEqual(meta.form.sections[0]!.fields[0]!.live, { debounce: '750ms' });
    assert.equal(meta.form.sections[0]!.fields[1]!.columnSpan, 'full');
    assert.equal(meta.form.sections[1]!.kind, 'fieldset');
    assert.equal(meta.form.sections[1]!.title, 'Meta');
    assert.equal(meta.form.sections[1]!.card, true);
    assert.equal(meta.form.sections[0]!.card, true);
  });

  it('configures infolist columns().schema([TextEntry...])', () => {
    const meta = DemoResource.configure();
    assert.equal(meta.hasExplicitInfolist, true);
    assert.equal(meta.infolist.sections[0]!.entries[1]!.columnSpan, 'full');
  });

  it('configures nested Section.schema on infolist', () => {
    const meta = NestedInfolistResource.configure();
    const section = meta.infolist.sections[0]!;
    assert.equal(section.title, 'Company');
    assert.equal(section.columns, 3);
    assert.equal(section.kind, 'section');
    assert.equal(section.card, true);
    assert.equal(section.entries[0]!.columnSpan, 'full');
    assert.equal(section.entries[1]!.label, 'Email Address');
    assert.equal(section.entries[2]!.format, 'boolean');
    assert.equal(section.entries[2]!.columnSpan, 2);
  });

  it('shares Fieldset layout between form and infolist', () => {
    class SharedLayoutResource extends Resource {
      static override slug = 'shared';
      static override label = 'Shared';
      static override singularLabel = 'Shared';
      static override model = 'Shared';

      static override form() {
        return form((f) => {
          f.schema([
            Fieldset.make('Flags').card().schema([TextInput.make('active')]),
          ]);
        });
      }

      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('active')]);
        });
      }

      static override infolist() {
        return infolist((i) => {
          i.schema([
            Fieldset.make('Flags').card().schema([TextEntry.make('active').boolean()]),
          ]);
        });
      }
    }

    const meta = SharedLayoutResource.configure();
    assert.equal(meta.form.sections[0]!.kind, 'fieldset');
    assert.equal(meta.form.sections[0]!.card, true);
    assert.equal(meta.infolist.sections[0]!.kind, 'fieldset');
    assert.equal(meta.infolist.sections[0]!.card, true);
    assert.equal(meta.infolist.sections[0]!.entries[0]!.format, 'boolean');
  });

  it('allows headerless Section.make() without defaulting title to Details', () => {
    class HeaderlessResource extends Resource {
      static override slug = 'headerless';
      static override label = 'Headerless';
      static override singularLabel = 'Headerless';
      static override model = 'Headerless';

      static override form() {
        return form((f) => {
          f.schema([
            Section.make().columns(2).schema([TextInput.make('name')]),
          ]);
        });
      }

      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('name')]);
        });
      }

      static override infolist() {
        return infolist((i) => {
          i.schema([
            Section.make().schema([TextEntry.make('name')]),
          ]);
        });
      }
    }

    const meta = HeaderlessResource.configure();
    assert.equal(meta.form.sections[0]!.title, '');
    assert.equal(meta.form.sections[0]!.icon, undefined);
    assert.equal(meta.form.sections[0]!.description, undefined);
    assert.notEqual(meta.form.sections[0]!.title, 'Details');
    assert.equal(meta.infolist.sections[0]!.title, '');
  });

  it('falls back to infolist from form fields', () => {
    const meta = FallbackResource.configure();
    assert.equal(meta.hasExplicitInfolist, false);
    assert.equal(meta.infolist.sections[0]!.kind, 'plain');
    assert.equal(meta.infolist.sections[0]!.entries[0]!.name, 'title');
  });

  it('bare form schema uses plain containers (no section chrome)', () => {
    const meta = FallbackResource.configure();
    assert.equal(meta.form.sections[0]!.kind, 'plain');
    assert.equal(meta.form.sections[0]!.title, '');
  });

  it('resolves grid item styles', () => {
    assert.equal(resolveGridItemStyle({ columnSpan: 'full' }, 2), 'grid-column: 1 / -1');
    assert.match(resolveGridItemStyle({ columnSpan: 2 }, 2), /span 2/);
  });

  it('evaluates afterStateUpdated with get/set', async () => {
    const meta = DemoResource.configure();
    const field = meta.fields.find((f) => f.name === 'name')!;
    const next = await evaluateAfterStateUpdated(field, {
      state: { name: 'Acme', code: '' },
      operation: 'create',
    });
    assert.equal(next.code, 'ACME');
  });

  it('builds table via TextColumn.make + schema([])', () => {
    const meta = DemoResource.configure();
    assert.equal(meta.columns[0]!.type, 'id');
    assert.equal(meta.columns[1]!.type, 'email');
    assert.equal(meta.columns[2]!.format, 'date');
  });

  it('configures unique() on fields', () => {
    const meta = DemoResource.configure();
    const code = meta.fields.find((f) => f.name === 'code');
    assert.equal(code?.unique, true);
  });
});
