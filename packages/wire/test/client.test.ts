import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { WireKernel, wireClientPath, type WireComponent, type WireRequest } from '../src/index.js';

class Counter implements WireComponent {
  data = { count: 0 };

  increment(): void {
    this.data.count = Number(this.data.count) + 1;
  }
}

describe('wire client and a host without a panel', () => {
  it('ships wire.js next to the package', () => {
    const source = readFileSync(wireClientPath(), 'utf8');
    assert.match(source, /wire:model/);
    assert.match(source, /Alpine\.magic\('wire'/);
    assert.match(source, /window\.Wire = \{/);
    assert.match(source, /wire:persist/);
    assert.match(source, /wire-progress/);
  });

  it('serves an island and increments it over HTTP', async () => {
    const kernel = new WireKernel('docs-secret', {
      counter: {
        create: () => new Counter(),
        render: (component) =>
          `<button type="button" wire:click="increment">${component.data.count}</button>`,
      },
    });
    const endpoint = '/wire';
    const server = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/') {
        const island = kernel.mount('counter', endpoint);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html><meta name="csrf-token" content="t"><script src="/wire.js"></script>${island.html}`);
        return;
      }
      if (req.method === 'GET' && req.url === '/wire.js') {
        res.writeHead(200, { 'content-type': 'application/javascript' });
        res.end(readFileSync(wireClientPath()));
        return;
      }
      if (req.method === 'POST' && req.url === '/wire') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const body = JSON.parse(Buffer.concat(chunks).toString()) as WireRequest;
        const result = await kernel.update(body, endpoint);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const page = await fetch(`${base}/`);
      const html = await page.text();
      assert.match(html, /wire:endpoint="\/wire"/);
      assert.match(html, />0</);
      const snapshot = JSON.parse(
        html.match(/wire:snapshot="([^"]+)"/)?.[1]?.replaceAll('&quot;', '"') ?? '',
      );
      const updated = await fetch(`${base}/wire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ snapshot, calls: [{ method: 'increment' }] }),
      });
      const body = (await updated.json()) as { html: string; snapshot: { data: { count: number } } };
      assert.equal(updated.status, 200);
      assert.match(body.html, />1</);
      assert.equal(body.snapshot.data.count, 1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
