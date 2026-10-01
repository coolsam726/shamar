/**
 * @shamar/wire browser runtime.
 *
 * Additive with Alpine. Existing `x-data` islands keep working. A component
 * opts in with `wire:*` and `$wire`. The server returns HTML and this runtime
 * morphs the current island so focus, cursor, and nested Alpine trees survive.
 *
 * Model timing matches Livewire 3:
 *   wire:model                 deferred until the next action
 *   wire:model.live            send on input
 *   wire:model.blur            send on blur
 *   wire:model.debounce.500ms  send after the delay
 */
(function () {
  const queued = new WeakMap();
  const timers = new WeakMap();
  const generation = new WeakMap();

  function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }

  function rootOf(node) {
    return node && node.closest ? node.closest('[wire\\:id]') : null;
  }

  function snapshotOf(root) {
    const raw = root.getAttribute('wire:snapshot');
    if (!raw) throw new Error('Missing wire snapshot');
    return JSON.parse(raw);
  }

  function attrNamed(el, prefix) {
    return [...el.attributes].find((attr) => attr.name === prefix || attr.name.startsWith(`${prefix}.`));
  }

  function parseArgs(raw) {
    if (!raw.trim()) return [];
    return raw.split(',').map((part) => {
      const token = part.trim();
      if (
        (token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith('"') && token.endsWith('"'))
      ) {
        return token.slice(1, -1);
      }
      if (token === 'true') return true;
      if (token === 'false') return false;
      if (token === 'null') return null;
      if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
      return token;
    });
  }

  function parseCall(expression) {
    const text = String(expression || '').trim();
    const match = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
    if (!match) return { method: text, params: [] };
    return { method: match[1], params: parseArgs(match[2]) };
  }

  function queueUpdate(root, key, value) {
    const bag = queued.get(root) || {};
    bag[key] = value;
    queued.set(root, bag);
  }

  function takeQueued(root, extra) {
    const updates = { ...(queued.get(root) || {}), ...(extra || {}) };
    queued.delete(root);
    return Object.keys(updates).length ? updates : undefined;
  }

  function setLoading(root, on) {
    root.classList.toggle('wire-loading', on);
  }

  function sameElement(from, to) {
    return from.nodeType === 1 && to.nodeType === 1 && from.tagName === to.tagName;
  }

  function morph(from, to, origin, skipIslands = true) {
    if (from.nodeType === 3 && to.nodeType === 3) {
      if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
      return;
    }
    if (!sameElement(from, to)) {
      from.replaceWith(to.cloneNode(true));
      return;
    }
    if (from.hasAttribute('wire:ignore')) return;
    if (skipIslands && from !== origin && from.hasAttribute('wire:id')) return;

    const nextNames = new Set([...to.attributes].map((attr) => attr.name));
    for (const attr of [...from.attributes]) {
      if (!nextNames.has(attr.name)) from.removeAttribute(attr.name);
    }
    for (const attr of [...to.attributes]) {
      if (from.getAttribute(attr.name) !== attr.value) from.setAttribute(attr.name, attr.value);
    }

    if (from instanceof HTMLInputElement || from instanceof HTMLTextAreaElement) {
      const nextValue = 'value' in to ? to.value : '';
      if (document.activeElement !== from && from.value !== nextValue) from.value = nextValue;
    }
    if (from instanceof HTMLSelectElement && to instanceof HTMLSelectElement && document.activeElement !== from) {
      from.value = to.value;
    }
    if (from instanceof HTMLInputElement && to instanceof HTMLInputElement && from.type === 'checkbox') {
      from.checked = to.checked;
    }

    morphChildren(from, to, origin, skipIslands);
  }

  function morphChildren(from, to, origin, skipIslands = true) {
    const current = [...from.childNodes];
    const incoming = [...to.childNodes];
    const used = new Set();
    const keyed = new Map();
    for (const node of current) {
      if (node.nodeType === 1 && node.hasAttribute('wire:key')) {
        keyed.set(node.getAttribute('wire:key'), node);
      }
    }

    const ordered = [];
    for (const target of incoming) {
      let match = null;
      if (target.nodeType === 1 && target.hasAttribute('wire:key')) {
        match = keyed.get(target.getAttribute('wire:key')) || null;
      }
      if (!match) {
        match =
          current.find(
            (node) =>
              !used.has(node) &&
              node.nodeType === target.nodeType &&
              (node.nodeType !== 1 || node.tagName === target.tagName),
          ) || null;
      }
      if (match) {
        used.add(match);
        morph(match, target, origin, skipIslands);
        ordered.push(match);
      } else {
        ordered.push(target.cloneNode(true));
      }
    }
    for (const node of current) {
      if (!used.has(node)) node.remove();
    }
    ordered.forEach((node, index) => {
      if (from.childNodes[index] !== node) from.insertBefore(node, from.childNodes[index] || null);
    });
    if (window.Alpine?.initTree) {
      for (const node of ordered) {
        if (!used.has(node) && node.nodeType === 1 && !node.hasAttribute('wire:persist')) {
          window.Alpine.initTree(node);
        }
      }
    }
  }

  async function commit(root, payload) {
    const endpoint = root.getAttribute('wire:endpoint');
    if (!endpoint) return;
    const gen = (generation.get(root) || 0) + 1;
    generation.set(root, gen);
    setLoading(root, true);
    const timer = timers.get(root);
    if (timer) clearTimeout(timer);
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken(),
        },
        body: JSON.stringify({
          snapshot: snapshotOf(root),
          updates: takeQueued(root, payload.updates),
          calls: payload.calls,
        }),
      });
    } catch {
      if (generation.get(root) === gen) setLoading(root, false);
      return;
    }
    if (generation.get(root) !== gen) return;
    setLoading(root, false);
    if (!res.ok) return;
    const body = await res.json();
    if (body?.effects?.redirect) {
      prefetchCache.clear();
      followRedirect(body.effects.redirect);
      return;
    }
    prefetchCache.clear();
    if (!body || typeof body.html !== 'string') return;
    const template = document.createElement('template');
    template.innerHTML = body.html.trim();
    const next = template.content.firstElementChild;
    if (!next || next.getAttribute('wire:id') !== root.getAttribute('wire:id')) return;
    morph(root, next, root);
  }

  function schedule(root, key, value, delay) {
    queueUpdate(root, key, value);
    const previous = timers.get(root);
    if (previous) clearTimeout(previous);
    timers.set(
      root,
      setTimeout(() => {
        timers.delete(root);
        commit(root, {}).catch(() => {});
      }, delay),
    );
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const binding = attrNamed(target, 'wire:model');
    if (!binding) return;
    const root = rootOf(target);
    if (!root) return;
    const value = 'value' in target ? target.value : '';
    const name = binding.name;
    if (name.includes('.blur')) return;
    if (name.includes('.live')) {
      schedule(root, binding.value, value, 0);
      return;
    }
    const debounce = name.match(/\.debounce\.(\d+)ms/);
    if (debounce) {
      schedule(root, binding.value, value, Number(debounce[1]));
      return;
    }
    queueUpdate(root, binding.value, value);
  });

  document.addEventListener(
    'blur',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const binding = attrNamed(target, 'wire:model');
      if (!binding || !binding.name.includes('.blur')) return;
      const root = rootOf(target);
      if (!root || !('value' in target)) return;
      commit(root, { updates: { [binding.value]: target.value } }).catch(() => {});
    },
    true,
  );

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[wire\\:click]') : null;
    if (!target) return;
    const root = rootOf(target);
    if (!root) return;
    event.preventDefault();
    const call = parseCall(target.getAttribute('wire:click') || '');
    commit(root, { calls: [call] }).catch(() => {});
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const binding = attrNamed(form, 'wire:submit');
    if (!binding) return;
    event.preventDefault();
    const root = rootOf(form);
    if (!root) return;
    commit(root, { calls: [parseCall(binding.value)] }).catch(() => {});
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const host = target.closest('[wire\\:keydown\\.enter], [wire\\:keydown]');
    if (!host) return;
    const enter = host.getAttribute('wire:keydown.enter');
    const any = host.getAttribute('wire:keydown');
    const expression = event.key === 'Enter' ? enter || any : any && !enter ? any : '';
    if (!expression) return;
    if (enter && event.key !== 'Enter') return;
    const root = rootOf(host);
    if (!root) return;
    event.preventDefault();
    commit(root, { calls: [parseCall(expression)] }).catch(() => {});
  });

  const style = document.createElement('style');
  style.textContent =
    '[wire\\:loading]{display:none !important}.wire-loading [wire\\:loading]{display:revert !important}.wire-loading [wire\\:loading\\.remove]{display:none !important}' +
    '.wire-progress{position:fixed;top:0;left:0;height:2px;width:0;opacity:0;z-index:2147483646;pointer-events:none;background:#f59e0b;transition:width .2s ease,opacity .2s ease}' +
    '.wire-progress.is-active{opacity:1}';
  document.head.appendChild(style);

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'file') return;
    const binding = attrNamed(target, 'wire:model');
    if (!binding || !target.files?.[0]) return;
    const root = rootOf(target);
    if (!root) return;
    const endpoint = root.getAttribute('wire:endpoint');
    if (!endpoint) return;
    const body = new FormData();
    body.append('file', target.files[0]);
    fetch(`${endpoint.replace(/\/$/, '')}/upload`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken() },
      body,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((saved) => {
        if (!saved) return;
        return commit(root, { updates: { [binding.value]: saved } });
      })
      .catch(() => {});
  });

  const prefetchCache = new Map();
  const prefetchTimers = new WeakMap();
  const ranScripts = new Set();
  for (const existing of document.scripts) {
    if (existing.src || existing.hasAttribute('data-navigate-once')) {
      ranScripts.add(existing.src || existing.textContent || '');
    }
  }
  let navigationId = 0;
  const PREFETCH_TTL = 30000;

  document.addEventListener('click', (event) => {
    const found = navigateLink(event.target);
    if (!found) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (found.link.hasAttribute('download')) return;
    const target = found.link.getAttribute('target');
    if (target && target !== '_self') return;
    const url = new URL(found.link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    const preserveScroll = found.name.includes('.preserve-scroll');
    if (sameDocument(url)) {
      visitHash(url, true);
      return;
    }
    navigate(url, { push: true, scroll: preserveScroll ? 'preserve' : 'top' }).catch(() => {
      window.location.assign(url);
    });
  });

  document.addEventListener('pointerenter', (event) => {
    schedulePrefetch(event.target);
  }, true);

  document.addEventListener('focusin', (event) => {
    schedulePrefetch(event.target);
  });

  window.addEventListener('popstate', () => {
    const url = new URL(window.location.href);
    const saved = history.state && typeof history.state.wireScroll === 'number' ? history.state.wireScroll : 0;
    navigate(url, { push: false, scroll: 'restore', scrollY: saved }).catch(() => window.location.reload());
  });

  window.Wire = {
    navigate(href) {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        window.location.assign(url);
        return Promise.resolve();
      }
      return navigate(url, { push: true, scroll: 'top' });
    },
    prefetch(href) {
      const url = new URL(href, window.location.href);
      return prefetch(url);
    },
  };

  function navigateLink(node) {
    const link = node instanceof Element ? node.closest('a') : null;
    if (!(link instanceof HTMLAnchorElement)) return null;
    const attr = [...link.attributes].find(
      (item) => item.name === 'wire:navigate' || item.name.startsWith('wire:navigate.'),
    );
    if (!attr) return null;
    return { link, name: attr.name };
  }

  function sameDocument(url) {
    return url.pathname === window.location.pathname && url.search === window.location.search;
  }

  function visitHash(url, push) {
    rememberScroll();
    if (push) history.pushState({ wireScroll: window.scrollY }, '', url);
    const id = decodeURIComponent(url.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
  }

  function rememberScroll() {
    const state = history.state && typeof history.state === 'object' ? history.state : {};
    history.replaceState({ ...state, wireScroll: window.scrollY }, '');
  }

  function schedulePrefetch(node) {
    const found = navigateLink(node);
    if (!found || found.name.includes('.no-prefetch')) return;
    const previous = prefetchTimers.get(found.link);
    if (previous) clearTimeout(previous);
    prefetchTimers.set(
      found.link,
      setTimeout(() => {
        prefetchTimers.delete(found.link);
        const url = new URL(found.link.href, window.location.href);
        if (url.origin !== window.location.origin || sameDocument(url)) return;
        prefetch(url).catch(() => {});
      }, 60),
    );
  }

  function cacheKey(url) {
    return `${url.origin}${url.pathname}${url.search}`;
  }

  function prefetch(url) {
    const key = cacheKey(url);
    const hit = prefetchCache.get(key);
    if (hit && Date.now() - hit.time < PREFETCH_TTL) return hit.promise;
    const promise = fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'text/html',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Wire-Prefetch': '1',
      },
    }).then(async (res) => {
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.includes('text/html')) return null;
      return { html: await res.text(), url: res.url || url.href };
    });
    prefetchCache.set(key, { promise, time: Date.now() });
    return promise;
  }

  function followRedirect(value) {
    let url;
    try {
      url = new URL(value, window.location.href);
    } catch {
      window.location.assign(value);
      return;
    }
    if (url.origin !== window.location.origin) {
      window.location.assign(url);
      return;
    }
    navigate(url, { push: true, scroll: 'top' }).catch(() => window.location.assign(url));
  }

  function startProgress() {
    let bar = document.getElementById('wire-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'wire-progress';
      bar.className = 'wire-progress';
      bar.setAttribute('wire:ignore', '');
      document.documentElement.appendChild(bar);
    }
    bar.style.width = '0%';
    const show = setTimeout(() => {
      bar.classList.add('is-active');
      bar.style.width = '35%';
    }, 80);
    const tick = setInterval(() => {
      const width = Number.parseFloat(bar.style.width) || 0;
      if (width < 90) bar.style.width = `${width + 8}%`;
    }, 200);
    return () => {
      clearTimeout(show);
      clearInterval(tick);
      bar.classList.add('is-active');
      bar.style.width = '100%';
      setTimeout(() => {
        bar.classList.remove('is-active');
        bar.style.width = '0%';
      }, 220);
    };
  }

  function persistKey(el) {
    const named = el.getAttribute('wire:persist');
    if (named) return named;
    if (el.id) return `#${el.id}`;
    return '';
  }

  function liftPersisted(root) {
    const bag = new Map();
    for (const el of [...root.querySelectorAll('[wire\\:persist]')]) {
      const key = persistKey(el);
      if (!key || bag.has(key)) continue;
      const marker = document.createComment(`wire-persist:${key}`);
      el.replaceWith(marker);
      bag.set(key, el);
    }
    return bag;
  }

  function restorePersisted(root, bag) {
    const restored = [];
    for (const el of [...root.querySelectorAll('[wire\\:persist]')]) {
      const key = persistKey(el);
      const saved = bag.get(key);
      if (!saved || saved === el) continue;
      el.replaceWith(saved);
      restored.push(saved);
      bag.delete(key);
    }
    return restored;
  }

  function assetIdentity(node) {
    if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') return `link:${node.href}`;
    if (node instanceof HTMLScriptElement && node.src) return `script:${node.src}`;
    if (node.tagName === 'STYLE') return `style:${node.id || node.textContent}`;
    return '';
  }

  function mergeHead(nextDoc) {
    document.title = nextDoc.title;
    for (const node of [...nextDoc.head.children]) {
      if (node.tagName === 'TITLE') continue;
      if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') {
        if (![...document.querySelectorAll('link[rel="stylesheet"]')].some((link) => link.href === node.href)) {
          document.head.appendChild(node.cloneNode(true));
        }
        continue;
      }
      if (node instanceof HTMLScriptElement && node.src) {
        if (![...document.scripts].some((script) => script.src === node.src)) {
          document.head.appendChild(node.cloneNode(true));
        }
        continue;
      }
      if (node instanceof HTMLScriptElement) {
        reviveScript(node, document.head);
        continue;
      }
      if (node.tagName === 'META') {
        const name = node.getAttribute('name') || node.getAttribute('property');
        if (!name) continue;
        const selector = `meta[name="${CSS.escape(name)}"], meta[property="${CSS.escape(name)}"]`;
        const current = document.head.querySelector(selector);
        const copy = node.cloneNode(true);
        if (current) current.replaceWith(copy);
        else document.head.appendChild(copy);
        continue;
      }
      if (node.tagName === 'STYLE') {
        const key = assetIdentity(node);
        const exists = [...document.head.querySelectorAll('style')].some((styleNode) => assetIdentity(styleNode) === key);
        if (!exists) document.head.appendChild(node.cloneNode(true));
      }
    }
  }

  function reviveScripts(root, restored) {
    for (const script of [...root.querySelectorAll('script')]) {
      if (restored.some((node) => node === script || node.contains(script))) continue;
      reviveScript(script, script.parentNode);
    }
  }

  function reviveScript(script, parent) {
    if (!parent) return;
    const key = script.src || script.textContent || '';
    const once = Boolean(script.src) || script.hasAttribute('data-navigate-once');
    const live = script.isConnected && script.ownerDocument === document;
    if (once && ranScripts.has(key)) {
      if (live) script.remove();
      return;
    }
    ranScripts.add(key);
    const copy = document.createElement('script');
    for (const attr of script.attributes) copy.setAttribute(attr.name, attr.value);
    if (!script.src) copy.textContent = script.textContent;
    if (live) script.replaceWith(copy);
    else parent.appendChild(copy);
  }

  function sharedRoot(nextDoc) {
    const selectors = ['[data-shamar-scroll-root]', '[data-wire-navigate-root]'];
    for (const selector of selectors) {
      const current = document.querySelector(selector);
      const next = nextDoc.querySelector(selector);
      if (current instanceof HTMLElement && next instanceof HTMLElement) return { current, next };
    }
    return null;
  }

  /**
   * Swap chrome that sits outside the scroll morph root (sidebar roots, topbar
   * menu, etc.) so active nav and Alpine menus match the destination page.
   */
  function syncNavigateRegions(nextDoc) {
    const updated = [];
    for (const current of [...document.querySelectorAll('[data-wire-sync]')]) {
      const key = current.getAttribute('data-wire-sync');
      if (!key) continue;
      const next = nextDoc.querySelector(`[data-wire-sync="${CSS.escape(key)}"]`);
      if (!(next instanceof HTMLElement)) continue;
      if (window.Alpine?.destroyTree) {
        try {
          window.Alpine.destroyTree(current);
        } catch {
          /* ignore */
        }
      }
      const clone = next.cloneNode(true);
      current.replaceWith(clone);
      updated.push(clone);
    }
    return updated;
  }

  function reviveAlpine(roots) {
    if (!window.Alpine?.initTree) return;
    for (const root of roots) {
      if (!(root instanceof HTMLElement)) continue;
      try {
        window.Alpine.initTree(root);
      } catch {
        /* ignore */
      }
    }
  }

  function applyScroll(mode, scrollY, url) {
    if (mode === 'preserve') return;
    if (mode === 'restore') {
      window.scrollTo(0, scrollY || 0);
      return;
    }
    const id = decodeURIComponent(url.hash.replace(/^#/, ''));
    if (id) {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
    const root = document.querySelector('[data-shamar-scroll-root], [data-wire-navigate-root]');
    if (root instanceof HTMLElement && root !== document.body) root.scrollTop = 0;
  }

  async function navigate(url, options) {
    const id = ++navigationId;
    const navigating = new CustomEvent('wire:navigating', {
      cancelable: true,
      detail: { url: url.href },
    });
    if (!document.dispatchEvent(navigating)) return;
    const finish = startProgress();
    try {
      const cached = prefetchCache.get(cacheKey(url));
      let html = null;
      let finalUrl = url.href;
      if (cached && Date.now() - cached.time < PREFETCH_TTL) {
        const payload = await cached.promise;
        if (payload) {
          html = payload.html;
          finalUrl = payload.url;
        }
      }
      if (html === null) {
        const res = await fetch(url, {
          credentials: 'same-origin',
          headers: { Accept: 'text/html', 'X-Requested-With': 'XMLHttpRequest' },
        });
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !type.includes('text/html')) {
          window.location.assign(res.url || url);
          return;
        }
        html = await res.text();
        finalUrl = res.url || url.href;
      }
      if (id !== navigationId) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (!doc.body) {
        window.location.assign(finalUrl);
        return;
      }
      if (options.push !== false) {
        rememberScroll();
        history.pushState({ wireScroll: 0 }, '', finalUrl);
      }
      mergeHead(doc);
      const synced = syncNavigateRegions(doc);
      const region = sharedRoot(doc);
      const from = region ? region.current : document.body;
      const to = region ? region.next : doc.body;
      const kept = liftPersisted(from);
      // Drop Alpine on the outgoing region before morph. Morph reuses matching
      // nodes (same tag), so without destroyTree, list selection / open menus
      // from the previous page leak into the next (bulk bar, dropdowns, etc.).
      if (window.Alpine?.destroyTree) {
        try {
          window.Alpine.destroyTree(from);
        } catch {
          /* ignore */
        }
      }
      morph(from, to, from, false);
      const restored = restorePersisted(from, kept);
      const alpineRoots = [...synced, from];
      for (const el of from.querySelectorAll('[wire\\:persist]')) {
        if (!restored.includes(el)) alpineRoots.push(el);
      }
      reviveAlpine(alpineRoots);
      reviveScripts(from, restored);
      applyScroll(options.scroll, options.scrollY, new URL(finalUrl, window.location.href));
      document.dispatchEvent(new CustomEvent('wire:navigated', { detail: { url: window.location.href } }));
    } finally {
      if (id === navigationId) finish();
    }
  }

  document.addEventListener('alpine:init', () => {
    if (!window.Alpine?.magic) return;
    window.Alpine.magic('wire', (el) => {
      const root = rootOf(el);
      if (!root) return {};
      return new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === '$set') {
              return (key, value) => commit(root, { updates: { [key]: value } });
            }
            if (prop === '$call') {
              return (method, ...params) => commit(root, { calls: [{ method, params }] });
            }
            const data = snapshotOf(root).data || {};
            if (Object.prototype.hasOwnProperty.call(data, prop)) return data[prop];
            if (typeof prop !== 'string') return undefined;
            return (...params) => commit(root, { calls: [{ method: prop, params }] });
          },
          set(_target, prop, value) {
            if (typeof prop !== 'string') return false;
            commit(root, { updates: { [prop]: value } }).catch(() => {});
            return true;
          },
        },
      );
    });
  });
})();
