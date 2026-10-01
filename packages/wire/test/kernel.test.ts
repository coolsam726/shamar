import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WireKernel, type WireComponent } from '../src/index.js';

class Counter implements WireComponent {
  data: Record<string, unknown> = { count: 0 };

  increment(): void {
    this.data.count = Number(this.data.count) + 1;
  }
}

describe('@shamar/wire', () => {
  const kernel = new WireKernel('test-secret', {
    counter: {
      create: () => new Counter(),
      render: (component) => `<span>${component.data.count}</span>`,
    },
  });

  it('mounts a signed island and increments through a method call', async () => {
    const mounted = kernel.mount('counter', '/admin/wire');
    assert.match(mounted.html, /wire:endpoint="\/admin\/wire"/);
    assert.match(mounted.html, /<span>0<\/span>/);

    const next = await kernel.update(
      { snapshot: mounted.snapshot, calls: [{ method: 'increment' }] },
      '/admin/wire',
    );
    assert.match(next.html, /<span>1<\/span>/);
    assert.equal(next.snapshot.data.count, 1);
    assert.equal(next.snapshot.id, mounted.snapshot.id);
  });

  it('seeds numeric and boolean fields from string props', () => {
    const seeded = new WireKernel('test-secret', {
      counter: {
        create: () => ({ data: { count: 0, open: false } }),
        render: () => '',
      },
    }).mount('counter', '/wire', undefined, { count: '4', open: 'true', extra: 1 });
    assert.equal(seeded.snapshot.data.count, 4);
    assert.equal(seeded.snapshot.data.open, true);
    assert.equal('extra' in seeded.snapshot.data, false);
  });

  it('rejects a tampered snapshot', async () => {
    const mounted = kernel.mount('counter', '/admin/wire');
    mounted.snapshot.data.count = 99;
    await assert.rejects(
      () => kernel.update({ snapshot: mounted.snapshot }, '/admin/wire'),
      /Invalid wire snapshot/,
    );
  });

  it('applies public property updates', async () => {
    const kernelWithUpdated = new WireKernel('test-secret', {
      box: {
        create: () => {
          const component: WireComponent = {
            data: { query: '' },
            updated(key) {
              if (key === 'query') this.data.echo = this.data.query;
            },
          };
          return component;
        },
        render: (component) => String(component.data.echo ?? ''),
      },
    });
    const mounted = kernelWithUpdated.mount('box', '/wire');
    const next = await kernelWithUpdated.update(
      { snapshot: mounted.snapshot, updates: { query: 'alpha' } },
      '/wire',
    );
    assert.equal(next.snapshot.data.query, 'alpha');
    assert.equal(next.snapshot.data.echo, 'alpha');
  });

  it('returns a redirect effect without putting it in the snapshot', async () => {
    const kernelWithRedirect = new WireKernel('test-secret', {
      leave: {
        create: () => ({
          data: { ok: true },
          go() {
            this.effects = { redirect: '/done' };
          },
        }),
        render: () => '<p>stay</p>',
      },
    });
    const mounted = kernelWithRedirect.mount('leave', '/wire');
    const next = await kernelWithRedirect.update(
      { snapshot: mounted.snapshot, calls: [{ method: 'go' }] },
      '/wire',
    );
    assert.equal(next.effects?.redirect, '/done');
    assert.equal(next.snapshot.data.effects, undefined);
  });

  it('embeds a child island and keeps its snapshot signed with the parent', async () => {
    const nested = new WireKernel('test-secret', {
      child: {
        create: () => ({ data: { label: 'inner' } }),
        render: (component) => `<em>${component.data.label}</em>`,
      },
      parent: {
        create: () => ({ data: { title: 'outer' } }),
        render: (_component, slots) => `<section>${slots?.panel ?? ''}</section>`,
      },
    });

    const mounted = nested.mount('parent', '/wire', { panel: 'child' });
    assert.match(mounted.html, /<section><div wire:id=/);
    assert.match(mounted.html, /<em>inner<\/em>/);
    const child = mounted.snapshot.children?.panel;
    assert.ok(child);
    assert.equal(child.name, 'child');

    child.data.label = 'tampered';
    await assert.rejects(
      () => nested.update({ snapshot: mounted.snapshot }, '/wire'),
      /Invalid wire snapshot/,
    );
  });
});
