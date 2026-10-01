import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { Edge } from 'edge.js';
import { WireKernel } from '@shamar/wire';
import { registerWireTag, rewriteWireTags } from '../src/wire/edge_tag.js';
import { Wire, wireDefinitionFromClass } from '../src/wire/class_component.js';
import { discoverWireComponents } from '../src/wire/discover.js';
import { parseWireName } from '../src/wire/naming.js';

class Counter extends Wire {
  count = 0;

  increment() {
    this.count += 1;
  }

  updatedCount() {
    this.count += 10;
  }
}

describe('Wire class components', () => {
  it('parses make:wire names the way Livewire parses paths', () => {
    assert.deepEqual(parseWireName('counter'), {
      file: 'counter',
      className: 'Counter',
      tag: 'counter',
    });
    assert.deepEqual(parseWireName('posts/create_form'), {
      file: 'posts/create_form',
      className: 'CreateForm',
      tag: 'posts.create-form',
    });
    assert.throws(() => parseWireName('../secret'));
  });

  it('syncs public fields through mount, props, actions, and updated hooks', async () => {
    const kernel = new WireKernel('secret', {
      counter: wireDefinitionFromClass(Counter, (data) => `<b>${data.count}</b>`),
    });
    const mounted = kernel.mount('counter', '/wire', undefined, { count: 2, ignored: 1 });
    assert.match(mounted.html, /<b>2<\/b>/);
    assert.equal(mounted.snapshot.data.count, 2);
    assert.equal('ignored' in mounted.snapshot.data, false);

    const clicked = await kernel.update(
      { snapshot: mounted.snapshot, calls: [{ method: 'increment', params: [] }] },
      '/wire',
    );
    assert.equal(clicked.snapshot.data.count, 3);

    const typed = await kernel.update(
      { snapshot: clicked.snapshot, updates: { count: 1 } },
      '/wire',
    );
    assert.equal(typed.snapshot.data.count, 11);
  });

  it('compiles @wire into an unescaped helper call', () => {
    const edge = new Edge();
    registerWireTag(edge);
    edge.global('wire', (name: string, props?: Record<string, unknown>) => {
      return `<island>${name}:${props?.count ?? ''}</island>`;
    });
    assert.equal(edge.renderRawSync("@wire('counter')"), '<island>counter:</island>');
    assert.equal(
      edge.renderRawSync("@wire('counter', { count: 3 })"),
      '<island>counter:3</island>',
    );
  });

  it('rewrites <wire:counter /> into the same helper as @wire', () => {
    assert.equal(rewriteWireTags('<a wire:navigate href="/a">x</a>'), '<a wire:navigate href="/a">x</a>');
    const edge = new Edge();
    registerWireTag(edge);
    edge.global('wire', (name: string, props?: Record<string, unknown>) => {
      return JSON.stringify({ name, props: props ?? null });
    });
    assert.equal(edge.renderRawSync('<wire:counter/>'), '{"name":"counter","props":null}');
    assert.equal(edge.renderRawSync('<wire:counter></wire:counter>'), '{"name":"counter","props":null}');
    const rendered = edge.renderRawSync('<wire:posts.form title="Hello" :count="4" open count="{{ start }}" />', {
      start: 2,
    });
    assert.deepEqual(JSON.parse(rendered), {
      name: 'posts.form',
      props: { title: 'Hello', count: 2, open: true },
    });
    const persisted = edge.renderRawSync("@persist('player')\n<p>{{ name }}</p>\n@end", { name: 'Ada' });
    assert.match(persisted, /<div wire:persist="player">/);
    assert.match(persisted, /<p>Ada<\/p>/);
  });

  it('discovers a default-exported class under app/wire', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shamar-wire-'));
    const file = join(root, 'app/wire/posts/create_form.ts');
    await mkdir(join(root, 'app/wire/posts'), { recursive: true });
    await writeFile(
      file,
      `export default class CreateForm {\n  title = 'draft'\n}\n`,
    );
    try {
      const found = await discoverWireComponents(root);
      assert.equal(found.length, 1);
      assert.equal(found[0]?.name, 'posts.create-form');
      assert.equal(found[0]?.view, 'posts/create_form');
      const instance = new found[0]!.Class() as { title: string };
      assert.equal(instance.title, 'draft');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
