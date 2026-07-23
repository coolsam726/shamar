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
  Textarea,
  Select,
  Hidden,
  Checkbox,
  Radio,
  ColorPicker,
  TagsInput,
  FileUpload,
  Section,
  Fieldset,
  Grid,
  Tabs,
  Tab,
  Callout,
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
      .contentMaxWidth('7xl')
      .discoverResources('app/resources/admin')
      .resources([DemoResource])
      .build();

    assert.equal(config.id, 'admin');
    assert.equal(config.contentMaxWidth, '7xl');
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

  it('preserves nested Grid/Tabs chrome in schema tree', () => {
    class NestedLayoutResource extends Resource {
      static override slug = 'nested-layout';
      static override label = 'Nested';
      static override singularLabel = 'Nested';
      static override model = 'Nested';

      static override form() {
        return form((f) => {
          f.schema([
            Section.make('Outer')
              .collapsible()
              .schema([
                Grid.make(2).schema([
                  TextInput.make('a'),
                  TextInput.make('b'),
                ]),
                Tabs.make()
                  .tabs([
                    Tab.make('One').schema([TextInput.make('c')]),
                    Tab.make('Two').badge(2).schema([TextInput.make('d')]),
                  ]),
                Callout.make('Note').info().description('Hello'),
              ]),
          ]);
        });
      }

      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('a')]);
        });
      }
    }

    const meta = NestedLayoutResource.configure();
    assert.equal(meta.form.schema[0]!.kind, 'section');
    assert.equal(meta.form.schema[0]!.collapsible, true);
    const kids = meta.form.schema[0]!.children ?? [];
    assert.equal(kids[0]!.kind, 'grid');
    assert.equal(kids[0]!.children?.[0]!.kind, 'field');
    assert.equal(kids[1]!.kind, 'tabs');
    assert.equal(kids[1]!.children?.[1]!.badge, 2);
    assert.equal(kids[2]!.kind, 'callout');
    assert.deepEqual(
      meta.form.fields.map((f) => f.name).sort(),
      ['a', 'b', 'c', 'd'],
    );

    // Derived show/infolist must keep the same layout tree (not flatten to fields).
    assert.equal(meta.hasExplicitInfolist, false);
    assert.equal(meta.infolist.schema[0]!.kind, 'section');
    assert.equal(meta.infolist.schema[0]!.collapsible, true);
    const detailKids = meta.infolist.schema[0]!.children ?? [];
    assert.equal(detailKids[0]!.kind, 'grid');
    assert.equal(detailKids[0]!.columns, 2);
    assert.equal(detailKids[0]!.children?.[0]!.kind, 'entry');
    assert.equal(detailKids[0]!.children?.[0]!.name, 'a');
    assert.equal(detailKids[1]!.kind, 'tabs');
    assert.equal(detailKids[2]!.kind, 'callout');
  });

  it('derives infolist sections with columns and field colspans from form()', () => {
    class LayoutDeriveResource extends Resource {
      static override slug = 'layout-derive';
      static override label = 'Layout Derive';
      static override singularLabel = 'Layout Derive';
      static override model = 'LayoutDerive';

      static override form() {
        return form((f) => {
          f.schema([
            Section.make('Details')
              .columnSpanFull()
              .columns(3)
              .schema([
                TextInput.make('name').columnSpan(2),
                TextInput.make('code'),
                Textarea.make('notes').columnSpanFull(),
              ]),
          ]);
        });
      }

      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('name')]);
        });
      }
    }

    const meta = LayoutDeriveResource.configure();
    const section = meta.infolist.schema[0]!;
    assert.equal(section.kind, 'section');
    assert.equal(section.title, 'Details');
    assert.equal(section.columns, 3);
    assert.equal(section.columnSpan, 'full');
    const children = section.children ?? [];
    assert.equal(children.length, 3);
    assert.equal(children[0]!.kind, 'entry');
    assert.equal(children[0]!.columnSpan, 2);
    assert.equal(children[1]!.columnSpan, undefined);
    assert.equal(children[2]!.columnSpan, 'full');
    assert.equal(children[2]!.entry?.format, 'textarea');
  });

  it('builds new form field types', () => {
    class ExtraFieldsResource extends Resource {
      static override slug = 'extra';
      static override label = 'Extra';
      static override singularLabel = 'Extra';
      static override model = 'Extra';

      static override form() {
        return form((f) => {
          f.schema([
            Hidden.make('token'),
            Checkbox.make('agree'),
            Radio.make('plan').options([
              { label: 'A', value: 'a' },
              { label: 'B', value: 'b' },
            ]),
            ColorPicker.make('color'),
            TagsInput.make('tags'),
            Textarea.make('bio').rows(6).maxLength(200),
            TextInput.make('slug').prefix('https://').suffix('.test'),
            TextInput.make('phone').tel().prefixIcon('phone').autocomplete('tel'),
            TextInput.make('site').url().maxLength(80).datalist(['https://a.test']),
            TextInput.make('secret').password().revealable(),
            TextInput.make('ref').copyable(),
            TextInput.make('qty').integer().min(1).max(10).step(1),
            Select.make('roles')
              .multiple()
              .selectablePlaceholder(false)
              .options([{ label: 'Admin', value: 'admin' }]),
            Select.make('status').native().options([{ label: 'Open', value: 'open' }]),
            FileUpload.make('avatar').image().accept('image/png'),
          ]);
        });
      }

      static override table() {
        return table((t) => {
          t.schema([TextColumn.make('slug')]);
        });
      }
    }

    const meta = ExtraFieldsResource.configure();
    const byName = Object.fromEntries(meta.fields.map((f) => [f.name, f]));
    assert.equal(byName.token?.type, 'hidden');
    assert.equal(byName.agree?.type, 'checkbox');
    assert.equal(byName.plan?.type, 'radio');
    assert.equal(byName.color?.type, 'color');
    assert.equal(byName.tags?.type, 'tags');
    assert.equal(byName.bio?.rows, 6);
    assert.equal(byName.bio?.maxLength, 200);
    assert.equal(byName.slug?.prefix, 'https://');
    assert.equal(byName.phone?.type, 'tel');
    assert.equal(byName.phone?.prefixIcon, 'phone');
    assert.equal(byName.site?.type, 'url');
    assert.equal(byName.secret?.revealable, true);
    assert.equal(byName.ref?.copyable, true);
    assert.equal(byName.qty?.type, 'number');
    assert.equal(byName.qty?.minValue, 1);
    assert.equal(byName.qty?.step, 1);
    assert.equal(byName.roles?.multiple, true);
    assert.equal(byName.roles?.selectablePlaceholder, false);
    assert.equal(byName.status?.nativeSelect, true);
    assert.equal(byName.avatar?.type, 'image');
    assert.equal(byName.avatar?.accept, 'image/png');
  });

  it('falls back to infolist from form fields', () => {
    const meta = FallbackResource.configure();
    assert.equal(meta.hasExplicitInfolist, false);
    // Bare form() uses plain containers — derived show keeps that layout.
    assert.equal(meta.infolist.sections[0]!.kind, 'plain');
    assert.equal(meta.infolist.sections[0]!.entries[0]!.name, 'title');
  });

  it('TextEntry.textarea marks long-text format', () => {
    const entry = TextEntry.make('payload').textarea().columnSpanFull().build();
    assert.equal(entry.type, 'textarea');
    assert.equal(entry.format, 'textarea');
    assert.equal(entry.columnSpan, 'full');
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
