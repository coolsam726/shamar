import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { JSDOM } from 'jsdom';
import { wireClientPath } from '@shamar/wire';

const source = readFileSync(wireClientPath(), 'utf8');

function documentOf(title: string, body: string, head = ''): string {
  return `<!doctype html><html><head><title>${title}</title>${head}</head><body>${body}</body></html>`;
}

function htmlResponse(html: string): Response {
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function boot(html: string) {
  const dom = new JSDOM(html, { url: 'http://app.test/one', runScripts: 'dangerously' });
  const { window } = dom;
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.CSS = window.CSS || { escape: (value: string) => value };
  window.eval(source);
  return window;
}

function click(window: JSDOM['window'], element: Element) {
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
}

function navigated(window: JSDOM['window']): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('navigation timed out')), 1000);
    window.document.addEventListener(
      'wire:navigated',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

describe('wire:navigate', () => {
  it('prefetches, swaps the body, and keeps wire:persist nodes', async () => {
    const window = boot(
      documentOf('One', '<div wire:persist="player">old</div><p id="page">one</p><a id="go" href="/two" wire:navigate>Two</a>'),
    );
    let calls = 0;
    window.fetch = async () => {
      calls += 1;
      return htmlResponse(
        documentOf(
          'Two',
          '<div wire:persist="player">new</div><p id="page">two</p><script data-navigate-once>window.__once=(window.__once||0)+1</script>',
          '<link rel="stylesheet" href="/app.css">',
        ),
      );
    };
    const link = window.document.getElementById('go');
    assert.ok(link);
    link.dispatchEvent(new window.MouseEvent('pointerenter', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(calls, 1);
    const done = navigated(window);
    click(window, link);
    await done;
    assert.equal(calls, 1);
    assert.equal(window.document.title, 'Two');
    assert.equal(window.document.querySelector('#page')?.textContent, 'two');
    assert.equal(window.document.querySelector('[wire\\:persist="player"]')?.textContent, 'old');
    assert.equal(window.__once, 1);
    assert.ok(window.document.querySelector('link[rel="stylesheet"]'));

    window.fetch = async () => {
      calls += 1;
      return htmlResponse(
        documentOf(
          'Three',
          '<div wire:persist="player">newer</div><p id="page">three</p><script data-navigate-once>window.__once=(window.__once||0)+1</script>',
        ),
      );
    };
    const again = navigated(window);
    await window.Wire.navigate('/three');
    await again;
    assert.equal(window.document.querySelector('#page')?.textContent, 'three');
    assert.equal(window.__once, 1);
  });

  it('morphs only the shared scroll region and syncs data-wire-sync chrome', async () => {
    const window = boot(
      documentOf(
        'One',
        '<aside><nav data-wire-sync="sidebar-roots"><a class="nav-item nav-active" href="/one">One</a></nav></aside><main data-shamar-scroll-root><p id="page">one</p></main><a id="go" href="/two" wire:navigate.no-prefetch>Two</a>',
      ),
    );
    window.fetch = async () =>
      htmlResponse(
        documentOf(
          'Two',
          '<aside><nav data-wire-sync="sidebar-roots"><a class="nav-item nav-active" href="/two">Two</a></nav></aside><main data-shamar-scroll-root><p id="page">two</p></main>',
        ),
      );
    const link = window.document.getElementById('go');
    assert.ok(link);
    link.dispatchEvent(new window.MouseEvent('pointerenter', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    const done = navigated(window);
    click(window, link);
    await done;
    assert.equal(window.document.querySelector('#page')?.textContent, 'two');
    assert.equal(window.document.querySelector('[data-wire-sync="sidebar-roots"] a')?.textContent, 'Two');
    assert.equal(window.document.querySelector('[data-wire-sync="sidebar-roots"] a')?.getAttribute('href'), '/two');
  });

  it('destroys Alpine on the scroll region before morphing so UI state does not leak', async () => {
    const window = boot(
      documentOf(
        'One',
        '<main data-shamar-scroll-root><div id="page" x-data="{ open: true }">one</div></main><a id="go" href="/two" wire:navigate.no-prefetch>Two</a>',
      ),
    );
    const destroyed = [];
    window.Alpine = {
      destroyTree(el) {
        destroyed.push(el);
      },
      initTree() {},
    };
    window.fetch = async () =>
      htmlResponse(documentOf('Two', '<main data-shamar-scroll-root><div id="page">two</div></main>'));
    const done = navigated(window);
    click(window, window.document.getElementById('go'));
    await done;
    assert.equal(destroyed.length, 1);
    assert.equal(destroyed[0]?.getAttribute?.('data-shamar-scroll-root') != null, true);
    assert.equal(window.document.querySelector('#page')?.textContent, 'two');
  });

  it('shows the progress bar when the request is slow', async () => {
    const window = boot(documentOf('One', '<a id="go" href="/slow" wire:navigate.no-prefetch>Slow</a>'));
    let release: (response: Response) => void = () => {};
    window.fetch = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const pending = window.Wire.navigate('/slow');
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.ok(window.document.querySelector('.wire-progress.is-active'));
    release(htmlResponse(documentOf('Slow', '<p id="page">slow</p>')));
    await pending;
    assert.equal(window.document.title, 'Slow');
  });

  it('follows a same-origin wire redirect as a navigation', async () => {
    const window = boot(
      documentOf(
        'One',
        '<div wire:id="a" wire:snapshot="{&quot;id&quot;:&quot;a&quot;,&quot;name&quot;:&quot;counter&quot;,&quot;data&quot;:{}}" wire:endpoint="/wire"><button id="go" type="button" wire:click="save">Save</button></div>',
      ),
    );
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ effects: { redirect: '/two' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return htmlResponse(documentOf('Two', '<p id="page">two</p>'));
    };
    const button = window.document.getElementById('go');
    assert.ok(button);
    const done = navigated(window);
    click(window, button);
    await done;
    assert.equal(window.document.title, 'Two');
    assert.equal(window.document.querySelector('#page')?.textContent, 'two');
  });

  it('lets wire:navigating cancel the visit', async () => {
    const window = boot(documentOf('One', '<p id="page">one</p>'));
    let calls = 0;
    window.fetch = async () => {
      calls += 1;
      return htmlResponse(documentOf('Two', '<p>two</p>'));
    };
    window.document.addEventListener('wire:navigating', (event) => event.preventDefault());
    await window.Wire.navigate('/two');
    assert.equal(calls, 0);
    assert.equal(window.document.title, 'One');
  });
});
