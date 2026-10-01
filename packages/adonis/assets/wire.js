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

  function morph(from, to, origin) {
    if (from.nodeType === 3 && to.nodeType === 3) {
      if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
      return;
    }
    if (!sameElement(from, to)) {
      from.replaceWith(to.cloneNode(true));
      return;
    }
    if (from.hasAttribute('wire:ignore')) return;
    if (from !== origin && from.hasAttribute('wire:id')) return;

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

    morphChildren(from, to, origin);
  }

  function morphChildren(from, to, origin) {
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
        morph(match, target, origin);
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
        if (!used.has(node) && node.nodeType === 1) window.Alpine.initTree(node);
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
      window.location.assign(body.effects.redirect);
      return;
    }
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
    '[wire\\:loading]{display:none !important}.wire-loading [wire\\:loading]{display:revert !important}.wire-loading [wire\\:loading\\.remove]{display:none !important}';
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

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[wire\\:navigate]') : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(url).catch(() => window.location.assign(url));
  });

  window.addEventListener('popstate', () => {
    navigate(new URL(window.location.href), false).catch(() => window.location.reload());
  });

  async function navigate(url, push = true) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html', 'X-Requested-With': 'XMLHttpRequest' },
    });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('text/html')) {
      window.location.assign(url);
      return;
    }
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const next = doc.querySelector('[data-shamar-scroll-root]');
    const current = document.querySelector('[data-shamar-scroll-root]');
    if (!(next instanceof HTMLElement) || !(current instanceof HTMLElement)) {
      window.location.assign(url);
      return;
    }
    morph(current, next, current);
    document.title = doc.title;
    if (push) history.pushState({}, '', url);
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
