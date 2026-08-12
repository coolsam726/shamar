(function () {
  const FLASH_MESSAGES = {
    created: { type: 'success', title: 'Created', message: 'The record was saved successfully.' },
    updated: { type: 'success', title: 'Updated', message: 'Your changes have been saved.' },
    deleted: { type: 'success', title: 'Deleted', message: 'The record was removed.' },
    restored: { type: 'success', title: 'Restored', message: 'The record was restored.' },
  };

  const TOAST_ICONS = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z"/></svg>',
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  }

  function csrfHeaders(extra) {
    const headers = { ...(extra || {}) };
    const token = csrfToken();
    if (token) headers['X-CSRF-Token'] = token;
    return headers;
  }

  /**
   * Fixed-position styles so dropdowns escape overflow:hidden / overflow:auto
   * ancestors (form cards, tabs, table scroll roots).
   */
  function fixedDropdownStyle(anchorEl, panelEl, opts = {}) {
    if (!anchorEl) return {};
    const rect = anchorEl.getBoundingClientRect();
    const gap = opts.gap ?? 4;
    const pad = opts.pad ?? 8;
    const maxHeight = opts.maxHeight ?? 256;
    const width = Math.max(opts.width ?? rect.width, 0);
    const measured = panelEl?.offsetHeight || 0;
    const panelHeight = measured > 0 ? Math.min(measured, maxHeight) : maxHeight;

    let top = rect.bottom + gap;
    if (top + panelHeight > window.innerHeight - pad) {
      const above = rect.top - panelHeight - gap;
      if (above >= pad) top = above;
    }

    let left = rect.left;
    if (opts.align === 'end') {
      left = rect.right - width;
    }
    left = Math.min(Math.max(pad, left), Math.max(pad, window.innerWidth - width - pad));

    return {
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${Math.round(width)}px`,
      right: 'auto',
      maxHeight: `${maxHeight}px`,
      zIndex: String(opts.zIndex ?? 1100),
    };
  }

  function bindFixedDropdownListeners(component) {
    component._onFixedDropdownReposition = () => {
      if (component.open) component.repositionDropdown?.();
    };
    window.addEventListener('scroll', component._onFixedDropdownReposition, true);
    window.addEventListener('resize', component._onFixedDropdownReposition);
  }

  function unbindFixedDropdownListeners(component) {
    if (!component._onFixedDropdownReposition) return;
    window.removeEventListener('scroll', component._onFixedDropdownReposition, true);
    window.removeEventListener('resize', component._onFixedDropdownReposition);
    component._onFixedDropdownReposition = null;
  }

  function normalizeToast(typeOrOptions, messageOrDuration, durationMs) {
    if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
      const options = typeOrOptions;
      return {
        type: options.type || 'success',
        title: options.title || defaultTitleForType(options.type || 'success'),
        message: options.message ?? options.body ?? '',
        durationMs: options.durationMs ?? 4200,
      };
    }

    const type = typeOrOptions || 'success';
    let title = defaultTitleForType(type);
    let message = '';
    let duration = durationMs ?? 4200;

    if (typeof messageOrDuration === 'object' && messageOrDuration !== null) {
      title = messageOrDuration.title || title;
      message = messageOrDuration.message ?? messageOrDuration.body ?? '';
      duration = messageOrDuration.durationMs ?? duration;
    } else if (typeof messageOrDuration === 'number') {
      duration = messageOrDuration;
    } else if (typeof messageOrDuration === 'string') {
      message = messageOrDuration;
    }

    return { type, title, message, durationMs: duration };
  }

  function defaultTitleForType(type) {
    switch (type) {
      case 'error':
        return 'Something went wrong';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Notice';
      default:
        return 'Success';
    }
  }

  function resolveFlashMessage(value, type) {
    const preset = FLASH_MESSAGES[value];
    if (preset) return preset;

    const decoded = decodeURIComponent(value);
    if (type === 'error') {
      return {
        type: 'error',
        title: 'Something went wrong',
        message: decoded,
      };
    }
    return {
      type: 'success',
      title: 'Success',
      message: decoded,
    };
  }

  function showToast(typeOrOptions, messageOrDuration, durationMs) {
    const stack = document.getElementById('shamar-toast-stack');
    if (!stack) return;

    const toastData = normalizeToast(typeOrOptions, messageOrDuration, durationMs);
    const type = toastData.type;
    const title = toastData.title || defaultTitleForType(type);
    const message = toastData.message || '';
    const icon = TOAST_ICONS[type] || TOAST_ICONS.info;

    const toast = document.createElement('div');
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.className = `shamar-toast shamar-toast--${type}`;

    const bodyMarkup = message
      ? `<p class="shamar-toast__body">${escapeHtml(message)}</p>`
      : '';

    toast.innerHTML = `
      <div class="shamar-toast__icon">${icon}</div>
      <div class="shamar-toast__content">
        <p class="shamar-toast__title">${escapeHtml(title)}</p>
        ${bodyMarkup}
      </div>
      <button type="button" class="shamar-toast__dismiss" aria-label="Dismiss">×</button>
    `;

    const dismiss = () => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 200);
    };

    toast.querySelector('.shamar-toast__dismiss')?.addEventListener('click', dismiss);
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(dismiss, toastData.durationMs ?? 4200);
  }

  /**
   * One-time secret reveal (API keys / PATs). Blocks redirect until the user confirms.
   */
  function revealOneTimeSecret({ secret, title, message, confirmLabel, onConfirm }) {
    const value = String(secret ?? '').trim();
    if (!value) {
      if (typeof onConfirm === 'function') onConfirm();
      return;
    }
    window.dispatchEvent(
      new CustomEvent('shamar-open-confirm', {
        detail: {
          mode: 'secret',
          variant: 'warning',
          title: title || 'Copy your secret',
          message:
            message ||
            'This value will only be shown once. Copy it now and store it somewhere safe.',
          secret: value,
          confirmLabel: confirmLabel || "I've copied it",
          onConfirm: typeof onConfirm === 'function' ? onConfirm : null,
        },
      }),
    );
  }

  function clearFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.shamar-field__error').forEach((el) => el.remove());
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  }

  function findFieldHost(form, name) {
    if (!form || !name) return null;
    const byData = form.querySelector(`[data-field-name="${CSS.escape(name)}"]`);
    if (byData) return byData;

    const input =
      form.querySelector(`[name="${CSS.escape(name)}"]`) ||
      form.querySelector(`[name="${CSS.escape(name)}[]"]`) ||
      form.querySelector(`#field-${CSS.escape(name)}`);
    if (input) return input.closest('.shamar-field') || input.parentElement;

    for (const el of form.querySelectorAll(
      '[data-shamar-m2o-config], [data-shamar-m2m-config]',
    )) {
      try {
        const raw =
          el.getAttribute('data-shamar-m2o-config') ||
          el.getAttribute('data-shamar-m2m-config') ||
          '{}';
        const cfg = JSON.parse(raw);
        if (cfg?.name === name) return el.closest('.shamar-field') || el;
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  /** Apply server validation errors onto form fields. Returns message list. */
  function applyFieldErrors(form, errors) {
    clearFieldErrors(form);
    if (!form || !errors || typeof errors !== 'object') return [];
    const messages = [];
    let firstHost = null;
    for (const [name, message] of Object.entries(errors)) {
      const text = String(message ?? '').trim();
      if (!text) continue;
      messages.push(text);
      const host = findFieldHost(form, name);
      if (!host) continue;
      if (!firstHost) firstHost = host;
      host.classList.add('is-invalid');
      const control =
        host.querySelector(
          '.shamar-input, .shamar-select, .shamar-combobox, .shamar-m2m-checkboxes, [data-shamar-m2o-config], [data-shamar-m2m-config]',
        ) || host;
      control.classList.add('is-invalid');
      const p = document.createElement('p');
      p.className = 'shamar-field__error';
      p.setAttribute('role', 'alert');
      p.setAttribute('data-shamar-field-error', name);
      p.textContent = text;
      host.appendChild(p);
    }
    if (firstHost?.scrollIntoView) {
      firstHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return messages;
  }

  function validationToastMessage(messages, fallbackMessage) {
    if (messages?.length === 1) return messages[0];
    if (messages?.length > 1) return `${messages[0]} (+${messages.length - 1} more)`;
    if (fallbackMessage) return String(fallbackMessage);
    return 'Could not save your changes — fix any errors and try again.';
  }

  function listViewKey(slug) {
    return `shamar-list-view:${slug}`;
  }

  function getStoredListView(slug) {
    const stored = localStorage.getItem(listViewKey(slug));
    return stored === 'kanban' ? 'kanban' : 'table';
  }

  function setStoredListView(slug, view) {
    localStorage.setItem(listViewKey(slug), view);
  }

  function listPath(basePath, slug, view) {
    return view === 'kanban' ? `${basePath}/${slug}/kanban` : `${basePath}/${slug}`;
  }

  function resourceSlugFromUrl(basePath, pathname) {
    const baseSegments = basePath.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length <= baseSegments.length) return '';
    return pathSegments[baseSegments.length] ?? '';
  }

  function clearFlashQueryParams() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('success') && !params.has('error')) return;

    params.delete('success');
    params.delete('error');
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
  }

  function consumeQueryFlash() {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    if (!success && !error) return false;

    const flash = resolveFlashMessage(success || error || '', success ? 'success' : 'error');
    showToast(flash);
    clearFlashQueryParams();
    return true;
  }

  function getScrollRoot() {
    return document.querySelector('[data-shamar-scroll-root]');
  }

  function saveScrollPosition() {
    const root = getScrollRoot();
    if (!root) return;
    try {
      sessionStorage.setItem('shamar-scroll-top', String(root.scrollTop));
    } catch {
      /* private mode / quota */
    }
  }

  function restoreScrollPosition() {
    let raw = null;
    try {
      raw = sessionStorage.getItem('shamar-scroll-top');
      sessionStorage.removeItem('shamar-scroll-top');
    } catch {
      return;
    }
    if (raw == null) return;
    const top = Number(raw);
    if (!Number.isFinite(top)) return;
    const apply = () => {
      const root = getScrollRoot();
      if (root) root.scrollTop = top;
    };
    apply();
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
  }

  function reloadParentView({ success, error } = {}) {
    saveScrollPosition();
    const url = new URL(window.location.href);
    url.searchParams.delete('success');
    url.searchParams.delete('error');
    if (success) url.searchParams.set('success', success);
    else if (error) url.searchParams.set('error', error);
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  }

  function consumeInitialFlash() {
    const flash = document.getElementById('shamar-initial-flash');
    if (!flash) return false;

    try {
      const data = JSON.parse(flash.textContent || 'null');
      if (data?.title || data?.message) {
        showToast(data);
      }
    } catch {
      /* ignore */
    }
    flash.remove();
    clearFlashQueryParams();
    return true;
  }

  function maybeRedirectToStoredListView() {
    const root = document.querySelector('[data-shamar-list-root]');
    if (!root) return;

    const slug = root.dataset.shamarListRoot;
    const basePath = root.dataset.shamarBasePath;
    const currentView = root.dataset.shamarCurrentView;
    const hasKanban = root.dataset.shamarHasKanban === 'true';
    if (!slug || !basePath || !hasKanban) return;

    const preferred = getStoredListView(slug);
    if (preferred === currentView) return;

    const params = window.location.search;
    window.location.replace(listPath(basePath, slug, preferred) + params);
  }

  function applyListHrefs() {
    const basePath = document.body.dataset.shamarBasePath;
    if (!basePath) return;

    document.querySelectorAll('[data-shamar-list-href]').forEach((el) => {
      const slug = el.getAttribute('data-shamar-list-href');
      if (!slug || !(el instanceof HTMLAnchorElement)) return;
      el.href = listPath(basePath, slug, getStoredListView(slug));
    });
  }

  function bindListViewSwitcher() {
    document.querySelectorAll('[data-shamar-list-view]').forEach((el) => {
      el.addEventListener('click', () => {
        const slug = el.getAttribute('data-shamar-list-view-slug');
        const view = el.getAttribute('data-shamar-list-view');
        if (slug && view) setStoredListView(slug, view);
      });
    });
  }

  /** Auto-refresh interval while the list refresh control is armed. */
  const AUTO_REFRESH_MS = 10 * 1000; // 10 seconds
  const AUTO_REFRESH_CLICK_MS = 300;
  let _listAutoRefreshTimer = null;
  let _listRefreshClickTimer = null;
  let _listRefreshLastClick = 0;
  let _listRefreshBusy = false;

  function listAutoRefreshKey(slug) {
    return `shamar-list-autorefresh:${slug}`;
  }

  function isListAutoRefreshEnabled(slug) {
    return sessionStorage.getItem(listAutoRefreshKey(slug)) === '1';
  }

  function setListAutoRefreshEnabled(slug, enabled) {
    if (enabled) {
      sessionStorage.setItem(listAutoRefreshKey(slug), '1');
    } else {
      sessionStorage.removeItem(listAutoRefreshKey(slug));
    }
  }

  function setListRefreshBusy(button, busy) {
    _listRefreshBusy = busy;
    const target = button || document.querySelector('[data-shamar-list-refresh]');
    if (!target) return;
    target.disabled = busy;
    target.setAttribute('aria-busy', busy ? 'true' : 'false');
    target.classList.toggle('is-busy', busy);
  }

  function refreshListPage(button) {
    if (_listRefreshBusy) return false;
    setListRefreshBusy(button, true);
    window.location.reload();
    return true;
  }

  function stopListAutoRefresh() {
    if (_listAutoRefreshTimer) {
      clearInterval(_listAutoRefreshTimer);
      _listAutoRefreshTimer = null;
    }
  }

  function startListAutoRefresh(button) {
    stopListAutoRefresh();
    _listAutoRefreshTimer = window.setInterval(() => {
      refreshListPage(button);
    }, AUTO_REFRESH_MS);
  }

  function syncListRefreshButton(button, enabled) {
    if (!button) return;
    button.classList.toggle('is-auto', enabled);
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.title = enabled
      ? 'Auto-refresh on (every 10s) — click to turn off'
      : 'Refresh (double-click for auto-refresh every 10s)';
  }

  /** Legacy FileUpload helpers — superseded by File Manager / FilePicker. */
  function bindMediaUploads() {
    // no-op: media library uses shamarMediaManager + multipart /media/upload
  }

  function bindListRefresh() {
    const root = document.querySelector('[data-shamar-list-root]');
    const button = document.querySelector('[data-shamar-list-refresh]');
    if (!root || !button) return;

    const slug = root.dataset.shamarListRoot;
    if (!slug) return;

    setListRefreshBusy(button, false);

    const enabled = isListAutoRefreshEnabled(slug);
    syncListRefreshButton(button, enabled);
    if (enabled) {
      startListAutoRefresh(button);
    }

    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (_listRefreshBusy || button.disabled) return;

      const now = Date.now();
      const isDoubleClick = now - _listRefreshLastClick < AUTO_REFRESH_CLICK_MS;
      _listRefreshLastClick = now;

      if (_listRefreshClickTimer) {
        clearTimeout(_listRefreshClickTimer);
        _listRefreshClickTimer = null;
      }

      if (isDoubleClick) {
        const next = !isListAutoRefreshEnabled(slug);
        setListAutoRefreshEnabled(slug, next);
        syncListRefreshButton(button, next);
        if (next) {
          startListAutoRefresh(button);
          showToast('info', {
            title: 'Auto-refresh on',
            message: 'This list will refresh every 10 seconds.',
          });
        } else {
          stopListAutoRefresh();
          showToast('info', {
            title: 'Auto-refresh off',
            message: 'Automatic refresh has been stopped.',
          });
        }
        return;
      }

      _listRefreshClickTimer = window.setTimeout(() => {
        _listRefreshClickTimer = null;
        if (_listRefreshBusy || button.disabled) return;
        if (isListAutoRefreshEnabled(slug)) {
          setListAutoRefreshEnabled(slug, false);
          stopListAutoRefresh();
          syncListRefreshButton(button, false);
          showToast('info', {
            title: 'Auto-refresh off',
            message: 'Automatic refresh has been stopped.',
          });
          return;
        }
        refreshListPage(button);
      }, AUTO_REFRESH_CLICK_MS);
    });
  }

  window.ShamarUI = {
    showToast,
    applyFieldErrors,
    clearFieldErrors,
    getStoredListView,
    setStoredListView,
    listPath,
    resolveFlashMessage,
    openDialog(detail) {
      _dialogOnResult = typeof detail.onResult === 'function' ? detail.onResult : null;
      window.dispatchEvent(new CustomEvent('shamar-open-dialog', { detail }));
    },
    openConfirm(detail) {
      window.dispatchEvent(new CustomEvent('shamar-open-confirm', { detail }));
    },
    readImportFile(event) {
      const input = event?.target;
      const file = input?.files?.[0];
      if (!file) return;
      const form = input.closest('form');
      const textarea = form?.querySelector('textarea[name="csv"]');
      if (!textarea) return;
      const reader = new FileReader();
      reader.onload = () => {
        textarea.value = String(reader.result || '');
      };
      reader.readAsText(file);
    },
  };

  let _dialogOnResult = null;
  let _pendingRelationPick = null;

  function applyPendingRelationPick() {
    if (!_pendingRelationPick) return;
    const detail = _pendingRelationPick;
    _pendingRelationPick = null;
    const eventName = detail.mode === 'm2m' ? 'shamar-m2m-pick' : 'shamar-m2o-pick';
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  function withEmbed(url) {
    const next = new URL(url, window.location.origin);
    next.searchParams.set('embed', '1');
    return `${next.pathname}${next.search}`;
  }

  function withoutEmbed(url) {
    const next = new URL(url, window.location.origin);
    next.searchParams.delete('embed');
    const query = next.searchParams.toString();
    return `${next.pathname}${query ? `?${query}` : ''}`;
  }

  function parseAdminRecordPath(pathname) {
    const basePath = document.body.dataset.shamarBasePath || '';
    const baseSegments = basePath.split('/').filter(Boolean);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length < baseSegments.length + 2) return null;
    for (let index = 0; index < baseSegments.length; index += 1) {
      if (segments[index] !== baseSegments[index]) return null;
    }
    const slug = segments[baseSegments.length];
    const id = segments[baseSegments.length + 1];
    if (!slug || !id) return null;
    if (['create', 'edit', 'relation-search', 'relation-quick-create', 'kanban'].includes(id)) {
      return null;
    }
    if (id === 'summary') return null;
    return { slug, id };
  }

  function flashFromRedirect(success, error) {
    if (success) return resolveFlashMessage(success, 'success');
    if (error) {
      return {
        type: 'error',
        title: 'Something went wrong',
        message: decodeURIComponent(error),
      };
    }
    return null;
  }

  document.addEventListener('alpine:init', () => {
    registerShamarAlpineComponents();
  });

  if (window.Alpine) {
    registerShamarAlpineComponents();
  }

  function readM2oConfig(el) {
    const raw = el?.getAttribute?.('data-shamar-m2o-config');
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function readM2mConfig(el) {
    const raw = el?.getAttribute?.('data-shamar-m2m-config');
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function createShamarM2o(cfg) {
    return {
      name: cfg.name,
      relatedResource: cfg.relatedResource,
      singularLabel: cfg.singularLabel || 'Record',
      searchUrl: cfg.searchUrl,
      quickCreateUrl: cfg.quickCreateUrl,
      createUrl: cfg.createUrl,
      detailUrlBase: cfg.detailUrlBase,
      readonly: !!cfg.readonly,
      required: !!cfg.required,

      value: cfg.initialId != null && cfg.initialId !== '' ? String(cfg.initialId) : null,
      label: cfg.initialLabel || '',
      query: '',
      results: [],
      cursor: 0,
      open: false,
      loading: false,
      _abort: null,
      _initialFetched: false,
      dropdownStyle: {},

      init() {
        this.query = this.label;
        this.$nextTick?.(() => this.syncHiddenInput());
        this._pickHandler = (event) => {
          const detail = event.detail || {};
          if (detail.field === this.name) {
            this.pick({ id: detail.id, label: detail.label });
          }
        };
        window.addEventListener('shamar-m2o-pick', this._pickHandler);
        bindFixedDropdownListeners(this);
      },

      destroy() {
        if (this._pickHandler) {
          window.removeEventListener('shamar-m2o-pick', this._pickHandler);
        }
        unbindFixedDropdownListeners(this);
      },

      repositionDropdown() {
        this.dropdownStyle = fixedDropdownStyle(this.$el, this.$refs.dropdown, {
          maxHeight: 288,
          zIndex: 1100,
        });
      },

      get exactMatch() {
        const q = this.query.trim().toLowerCase();
        if (!q) return null;
        return this.results.find((item) => item.label.toLowerCase() === q) || null;
      },

      get createCandidate() {
        if (this.readonly || !this.quickCreateUrl) return false;
        const q = this.query.trim();
        return q.length > 0 && !this.exactMatch;
      },

      get canCreateAndEdit() {
        return !this.readonly && !!this.createUrl;
      },

      async fetchResults() {
        if (this._abort) this._abort.abort();
        const ctl = new AbortController();
        this._abort = ctl;
        this.loading = true;
        try {
          const url = `${this.searchUrl}&q=${encodeURIComponent(this.query)}`;
          const response = await fetch(url, { signal: ctl.signal });
          if (!response.ok) throw new Error('fetch failed');
          const data = await response.json();
          this.results = data.results || [];
          this.cursor = 0;
        } catch (error) {
          if (error.name !== 'AbortError') {
            this.results = [];
          }
        } finally {
          this.loading = false;
          if (this.open) this.$nextTick(() => this.repositionDropdown());
        }
      },

      onFocus() {
        this.open = true;
        this.$nextTick(() => this.repositionDropdown());
        if (!this._initialFetched) {
          this._initialFetched = true;
          this.fetchResults();
        }
      },

      onInput() {
        this.open = true;
        if (this.query !== this.label) {
          this.value = null;
          this.label = '';
        }
        this.fetchResults();
        this.$nextTick(() => this.repositionDropdown());
      },

      close() {
        this.open = false;
        this.dropdownStyle = {};
        this.query = this.label;
      },

      onFocusOut(event) {
        const next = event.relatedTarget;
        if (next && this.$el.contains(next)) return;
        // Defer past the option mousedown/click so pick() can run first.
        setTimeout(() => {
          if (!this.open) return;
          if (this.$el.contains(document.activeElement)) return;
          this.close();
        }, 0);
      },

      moveCursor(delta) {
        if (!this.open) {
          this.open = true;
          this.$nextTick(() => this.repositionDropdown());
          return;
        }
        const extra = this.createCandidate ? 1 : 0;
        const max = this.results.length + extra - 1;
        if (max < 0) return;
        this.cursor = Math.max(0, Math.min(max, this.cursor + delta));
      },

      onEnter() {
        if (!this.open) return;
        if (this.cursor < this.results.length) {
          this.pick(this.results[this.cursor]);
        } else if (this.createCandidate) {
          this.createFromQuery();
        }
      },

      pick(item) {
        if (!item || item.id == null) return;
        this.value = String(item.id);
        this.label = item.label || this.value;
        this.query = this.label;
        this.open = false;
        this.dropdownStyle = {};
        this.syncHiddenInput();
        notifyRelationFieldChange(this.$el, this.name);
      },

      syncHiddenInput() {
        const hidden = this.$el.querySelector(`input[type="hidden"][name="${this.name}"]`);
        if (hidden instanceof HTMLInputElement) {
          hidden.value = this.value != null && this.value !== '' ? String(this.value) : '';
        }
      },

      clearSelection() {
        this.value = null;
        this.label = '';
        this.query = '';
        this.cursor = 0;
        this.open = false;
        this.dropdownStyle = {};
        this.syncHiddenInput();
        this.$refs.input?.focus();
        notifyRelationFieldChange(this.$el, this.name);
      },

      openRecord() {
        if (!this.value || !this.detailUrlBase) return;
        const url = this.readonly
          ? `${this.detailUrlBase}/${this.value}`
          : `${this.detailUrlBase}/${this.value}/edit`;
        window.ShamarUI.openDialog({
          url,
          title: this.label || (this.readonly ? 'View record' : 'Edit record'),
          slug: this.relatedResource,
        });
      },

      async createFromQuery() {
        const name = this.query.trim();
        if (!name) return;
        try {
          const response = await fetch(this.quickCreateUrl, {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              field: this.name,
              name,
              parentId: this.parentId,
            }),
          });
          if (response.status === 400) {
            if (this.canCreateAndEdit) {
              this.createAndEdit();
              return;
            }
            const body = await response.json().catch(() => ({}));
            showToast('error', {
              title: 'Create blocked',
              message: body.message || body.detail || 'Cannot create this record inline.',
            });
            return;
          }
          if (!response.ok) throw new Error('create failed');
          const item = await response.json();
          this.results = [item, ...this.results.filter((entry) => String(entry.id) !== String(item.id))];
          this.pick(item);
        } catch {
          showToast('error', {
            title: 'Error',
            message: 'Unable to create record.',
          });
        }
      },

      createAndEdit() {
        if (!this.createUrl) return;
        this.open = false;
        this.dropdownStyle = {};
        const q = (this.query || '').trim();
        const url = q
          ? `${this.createUrl}?name=${encodeURIComponent(q)}`
          : this.createUrl;
        const title = q ? `New ${this.singularLabel}` : `Create ${this.singularLabel}`;
        window.ShamarUI.openDialog({
          url,
          title,
          slug: this.relatedResource,
          onResult: (result) => {
            if (result?.id) {
              _pendingRelationPick = {
                mode: 'm2o',
                field: this.name,
                id: result.id,
                label: result.label,
              };
            }
          },
        });
      },
    };
  }

  function createShamarM2m(cfg) {
    return {
      name: cfg.name,
      relatedResource: cfg.relatedResource,
      singularLabel: cfg.singularLabel || 'Record',
      searchUrl: cfg.searchUrl,
      quickCreateUrl: cfg.quickCreateUrl,
      createUrl: cfg.createUrl,
      detailUrlBase: cfg.detailUrlBase,
      attachUrl: cfg.attachUrl || null,
      detachUrl: cfg.detachUrl || null,
      kind: cfg.kind || 'manyToMany',
      foreignKey: cfg.foreignKey || null,
      parentId: cfg.parentId != null && cfg.parentId !== '' ? String(cfg.parentId) : null,
      readonly: !!cfg.readonly,
      required: !!cfg.required,

      selected: Array.isArray(cfg.initialItems)
        ? cfg.initialItems.map((item) => ({
            id: String(item.id),
            label: item.label || String(item.id),
            name: item.name,
            group: item.group,
            ability: item.ability,
          }))
        : [],
      query: '',
      results: [],
      cursor: 0,
      open: false,
      loading: false,
      _abort: null,
      _initialFetched: false,
      dropdownStyle: {},

      init() {
        this._pickHandler = (event) => {
          const detail = event.detail || {};
          if (detail.field === this.name) {
            this.pick({ id: detail.id, label: detail.label });
          }
        };
        window.addEventListener('shamar-m2m-pick', this._pickHandler);
        bindFixedDropdownListeners(this);
      },

      destroy() {
        if (this._pickHandler) {
          window.removeEventListener('shamar-m2m-pick', this._pickHandler);
        }
        unbindFixedDropdownListeners(this);
      },

      repositionDropdown() {
        this.dropdownStyle = fixedDropdownStyle(this.$el, this.$refs.dropdown, {
          maxHeight: 288,
          zIndex: 1100,
        });
      },

      get valueCsv() {
        return this.selected.map((item) => item.id).join(',');
      },

      get selectedIds() {
        return new Set(this.selected.map((item) => String(item.id)));
      },

      get availableResults() {
        const selected = this.selectedIds;
        return this.results.filter((item) => !selected.has(String(item.id)));
      },

      get exactMatch() {
        const q = this.query.trim().toLowerCase();
        if (!q) return null;
        return this.availableResults.find((item) => item.label.toLowerCase() === q) || null;
      },

      get createCandidate() {
        if (this.readonly || !this.quickCreateUrl) return false;
        const q = this.query.trim();
        return q.length > 0 && !this.exactMatch;
      },

      get canCreateAndEdit() {
        return !this.readonly && !!this.createUrl;
      },

      focusInput() {
        if (this.readonly) return;
        this.$refs.input?.focus();
        this.onFocus();
      },

      async fetchResults() {
        if (this._abort) this._abort.abort();
        const ctl = new AbortController();
        this._abort = ctl;
        this.loading = true;
        try {
          const url = `${this.searchUrl}&q=${encodeURIComponent(this.query)}`;
          const response = await fetch(url, { signal: ctl.signal });
          if (!response.ok) throw new Error('fetch failed');
          const data = await response.json();
          this.results = data.results || [];
          this.cursor = 0;
        } catch (error) {
          if (error.name !== 'AbortError') {
            this.results = [];
          }
        } finally {
          this.loading = false;
          if (this.open) this.$nextTick(() => this.repositionDropdown());
        }
      },

      onFocus() {
        if (this.readonly) return;
        this.open = true;
        this.$nextTick(() => this.repositionDropdown());
        if (!this._initialFetched) {
          this._initialFetched = true;
          this.fetchResults();
        }
      },

      onInput() {
        this.open = true;
        this.fetchResults();
        this.$nextTick(() => this.repositionDropdown());
      },

      close() {
        this.open = false;
        this.dropdownStyle = {};
        this.query = '';
      },

      onFocusOut(event) {
        const next = event.relatedTarget;
        if (next && this.$el.contains(next)) return;
        // Defer past the option mousedown/click so pick() can run first.
        setTimeout(() => {
          if (!this.open) return;
          if (this.$el.contains(document.activeElement)) return;
          this.close();
        }, 0);
      },

      moveCursor(delta) {
        if (!this.open) {
          this.open = true;
          this.$nextTick(() => this.repositionDropdown());
          return;
        }
        const extra = this.createCandidate ? 1 : 0;
        const max = this.availableResults.length + extra - 1;
        if (max < 0) return;
        this.cursor = Math.max(0, Math.min(max, this.cursor + delta));
      },

      onEnter() {
        if (!this.open) return;
        if (this.cursor < this.availableResults.length) {
          this.pick(this.availableResults[this.cursor]);
        } else if (this.createCandidate) {
          this.createFromQuery();
        }
      },

      onBackspace() {
        if (this.query || this.readonly || this.selected.length === 0) return;
        this.remove(this.selected[this.selected.length - 1].id);
      },

      pick(item) {
        if (!item || item.id == null) return;
        const id = String(item.id);
        if (this.selectedIds.has(id)) return;
        if (this.kind === 'hasMany' && this.attachUrl && this.parentId) {
          this.attachHasMany(item);
          return;
        }
        this.selected = [...this.selected, { id, label: item.label || id }];
        this.query = '';
        this.cursor = 0;
        this.fetchResults();
        this.$nextTick?.(() => this.$refs.input?.focus());
        notifyRelationFieldChange(this.$el, this.name);
      },

      async attachHasMany(item) {
        try {
          const response = await fetch(this.attachUrl, {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              field: this.name,
              relatedId: item.id,
              parentId: this.parentId,
            }),
          });
          if (!response.ok) throw new Error('attach failed');
          const linked = await response.json();
          const id = String(linked.id);
          this.selected = [
            ...this.selected.filter((entry) => String(entry.id) !== id),
            { id, label: linked.label || item.label || id },
          ];
          this.query = '';
          this.cursor = 0;
          this.fetchResults();
          this.$nextTick?.(() => this.$refs.input?.focus());
        } catch {
          showToast('error', { title: 'Error', message: 'Unable to link record.' });
        }
      },

      remove(id) {
        const target = String(id);
        if (this.kind === 'hasMany' && this.detachUrl) {
          this.detachHasMany(target);
          return;
        }
        this.selected = this.selected.filter((item) => String(item.id) !== target);
        notifyRelationFieldChange(this.$el, this.name);
      },

      async detachHasMany(relatedId) {
        try {
          const response = await fetch(this.detachUrl, {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ field: this.name, relatedId }),
          });
          if (!response.ok) throw new Error('detach failed');
          this.selected = this.selected.filter((item) => String(item.id) !== String(relatedId));
        } catch {
          showToast('error', { title: 'Error', message: 'Unable to unlink record.' });
        }
      },

      openRecord(item) {
        if (!item?.id || !this.detailUrlBase) return;
        const url = this.readonly
          ? `${this.detailUrlBase}/${item.id}`
          : `${this.detailUrlBase}/${item.id}/edit`;
        window.ShamarUI.openDialog({
          url,
          title: item.label || (this.readonly ? 'View record' : 'Edit record'),
          slug: this.relatedResource,
        });
      },

      async createFromQuery() {
        const name = this.query.trim();
        if (!name) return;
        try {
          const response = await fetch(this.quickCreateUrl, {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              field: this.name,
              name,
              parentId: this.parentId,
            }),
          });
          if (response.status === 400) {
            if (this.canCreateAndEdit) {
              this.createAndEdit();
              return;
            }
            const body = await response.json().catch(() => ({}));
            showToast('error', {
              title: 'Create blocked',
              message: body.message || body.detail || 'Cannot create this record inline.',
            });
            return;
          }
          if (!response.ok) throw new Error('create failed');
          const item = await response.json();
          this.results = [item, ...this.results.filter((entry) => String(entry.id) !== String(item.id))];
          this.pick(item);
        } catch {
          showToast('error', {
            title: 'Error',
            message: 'Unable to create record.',
          });
        }
      },

      createAndEdit() {
        if (!this.createUrl) return;
        this.open = false;
        const q = (this.query || '').trim();
        const url = q
          ? `${this.createUrl}?name=${encodeURIComponent(q)}`
          : this.createUrl;
        const title = q ? `New ${this.singularLabel}` : `Create ${this.singularLabel}`;
        window.ShamarUI.openDialog({
          url,
          title,
          slug: this.relatedResource,
          onResult: (result) => {
            if (result?.id) {
              _pendingRelationPick = {
                mode: 'm2m',
                field: this.name,
                id: result.id,
                label: result.label,
              };
            }
          },
        });
      },
    };
  }

  function createShamarM2mCheckbox(cfg) {
    const self = createShamarM2m(cfg);
    self.filter = '';
    self.columns = Math.min(4, Math.max(1, Number(cfg.checkboxColumns) || 1));
    self.cascadeWildcards = cfg.cascadeWildcards !== false;
    self.groupBy = cfg.groupBy ? String(cfg.groupBy) : '';
    self.framed = cfg.checkboxFramed !== false;
    self.valueAttribute = cfg.valueAttribute ? String(cfg.valueAttribute) : 'id';
    self.options = Array.isArray(cfg.options)
      ? cfg.options.map((item) => normalizeCheckboxOption(item))
      : [];
    const prevInit = self.init;
    self.init = function initCheckbox() {
      this.selected = this.selected.map((item) => normalizeCheckboxOption(item));
      prevInit.call(this);
      if (this.options.length === 0) {
        this.loadAllOptions();
      } else {
        this.sortOptions();
        this.options = this.options.map((item) => normalizeCheckboxOption(item));
        this.mergeSelectedIntoOptions();
        this.pruneCovered();
      }
    };
    Object.defineProperty(self, 'filteredOptions', {
      configurable: true,
      enumerable: true,
      get() {
        const q = this.filter.trim().toLowerCase();
        if (!q) return this.options;
        return this.options.filter((item) => {
          const hay = `${item.label} ${item.ability || ''} ${item.group || ''}`.toLowerCase();
          return hay.includes(q);
        });
      },
    });
    Object.defineProperty(self, 'filteredGroups', {
      configurable: true,
      enumerable: true,
      get() {
        const items = this.filteredOptions;
        if (!this.groupBy) {
          return items.length
            ? [{ key: '_all', title: 'All', items }]
            : [];
        }
        const map = new Map();
        for (const item of items) {
          const key = item.group || deriveGroupFromLabel(item.label) || '_other';
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(item);
        }
        const keys = [...map.keys()].sort((a, b) => {
          if (a === '*') return -1;
          if (b === '*') return 1;
          if (a === '_other') return 1;
          if (b === '_other') return -1;
          return a.localeCompare(b);
        });
        return keys.map((key) => ({
          key,
          title: groupTitle(key),
          items: sortGroupItems(map.get(key), this),
        }));
      },
    });
    self.itemValue = function itemValue(item) {
      if (!item) return '';
      if (this.valueAttribute === 'name') {
        return String(item.name || this.permissionKey(item) || item.id || '');
      }
      return String(item.id ?? '');
    };
    self.permissionKey = function permissionKey(item) {
      if (item?.name) return String(item.name).trim();
      if (item?.group != null && item?.ability != null) {
        const group = String(item.group).trim();
        const ability = String(item.ability).trim();
        if (group === '*' && ability === '*') return '*';
        if (group && ability) return `${group}:${ability}`;
      }
      const label = String(item?.label || item?.id || '').trim();
      if (label === '*') return '*';
      if (label.includes(':')) return label;
      return label;
    };
    self.itemDisplay = function itemDisplay(item) {
      // Prefer catalog label / permission name over bare ability or raw id.
      const label = String(item?.label || '').trim();
      if (label && label !== String(item?.id || '')) return label;
      const name = String(item?.name || '').trim();
      if (name) {
        if (name === '*') return 'All (*)';
        return name;
      }
      if (item?.ability) {
        return item.ability === '*' ? 'All (*)' : item.ability;
      }
      const key = this.permissionKey(item);
      if (key === '*') return 'All (*)';
      if (key.includes(':')) return key;
      return key || String(item?.id || '');
    };
    self.groupSelectedCount = function groupSelectedCount(group) {
      if (!group?.items) return 0;
      return group.items.filter((item) => this.isSelected(item)).length;
    };
    self.covers = function covers(wildcard, candidate) {
      if (!wildcard || !candidate || wildcard === candidate) return false;
      if (wildcard === '*') return true;
      if (wildcard.endsWith(':*')) {
        const prefix = wildcard.slice(0, -1);
        return candidate.startsWith(prefix);
      }
      return false;
    };
    self.isCovered = function isCovered(item) {
      if (!this.cascadeWildcards || !item) return false;
      const key = this.permissionKey(item);
      for (const sel of this.selected) {
        if (String(sel.id) === String(item.id)) continue;
        if (this.covers(this.permissionKey(sel), key)) return true;
      }
      return false;
    };
    self.coveredHint = function coveredHint(item) {
      if (!item) return '';
      const key = this.permissionKey(item);
      for (const sel of this.selected) {
        const wild = this.permissionKey(sel);
        if (this.covers(wild, key)) {
          return `Covered by ${wild}`;
        }
      }
      return '';
    };
    self.pruneCovered = function pruneCovered() {
      if (!this.cascadeWildcards) return;
      this.selected = this.selected.filter((item) => !this.isCovered(item));
    };
    self.sortOptions = function sortOptions() {
      this.options = [...this.options].sort((a, b) => {
        const ag = a.group || deriveGroupFromLabel(a.label) || '';
        const bg = b.group || deriveGroupFromLabel(b.label) || '';
        if (ag === '*' && bg !== '*') return -1;
        if (bg === '*' && ag !== '*') return 1;
        if (ag !== bg) return ag.localeCompare(bg);
        return compareAbility(a, b, this);
      });
    };
    self.isSelected = function isSelected(itemOrId) {
      const id =
        itemOrId && typeof itemOrId === 'object'
          ? String(itemOrId.id ?? '')
          : String(itemOrId ?? '');
      return this.selectedIds.has(id);
    };
    self.pick = function pickCheckbox(item) {
      if (!item || item.id == null || this.readonly) return;
      const id = String(item.id);
      if (this.selectedIds.has(id)) return;
      const next = normalizeCheckboxOption(item);
      this.selected = [...this.selected, next];
      this.pruneCovered();
    };
    self.toggle = function toggle(item) {
      if (this.readonly || !item) return;
      if (this.isCovered(item) && !this.isSelected(item)) return;
      if (this.isSelected(item)) {
        this.remove(item.id);
      } else {
        this.pick(item);
      }
    };
    self.mergeSelectedIntoOptions = function mergeSelectedIntoOptions() {
      const seen = new Set(this.options.map((item) => String(item.id)));
      for (const item of this.selected) {
        if (!seen.has(String(item.id))) {
          const enriched = normalizeCheckboxOption({
            ...item,
            group: item.group || deriveGroupFromLabel(item.label),
          });
          this.options = [enriched, ...this.options];
        }
      }
    };
    self.loadAllOptions = async function loadAllOptions() {
      this.loading = true;
      try {
        const url = `${this.searchUrl}&q=&limit=250`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('fetch failed');
        const data = await response.json();
        this.options = (data.results || []).map((item) => normalizeCheckboxOption(item));
        this.sortOptions();
        this.mergeSelectedIntoOptions();
        this.pruneCovered();
      } catch {
        this.options = this.selected.map((item) => normalizeCheckboxOption(item));
      } finally {
        this.loading = false;
      }
    };
    return self;
  }

  function normalizeCheckboxOption(item) {
    const id = String(item.id ?? item.value ?? '');
    const label = item.label || id;
    const group = item.group || deriveGroupFromLabel(item.name || label);
    const ability =
      item.ability || deriveAbilityFromLabel(item.name || label);
    let name = item.name ? String(item.name).trim() : '';
    if (!name && group && ability) {
      name = group === '*' && ability === '*' ? '*' : `${group}:${ability}`;
    }
    if (!name) {
      name = deriveGroupFromLabel(label) === '*' ? '*' : label.includes(':') ? label : id;
    }
    return {
      id,
      label,
      name,
      group,
      ability,
    };
  }

  function deriveGroupFromLabel(label) {
    const trimmed = String(label || '').trim();
    if (!trimmed || trimmed === '*') return '*';
    const colon = trimmed.indexOf(':');
    if (colon <= 0) return trimmed;
    return trimmed.slice(0, colon) || '*';
  }

  function deriveAbilityFromLabel(label) {
    const trimmed = String(label || '').trim();
    if (!trimmed || trimmed === '*') return '*';
    const colon = trimmed.indexOf(':');
    if (colon < 0) return undefined;
    return trimmed.slice(colon + 1) || undefined;
  }

  function groupTitle(key) {
    if (key === '*' || key === '_all') return 'Global';
    if (key === '_other') return 'Other';
    return String(key)
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function compareAbility(a, b, ctx) {
    const aa = a.ability || deriveAbilityFromLabel(a.label) || ctx.permissionKey(a);
    const ba = b.ability || deriveAbilityFromLabel(b.label) || ctx.permissionKey(b);
    const aRank = aa === '*' ? 0 : 1;
    const bRank = ba === '*' ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return String(aa).localeCompare(String(ba));
  }

  function sortGroupItems(items, ctx) {
    return [...items].sort((a, b) => compareAbility(a, b, ctx));
  }

  function createShamarM2mTable(cfg) {
    const self = createShamarM2m(cfg);
    self.addOpen = false;
    self.listUrl = cfg.listUrl || null;
    self.columns = Array.isArray(cfg.columns) ? cfg.columns : [];
    self.listHeaders = Array.isArray(cfg.listHeaders) ? cfg.listHeaders : [];
    self.rows = [];
    self.total = 0;
    self.page = 1;
    self.pageCount = 1;
    self.perPage = String(cfg.perPage || 10);
    self.listSearch = '';
    self.listFilters = [];
    self.listSort = cfg.defaultSort || '';
    self.listDirection = cfg.defaultDirection || 'asc';
    self.listLoading = false;
    self.filterPanelOpen = false;
    self._listAbort = null;

    const prevInit = self.init;
    const prevDestroy = self.destroy;
    const prevPick = self.pick;
    const prevCreateAndEdit = self.createAndEdit;
    const prevAttach = self.attachHasMany;
    const prevDetach = self.detachHasMany;
    const prevOpenRecord = self.openRecord;

    self.init = function initTable() {
      prevInit.call(this);
      this._tablePickHandler = (event) => {
        const detail = event.detail || {};
        if (detail.field === this.name) {
          prevPick.call(this, { id: detail.id, label: detail.label });
          this.closeAdd();
        }
      };
      window.addEventListener('shamar-m2m-pick', this._tablePickHandler);
      if (this.listUrl) {
        this.loadList();
      }
    };

    self.destroy = function destroyTable() {
      prevDestroy.call(this);
      if (this._tablePickHandler) {
        window.removeEventListener('shamar-m2m-pick', this._tablePickHandler);
      }
      if (this._listAbort) this._listAbort.abort();
    };

    Object.defineProperty(self, 'filterableHeaders', {
      get() {
        return (this.listHeaders || []).filter(
          (header) =>
            header.filter_kind === 'boolean' ||
            (header.filter_kind === 'select' && Array.isArray(header.options)),
        );
      },
    });

    Object.defineProperty(self, 'availableResults', {
      get() {
        const linked = new Set([
          ...(this.selected || []).map((item) => String(item.id)),
          ...(this.rows || []).map((row) => String(row.id)),
        ]);
        return (this.results || []).filter((item) => !linked.has(String(item.id)));
      },
    });

    self.cellAlignment = function cellAlignment(columnName) {
      const column = (this.columns || []).find((entry) => entry.name === columnName);
      return column?.alignmentClass || '';
    };

    self.buildListUrl = function buildListUrl() {
      const url = new URL(this.listUrl, window.location.origin);
      if (this.listSearch) url.searchParams.set('search', this.listSearch);
      if (this.listSort) {
        url.searchParams.set('sort', this.listSort);
        if (this.listDirection === 'asc' || this.listDirection === 'desc') {
          url.searchParams.set('direction', this.listDirection);
        }
      }
      url.searchParams.set('page', String(this.page || 1));
      url.searchParams.set('perPage', String(this.perPage || 10));
      if (this.listFilters?.length) {
        url.searchParams.set('filters', JSON.stringify(this.listFilters));
      }
      return `${url.pathname}${url.search}`;
    };

    self.loadList = async function loadList() {
      if (!this.listUrl) return;
      if (this._listAbort) this._listAbort.abort();
      const ctl = new AbortController();
      this._listAbort = ctl;
      this.listLoading = true;
      try {
        const response = await fetch(this.buildListUrl(), {
          signal: ctl.signal,
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('list failed');
        const data = await response.json();
        this.rows = Array.isArray(data.rows) ? data.rows : [];
        this.total = Number(data.total) || 0;
        this.page = Number(data.page) || 1;
        this.pageCount = Math.max(1, Number(data.pageCount) || 1);
        this.perPage = String(data.perPage || this.perPage || 10);
        if (Array.isArray(data.columns) && data.columns.length) {
          this.columns = data.columns;
        }
        if (Array.isArray(data.listHeaders)) {
          this.listHeaders = data.listHeaders;
        }
        if (data.sort) this.listSort = data.sort;
        if (data.direction) this.listDirection = data.direction;
      } catch (error) {
        if (error.name !== 'AbortError') {
          this.rows = [];
          this.total = 0;
          showToast('error', {
            title: 'Error',
            message: 'Unable to load related records.',
          });
        }
      } finally {
        this.listLoading = false;
      }
    };

    self.applyListSearch = function applyListSearch() {
      this.page = 1;
      this.loadList();
    };

    self.setListPage = function setListPage(page) {
      const next = Math.max(1, Number(page) || 1);
      this.page = next;
      this.loadList();
    };

    self.toggleListSort = function toggleListSort(field) {
      if (!field) return;
      if (this.listSort === field) {
        this.listDirection = this.listDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.listSort = field;
        this.listDirection = 'asc';
      }
      this.page = 1;
      this.loadList();
    };

    self.hasFilter = function hasFilter(header, value) {
      const field = header.filterField || header.name;
      return this.listFilters.some(
        (chip) => chip.field === field && String(chip.value) === String(value),
      );
    };

    self.toggleBooleanFilter = function toggleBooleanFilter(header, value) {
      const field = header.filterField || header.name;
      const existing = this.listFilters.find((chip) => chip.field === field);
      if (existing && String(existing.value) === String(value)) {
        this.listFilters = this.listFilters.filter((chip) => chip.field !== field);
      } else {
        this.listFilters = [
          ...this.listFilters.filter((chip) => chip.field !== field),
          {
            field,
            op: '=',
            value,
            label: `${header.label}: ${value ? 'Yes' : 'No'}`,
          },
        ];
      }
      this.page = 1;
      this.loadList();
    };

    self.toggleSelectFilter = function toggleSelectFilter(header, opt) {
      const field = header.filterField || header.name;
      const value = opt.value;
      if (this.hasFilter(header, value)) {
        this.listFilters = this.listFilters.filter(
          (chip) => !(chip.field === field && String(chip.value) === String(value)),
        );
      } else {
        this.listFilters = [
          ...this.listFilters.filter((chip) => chip.field !== field),
          {
            field,
            op: '=',
            value,
            label: `${header.label}: ${opt.label}`,
          },
        ];
      }
      this.page = 1;
      this.loadList();
    };

    self.removeListFilter = function removeListFilter(chip) {
      this.listFilters = this.listFilters.filter(
        (entry) =>
          !(entry.field === chip.field && String(entry.value) === String(chip.value)),
      );
      this.page = 1;
      this.loadList();
    };

    self.clearListFilters = function clearListFilters() {
      this.listFilters = [];
      this.filterPanelOpen = false;
      this.page = 1;
      this.loadList();
    };

    self.toggleAdd = function toggleAdd() {
      this.addOpen = !this.addOpen;
      if (this.addOpen) {
        this.query = '';
        this.fetchResults();
        this.$nextTick?.(() => this.$refs.addInput?.focus());
      }
    };

    self.closeAdd = function closeAdd() {
      this.addOpen = false;
      this.query = '';
    };

    self.pick = function pickTable(item) {
      if (
        this.listUrl &&
        item?.id != null &&
        this.rows.some((row) => String(row.id) === String(item.id))
      ) {
        this.closeAdd();
        return;
      }
      prevPick.call(this, item);
      this.closeAdd();
    };

    self.attachHasMany = async function attachHasManyTable(item) {
      await prevAttach.call(this, item);
      if (this.listUrl) {
        this.page = 1;
        await this.loadList();
      }
    };

    self.detachHasMany = async function detachHasManyTable(relatedId) {
      await prevDetach.call(this, relatedId);
      if (this.listUrl) {
        await this.loadList();
      }
    };

    self.openRecord = function openRecordTable(item) {
      if (!item?.id || !this.detailUrlBase) return;
      const url = this.readonly
        ? `${this.detailUrlBase}/${item.id}`
        : `${this.detailUrlBase}/${item.id}/edit`;
      window.ShamarUI.openDialog({
        url,
        title: item.label || (this.readonly ? 'View record' : 'Edit record'),
        slug: this.relatedResource,
        onResult: () => {
          if (this.listUrl) this.loadList();
        },
      });
    };

    self.createAndEdit = function createAndEditTable() {
      this.closeAdd();
      if (!this.createUrl) return;
      const q = (this.query || '').trim();
      const url = q
        ? `${this.createUrl}${this.createUrl.includes('?') ? '&' : '?'}name=${encodeURIComponent(q)}`
        : this.createUrl;
      const title = q ? `New ${this.singularLabel}` : `Create ${this.singularLabel}`;
      window.ShamarUI.openDialog({
        url,
        title,
        slug: this.relatedResource,
        onResult: (detail) => {
          if (detail?.id) {
            prevPick.call(this, { id: detail.id, label: detail.label });
          }
          if (this.listUrl) this.loadList();
        },
      });
    };

    return self;
  }

  function createShamarForm(cfg = {}) {
    return {
      endpoint: cfg.endpoint || '',
      operation: cfg.operation || 'create',
      recordId: cfg.recordId != null && cfg.recordId !== '' ? String(cfg.recordId) : null,
      state: { ...(cfg.state || {}) },
      fieldMeta: {},
      liveMap: {},
      currencyMap: {},
      _currencyEditing: {},
      _timers: {},
      _abort: null,

      init() {
        const fields = Array.isArray(cfg.fields) ? cfg.fields : [];
        for (const field of fields) {
          if (!field?.name) continue;
          this.liveMap[field.name] = field.live;
          this.fieldMeta[field.name] = {
            visible: field.visible !== false,
            disabled: !!field.disabled,
            required: !!field.required,
            readonly: !!field.readonly,
            label: field.label,
            help: field.help,
            placeholder: field.placeholder,
          };
          if (field.currency) {
            this.currencyMap[field.name] = field.currency;
          }
          if (!(field.name in this.state) && field.value !== undefined) {
            this.state[field.name] = field.value;
          }
        }
        const formEl = this.$el?.tagName === 'FORM' ? this.$el : this.$el?.closest?.('form');
        if (formEl) {
          formEl.addEventListener('submit', () => this.syncJsonFields());
        }
      },

      syncJsonFields() {
        const root =
          this.$el?.tagName === 'FORM' ? this.$el : this.$el?.closest?.('form') || this.$el;
        if (!root?.querySelectorAll) return;
        root.querySelectorAll('[data-shamar-json]').forEach((input) => {
          const name = input.getAttribute('data-shamar-json');
          if (!name) return;
          const fallback = input.getAttribute('data-shamar-json-kind') === 'record' ? {} : [];
          input.value = JSON.stringify(this.state[name] ?? fallback);
        });
      },

      isVisible(name) {
        const meta = this.fieldMeta[name];
        return !meta || meta.visible !== false;
      },

      isDisabled(name) {
        return !!this.fieldMeta[name]?.disabled;
      },

      isRequired(name) {
        return !!this.fieldMeta[name]?.required;
      },

      isReadonly(name) {
        return !!this.fieldMeta[name]?.readonly;
      },

      fieldLabel(name, fallback) {
        return this.fieldMeta[name]?.label || fallback || name;
      },

      beginCurrencyEdit(name) {
        this._currencyEditing[name] = true;
      },

      endCurrencyEdit(name) {
        this._currencyEditing[name] = false;
        const parsed = this.parseCurrencyValue(this.state[name]);
        this.state[name] = parsed;
      },

      onCurrencyInput(name, event) {
        const raw = event?.target?.value ?? '';
        this.state[name] = this.parseCurrencyValue(raw);
        this.onFieldInput(name);
      },

      parseCurrencyValue(value) {
        if (value == null || value === '') return '';
        if (typeof value === 'number') return Number.isFinite(value) ? value : '';
        const cleaned = String(value).replace(/[^\d.-]/g, '');
        if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return '';
        const num = Number(cleaned);
        return Number.isFinite(num) ? num : '';
      },

      currencyDisplay(name) {
        const value = this.state[name];
        if (this._currencyEditing[name]) {
          return value == null || value === '' ? '' : String(value);
        }
        const cfg = this.currencyMap[name];
        if (!cfg) return value == null || value === '' ? '' : String(value);
        if (value == null || value === '') return '';
        const num = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(num)) return String(value);
        try {
          return new Intl.NumberFormat(cfg.locale, {
            minimumFractionDigits: cfg.precision ?? 2,
            maximumFractionDigits: cfg.precision ?? 2,
          }).format(num);
        } catch {
          return num.toFixed(cfg.precision ?? 2);
        }
      },

      parseLive(mode) {
        // live() | live({ debounce }) | live({ onBlur: true })
        if (mode === true) return { event: 'input', debounce: 500 };
        if (mode && typeof mode === 'object') {
          if (mode.onBlur) return { event: 'blur', debounce: 0 };
          let ms = 500;
          const d = mode.debounce;
          if (typeof d === 'number' && Number.isFinite(d)) {
            ms = d;
          } else if (typeof d === 'string') {
            const parsed = Number.parseInt(d, 10);
            if (Number.isFinite(parsed)) ms = parsed;
          }
          return { event: 'input', debounce: Math.max(0, ms) };
        }
        return { event: 'change', debounce: 0 };
      },

      onFieldInput(name) {
        const live = this.liveMap[name];
        if (!live) return;
        const parsed = this.parseLive(live);
        if (parsed.event !== 'input') return;
        this.scheduleSync(name, parsed.debounce);
      },

      onFieldChange(name) {
        const live = this.liveMap[name];
        if (!live) return;
        const parsed = this.parseLive(live);
        // Selects/comboboxes fire change; default live() uses "input" — treat both.
        if (parsed.event === 'change' || parsed.event === 'input') {
          this.scheduleSync(name, parsed.event === 'input' ? parsed.debounce : 0);
        }
      },

      onFieldBlur(name) {
        const live = this.liveMap[name];
        if (!live) return;
        if (this.parseLive(live).event === 'blur') {
          this.scheduleSync(name, 0);
        }
      },

      scheduleSync(changed, debounceMs) {
        if (this._timers[changed]) clearTimeout(this._timers[changed]);
        this._timers[changed] = window.setTimeout(() => {
          this._timers[changed] = null;
          this.sync(changed);
        }, Math.max(0, debounceMs || 0));
      },

      async sync(changed) {
        if (!this.endpoint) return;
        if (this._abort) this._abort.abort();
        const ctl = new AbortController();
        this._abort = ctl;
        // Snapshot before the round-trip so we only apply server patches to
        // fields the user has not edited while the request was in flight.
        // Never overwrite `changed` — bodyparsers often trim strings, which
        // would steal trailing spaces mid-typing.
        const sent = { ...this.state };
        try {
          const res = await fetch(this.endpoint, {
            method: 'POST',
            headers: csrfHeaders({
              'Content-Type': 'application/json',
              Accept: 'application/json',
            }),
            credentials: 'same-origin',
            signal: ctl.signal,
            body: JSON.stringify({
              operation: this.operation,
              changed,
              state: sent,
              id: this.recordId,
            }),
          });
          if (!res.ok) return;
          const payload = await res.json();
          if (payload?.state && typeof payload.state === 'object') {
            const next = { ...this.state };
            for (const [key, value] of Object.entries(payload.state)) {
              if (key === changed) continue;
              if (Object.is(this.state[key], sent[key])) {
                next[key] = value;
              }
            }
            this.state = next;
          }
          if (Array.isArray(payload?.fields)) {
            for (const field of payload.fields) {
              if (!field?.name) continue;
              this.fieldMeta[field.name] = {
                visible: field.visible !== false,
                disabled: !!field.disabled,
                required: !!field.required,
                readonly: !!field.readonly,
                label: field.label,
                help: field.help,
                placeholder: field.placeholder,
              };
              if (field.currency) {
                this.currencyMap[field.name] = field.currency;
              }
              if (field.live != null) {
                this.liveMap[field.name] = field.live;
              }
            }
          }
        } catch (error) {
          if (error?.name !== 'AbortError') {
            /* ignore transient form-state errors */
          }
        }
      },

      ensureRepeater(name, emptyItem) {
        if (!Array.isArray(this.state[name])) this.state[name] = [];
        void emptyItem;
        return this.state[name];
      },

      addRepeaterItem(name, emptyItem) {
        const cur = Array.isArray(this.state[name]) ? [...this.state[name]] : [];
        cur.push({ ...(emptyItem && typeof emptyItem === 'object' ? emptyItem : {}) });
        this.state[name] = cur;
        this.onFieldChange(name);
      },

      removeRepeaterItem(name, index) {
        const cur = Array.isArray(this.state[name]) ? [...this.state[name]] : [];
        cur.splice(index, 1);
        this.state[name] = cur;
        this.onFieldChange(name);
      },

      moveRepeaterItem(name, index, delta) {
        const cur = Array.isArray(this.state[name]) ? [...this.state[name]] : [];
        const next = index + delta;
        if (next < 0 || next >= cur.length) return;
        const [row] = cur.splice(index, 1);
        cur.splice(next, 0, row);
        this.state[name] = cur;
        this.onFieldChange(name);
      },

      ensureKeyValue(name) {
        if (!Array.isArray(this.state[name])) this.state[name] = [];
        return this.state[name];
      },

      addKeyValueRow(name) {
        const cur = Array.isArray(this.state[name]) ? [...this.state[name]] : [];
        cur.push({ key: '', value: '' });
        this.state[name] = cur;
        this.onFieldChange(name);
      },

      removeKeyValueRow(name, index) {
        const cur = Array.isArray(this.state[name]) ? [...this.state[name]] : [];
        cur.splice(index, 1);
        this.state[name] = cur;
        this.onFieldChange(name);
      },

      moveKeyValueRow(name, index, delta) {
        const cur = Array.isArray(this.state[name]) ? [...this.state[name]] : [];
        const next = index + delta;
        if (next < 0 || next >= cur.length) return;
        const [row] = cur.splice(index, 1);
        cur.splice(next, 0, row);
        this.state[name] = cur;
        this.onFieldChange(name);
      },
    };
  }

  // Available before Alpine boots (defer scripts run before Alpine.start).
  window.shamarForm = createShamarForm;

  const esmCache = new Map();
  function loadEsm(url) {
    if (!esmCache.has(url)) esmCache.set(url, import(url));
    return esmCache.get(url);
  }

  function pickExport(mod, name) {
    if (!mod) return null;
    if (name && typeof mod[name] === 'function') return mod[name];
    if (typeof mod.default === 'function') return mod.default;
    if (mod.default && typeof mod.default[name] === 'function') return mod.default[name];
    return mod.default || mod;
  }

  function createShamarRichEditor(cfg = {}) {
    const mode =
      cfg.mode === 'document' ? 'document' : cfg.mode === 'notion' ? 'notion' : 'simple';
    const basePath = String(
      cfg.basePath ||
        (typeof document !== 'undefined' ? document.body?.dataset?.shamarBasePath : '') ||
        '',
    ).replace(/\/$/, '');

    return {
      html: '',
      editor: null,
      mount: null,
      mode,
      async init() {
        this.html = typeof cfg.getValue === 'function' ? cfg.getValue() || '' : '';
        const disabled = typeof cfg.isDisabled === 'function' ? cfg.isDisabled() : false;
        const host = this.$refs.host;
        if (!host) return;
        const assetBase = basePath || '';
        try {
          if (mode === 'document') {
            const mod = await import(`${assetBase}/assets/rich-editor/document.js`);
            this.mount = mod.mountDocumentEditor(host, {
              brandLabel: cfg.brandLabel || 'Shamar',
              documentTitle: cfg.name || 'Document',
              initialHtml: this.html,
              editable: !disabled,
              placeholder: 'Start typing your document…',
              onChange: (html) => {
                this.html = html;
                if (typeof cfg.setValue === 'function') cfg.setValue(html);
              },
            });
            this.editor = this.mount.editor;
            return;
          }

          if (mode === 'notion') {
            const mod = await import(`${assetBase}/assets/rich-editor/notion.js`);
            this.mount = mod.mountNotionEditor(host, {
              initialHtml: this.html,
              editable: !disabled,
              placeholder: "Type '/' for commands…",
              onChange: (html) => {
                this.html = html;
                if (typeof cfg.setValue === 'function') cfg.setValue(html);
              },
            });
            this.editor = this.mount.editor;
            return;
          }

          const mod = await import(`${assetBase}/assets/rich-editor/simple.js`);
          this.mount = mod.mountSimpleEditor(host, {
            initialHtml: this.html,
            editable: !disabled,
            toolbar: Array.isArray(cfg.toolbar) ? cfg.toolbar : undefined,
            placeholder: 'Start writing…',
            onChange: (html) => {
              this.html = html;
              if (typeof cfg.setValue === 'function') cfg.setValue(html);
            },
          });
          this.editor = this.mount.editor;
        } catch (err) {
          console.error(err);
          host.innerHTML =
            '<p class="text-xs text-fg-danger px-3 py-2">Rich editor failed to load.</p>';
        }
      },
      destroy() {
        this.mount?.destroy?.();
        this.editor?.destroy?.();
        this.mount = null;
        this.editor = null;
      },
    };
  }

  const CODEMIRROR_LANGS = {
    javascript: ['https://esm.sh/@codemirror/lang-javascript@6', 'javascript'],
    typescript: ['https://esm.sh/@codemirror/lang-javascript@6', 'javascript'],
    json: ['https://esm.sh/@codemirror/lang-json@6', 'json'],
    html: ['https://esm.sh/@codemirror/lang-html@6', 'html'],
    css: ['https://esm.sh/@codemirror/lang-css@6', 'css'],
    markdown: ['https://esm.sh/@codemirror/lang-markdown@6', 'markdown'],
    python: ['https://esm.sh/@codemirror/lang-python@6', 'python'],
    sql: ['https://esm.sh/@codemirror/lang-sql@6', 'sql'],
    xml: ['https://esm.sh/@codemirror/lang-xml@6', 'xml'],
  };

  function createShamarCodeEditor(cfg = {}) {
    return {
      doc: '',
      language: cfg.language || 'javascript',
      view: null,
      async init() {
        this.doc = typeof cfg.getValue === 'function' ? cfg.getValue() || '' : '';
        this.language = cfg.language || this.language || 'javascript';
        await this.mount();
      },
      async loadLanguage(id) {
        const spec = CODEMIRROR_LANGS[id] || CODEMIRROR_LANGS.javascript;
        const mod = await loadEsm(spec[0]);
        const fn = pickExport(mod, spec[1]);
        return typeof fn === 'function' ? fn() : [];
      },
      async mount() {
        try {
          const cm = await loadEsm('https://esm.sh/codemirror@6.0.1');
          const EditorView = pickExport(cm, 'EditorView');
          const basicSetup = cm.basicSetup || cm.default?.basicSetup;
          const lang = await this.loadLanguage(this.language);
          if (this.view) {
            this.view.destroy();
            this.view = null;
          }
          this.view = new EditorView({
            doc: this.doc || '',
            parent: this.$refs.editor,
            extensions: [
              basicSetup,
              lang,
              EditorView.updateListener.of((update) => {
                if (!update.docChanged) return;
                this.doc = update.state.doc.toString();
                if (typeof cfg.setValue === 'function') cfg.setValue(this.doc);
              }),
            ],
          });
        } catch {
          if (this.$refs.editor) {
            this.$refs.editor.innerHTML =
              '<p class="text-xs text-fg-danger">Code editor failed to load.</p>';
          }
        }
      },
      async setLanguage(id) {
        this.language = id;
        await this.mount();
      },
      destroy() {
        this.view?.destroy?.();
      },
    };
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderMarkdownPreview(source) {
    const escaped = escapeHtml(source);
    const html = escaped
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
      .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br />');
    return `<p>${html}</p>`;
  }

  function createShamarMarkdownEditor(cfg = {}) {
    return {
      tab: 'write',
      doc: '',
      disabled: false,
      init() {
        this.doc = typeof cfg.getValue === 'function' ? cfg.getValue() || '' : '';
        this.disabled = typeof cfg.isDisabled === 'function' ? cfg.isDisabled() : false;
      },
      get previewHtml() {
        return renderMarkdownPreview(this.doc);
      },
      onInput() {
        if (typeof cfg.setValue === 'function') cfg.setValue(this.doc);
      },
      insert(kind) {
        const ta = this.$refs.input;
        if (!ta || this.disabled) return;
        const start = ta.selectionStart ?? this.doc.length;
        const end = ta.selectionEnd ?? this.doc.length;
        const selected = this.doc.slice(start, end);
        const wraps = {
          bold: ['**', '**', 'bold'],
          italic: ['*', '*', 'italic'],
          code: ['`', '`', 'code'],
          link: ['[', '](url)', 'text'],
          h2: ['## ', '', 'Heading'],
          ul: ['- ', '', 'item'],
          ol: ['1. ', '', 'item'],
          quote: ['> ', '', 'quote'],
        };
        const spec = wraps[kind];
        if (!spec) return;
        const inner = selected || spec[2];
        const next = this.doc.slice(0, start) + spec[0] + inner + spec[1] + this.doc.slice(end);
        this.doc = next;
        this.onInput();
        this.$nextTick(() => {
          ta.focus();
          const pos = start + spec[0].length + inner.length;
          ta.setSelectionRange(pos, pos);
        });
      },
    };
  }

  function createShamarCombobox(cfg = {}) {
    const options = Array.isArray(cfg.options)
      ? cfg.options.map((opt) => ({
          label: String(opt?.label ?? opt?.value ?? ''),
          value: opt?.value != null ? String(opt.value) : '',
        }))
      : [];

    return {
      name: cfg.name || '',
      multiple: !!cfg.multiple,
      options,
      placeholder: cfg.placeholder || 'Select...',
      selectablePlaceholder: cfg.selectablePlaceholder !== false,
      getValue: typeof cfg.getValue === 'function' ? cfg.getValue : () => (cfg.multiple ? [] : ''),
      setValue: typeof cfg.setValue === 'function' ? cfg.setValue : () => {},
      isDisabled: typeof cfg.isDisabled === 'function' ? cfg.isDisabled : () => false,

      query: '',
      open: false,
      cursor: 0,
      _syncing: false,
      dropdownStyle: {},

      init() {
        this.syncFromValue();
        this.$watch(
          () => this.getValue(),
          () => {
            if (this._syncing) return;
            this.syncFromValue();
          },
        );
        bindFixedDropdownListeners(this);
      },

      destroy() {
        unbindFixedDropdownListeners(this);
      },

      repositionDropdown() {
        const anchor = this.$refs.control || this.$el;
        this.dropdownStyle = fixedDropdownStyle(anchor, this.$refs.list, {
          maxHeight: 256,
          zIndex: 1100,
        });
      },

      get disabled() {
        return !!this.isDisabled();
      },

      get selectedValues() {
        const raw = this.getValue();
        if (this.multiple) {
          if (Array.isArray(raw)) return raw.map((item) => String(item));
          if (raw == null || raw === '') return [];
          return [String(raw)];
        }
        if (raw == null || raw === '') return [];
        return [String(raw)];
      },

      get selectedOptions() {
        const selected = new Set(this.selectedValues);
        return this.options.filter((opt) => selected.has(String(opt.value)));
      },

      get selectedLabel() {
        return this.selectedOptions.map((opt) => opt.label).join(', ');
      },

      get filteredOptions() {
        const q = this.query.trim().toLowerCase();
        if (!q) return this.options;
        return this.options.filter(
          (opt) =>
            opt.label.toLowerCase().includes(q) ||
            String(opt.value).toLowerCase().includes(q),
        );
      },

      syncFromValue() {
        if (this.multiple) return;
        if (this.open && this.query && this.query !== this.selectedLabel) return;
        this.query = this.selectedLabel;
      },

      optionLabel(value) {
        const found = this.options.find((opt) => String(opt.value) === String(value));
        return found?.label ?? String(value ?? '');
      },

      isSelected(opt) {
        return this.selectedValues.includes(String(opt.value));
      },

      commit(next) {
        this._syncing = true;
        this.setValue(next);
        queueMicrotask(() => {
          this._syncing = false;
        });
      },

      openDropdown() {
        if (this.disabled) return;
        this.repositionDropdown();
        this.open = true;
        this.cursor = 0;
        if (!this.multiple) {
          this.query = '';
        }
        this.$nextTick(() => {
          this.repositionDropdown();
          this.$refs.search?.focus();
        });
      },

      close() {
        this.open = false;
        this.cursor = 0;
        this.dropdownStyle = {};
        if (!this.multiple) {
          this.query = this.selectedLabel;
        } else {
          this.query = '';
        }
      },

      toggleOpen() {
        if (this.open) this.close();
        else this.openDropdown();
      },

      onControlClick() {
        if (this.disabled) return;
        if (!this.open) this.openDropdown();
        else this.$refs.search?.focus();
      },

      onFocusOut(event) {
        const next = event.relatedTarget;
        if (next && this.$el.contains(next)) return;
        queueMicrotask(() => {
          if (!this.open) return;
          if (this.$el.contains(document.activeElement)) return;
          this.close();
        });
      },

      onInput() {
        if (this.disabled) return;
        this.open = true;
        this.cursor = 0;
        if (!this.multiple && this.selectablePlaceholder && this.query !== this.selectedLabel) {
          // Typing clears the current single selection until an option is picked.
          this.commit('');
        }
        this.$nextTick(() => this.repositionDropdown());
      },

      onKeydown(event) {
        if (this.disabled) return;
        const key = event.key;
        if (key === 'ArrowDown') {
          event.preventDefault();
          if (!this.open) {
            this.openDropdown();
            return;
          }
          this.moveCursor(1);
        } else if (key === 'ArrowUp') {
          event.preventDefault();
          if (!this.open) {
            this.openDropdown();
            return;
          }
          this.moveCursor(-1);
        } else if (key === 'Enter') {
          if (!this.open) return;
          event.preventDefault();
          const opt = this.filteredOptions[this.cursor];
          if (opt) this.pick(opt);
        } else if (key === 'Escape') {
          if (this.open) {
            event.preventDefault();
            this.close();
          }
        } else if (key === 'Backspace' && this.multiple && !this.query) {
          const values = this.selectedValues;
          if (values.length) {
            event.preventDefault();
            this.remove(values[values.length - 1]);
          }
        } else if (key === 'Tab') {
          this.close();
        }
      },

      moveCursor(delta) {
        const max = this.filteredOptions.length - 1;
        if (max < 0) {
          this.cursor = 0;
          return;
        }
        this.cursor = Math.max(0, Math.min(max, this.cursor + delta));
        this.$nextTick(() => {
          const el = this.$refs.list?.querySelector(`[data-combobox-index="${this.cursor}"]`);
          el?.scrollIntoView?.({ block: 'nearest' });
        });
      },

      pick(opt) {
        if (this.disabled || !opt) return;
        const value = String(opt.value);
        if (this.multiple) {
          const current = this.selectedValues;
          if (current.includes(value)) {
            this.commit(current.filter((item) => item !== value));
          } else {
            this.commit([...current, value]);
          }
          this.query = '';
          this.open = true;
          this.cursor = 0;
          this.$nextTick(() => {
            this.repositionDropdown();
            this.$refs.search?.focus();
          });
        } else {
          this.commit(value);
          this.query = opt.label;
          this.open = false;
          this.dropdownStyle = {};
        }
      },

      remove(value) {
        if (this.disabled || !this.multiple) return;
        this.commit(this.selectedValues.filter((item) => item !== String(value)));
        this.$nextTick(() => this.$refs.search?.focus());
      },

      clearSelection() {
        if (this.disabled) return;
        this.commit(this.multiple ? [] : '');
        this.query = '';
        this.open = false;
        this.dropdownStyle = {};
        this.$nextTick(() => this.$refs.search?.focus());
      },
    };
  }

  window.shamarCombobox = createShamarCombobox;

  function shamarAssetUrl(path) {
    const base = document.body?.dataset?.shamarBasePath || '';
    return `${base}${path}`;
  }

  let flowbiteDatepickerReady = null;
  function loadFlowbiteDatepicker() {
    if (typeof window.Datepicker === 'function') return Promise.resolve();
    if (!flowbiteDatepickerReady) {
      flowbiteDatepickerReady = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = shamarAssetUrl('/assets/vendor/flowbite-datepicker.min.js');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Flowbite datepicker'));
        document.head.appendChild(script);
      });
    }
    return flowbiteDatepickerReady;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function parsePickerBounds(raw) {
    if (raw == null || raw === '') return null;
    const str = String(raw).trim();
    const ym = /^(\d{4})-(\d{2})$/.exec(str);
    if (ym) return new Date(Number(ym[1]), Number(ym[2]) - 1, 1);
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (dateOnly) {
      return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    }
    const dt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
    if (dt) {
      return new Date(
        Number(dt[1]),
        Number(dt[2]) - 1,
        Number(dt[3]),
        Number(dt[4]),
        Number(dt[5]),
        dt[6] != null ? Number(dt[6]) : 0,
      );
    }
    const timeOnly = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(str);
    if (timeOnly) {
      const d = new Date();
      d.setHours(Number(timeOnly[1]), Number(timeOnly[2]), timeOnly[3] != null ? Number(timeOnly[3]) : 0, 0);
      return d;
    }
    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function parsePickerValue(raw, mode) {
    if (raw == null || raw === '') return null;
    const str = String(raw).trim();
    if (mode === 'time') {
      const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(str);
      if (!m) return null;
      return {
        year: null,
        month: null,
        day: null,
        hour: Number(m[1]),
        minute: Number(m[2]),
        second: m[3] != null ? Number(m[3]) : 0,
      };
    }
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (dateOnly) {
      return {
        year: Number(dateOnly[1]),
        month: Number(dateOnly[2]),
        day: Number(dateOnly[3]),
        hour: 0,
        minute: 0,
        second: 0,
      };
    }
    const dt = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(str);
    if (dt) {
      return {
        year: Number(dt[1]),
        month: Number(dt[2]),
        day: Number(dt[3]),
        hour: Number(dt[4]),
        minute: Number(dt[5]),
        second: dt[6] != null ? Number(dt[6]) : 0,
      };
    }
    const parsed = parsePickerBounds(str);
    if (!parsed) return null;
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
      hour: parsed.getHours(),
      minute: parsed.getMinutes(),
      second: parsed.getSeconds(),
    };
  }

  function formatPickerState(parts, mode, withSeconds) {
    if (!parts) return '';
    if (mode === 'time') {
      return withSeconds
        ? `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
        : `${pad2(parts.hour)}:${pad2(parts.minute)}`;
    }
    const date = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
    if (mode === 'date' || mode === 'week' || mode === 'month') return date;
    const time = withSeconds
      ? `T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
      : `T${pad2(parts.hour)}:${pad2(parts.minute)}`;
    return date + time;
  }

  function dateOnlyStamp(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  function isoWeekStart(date, weekStart = 1) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = (d.getDay() - weekStart + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  function isoWeekNumber(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
      )
    );
  }

  function resolveTimeDisplayFormat(preferred) {
    if (preferred === '12' || preferred === '24') return preferred;
    try {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12
        ? '12'
        : '24';
    } catch {
      return '24';
    }
  }

  function resolveMinuteStep(cfg, withSeconds) {
    if (cfg.minuteStep != null && Number.isFinite(Number(cfg.minuteStep))) {
      return Math.max(1, Math.min(30, Math.floor(Number(cfg.minuteStep))));
    }
    return withSeconds ? 1 : 5;
  }

  function formatTimeDisplay(parts, format, withSeconds) {
    if (!parts) return '';
    const minute = pad2(parts.minute);
    const second = pad2(parts.second ?? 0);
    if (format === '24') {
      const base = `${pad2(parts.hour)}:${minute}`;
      return withSeconds ? `${base}:${second}` : base;
    }
    const hour24 = ((parts.hour % 24) + 24) % 24;
    const meridiem = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const base = `${pad2(hour12)}:${minute}`;
    return withSeconds ? `${base}:${second} ${meridiem}` : `${base} ${meridiem}`;
  }

  function timeMaskDigitCapacity(withSeconds) {
    return withSeconds ? 6 : 4;
  }

  function formatTimeMaskDraft(digits, meridiem, format, withSeconds) {
    const raw = String(digits || '').replace(/\D/g, '');
    let result = '';
    if (raw.length <= 2) {
      result = raw;
    } else if (raw.length <= 4) {
      result = `${raw.slice(0, 2)}:${raw.slice(2)}`;
    } else {
      const capped = raw.slice(0, timeMaskDigitCapacity(withSeconds));
      result = `${capped.slice(0, 2)}:${capped.slice(2, 4)}:${capped.slice(4)}`;
    }
    if (format === '12' && meridiem) {
      return result ? `${result} ${meridiem}` : meridiem;
    }
    return result;
  }

  function timeMaskFromParts(parts, format, withSeconds) {
    const hour24 = ((parts.hour % 24) + 24) % 24;
    const hour = format === '12' ? (hour24 % 12 === 0 ? 12 : hour24 % 12) : hour24;
    let digits = `${pad2(hour)}${pad2(parts.minute)}`;
    if (withSeconds) digits += pad2(parts.second ?? 0);
    const meridiem = format === '12' ? (hour24 >= 12 ? 'PM' : 'AM') : '';
    return { digits, meridiem };
  }

  function parseTimeMaskState(state, format, withSeconds) {
    const need = timeMaskDigitCapacity(withSeconds);
    const digits = String(state.digits || '').replace(/\D/g, '');
    if (digits.length < need) return null;
    if (format === '12' && !state.meridiem) return null;
    const hour = Number(digits.slice(0, 2));
    const minute = Number(digits.slice(2, 4));
    const second = withSeconds ? Number(digits.slice(4, 6)) : 0;
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
      return null;
    }
    if (minute > 59 || second > 59) return null;
    if (format === '12') {
      if (hour < 1 || hour > 12) return null;
      const meridiem = state.meridiem;
      const hour24 =
        meridiem === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
      return { hour: hour24, minute, second };
    }
    if (hour > 23) return null;
    return { hour, minute, second };
  }

  function applyTimeMaskKey(state, key, format, withSeconds) {
    const max = timeMaskDigitCapacity(withSeconds);
    const digits = String(state.digits || '').replace(/\D/g, '').slice(0, max);
    let meridiem = state.meridiem || '';
    const draftOf = (nextDigits, nextMeridiem) =>
      formatTimeMaskDraft(nextDigits, nextMeridiem, format, withSeconds);

    if (/^[0-9]$/.test(key)) {
      if (digits.length >= max) {
        return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
      }
      const pos = digits.length;
      const d = Number(key);
      let next = digits;

      if (pos === 0) {
        if (format === '24' && d > 2) next = `0${key}`;
        else if (format === '12' && d > 1) next = `0${key}`;
        else next = key;
      } else if (pos === 1) {
        const hour = Number(`${digits[0]}${key}`);
        if (format === '24' && hour > 23) {
          return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
        }
        if (format === '12' && (hour > 12 || hour === 0)) {
          if (digits.length + 2 > max) {
            return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
          }
          next = `0${digits[0]}${key}`;
        } else {
          next = `${digits}${key}`;
        }
      } else if (pos === 2 || pos === 4) {
        if (d > 5) {
          if (digits.length + 2 > max) {
            return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
          }
          next = `${digits}0${key}`;
        } else {
          next = `${digits}${key}`;
        }
      } else {
        next = `${digits}${key}`;
      }

      next = next.slice(0, max);
      return { digits: next, meridiem, draft: draftOf(next, meridiem), handled: true };
    }

    if (format === '12' && (key === 'a' || key === 'A' || key === 'p' || key === 'P')) {
      meridiem = key === 'a' || key === 'A' ? 'AM' : 'PM';
      return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
    }

    if (key === 'Backspace' || key === 'Delete') {
      if (format === '12' && meridiem) {
        meridiem = '';
        return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
      }
      const next = digits.slice(0, -1);
      return { digits: next, meridiem, draft: draftOf(next, meridiem), handled: true };
    }

    if (key === ':' || key === ' ') {
      return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
    }

    if (key.length === 1) {
      return { digits, meridiem, draft: draftOf(digits, meridiem), handled: true };
    }

    return { digits, meridiem, draft: draftOf(digits, meridiem), handled: false };
  }

  function parseFlexibleTimeInput(raw, format = '24') {
    const str = String(raw || '').trim();
    if (!str) return null;
    const meridiemMatch = /(a\.?m\.?|p\.?m\.?|[ap])\s*$/i.exec(str);
    const meridiemToken = meridiemMatch ? meridiemMatch[1].toLowerCase().replace(/\./g, '') : null;
    const meridiem =
      meridiemToken == null ? null : meridiemToken.startsWith('a') ? 'am' : 'pm';
    const cleaned = str
      .replace(/(a\.?m\.?|p\.?m\.?|[ap])\s*$/i, '')
      .replace(/\s+/g, '')
      .replace(/\./g, '');
    let hour = 0;
    let minute = 0;
    let second = 0;
    const colon = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(cleaned);
    if (colon) {
      hour = Number(colon[1]);
      minute = Number(colon[2]);
      second = colon[3] != null ? Number(colon[3]) : 0;
    } else if (/^\d{3,6}$/.test(cleaned)) {
      if (cleaned.length <= 4) {
        const padded = cleaned.padStart(4, '0');
        hour = Number(padded.slice(0, 2));
        minute = Number(padded.slice(2, 4));
      } else {
        const padded = cleaned.padStart(6, '0');
        hour = Number(padded.slice(0, 2));
        minute = Number(padded.slice(2, 4));
        second = Number(padded.slice(4, 6));
      }
    } else {
      return null;
    }
    if (minute > 59 || second > 59) return null;
    if (meridiem || format === '12') {
      if (hour < 0 || hour > 12) return null;
      let hour24;
      if (meridiem === 'am') hour24 = hour === 12 ? 0 : hour;
      else if (meridiem === 'pm') hour24 = hour === 12 ? 12 : hour + 12;
      else hour24 = hour === 12 ? 12 : hour;
      return { hour: hour24, minute, second };
    }
    if (hour > 23) return null;
    return { hour, minute, second };
  }

  function nudgeTimePart(parts, unit, delta, minuteStep = 5) {
    let { hour, minute, second } = parts;
    if (unit === 'meridiem') return { hour: (hour + 12) % 24, minute, second };
    if (unit === 'hour') return { hour: (hour + delta + 24) % 24, minute, second };
    if (unit === 'second') return { hour, minute, second: (second + delta + 60) % 60 };
    const step = Math.max(1, minuteStep);
    const next = minute + delta * step;
    if (next >= 60) {
      return { hour: (hour + Math.floor(next / 60)) % 24, minute: next % 60, second };
    }
    if (next < 0) {
      const borrow = Math.ceil(-next / 60);
      return {
        hour: (hour - borrow + 240) % 24,
        minute: ((next % 60) + 60) % 60,
        second,
      };
    }
    return { hour, minute: next, second };
  }

  function createShamarFlowbitePicker(cfg = {}) {
    const mode = cfg.mode || 'date';
    const withSeconds = !!cfg.seconds;
    const timeFormat = resolveTimeDisplayFormat(cfg.timeFormat);
    const minuteStep = resolveMinuteStep(cfg, withSeconds);
    let picker = null;
    let selectedWeekStart = null;

    return {
      name: cfg.name || '',
      mode,
      seconds: withSeconds,
      timeFormat,
      minuteStep,
      placeholder: cfg.placeholder || '',
      timeValue: '',
      timeDraft: '',
      timeMaskDigits: '',
      timeMaskMeridiem: '',
      timeOpen: false,
      hour: 0,
      minute: 0,
      second: 0,
      _syncing: false,
      _outsideClose: null,

      getValue: typeof cfg.getValue === 'function' ? cfg.getValue : () => '',
      setValue: typeof cfg.setValue === 'function' ? cfg.setValue : () => {},
      isDisabled: typeof cfg.isDisabled === 'function' ? cfg.isDisabled : () => false,

      async init() {
        try {
          await loadFlowbiteDatepicker();
        } catch {
          return;
        }
        this.syncTimeFromState();
        if (this.mode !== 'time') {
          this.initPicker();
        }
        this.bindOutsideClose();
        this.$watch(
          () => this.getValue(),
          () => {
            if (this._syncing) return;
            this.syncPickerFromState();
            this.syncTimeFromState();
          },
        );
      },

      destroy() {
        this.unbindOutsideClose();
        picker?.destroy?.();
        picker = null;
      },

      get disabled() {
        return !!this.isDisabled();
      },

      get defaultPlaceholder() {
        if (this.mode === 'time') return 'Select time';
        if (this.mode === 'datetime') return 'Select date and time';
        if (this.mode === 'week') return 'Select week';
        if (this.mode === 'month') return 'Select month';
        return 'Select date';
      },

      get timePlaceholder() {
        if (this.timeFormat === '12') {
          return withSeconds ? 'hh:mm:ss AM' : 'hh:mm AM';
        }
        return withSeconds ? 'HH:mm:ss' : 'HH:mm';
      },

      get stateValue() {
        const raw = this.getValue();
        return raw == null ? '' : String(raw);
      },

      get displayHour() {
        if (this.timeFormat === '12') {
          const h = this.hour % 24;
          const hour12 = h % 12 === 0 ? 12 : h % 12;
          return String(hour12);
        }
        return pad2(this.hour);
      },

      get meridiem() {
        return this.hour % 24 >= 12 ? 'PM' : 'AM';
      },

      padTime(n) {
        return pad2(n);
      },

      refreshTimeDraft() {
        if (!this.timeValue) {
          this.timeDraft = '';
          this.timeMaskDigits = '';
          this.timeMaskMeridiem = '';
          return;
        }
        const mask = timeMaskFromParts(
          { hour: this.hour, minute: this.minute, second: this.second },
          this.timeFormat,
          withSeconds,
        );
        this.timeMaskDigits = mask.digits;
        this.timeMaskMeridiem = mask.meridiem;
        this.timeDraft = formatTimeMaskDraft(
          mask.digits,
          mask.meridiem,
          this.timeFormat,
          withSeconds,
        );
      },

      buildDisplayFormat() {
        const self = this;
        return {
          toValue(date) {
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;
            if (self.mode === 'month') {
              return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
            }
            if (self.mode === 'week') {
              return isoWeekStart(date, 1).getTime();
            }
            return dateOnlyStamp(date);
          },
          toDisplay(date) {
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
            if (self.mode === 'week') {
              const start = isoWeekStart(date, 1);
              return `Week ${isoWeekNumber(start)}, ${start.getFullYear()}`;
            }
            if (self.mode === 'month') {
              return new Intl.DateTimeFormat(undefined, {
                year: 'numeric',
                month: 'long',
              }).format(date);
            }
            return new Intl.DateTimeFormat(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }).format(date);
          },
        };
      },

      buildPickerOptions() {
        // Keep in sync with packages/adonis/src/shamar/flowbite-picker.ts
        // Flowbite 1.3 resolves `container` via document.querySelector — Element refs break it.
        const opts = {
          autohide: this.mode === 'date' || this.mode === 'week' || this.mode === 'month',
          todayBtn: true,
          todayBtnMode: 1,
          todayHighlight: true,
          clearBtn: true,
          format: this.buildDisplayFormat(),
          orientation: 'bottom',
          weekStart: 1,
          container: 'body',
        };
        if (cfg.min) opts.minDate = cfg.min;
        if (cfg.max) opts.maxDate = cfg.max;

        if (this.mode === 'month') {
          opts.pickLevel = 1;
          opts.startView = 1;
        }

        if (this.mode === 'week') {
          opts.calendarWeeks = true;
          opts.beforeShowDay = (date) => {
            if (!selectedWeekStart) return undefined;
            const start = dateOnlyStamp(selectedWeekStart);
            const end = start + 6 * 86400000;
            const stamp = dateOnlyStamp(date);
            if (stamp >= start && stamp <= end) {
              return { classes: 'range bg-gray-200 dark:bg-gray-600' };
            }
            return undefined;
          };
        }

        return opts;
      },

      bindOutsideClose() {
        this.unbindOutsideClose();
        this._outsideClose = (ev) => {
          const target = ev.target;
          if (!(target instanceof Node)) return;

          if (this.timeOpen) {
            const timeWrap = this.$refs.timeWrap;
            if (!timeWrap || !timeWrap.contains(target)) {
              this.closeTime();
            }
          }

          if (!picker?.active) return;
          const input = this.$refs.dateInput;
          const pickerEl = picker.pickerElement;
          if (input && (target === input || input.contains(target))) return;
          if (pickerEl && pickerEl.contains(target)) return;
          picker.hide();
        };
        document.addEventListener('pointerdown', this._outsideClose, true);
      },

      unbindOutsideClose() {
        if (!this._outsideClose) return;
        document.removeEventListener('pointerdown', this._outsideClose, true);
        this._outsideClose = null;
      },

      onEscape() {
        if (this.timeOpen) {
          this.closeTime();
          return;
        }
        if (picker?.active) picker.hide();
      },

      initPicker() {
        const input = this.$refs.dateInput;
        if (!input || typeof window.Datepicker !== 'function') return;

        const options = this.buildPickerOptions();
        if (options.container != null && typeof options.container !== 'string') {
          throw new TypeError('Flowbite datepicker container must be a CSS selector string');
        }
        picker = new window.Datepicker(input, options);

        input.addEventListener('changeDate', (ev) => {
          if (this._syncing || this.disabled) return;
          const detailDate = ev.detail?.date;
          const picked = detailDate ?? picker.getDate?.();
          if (!picked) {
            this.commitState('');
            selectedWeekStart = null;
            return;
          }
          const date = picked instanceof Date ? picked : new Date(picked);
          if (Number.isNaN(date.getTime())) return;

          if (this.mode === 'week') {
            selectedWeekStart = isoWeekStart(date, 1);
            const next = formatPickerState(
              {
                year: selectedWeekStart.getFullYear(),
                month: selectedWeekStart.getMonth() + 1,
                day: selectedWeekStart.getDate(),
                hour: 0,
                minute: 0,
                second: 0,
              },
              'week',
              false,
            );
            this.commitState(next);
            this._syncing = true;
            picker.setDate(selectedWeekStart, { render: true });
            queueMicrotask(() => {
              this._syncing = false;
            });
            return;
          }

          if (this.mode === 'month') {
            const first = new Date(date.getFullYear(), date.getMonth(), 1);
            this.commitState(
              formatPickerState(
                {
                  year: first.getFullYear(),
                  month: first.getMonth() + 1,
                  day: first.getDate(),
                  hour: 0,
                  minute: 0,
                  second: 0,
                },
                'month',
                false,
              ),
            );
            return;
          }

          if (this.mode === 'datetime') {
            this.commitDateTime(date);
            return;
          }

          this.commitState(
            formatPickerState(
              {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                day: date.getDate(),
                hour: 0,
                minute: 0,
                second: 0,
              },
              'date',
              false,
            ),
          );
        });

        this.syncPickerFromState();
      },

      syncPickerFromState() {
        if (!picker) return;
        const raw = String(this.getValue() || '').trim();
        if (!raw) {
          picker.setDate({ clear: true });
          selectedWeekStart = null;
          return;
        }
        const bounds = parsePickerBounds(raw);
        if (!bounds) return;
        this._syncing = true;
        if (this.mode === 'week') {
          selectedWeekStart = isoWeekStart(bounds, 1);
          picker.setDate(selectedWeekStart);
        } else if (this.mode === 'month') {
          picker.setDate(new Date(bounds.getFullYear(), bounds.getMonth(), 1));
        } else {
          picker.setDate(bounds);
        }
        queueMicrotask(() => {
          this._syncing = false;
        });
      },

      syncTimeFromState() {
        if (this.mode !== 'datetime' && this.mode !== 'time') return;
        const parts = parsePickerValue(String(this.getValue() || ''), this.mode);
        if (!parts) {
          this.timeValue = '';
          this.timeDraft = '';
          this.hour = 0;
          this.minute = 0;
          this.second = 0;
          return;
        }
        this.hour = parts.hour;
        this.minute = parts.minute;
        this.second = parts.second;
        this.timeValue = withSeconds
          ? `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
          : `${pad2(parts.hour)}:${pad2(parts.minute)}`;
        this.refreshTimeDraft();
      },

      commitState(value) {
        this._syncing = true;
        this.setValue(value);
        queueMicrotask(() => {
          this._syncing = false;
        });
      },

      commitDateTime(datePart) {
        this.commitState(
          formatPickerState(
            {
              year: datePart.getFullYear(),
              month: datePart.getMonth() + 1,
              day: datePart.getDate(),
              hour: this.hour || 0,
              minute: this.minute || 0,
              second: this.second || 0,
            },
            'datetime',
            withSeconds,
          ),
        );
      },

      composeTimeValue() {
        return withSeconds
          ? `${pad2(this.hour)}:${pad2(this.minute)}:${pad2(this.second)}`
          : `${pad2(this.hour)}:${pad2(this.minute)}`;
      },

      applyTimeParts() {
        this.timeValue = this.composeTimeValue();
        this.refreshTimeDraft();
        this.onTimeChange();
      },

      openTimeAssist() {
        if (this.disabled) return;
        if (picker?.active) picker.hide();
        this.timeOpen = true;
      },

      toggleTime() {
        if (this.disabled) return;
        if (this.timeOpen) {
          this.closeTime();
          return;
        }
        if (!this.timeValue) {
          const now = new Date();
          this.hour = now.getHours();
          this.minute = now.getMinutes();
          this.second = withSeconds ? now.getSeconds() : 0;
          this.applyTimeParts();
        } else {
          this.refreshTimeDraft();
        }
        this.openTimeAssist();
      },

      closeTime() {
        this.timeOpen = false;
      },

      onTimeFocus() {
        this.openTimeAssist();
      },

      onTimeKeydown(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) return;

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          this.nudge('minute', 1);
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.nudge('minute', -1);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          this.commitTimeDraft();
          this.closeTime();
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          this.refreshTimeDraft();
          this.closeTime();
          return;
        }
        if (
          event.key === 'Tab' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight' ||
          event.key === 'Home' ||
          event.key === 'End'
        ) {
          return;
        }

        const result = applyTimeMaskKey(
          { digits: this.timeMaskDigits, meridiem: this.timeMaskMeridiem },
          event.key,
          this.timeFormat,
          withSeconds,
        );
        if (!result.handled) return;
        event.preventDefault();
        this.timeMaskDigits = result.digits;
        this.timeMaskMeridiem = result.meridiem;
        this.timeDraft = result.draft;

        const parsed = parseTimeMaskState(
          { digits: result.digits, meridiem: result.meridiem },
          this.timeFormat,
          withSeconds,
        );
        if (parsed) {
          this.hour = parsed.hour;
          this.minute = parsed.minute;
          this.second = withSeconds ? parsed.second : 0;
          this.applyTimeParts();
        }
      },

      onTimePaste(event) {
        event.preventDefault();
        const text = event.clipboardData?.getData('text') || '';
        const parsed = parseFlexibleTimeInput(text, this.timeFormat);
        if (!parsed) return;
        this.hour = parsed.hour;
        this.minute = parsed.minute;
        this.second = withSeconds ? parsed.second : 0;
        this.applyTimeParts();
      },

      commitTimeDraft() {
        if (this.disabled) return;
        const raw = String(this.timeDraft || '').trim();
        if (!raw) {
          this.clearTime({ keepOpen: true });
          return;
        }
        const fromMask = parseTimeMaskState(
          { digits: this.timeMaskDigits, meridiem: this.timeMaskMeridiem },
          this.timeFormat,
          withSeconds,
        );
        if (fromMask) {
          this.hour = fromMask.hour;
          this.minute = fromMask.minute;
          this.second = withSeconds ? fromMask.second : 0;
          this.applyTimeParts();
          return;
        }
        const need = timeMaskDigitCapacity(withSeconds);
        const typing =
          this.timeMaskDigits.length > 0 &&
          (this.timeMaskDigits.length < need ||
            (this.timeFormat === '12' && !this.timeMaskMeridiem));
        if (typing) {
          this.refreshTimeDraft();
          return;
        }
        const parsed = parseFlexibleTimeInput(raw, this.timeFormat);
        if (!parsed) {
          this.refreshTimeDraft();
          return;
        }
        this.hour = parsed.hour;
        this.minute = parsed.minute;
        this.second = withSeconds ? parsed.second : 0;
        this.applyTimeParts();
      },

      nudge(unit, delta) {
        if (this.disabled) return;
        if (!this.timeValue) {
          const now = new Date();
          this.hour = now.getHours();
          this.minute = now.getMinutes();
          this.second = withSeconds ? now.getSeconds() : 0;
        }
        const next = nudgeTimePart(
          { hour: this.hour, minute: this.minute, second: this.second },
          unit,
          delta,
          this.minuteStep,
        );
        this.hour = next.hour;
        this.minute = next.minute;
        this.second = next.second;
        this.applyTimeParts();
      },

      setTimeNow() {
        const now = new Date();
        this.hour = now.getHours();
        this.minute = now.getMinutes();
        this.second = withSeconds ? now.getSeconds() : 0;
        this.applyTimeParts();
      },

      clearTime(opts = {}) {
        this.hour = 0;
        this.minute = 0;
        this.second = 0;
        this.timeValue = '';
        this.timeDraft = '';
        this.timeMaskDigits = '';
        this.timeMaskMeridiem = '';
        if (this.mode === 'time') {
          this.commitState('');
          if (!opts.keepOpen) this.closeTime();
          return;
        }
        if (this.mode === 'datetime') {
          const parts = parsePickerValue(String(this.getValue() || ''), 'datetime');
          if (!parts) {
            this.commitState('');
            if (!opts.keepOpen) this.closeTime();
            return;
          }
          // Clear means drop time to midnight while keeping the date.
          parts.hour = 0;
          parts.minute = 0;
          parts.second = 0;
          this.timeValue = this.composeTimeValue();
          this.refreshTimeDraft();
          this.commitState(formatPickerState(parts, 'datetime', withSeconds));
        }
        if (!opts.keepOpen) this.closeTime();
      },

      onTimeChange() {
        if (this.disabled) return;
        if (this.mode === 'time') {
          this.commitState(this.timeValue || '');
          return;
        }
        if (this.mode === 'datetime') {
          const parts = parsePickerValue(String(this.getValue() || ''), 'datetime');
          const now = new Date();
          const base = parts || {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            hour: 0,
            minute: 0,
            second: 0,
          };
          base.hour = this.hour || 0;
          base.minute = this.minute || 0;
          base.second = this.second || 0;
          this.commitState(formatPickerState(base, 'datetime', withSeconds));
        }
      },
    };
  }

  window.shamarFlowbitePicker = createShamarFlowbitePicker;
  window.shamarDatePicker = createShamarFlowbitePicker;

  /**
   * Dropdown menu that uses position:fixed so it escapes overflow:hidden /
   * overflow:auto ancestors (list tables, cards, scroll roots).
   */
  function createShamarFloatingMenu() {
    return {
      open: false,
      panelStyle: {},

      init() {
        bindFixedDropdownListeners(this);
      },

      destroy() {
        unbindFixedDropdownListeners(this);
      },

      toggle() {
        if (this.open) {
          this.close();
          return;
        }
        this.open = true;
        this.$nextTick(() => this.repositionDropdown());
      },

      close() {
        this.open = false;
        this.panelStyle = {};
      },

      repositionDropdown() {
        const trigger = this.$refs.trigger;
        const panel = this.$refs.panel;
        if (!trigger) return;
        const width = panel?.offsetWidth || 152;
        this.panelStyle = {
          ...fixedDropdownStyle(trigger, panel, {
            width,
            align: 'end',
            maxHeight: Math.min(panel?.offsetHeight || 320, window.innerHeight - 16),
            zIndex: 1100,
          }),
          // Keep natural panel width instead of stretching to trigger width.
          width: `${Math.round(width)}px`,
          minWidth: '9.5rem',
        };
      },
    };
  }

  window.shamarFloatingMenu = createShamarFloatingMenu;

  const MEDIA_DND_MIME = 'application/x-shamar-media';
  const MEDIA_CLIPBOARD_KEY = 'shamar-media-clipboard';

  function normalizeMediaClipboard(parsed) {
    if (!parsed?.mode) return null;
    if (Array.isArray(parsed.items) && parsed.items.length) {
      return {
        mode: parsed.mode,
        items: parsed.items.filter((item) => item?.kind && item?.id),
      };
    }
    if (parsed.kind && parsed.id) {
      return {
        mode: parsed.mode,
        items: [{ kind: parsed.kind, id: parsed.id, name: parsed.name }],
      };
    }
    return null;
  }

  function readMediaClipboard() {
    try {
      const raw = sessionStorage.getItem(MEDIA_CLIPBOARD_KEY);
      if (!raw) return null;
      return normalizeMediaClipboard(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function writeMediaClipboard(value) {
    if (!value) {
      sessionStorage.removeItem(MEDIA_CLIPBOARD_KEY);
      return;
    }
    const normalized = normalizeMediaClipboard(value);
    if (!normalized?.items?.length) {
      sessionStorage.removeItem(MEDIA_CLIPBOARD_KEY);
      return;
    }
    sessionStorage.setItem(MEDIA_CLIPBOARD_KEY, JSON.stringify(normalized));
  }

  const MEDIA_VIEW_MODES = ['icons', 'tiles', 'list', 'details'];
  const MEDIA_SORT_COLUMNS = ['name', 'type', 'size', 'visibility'];

  function readMediaViewMode() {
    try {
      const mode = localStorage.getItem('shamar-media-view-mode');
      return MEDIA_VIEW_MODES.includes(mode) ? mode : 'icons';
    } catch {
      return 'icons';
    }
  }

  function readMediaSortColumn() {
    try {
      const col = localStorage.getItem('shamar-media-sort-column');
      return MEDIA_SORT_COLUMNS.includes(col) ? col : 'name';
    } catch {
      return 'name';
    }
  }

  function readMediaSortDirection() {
    try {
      const dir = localStorage.getItem('shamar-media-sort-direction');
      return dir === 'desc' ? 'desc' : 'asc';
    } catch {
      return 'asc';
    }
  }

  function createShamarMediaManager(cfg = {}) {
    return {
      apiBase: cfg.apiBase || '/admin/media',
      folderId: cfg.folderId ?? null,
      folders: Array.isArray(cfg.folders) ? cfg.folders : [],
      folderTree: Array.isArray(cfg.folderTree) ? cfg.folderTree : [],
      files: (Array.isArray(cfg.files) ? cfg.files : []).map((file) => ({
        ...file,
        visibility: file.visibility === 'public' ? 'public' : 'private',
      })),
      breadcrumbs: Array.isArray(cfg.breadcrumbs) ? cfg.breadcrumbs : [],
      viewMode: readMediaViewMode(),
      sortColumn: readMediaSortColumn(),
      sortDirection: readMediaSortDirection(),
      expandedIds: {},
      dragover: null,
      dropTarget: null,
      status: '',
      selection: [],
      details: null,
      clipboard: readMediaClipboard(),
      menu: { open: false, style: {}, kind: null, item: null },
      _menuOpenedAt: 0,
      _selectionAnchor: null,
      _dragging: null,

      init() {
        this.clipboard = readMediaClipboard();
        this.syncExpandedFromPath();
      },

      setViewMode(mode) {
        if (!MEDIA_VIEW_MODES.includes(mode)) return;
        this.viewMode = mode;
        try {
          localStorage.setItem('shamar-media-view-mode', mode);
        } catch {
          /* ignore */
        }
      },

      toggleSort(column) {
        if (!MEDIA_SORT_COLUMNS.includes(column)) return;
        if (this.sortColumn === column) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = column;
          this.sortDirection = 'asc';
        }
        try {
          localStorage.setItem('shamar-media-sort-column', this.sortColumn);
          localStorage.setItem('shamar-media-sort-direction', this.sortDirection);
        } catch {
          /* ignore */
        }
      },

      sortIndicator(column) {
        if (this.sortColumn !== column) return '';
        return this.sortDirection === 'asc' ? '↑' : '↓';
      },

      isSorted(column) {
        return this.sortColumn === column;
      },

      typeSortKey(row) {
        return row.kind === 'folder' ? 'Folder' : this.fileTypeLabel(row.item);
      },

      sizeSortKey(row) {
        return row.kind === 'folder' ? -1 : Number(row.item.size) || 0;
      },

      visibilitySortKey(row) {
        if (row.kind === 'folder') return -1;
        return row.item.visibility === 'public' ? 1 : 0;
      },

      browseItemsRaw() {
        const rows = [];
        for (const item of this.folders || []) {
          rows.push({ kind: 'folder', item, key: `folder:${item.id}` });
        }
        for (const item of this.files || []) {
          rows.push({ kind: 'file', item, key: `file:${item.id}` });
        }
        return rows;
      },

      defaultBrowseItems() {
        const folders = [...(this.folders || [])].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }),
        );
        const files = [...(this.files || [])].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }),
        );
        return [
          ...folders.map((item) => ({ kind: 'folder', item, key: `folder:${item.id}` })),
          ...files.map((item) => ({ kind: 'file', item, key: `file:${item.id}` })),
        ];
      },

      sortBrowseItems(rows) {
        const dir = this.sortDirection === 'desc' ? -1 : 1;
        const col = this.sortColumn;
        return [...rows].sort((a, b) => {
          let cmp = 0;
          if (col === 'type') {
            cmp = this.typeSortKey(a).localeCompare(this.typeSortKey(b), undefined, {
              sensitivity: 'base',
            });
          } else if (col === 'size') {
            cmp = this.sizeSortKey(a) - this.sizeSortKey(b);
          } else if (col === 'visibility') {
            cmp = this.visibilitySortKey(a) - this.visibilitySortKey(b);
          } else {
            cmp = String(a.item.name || '').localeCompare(String(b.item.name || ''), undefined, {
              sensitivity: 'base',
            });
          }
          if (cmp === 0) {
            cmp = String(a.item.name || '').localeCompare(String(b.item.name || ''), undefined, {
              sensitivity: 'base',
            });
          }
          return cmp * dir;
        });
      },

      sortedBrowseItems() {
        if (this.viewMode === 'icons' || this.viewMode === 'tiles') {
          return this.defaultBrowseItems();
        }
        return this.sortBrowseItems(this.browseItemsRaw());
      },

      selectionKey(kind, id) {
        return `${kind}:${id}`;
      },

      isItemSelected(kind, id) {
        const key = this.selectionKey(kind, id);
        return this.selection.some((entry) => this.selectionKey(entry.kind, entry.id) === key);
      },

      primarySelection() {
        return this.selection.length ? this.selection[this.selection.length - 1] : null;
      },

      browseItems() {
        return this.sortedBrowseItems();
      },

      clearSelection() {
        this.selection = [];
        this._selectionAnchor = null;
      },

      selectionLabel() {
        const n = this.selection.length;
        if (!n) return '';
        if (n === 1) return this.selection[0].item?.name || '1 item';
        return `${n} items selected`;
      },

      selectedFiles() {
        return this.selection.filter((entry) => entry.kind === 'file');
      },

      fileTypeLabel(item) {
        if (!item) return '—';
        const mime = String(item.mime || '');
        if (!mime) return 'File';
        const parts = mime.split('/');
        if (parts[1]) return `${parts[1].toUpperCase()} file`;
        return parts[0];
      },

      onItemClick(event, kind, item) {
        const normalized = kind === 'file' ? this.normalizeFileItem(item) : item;
        const rows = this.browseItems();
        const index = rows.findIndex(
          (row) => row.kind === kind && String(row.item.id) === String(item.id),
        );
        const entry = { kind, id: normalized.id, item: normalized };

        if (event.shiftKey && this._selectionAnchor != null && index >= 0) {
          const start = Math.min(this._selectionAnchor, index);
          const end = Math.max(this._selectionAnchor, index);
          const range = rows.slice(start, end + 1).map((row) => ({
            kind: row.kind,
            id: row.item.id,
            item: row.kind === 'file' ? this.normalizeFileItem(row.item) : row.item,
          }));
          if (event.metaKey || event.ctrlKey) {
            const map = new Map(
              this.selection.map((sel) => [this.selectionKey(sel.kind, sel.id), sel]),
            );
            for (const sel of range) map.set(this.selectionKey(sel.kind, sel.id), sel);
            this.selection = [...map.values()];
          } else {
            this.selection = range;
          }
        } else if (event.metaKey || event.ctrlKey) {
          if (this.isItemSelected(kind, item.id)) {
            this.selection = this.selection.filter(
              (sel) => !(sel.kind === kind && String(sel.id) === String(item.id)),
            );
          } else {
            this.selection = [...this.selection, entry];
          }
          this._selectionAnchor = index;
        } else {
          this.selection = [entry];
          this._selectionAnchor = index;
        }
        this.closeMenu();
      },

      selectAllItems() {
        this.selection = this.browseItems().map((row) => ({
          kind: row.kind,
          id: row.item.id,
          item: row.kind === 'file' ? this.normalizeFileItem(row.item) : row.item,
        }));
        this._selectionAnchor = 0;
      },

      clipboardLabel() {
        const clip = this.clipboard || readMediaClipboard();
        if (!clip?.items?.length) return '';
        const verb = clip.mode === 'cut' ? 'Cut' : 'Copied';
        if (clip.items.length === 1) {
          return `${verb}: ${clip.items[0].name || clip.items[0].id}`;
        }
        return `${verb}: ${clip.items.length} items`;
      },

      /** Expand ancestors + current folder so the open path is visible. */
      syncExpandedFromPath() {
        const next = { ...this.expandedIds };
        for (const crumb of this.breadcrumbs || []) {
          if (crumb?.id != null) next[String(crumb.id)] = true;
        }
        if (this.folderId != null) next[String(this.folderId)] = true;
        this.expandedIds = next;
      },

      isExpanded(id) {
        return !!this.expandedIds[String(id)];
      },

      toggleExpand(id, event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const key = String(id);
        this.expandedIds = {
          ...this.expandedIds,
          [key]: !this.expandedIds[key],
        };
      },

      foldersByParent() {
        const folders = Array.isArray(this.folderTree) ? this.folderTree : [];
        const byParent = new Map();
        for (const folder of folders) {
          const key = folder.parentId == null ? '' : String(folder.parentId);
          if (!byParent.has(key)) byParent.set(key, []);
          byParent.get(key).push(folder);
        }
        for (const list of byParent.values()) {
          list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        }
        return byParent;
      },

      /**
       * Visible tree rows: top-level folders always, plus children of expanded nodes.
       * The open path is auto-expanded via syncExpandedFromPath().
       */
      treeNodes() {
        const byParent = this.foldersByParent();
        const out = [];
        const walk = (parentId, depth) => {
          const key = parentId == null ? '' : String(parentId);
          for (const folder of byParent.get(key) || []) {
            const childKey = String(folder.id);
            const hasChildren = (byParent.get(childKey) || []).length > 0;
            const expanded = hasChildren && this.isExpanded(folder.id);
            out.push({ ...folder, depth, hasChildren, expanded });
            if (expanded) walk(folder.id, depth + 1);
          }
        };
        walk(null, 0);
        return out;
      },

      humanSize(bytes) {
        const n = Number(bytes) || 0;
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
      },

      humanSizeExact(bytes) {
        const n = Number(bytes) || 0;
        return `${n.toLocaleString()} bytes`;
      },

      formatDate(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      },

      fileExtension(name) {
        const base = String(name || '');
        const idx = base.lastIndexOf('.');
        if (idx <= 0 || idx === base.length - 1) return '';
        return base.slice(idx + 1).toUpperCase();
      },

      detailsLocation() {
        const parts = ['Library', ...(this.breadcrumbs || []).map((crumb) => crumb.name)];
        return parts.filter(Boolean).join(' › ');
      },

      detailsDimensions() {
        if (!this.details?.width || !this.details?.height) return null;
        return `${this.details.width} × ${this.details.height} px`;
      },

      async copyDetailsUrl() {
        if (!this.details?.url) return;
        try {
          await navigator.clipboard.writeText(this.details.url);
          this.status = 'URL copied to clipboard';
        } catch {
          this.status = 'Unable to copy URL';
        }
      },

      isCutItem(kind, id) {
        const clip = this.clipboard || readMediaClipboard();
        if (!clip || clip.mode !== 'cut') return false;
        return (clip.items || []).some(
          (item) => item.kind === kind && String(item.id) === String(id),
        );
      },

      openDetails(item) {
        if (!item) return;
        const file = this.normalizeFileItem(item);
        this.selection = [{ kind: 'file', id: file.id, item: file }];
        this.closeMenu();
        this.details = { ...file };
      },

      openDetailsFromMenu() {
        const item = this.menu.item;
        this.closeMenu();
        if (item) this.openDetails(item);
      },

      closeDetails() {
        this.details = null;
      },

      closeMenu() {
        if (this.menu?.open) this.menu.open = false;
      },

      onMenuOutside() {
        if (Date.now() - (this._menuOpenedAt || 0) < 400) return;
        this.closeMenu();
      },

      menuStyleAt(clientX, clientY) {
        const pad = 8;
        const estWidth = 190;
        const estHeight = 320;
        let left = Number(clientX) || 0;
        let top = Number(clientY) || 0;
        if (left + estWidth > window.innerWidth - pad) left = window.innerWidth - estWidth - pad;
        if (top + estHeight > window.innerHeight - pad) top = window.innerHeight - estHeight - pad;
        return {
          position: 'fixed',
          top: `${Math.max(pad, top)}px`,
          left: `${Math.max(pad, left)}px`,
          zIndex: '2000',
        };
      },

      normalizeFileItem(item) {
        if (!item) return item;
        return {
          ...item,
          visibility: item.visibility === 'public' ? 'public' : 'private',
        };
      },

      menuTargets() {
        if (this.selection.length) return this.selection;
        if (this.menu.item && this.menu.kind) {
          return [
            {
              kind: this.menu.kind,
              id: this.menu.item.id,
              item: this.menu.item,
            },
          ];
        }
        return [];
      },

      syncDetails() {
        if (!this.details) return;
        const updated = (this.files || []).find(
          (file) => String(file.id) === String(this.details.id),
        );
        if (updated) this.details = this.normalizeFileItem(updated);
        else this.details = null;
      },

      async refreshFolderTree() {
        const res = await fetch(`${this.apiBase}/folders`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        this.folderTree = data.folders || [];
      },

      async refresh() {
        const params = new URLSearchParams({ format: 'json' });
        if (this.folderId) params.set('folderId', this.folderId);
        const res = await fetch(`${this.apiBase}/browse?${params}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          this.status = 'Unable to load library';
          return;
        }
        const data = await res.json();
        this.folders = data.folders || [];
        this.files = (data.files || []).map((file) => this.normalizeFileItem(file));
        this.breadcrumbs = data.breadcrumbs || [];
        this.folderId = data.folder?.id ?? null;
        this.clipboard = readMediaClipboard();
        this.syncDetails();
        this.pruneSelection();
        await this.refreshFolderTree();
        this.syncExpandedFromPath();
      },

      pruneSelection() {
        const folderIds = new Set((this.folders || []).map((folder) => String(folder.id)));
        const fileIds = new Set((this.files || []).map((file) => String(file.id)));
        this.selection = this.selection.filter(
          (entry) =>
            (entry.kind === 'folder' && folderIds.has(String(entry.id))) ||
            (entry.kind === 'file' && fileIds.has(String(entry.id))),
        );
      },

      goFolder(id) {
        const url = new URL(window.location.href);
        if (id) url.searchParams.set('folderId', id);
        else url.searchParams.delete('folderId');
        window.location.href = url.toString();
      },

      async promptNewFolder(parentId = this.folderId) {
        const name = window.prompt('Folder name');
        if (!name?.trim()) return;
        this.status = 'Creating folder…';
        const res = await fetch(`${this.apiBase}/folders`, {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
          body: JSON.stringify({ name: name.trim(), parentId: parentId ?? null }),
        });
        this.status = '';
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          this.status = body.message || 'Unable to create folder';
          return;
        }
        await this.refresh();
      },

      async uploadFiles(fileList, targetFolderId = this.folderId) {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        this.status = `Uploading ${files.length} file(s)…`;
        const body = new FormData();
        if (targetFolderId) body.append('folderId', targetFolderId);
        for (const file of files) body.append('file', file);
        const res = await fetch(`${this.apiBase}/upload`, {
          method: 'POST',
          headers: csrfHeaders({ Accept: 'application/json' }),
          body,
        });
        this.status = '';
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          this.status = payload.message || 'Upload failed';
          return;
        }
        if (String(targetFolderId ?? '') === String(this.folderId ?? '')) {
          await this.refresh();
        } else {
          this.goFolder(targetFolderId);
        }
      },

      onUpload(event) {
        this.uploadFiles(event.target.files);
        event.target.value = '';
      },

      openFile(item) {
        if (item?.url) window.open(item.url, '_blank', 'noopener');
      },

      parseDragPayload(event) {
        const raw =
          event.dataTransfer?.getData(MEDIA_DND_MIME) ||
          event.dataTransfer?.getData('text/plain') ||
          '';
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.items?.length) return parsed;
          if (parsed?.kind && parsed?.id) return parsed;
          return null;
        } catch {
          return null;
        }
      },

      dragItemsFromPayload(payload) {
        if (!payload) return [];
        if (Array.isArray(payload.items)) return payload.items;
        if (payload.kind && payload.id) return [payload];
        return [];
      },

      async moveDragItemsTo(folderId, payload) {
        const items = this.dragItemsFromPayload(payload);
        if (!items.length) return;
        let failed = false;
        for (const item of items) {
          if (item.kind === 'folder' && String(item.id) === String(folderId ?? '')) {
            this.status = 'Cannot move a folder into itself';
            failed = true;
            continue;
          }
          const ok = await this.moveItemTo(item.kind, item.id, folderId, { refresh: false });
          if (!ok) failed = true;
        }
        await this.refresh();
        if (!failed && this.clipboard?.mode === 'cut') {
          const cutIds = new Set(
            (this.clipboard.items || []).map((entry) => this.selectionKey(entry.kind, entry.id)),
          );
          const movedIds = new Set(items.map((entry) => this.selectionKey(entry.kind, entry.id)));
          const remaining = (this.clipboard.items || []).filter(
            (entry) => !movedIds.has(this.selectionKey(entry.kind, entry.id)),
          );
          if (remaining.length) writeMediaClipboard({ mode: 'cut', items: remaining });
          else this.clearClipboard();
          if ([...movedIds].some((id) => cutIds.has(id))) this.clearSelection();
        }
      },

      onDragStart(event, kind, item) {
        if (!this.isItemSelected(kind, item.id)) {
          this.onItemClick({ metaKey: false, ctrlKey: false, shiftKey: false }, kind, item);
        }
        const dragItems =
          this.selection.length > 1
            ? this.selection.map((entry) => ({
                kind: entry.kind,
                id: entry.id,
                name: entry.item?.name,
              }))
            : [{ kind, id: item.id, name: item.name }];
        this._dragging = dragItems.length === 1 ? dragItems[0] : { items: dragItems };
        this.closeMenu();
        const payload = JSON.stringify(this._dragging);
        event.dataTransfer.setData(MEDIA_DND_MIME, payload);
        event.dataTransfer.setData('text/plain', payload);
        event.dataTransfer.effectAllowed = 'move';
      },

      onDragEnd() {
        this._dragging = null;
        this.dragover = null;
        this.dropTarget = null;
      },

      onDragOverTarget(event, targetKey, _folderId) {
        const hasFiles = Array.from(event.dataTransfer?.types || []).includes('Files');
        const hasMedia =
          Array.from(event.dataTransfer?.types || []).includes(MEDIA_DND_MIME) ||
          !!this._dragging;
        if (!hasFiles && !hasMedia) return;
        event.dataTransfer.dropEffect = hasFiles ? 'copy' : 'move';
        this.dropTarget = targetKey;
        this.dragover = hasFiles ? 'upload' : 'move';
      },

      clearDropTarget() {
        this.dropTarget = null;
      },

      onCanvasDragOver(event) {
        const types = Array.from(event.dataTransfer?.types || []);
        if (types.includes('Files')) {
          this.dragover = 'upload';
          event.dataTransfer.dropEffect = 'copy';
          return;
        }
        if (types.includes(MEDIA_DND_MIME) || this._dragging) {
          this.dragover = 'move';
          event.dataTransfer.dropEffect = 'move';
        }
      },

      onCanvasDragLeave(event) {
        if (event.currentTarget && !event.currentTarget.contains(event.relatedTarget)) {
          this.dragover = null;
        }
      },

      async onCanvasDrop(event) {
        this.dragover = null;
        this.dropTarget = null;
        const files = event.dataTransfer?.files;
        if (files && files.length) {
          await this.uploadFiles(files, this.folderId);
          return;
        }
        const payload = this.parseDragPayload(event) || this._dragging;
        if (payload) await this.moveDragItemsTo(this.folderId, payload);
      },

      async onDropOnTarget(event, targetFolderId) {
        this.dragover = null;
        this.dropTarget = null;
        const files = event.dataTransfer?.files;
        if (files && files.length) {
          await this.uploadFiles(files, targetFolderId);
          return;
        }
        const payload = this.parseDragPayload(event) || this._dragging;
        if (payload) await this.moveDragItemsTo(targetFolderId, payload);
      },

      async moveItemTo(kind, id, folderId, options = {}) {
        const path =
          kind === 'folder'
            ? `${this.apiBase}/folders/${id}/move`
            : `${this.apiBase}/files/${id}/move`;
        if (!options.refresh) this.status = 'Moving…';
        const res = await fetch(path, {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
          body: JSON.stringify({ folderId }),
        });
        if (!options.refresh) this.status = '';
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          this.status = body.message || 'Move failed';
          return false;
        }
        if (options.refresh !== false) await this.refresh();
        return true;
      },

      openMenu(event, kind, item) {
        event.preventDefault();
        event.stopPropagation();
        const normalized = kind === 'file' ? this.normalizeFileItem(item) : item;
        if (!this.isItemSelected(kind, item.id)) {
          this.selection = [{ kind, id: normalized.id, item: normalized }];
        }
        this._menuOpenedAt = Date.now();
        this.menu = {
          open: true,
          kind,
          item: normalized,
          style: this.menuStyleAt(event.clientX, event.clientY),
        };
      },

      openEmptyMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        this._menuOpenedAt = Date.now();
        this.menu = {
          open: true,
          kind: null,
          item: null,
          style: this.menuStyleAt(event.clientX, event.clientY),
        };
      },

      openFromMenu() {
        const item = this.menu.item;
        const kind = this.menu.kind;
        this.closeMenu();
        if (!item) return;
        if (kind === 'folder') this.goFolder(item.id);
        else this.openFile(item);
      },

      cutItem() {
        const targets = this.menuTargets();
        this.closeMenu();
        if (!targets.length) return;
        const items = targets.map((entry) => ({
          kind: entry.kind,
          id: entry.id,
          name: entry.item?.name,
        }));
        this.clipboard = { mode: 'cut', items };
        writeMediaClipboard(this.clipboard);
        this.status =
          items.length === 1
            ? `Cut “${items[0].name}” — paste into a folder`
            : `Cut ${items.length} items — paste into a folder`;
      },

      copyItem() {
        const targets = this.menuTargets().filter((entry) => entry.kind === 'file');
        this.closeMenu();
        if (!targets.length) {
          this.status = 'Only files can be copied';
          return;
        }
        const items = targets.map((entry) => ({
          kind: 'file',
          id: entry.id,
          name: entry.item?.name,
        }));
        this.clipboard = { mode: 'copy', items };
        writeMediaClipboard(this.clipboard);
        this.status =
          items.length === 1 ? `Copied “${items[0].name}”` : `Copied ${items.length} files`;
      },

      clearClipboard() {
        this.clipboard = null;
        writeMediaClipboard(null);
      },

      async pasteHere() {
        this.closeMenu();
        const clip = this.clipboard || readMediaClipboard();
        if (!clip?.items?.length) {
          this.status = 'Clipboard is empty';
          return;
        }
        if (clip.mode === 'cut') {
          let failed = false;
          for (const item of clip.items) {
            const ok = await this.moveItemTo(item.kind, item.id, this.folderId, { refresh: false });
            if (!ok) failed = true;
          }
          if (!failed) this.clearClipboard();
          await this.refresh();
          this.clearSelection();
          return;
        }
        const files = clip.items.filter((item) => item.kind === 'file');
        if (!files.length) {
          this.status = 'Only files can be pasted as copies';
          return;
        }
        this.status = 'Pasting…';
        let failed = false;
        for (const item of files) {
          const res = await fetch(`${this.apiBase}/files/${item.id}/copy`, {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
            body: JSON.stringify({ folderId: this.folderId }),
          });
          if (!res.ok) failed = true;
        }
        this.status = failed ? 'Some items could not be pasted' : '';
        await this.refresh();
      },

      async setVisibility(visibility, targets = null) {
        let items = targets;
        if (!items?.length) items = this.menuTargets();
        if (!items?.length && this.details) {
          items = [{ kind: 'file', id: this.details.id, item: this.details }];
        }
        items = items.filter((entry) => entry.kind === 'file');
        this.closeMenu();
        if (!items.length) return;
        this.status = visibility === 'public' ? 'Making public…' : 'Making private…';
        let failed = false;
        for (const entry of items) {
          const res = await fetch(`${this.apiBase}/files/${entry.id}/visibility`, {
            method: 'POST',
            headers: csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
            body: JSON.stringify({ visibility }),
          });
          if (!res.ok) failed = true;
        }
        this.status = failed ? 'Unable to update some items' : '';
        await this.refresh();
      },

      async bulkDelete() {
        const targets = this.selection.length ? this.selection : this.menuTargets();
        this.closeMenu();
        if (!targets.length) return;
        const label =
          targets.length === 1
            ? `Delete “${targets[0].item?.name}”?`
            : `Delete ${targets.length} items?`;
        if (!window.confirm(label)) return;
        let failed = false;
        for (const entry of targets) {
          const path =
            entry.kind === 'folder'
              ? `${this.apiBase}/folders/${entry.id}/delete`
              : `${this.apiBase}/files/${entry.id}/delete`;
          const res = await fetch(path, {
            method: 'POST',
            headers: csrfHeaders({ Accept: 'application/json' }),
          });
          if (!res.ok) failed = true;
        }
        this.clearSelection();
        this.details = null;
        await this.refresh();
        if (failed) this.status = 'Some items could not be deleted';
      },

      async bulkSetVisibility(visibility) {
        await this.setVisibility(visibility, this.selection);
      },

      async renameItem() {
        const primary = this.primarySelection() || this.menuTargets()[0];
        const kind = primary?.kind || this.menu.kind;
        const item = primary?.item || this.menu.item;
        this.closeMenu();
        if (!item || !kind) return;
        const name = window.prompt('Rename', item.name);
        if (!name?.trim() || name.trim() === item.name) return;
        const path =
          kind === 'folder'
            ? `${this.apiBase}/folders/${item.id}/rename`
            : `${this.apiBase}/files/${item.id}/rename`;
        const res = await fetch(path, {
          method: 'POST',
          headers: csrfHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
          body: JSON.stringify({ name: name.trim() }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          this.status = body.message || 'Rename failed';
          return;
        }
        await this.refresh();
      },

      async deleteItem() {
        await this.bulkDelete();
      },

      onKeydown(event) {
        const tag = String(event.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return;

        const meta = event.metaKey || event.ctrlKey;
        if (meta && event.key.toLowerCase() === 'a') {
          event.preventDefault();
          this.selectAllItems();
          return;
        }
        if (meta && event.key.toLowerCase() === 'x') {
          event.preventDefault();
          if (this.selection.length) this.cutItem();
          return;
        }
        if (meta && event.key.toLowerCase() === 'c') {
          event.preventDefault();
          if (this.selection.length) this.copyItem();
          return;
        }
        if (meta && event.key.toLowerCase() === 'v') {
          event.preventDefault();
          this.pasteHere();
          return;
        }
        if (event.key === 'Escape') {
          if (this.menu.open) {
            this.closeMenu();
            return;
          }
          if (this.selection.length) {
            this.clearSelection();
            return;
          }
          if (this.details) {
            this.closeDetails();
            return;
          }
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
          if (!this.selection.length) return;
          event.preventDefault();
          this.bulkDelete();
        }
      },
    };
  }

  window.shamarMediaManager = createShamarMediaManager;

  function createShamarFilePicker(cfg = {}) {
    return {
      name: cfg.name || '',
      multiple: !!cfg.multiple,
      accept: cfg.accept || '',
      rootFolderId: cfg.folderId ?? null,
      apiBase: cfg.apiBase || '/admin/media',
      getValue: typeof cfg.getValue === 'function' ? cfg.getValue : () => null,
      setValue: typeof cfg.setValue === 'function' ? cfg.setValue : () => {},
      isDisabled: typeof cfg.isDisabled === 'function' ? cfg.isDisabled : () => false,
      makePublic: !!cfg.makePublic,

      open: false,
      folderId: cfg.folderId ?? null,
      browseFolders: [],
      browseFiles: [],
      browseBreadcrumbs: [],
      selectedItems: [],
      draftIds: [],
      uploading: false,
      uploadStatus: '',
      pickerDragover: false,

      get disabled() {
        return !!this.isDisabled();
      },

      acceptsImages() {
        const accept = String(this.accept || '');
        return /image\/|\.svg/i.test(accept);
      },

      isImageFile(file) {
        const mime = String(file?.mime || '').toLowerCase();
        if (mime.startsWith('image/') || file?.isImage) return true;
        return /\.svg$/i.test(String(file?.name || ''));
      },

      matchesAccept(file) {
        if (!this.accept) return true;
        if (this.acceptsImages()) return this.isImageFile(file);
        const tokens = String(this.accept)
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        if (!tokens.length) return true;
        const mime = String(file?.mime || '').toLowerCase();
        const name = String(file?.name || '').toLowerCase();
        return tokens.some((token) => {
          if (token.startsWith('.')) return name.endsWith(token);
          if (token.endsWith('/*')) return mime.startsWith(token.slice(0, -1));
          return mime === token;
        });
      },

      get selectedIds() {
        const raw = this.getValue();
        if (this.multiple) {
          if (Array.isArray(raw)) return raw.map(String);
          if (raw == null || raw === '') return [];
          return [String(raw)];
        }
        if (raw == null || raw === '') return [];
        return [String(raw)];
      },

      init() {
        this.hydrateSelected();
        this.$watch(
          () => this.getValue(),
          () => this.hydrateSelected(),
        );
      },

      async hydrateSelected() {
        const ids = this.selectedIds;
        if (!ids.length) {
          this.selectedItems = [];
          return;
        }
        const items = [];
        for (const id of ids) {
          try {
            const res = await fetch(`${this.apiBase}/files/${id}`, {
              headers: { Accept: 'application/json' },
            });
            if (!res.ok) continue;
            const data = await res.json();
            if (data.file) {
              items.push({
                ...data.file,
                isImage: this.isImageFile(data.file),
              });
            }
          } catch {
            /* ignore */
          }
        }
        this.selectedItems = items;
      },

      async openPicker() {
        if (this.disabled) return;
        this.open = true;
        this.folderId = this.rootFolderId;
        this.draftIds = [...this.selectedIds];
        await this.loadBrowse();
      },

      closePicker() {
        this.open = false;
        this.uploadStatus = '';
        this.pickerDragover = false;
      },

      acceptInputAttr() {
        const accept = String(this.accept || '').trim();
        return accept || undefined;
      },

      onPickerDragOver(event) {
        if (this.uploading) return;
        event.preventDefault();
        this.pickerDragover = true;
      },

      onPickerDragLeave(event) {
        if (event.currentTarget && !event.currentTarget.contains(event.relatedTarget)) {
          this.pickerDragover = false;
        }
      },

      onPickerDrop(event) {
        event.preventDefault();
        this.pickerDragover = false;
        if (this.uploading) return;
        this.uploadFiles(event.dataTransfer?.files);
      },

      onUploadInput(event) {
        this.uploadFiles(event.target.files);
        event.target.value = '';
      },

      async uploadFiles(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length || this.uploading) return;

        if (this.accept) {
          const rejected = files.filter((file) => {
            const fake = { name: file.name, mime: file.type };
            return !this.matchesAccept(fake);
          });
          if (rejected.length === files.length) {
            this.uploadStatus = 'Selected file type is not allowed';
            return;
          }
        }

        this.uploading = true;
        this.uploadStatus = `Uploading ${files.length} file(s)…`;
        const body = new FormData();
        if (this.folderId) body.append('folderId', this.folderId);
        if (this.makePublic) body.append('visibility', 'public');
        for (const file of files) body.append('file', file);

        try {
          const res = await fetch(`${this.apiBase}/upload`, {
            method: 'POST',
            headers: csrfHeaders({ Accept: 'application/json' }),
            body,
          });
          if (!res.ok) {
            const payload = await res.json().catch(() => ({}));
            this.uploadStatus = payload.message || 'Upload failed';
            return;
          }
          const data = await res.json();
          const uploaded = (data.files || [])
            .map((file) => ({ ...file, isImage: this.isImageFile(file) }))
            .filter((file) => this.matchesAccept(file));

          await this.loadBrowse();

          if (uploaded.length) {
            if (this.multiple) {
              const next = new Set(this.draftIds.map(String));
              for (const file of uploaded) next.add(String(file.id));
              this.draftIds = [...next];
            } else {
              this.draftIds = [String(uploaded[0].id)];
            }
            this.uploadStatus = `Uploaded ${uploaded.length} file(s)`;
          } else {
            this.uploadStatus = 'Upload complete — no matching files for this field';
          }
        } catch {
          this.uploadStatus = 'Upload failed';
        } finally {
          this.uploading = false;
          window.setTimeout(() => {
            if (this.uploadStatus.startsWith('Uploaded') || this.uploadStatus === 'Upload complete — no matching files for this field') {
              this.uploadStatus = '';
            }
          }, 2500);
        }
      },

      async loadBrowse() {
        const params = new URLSearchParams({ format: 'json' });
        if (this.folderId) params.set('folderId', this.folderId);
        // Prefer server-side image filter, but keep SVG-friendly client filter too
        // (browsers sometimes upload SVG as application/octet-stream).
        if (this.acceptsImages() && !/\.svg/i.test(String(this.accept || ''))) {
          params.set('mime', 'image/');
        }
        const res = await fetch(`${this.apiBase}/browse?${params}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        this.browseFolders = data.folders || [];
        const files = (data.files || []).map((f) => ({
          ...f,
          isImage: this.isImageFile(f),
        }));
        this.browseFiles = this.accept ? files.filter((f) => this.matchesAccept(f)) : files;
        this.browseBreadcrumbs = data.breadcrumbs || [];
      },

      goFolder(id) {
        this.folderId = id;
        this.loadBrowse();
      },

      isPicked(id) {
        return this.draftIds.includes(String(id));
      },

      togglePick(item) {
        const id = String(item.id);
        if (this.multiple) {
          if (this.draftIds.includes(id)) {
            this.draftIds = this.draftIds.filter((x) => x !== id);
          } else {
            this.draftIds = [...this.draftIds, id];
          }
        } else {
          this.draftIds = [id];
        }
      },

      /** Single-select: double-click confirms immediately. Multi-select: just toggle. */
      pickOnDoubleClick(item) {
        if (this.multiple) {
          this.togglePick(item);
          return;
        }
        this.draftIds = [String(item.id)];
        return this.confirmPick();
      },

      async confirmPick() {
        const ids = this.multiple ? this.draftIds : this.draftIds[0] ? [this.draftIds[0]] : [];
        if (this.makePublic && ids.length) {
          await Promise.all(
            ids.map(async (id) => {
              try {
                await fetch(`${this.apiBase}/files/${id}/visibility`, {
                  method: 'POST',
                  headers: csrfHeaders({
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  }),
                  body: JSON.stringify({ visibility: 'public' }),
                });
              } catch {
                /* ignore */
              }
            }),
          );
        }
        if (this.multiple) this.setValue(this.draftIds);
        else this.setValue(this.draftIds[0] || '');
        this.closePicker();
        this.hydrateSelected();
      },

      remove(id) {
        if (this.multiple) {
          this.setValue(this.selectedIds.filter((x) => x !== String(id)));
        } else {
          this.setValue('');
        }
      },

      clear() {
        this.setValue(this.multiple ? [] : '');
      },
    };
  }

  window.shamarFilePicker = createShamarFilePicker;

  function registerShamarAlpineComponents() {
    if (registerShamarAlpineComponents._done) return;
    registerShamarAlpineComponents._done = true;

    Alpine.data('shamarM2oFromEl', (el) => createShamarM2o(readM2oConfig(el)));
    Alpine.data('shamarM2o', (cfg) => createShamarM2o(cfg));
    Alpine.data('shamarM2mFromEl', (el) => createShamarM2m(readM2mConfig(el)));
    Alpine.data('shamarM2m', (cfg) => createShamarM2m(cfg));
    Alpine.data('shamarM2mCheckboxFromEl', (el) => createShamarM2mCheckbox(readM2mConfig(el)));
    Alpine.data('shamarM2mTableFromEl', (el) => createShamarM2mTable(readM2mConfig(el)));
    // Global fallback (same pattern as shamarShell) so x-data works even if
    // Alpine.data registration races; Alpine.data still preferred when available.
    window.shamarForm = createShamarForm;
    Alpine.data('shamarForm', (cfg) => createShamarForm(cfg));
    Alpine.data('shamarCombobox', (cfg) => createShamarCombobox(cfg));
    Alpine.data('shamarFlowbitePicker', (cfg) => createShamarFlowbitePicker(cfg));
    Alpine.data('shamarDatePicker', (cfg) => createShamarFlowbitePicker(cfg));
    window.shamarFlowbitePicker = createShamarFlowbitePicker;
    window.shamarDatePicker = createShamarFlowbitePicker;
    window.shamarFloatingMenu = createShamarFloatingMenu;
    Alpine.data('shamarFloatingMenu', () => createShamarFloatingMenu());
    Alpine.data('shamarMediaManager', (cfg) => createShamarMediaManager(cfg));
    Alpine.data('shamarFilePicker', (cfg) => createShamarFilePicker(cfg));
    Alpine.data('shamarRichEditor', (cfg) => createShamarRichEditor(cfg));
    Alpine.data('shamarCodeEditor', (cfg) => createShamarCodeEditor(cfg));
    Alpine.data('shamarMarkdownEditor', (cfg) => createShamarMarkdownEditor(cfg));

    window.shamarTabs = (active = 1) => ({ active: Number(active) || 1 });
    Alpine.data('shamarTabs', (active = 1) => window.shamarTabs(active));

    window.shamarWizard = (total = 1) => ({
      step: 1,
      total: Math.max(1, Number(total) || 1),
      next() {
        if (this.step < this.total) this.step += 1;
      },
      prev() {
        if (this.step > 1) this.step -= 1;
      },
    });
    Alpine.data('shamarWizard', (total = 1) => window.shamarWizard(total));

    window.shamarTags = (name) => ({
      name,
      add(input) {
        const value = String(input?.value || '').trim().replace(/,$/, '');
        if (!value) return;
        const current = Array.isArray(this.state?.[name]) ? [...this.state[name]] : [];
        if (!current.includes(value)) {
          this.state[name] = [...current, value];
          if (typeof this.onFieldChange === 'function') this.onFieldChange(name);
        }
        if (input) input.value = '';
      },
      remove(index) {
        const current = Array.isArray(this.state?.[name]) ? [...this.state[name]] : [];
        current.splice(index, 1);
        this.state[name] = current;
        if (typeof this.onFieldChange === 'function') this.onFieldChange(name);
      },
    });
    Alpine.data('shamarTags', (name) => window.shamarTags(name));

    Alpine.data('shamarListToolbar', (cfg = {}) => ({
      searchInput: '',
      chips: [],
      groupBy: cfg.groupBy || null,
      filtersLockedEmpty: cfg.filtersLockedEmpty === true,
      groupLockedEmpty: cfg.groupLockedEmpty === true,
      sort: cfg.sort || '',
      direction: cfg.direction || '',
      perPage:
        cfg.perPage === 'all' || Number(cfg.perPage) === Number(cfg.allPerPage)
          ? 'all'
          : String(cfg.perPage || cfg.defaultPerPage || 15),
      trashed: cfg.trashed || false,
      headers: Array.isArray(cfg.headers) ? cfg.headers : [],
      basePath: cfg.basePath || '',
      slug: cfg.slug || '',
      queryPrefix: cfg.queryPrefix || '',
      view: cfg.view || 'table',
      allPerPage: cfg.allPerPage || 1000,
      defaultPerPage: String(cfg.defaultPerPage || 15),
      panelOpen: false,
      groupOpen: false,
      openFilterField: null,
      m2oQuery: {},
      m2oResults: {},
      _searchGen: 0,
      _softReloading: false,
      init() {
        // Free-text search stays in the input — never becomes a chip.
        this.searchInput = (cfg.search || '').trim();
        const chips = [];
        const filters = Array.isArray(cfg.filters) ? cfg.filters : [];
        for (const chip of filters) {
          if (chip && chip.field) chips.push(chip);
        }
        this.chips = chips;
      },
      buildUrl() {
        const fieldChips = this.chips.filter((c) => c.field !== null);
        const prefix = this.queryPrefix || '';
        const path =
          this.view === 'kanban'
            ? `${this.basePath}/${this.slug}/kanban`
            : `${this.basePath}/${this.slug}`;
        const params = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.search : '',
        );
        if (prefix) {
          for (const key of [...params.keys()]) {
            if (key.startsWith(prefix)) params.delete(key);
          }
        } else {
          params.forEach((_value, key) => params.delete(key));
        }
        const search = (this.searchInput || '').trim();
        if (search) params.set(`${prefix}search`, search);
        if (this.sort) {
          params.set(`${prefix}sort`, this.sort);
          if (this.direction === 'asc' || this.direction === 'desc') {
            params.set(`${prefix}direction`, this.direction);
          }
        }
        if (this.perPage && this.perPage !== String(this.defaultPerPage || 15)) {
          params.set(`${prefix}perPage`, String(this.perPage));
        }
        if (fieldChips.length) {
          params.set(`${prefix}filters`, JSON.stringify(fieldChips));
        } else if (this.filtersLockedEmpty) {
          params.set(`${prefix}filters`, '[]');
        }
        if (this.groupBy) {
          params.set(`${prefix}groupBy`, this.groupBy);
        } else if (this.groupLockedEmpty) {
          params.set(`${prefix}groupBy`, '');
        }
        if (this.trashed === true || this.trashed === 'only' || this.trashed === '1') {
          params.set(`${prefix}trashed`, '1');
        }
        const qs = params.toString();
        return qs ? `${path}?${qs}` : path;
      },
      reload() {
        window.location.assign(this.buildUrl());
      },
      applyFilters() {
        const gen = ++this._searchGen;
        this.softReload(gen);
      },
      async softReload(gen) {
        const url = this.buildUrl();
        const input = this.$refs.listSearchInput;
        const keepFocus = Boolean(input && document.activeElement === input);
        const selStart = input?.selectionStart ?? null;
        const selEnd = input?.selectionEnd ?? null;

        try {
          history.replaceState(null, '', url);
        } catch {
          /* ignore */
        }

        this._softReloading = true;
        let res;
        try {
          res = await fetch(url, {
            credentials: 'same-origin',
            headers: {
              Accept: 'text/html',
              'X-Requested-With': 'XMLHttpRequest',
            },
          });
        } catch {
          this._softReloading = false;
          window.location.assign(url);
          return;
        }

        if (gen != null && gen !== this._searchGen) {
          this._softReloading = false;
          return;
        }

        if (!res.ok) {
          this._softReloading = false;
          window.location.assign(url);
          return;
        }

        const html = await res.text();
        if (gen != null && gen !== this._searchGen) {
          this._softReloading = false;
          return;
        }

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const newRoot = doc.querySelector('[data-shamar-list-root]');
        const curRoot = document.querySelector('[data-shamar-list-root]');
        if (!newRoot || !curRoot) {
          this._softReloading = false;
          window.location.assign(url);
          return;
        }

        const newTbody = newRoot.querySelector('tbody');
        const curTbody = curRoot.querySelector('tbody');
        if (newTbody && curTbody) {
          curTbody.innerHTML = newTbody.innerHTML;
          if (window.Alpine?.initTree) {
            window.Alpine.initTree(curTbody);
          }
        }

        const newPagination = newRoot.querySelector('[data-shamar-list-pagination]');
        const curPagination = curRoot.querySelector('[data-shamar-list-pagination]');
        if (newPagination && curPagination) {
          curPagination.replaceWith(document.importNode(newPagination, true));
          const nextPagination = curRoot.querySelector('[data-shamar-list-pagination]');
          if (nextPagination && window.Alpine?.initTree) {
            window.Alpine.initTree(nextPagination);
          }
        }

        for (const key of ['total', 'search', 'sort', 'direction']) {
          const attr = `data-shamar-${key}`;
          const value = newRoot.getAttribute(attr);
          if (value == null) curRoot.removeAttribute(attr);
          else curRoot.setAttribute(attr, value);
        }

        const listData = window.Alpine?.$data?.(curRoot);
        if (listData) {
          listData.total = Number(curRoot.getAttribute('data-shamar-total') || 0);
          if (typeof listData.clearSelection === 'function') {
            listData.clearSelection();
          } else if (typeof listData.refreshPageState === 'function') {
            listData.refreshPageState();
          }
        }

        this._softReloading = false;

        if (keepFocus && input) {
          input.focus();
          try {
            const len = input.value.length;
            input.setSelectionRange(
              selStart == null ? len : selStart,
              selEnd == null ? len : selEnd,
            );
          } catch {
            /* ignore */
          }
        }
      },
      onSearchChange() {
        const gen = ++this._searchGen;
        this.softReload(gen);
      },
      clearSearch() {
        this.searchInput = '';
        this.onSearchChange();
      },
      removeChip(i) {
        this.chips.splice(i, 1);
        this.filtersLockedEmpty = this.chips.length === 0;
        this.applyFilters();
      },
      clearAll() {
        this.chips = [];
        this.searchInput = '';
        this.groupBy = null;
        this.filtersLockedEmpty = true;
        this.groupLockedEmpty = true;
        this.panelOpen = false;
        this.groupOpen = false;
        this.openFilterField = null;
        this.reload();
      },
      clearGroupBy() {
        this.groupBy = null;
        this.groupLockedEmpty = true;
        this.groupOpen = false;
        this.applyFilters();
      },
      filterableHeaders() {
        return this.headers.filter(
          (h) => h.filter_kind === 'm2o' || h.filter_kind === 'boolean' || h.filter_kind === 'select',
        );
      },
      groupableHeaders() {
        return this.headers.filter(
          (h) => h.group_kind === 'm2o' || h.group_kind === 'boolean' || h.group_kind === 'select',
        );
      },
      toggleFilterField(name) {
        this.openFilterField = this.openFilterField === name ? null : name;
      },
      addBooleanFilter(h, value) {
        const field = h.filterField || h.name;
        this.chips = this.chips.filter((chip) => chip.field !== field);
        this.chips.push({
          field,
          op: '=',
          value,
          label: `${h.label}: ${value ? 'Yes' : 'No'}`,
        });
        this.filtersLockedEmpty = false;
        this.openFilterField = null;
        this.panelOpen = false;
        this.applyFilters();
      },
      addSelectFilter(h, opt) {
        const field = h.filterField || h.name;
        this.chips = this.chips.filter((chip) => chip.field !== field);
        this.chips.push({
          field,
          op: '=',
          value: opt.value,
          label: `${h.label}: ${opt.label}`,
        });
        this.filtersLockedEmpty = false;
        this.openFilterField = null;
        this.panelOpen = false;
        this.applyFilters();
      },
      async searchM2o(h) {
        const q = this.m2oQuery[h.name] || '';
        const fieldName = h.filterField || h.name;
        try {
          const url = `${this.basePath}/${this.slug}/relation-search?field=${encodeURIComponent(fieldName)}&q=${encodeURIComponent(q)}`;
          const res = await fetch(url, { headers: csrfHeaders() });
          if (!res.ok) throw new Error('fetch failed');
          const data = await res.json();
          this.m2oResults[h.name] = data.results || data.options || data || [];
        } catch {
          this.m2oResults[h.name] = [];
        }
      },
      addM2oFilter(h, opt) {
        const field = h.filterField || h.name;
        this.chips = this.chips.filter((chip) => chip.field !== field);
        this.chips.push({
          field,
          op: '=',
          value: opt.id,
          label: `${h.label}: ${opt.label}`,
        });
        this.filtersLockedEmpty = false;
        this.openFilterField = null;
        this.panelOpen = false;
        this.m2oQuery[h.name] = '';
        this.m2oResults[h.name] = [];
        this.applyFilters();
      },
      setGroupBy(name) {
        this.groupBy = name;
        this.groupLockedEmpty = false;
        this.groupOpen = false;
        this.panelOpen = false;
        this.applyFilters();
      },
      groupByLabel() {
        const h = this.headers.find((item) => item.name === this.groupBy);
        return h ? h.label : this.groupBy;
      },
    }));

    Alpine.data('shamarListSelection', () => ({
      selected: [],
      selectAllMatching: false,
      total: 0,
      pageFullySelected: false,
      bulkOpen: false,
      init() {
        const root = this.$el;
        this.total = Number(root?.getAttribute?.('data-shamar-total') || 0);
        this.$watch('selected', () => this.refreshPageState());
        this.refreshPageState();
      },
      pageIds() {
        return Array.from(document.querySelectorAll('[data-shamar-record-id]'))
          .map((row) => row.getAttribute('data-shamar-record-id'))
          .filter(Boolean)
          .map(String);
      },
      refreshPageState() {
        if (this.selectAllMatching) {
          this.pageFullySelected = true;
          return;
        }
        const ids = this.pageIds();
        this.pageFullySelected =
          ids.length > 0 && ids.every((id) => this.selected.includes(id));
      },
      toggleId(id) {
        this.selectAllMatching = false;
        const value = String(id);
        if (this.selected.includes(value)) {
          this.selected = this.selected.filter((item) => item !== value);
        } else {
          this.selected = [...this.selected, value];
        }
      },
      toggleAll(checked) {
        this.selectAllMatching = false;
        const ids = this.pageIds();
        this.selected = checked ? ids : [];
      },
      selectAllInResultSet() {
        this.selectAllMatching = true;
        this.selected = this.pageIds();
        this.pageFullySelected = true;
      },
      clearSelection() {
        this.selectAllMatching = false;
        this.selected = [];
        this.pageFullySelected = false;
        this.bulkOpen = false;
      },
      submitBulk(url, action, confirmMessage) {
        if (!this.selected.length && !this.selectAllMatching) return;
        this.bulkOpen = false;
        const countLabel = this.selectAllMatching ? this.total : this.selected.length;
        const run = () => this.executeBulk(url, action);
        if (confirmMessage) {
          window.dispatchEvent(
            new CustomEvent('shamar-open-confirm', {
              detail: {
                title: 'Confirm',
                message: String(confirmMessage).replace('%d', String(countLabel)),
                variant: action === 'delete' ? 'danger' : 'primary',
                confirmLabel: action === 'delete' ? 'Delete' : 'Confirm',
                onConfirm: run,
              },
            }),
          );
          return;
        }
        run();
      },
      executeBulk(url, action) {
        const root = this.$el;
        const form = document.createElement('form');
        form.method = 'post';
        form.action = url;
        const token = csrfToken();
        if (token) {
          const csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = '_csrf';
          csrfInput.value = token;
          form.appendChild(csrfInput);
        }
        const actionInput = document.createElement('input');
        actionInput.type = 'hidden';
        actionInput.name = 'action';
        actionInput.value = action;
        form.appendChild(actionInput);
        if (this.selectAllMatching) {
          const selectAllInput = document.createElement('input');
          selectAllInput.type = 'hidden';
          selectAllInput.name = 'selectAll';
          selectAllInput.value = '1';
          form.appendChild(selectAllInput);
          for (const key of ['search', 'sort', 'direction', 'trashed']) {
            const value = root?.getAttribute?.(`data-shamar-${key}`) || '';
            if (!value || value === 'false' || value === 'undefined') continue;
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
          }
        } else {
          for (const id of this.selected) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'ids';
            input.value = id;
            form.appendChild(input);
          }
        }
        document.body.appendChild(form);
        form.submit();
      },
    }));

    Alpine.data('shamarDialogHost', () => ({
      open: false,
      loading: false,
      confirmMode: false,
      promptMode: 'confirm',
      promptVariant: 'danger',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      title: '',
      fullPageUrl: '',
      confirmAction: '',
      confirmMessage: '',
      secretText: '',
      secretCopied: false,
      fullscreen: false,
      x: 0,
      y: 0,
      /** Default record dialog ≈ Tailwind max-w-6xl (72rem). */
      width: 1152,
      height: 720,
      minWidth: 560,
      minHeight: 320,
      dragging: false,
      resizing: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      resizeStartX: 0,
      resizeStartY: 0,
      resizeStartW: 0,
      resizeStartH: 0,
      resourceSlug: '',
      dialogStack: [],
      currentEmbedUrl: '',
      hasContentFooter: false,
      _previousFocus: null,
      _confirmCallback: null,

      focusables() {
        const root = this.$refs.panel;
        if (!root) return [];
        return Array.from(
          root.querySelectorAll(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      },

      trapFocus(event) {
        if (!this.open) return;
        const items = this.focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      },

      focusDialog() {
        this.$nextTick(() => {
          const items = this.focusables();
          const preferred =
            this.bodyEl()?.querySelector('input,select,textarea,button') ||
            this.$refs.closeBtn ||
            items[0];
          preferred?.focus?.();
        });
      },

      panelEl() {
        return this.$refs.panel || document.querySelector('.shamar-dialog-panel') || null;
      },

      bodyEl() {
        const panel = this.panelEl();
        if (panel) {
          const fromPanel = panel.querySelector('[data-shamar-dialog-body]');
          if (fromPanel) return fromPanel;
        }
        return document.querySelector('.shamar-dialog-panel [data-shamar-dialog-body]');
      },

      footerEl() {
        const panel = this.panelEl();
        if (panel) {
          const fromPanel = panel.querySelector('[data-shamar-dialog-footer]');
          if (fromPanel) return fromPanel;
        }
        return document.querySelector('.shamar-dialog-panel [data-shamar-dialog-footer]');
      },

      clearContentFooter() {
        this.hasContentFooter = false;
        const footer = this.footerEl();
        if (footer) footer.innerHTML = '';
      },

      hoistDialogActions() {
        const body = this.bodyEl();
        const actions = body?.querySelector('[data-shamar-dialog-actions]');
        const footer = this.footerEl();
        if (!actions || !footer) {
          this.hasContentFooter = false;
          return;
        }
        footer.innerHTML = '';
        while (actions.firstChild) {
          footer.appendChild(actions.firstChild);
        }
        actions.remove();
        footer.querySelectorAll('[data-shamar-dialog-close]').forEach((btn) => {
          btn.addEventListener('click', () => this.dismissDialog());
        });
        const form =
          body.querySelector('form[data-shamar-embed-form]') ||
          body.querySelector('form[data-shamar-embed-import]');
        if (form?.id) {
          footer.querySelectorAll('button[type="submit"]').forEach((btn) => {
            if (!btn.getAttribute('form')) btn.setAttribute('form', form.id);
          });
        }
        try {
          if (typeof Alpine !== 'undefined' && Alpine.initTree) {
            Alpine.initTree(footer);
          }
        } catch {
          /* ignore */
        }
        this.hasContentFooter = true;
      },

      mountBody(html) {
        this.clearContentFooter();
        const body = this.bodyEl();
        if (!body) return false;
        body.innerHTML = typeof html === 'string' ? html : '';
        try {
          if (typeof Alpine !== 'undefined' && Alpine.initTree) {
            Alpine.initTree(body);
          }
        } catch {
          /* keep raw HTML */
        }
        this.hoistDialogActions();
        this.bindForm(body);
        this.focusDialog();
        return true;
      },

      async mountBodyWhenReady(html) {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          if (this.mountBody(html)) return true;
          await this.$nextTick();
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
        const panel = this.panelEl();
        if (!panel) return false;
        let body = panel.querySelector('[data-shamar-dialog-body]');
        if (!body) {
          body = document.createElement('div');
          body.setAttribute('data-shamar-dialog-body', '');
          const region = panel.querySelector('.shamar-dialog-body');
          (region || panel).appendChild(body);
        }
        body.innerHTML = typeof html === 'string' ? html : '';
        this.hoistDialogActions();
        this.bindForm(body);
        this.focusDialog();
        return true;
      },

      init() {
        window.addEventListener('mousemove', (e) => {
          this.onDrag(e);
          this.onResize(e);
        });
        window.addEventListener('mouseup', () => {
          this.dragging = false;
          this.resizing = false;
        });
      },

      panelStyle() {
        if (this.fullscreen) {
          return 'inset: 0.75rem; width: auto; height: auto; transform: none;';
        }
        return `width: ${this.width}px; height: ${this.height}px; transform: translate(calc(-50% + ${this.x}px), calc(-50% + ${this.y}px));`;
      },

      /** Size record dialogs to at least max-w-6xl, clamped to the viewport. */
      fitRecordDialogSize() {
        const margin = 24;
        const preferW = 1152;
        const preferH = 720;
        this.minWidth = 560;
        this.minHeight = 320;
        this.width = Math.min(preferW, Math.max(this.minWidth, window.innerWidth - margin));
        this.height = Math.min(preferH, Math.max(this.minHeight, window.innerHeight - margin));
        this.x = 0;
        this.y = 0;
      },

      async openModal(detail) {
        if (!this.open) {
          this._previousFocus = document.activeElement;
        }
        this.confirmMode = false;
        const nextSlug = detail.slug || '';
        const replace = detail.replace === true;
        const shouldStack =
          this.open &&
          !replace &&
          !this.confirmMode &&
          this.currentEmbedUrl &&
          nextSlug &&
          nextSlug !== this.resourceSlug;

        if (shouldStack) {
          this.dialogStack.push({
            title: this.title,
            fullPageUrl: this.fullPageUrl,
            resourceSlug: this.resourceSlug,
            url: this.currentEmbedUrl,
            onResult: _dialogOnResult,
          });
        } else if (!this.open) {
          document.body.classList.add('overflow-hidden');
        }
        this.open = true;
        this.loading = true;
        this.clearContentFooter();
        this.title = detail.title || 'Record';
        this.fullPageUrl = withoutEmbed(detail.url);
        this.resourceSlug = nextSlug;
        this.fullscreen = false;
        this.fitRecordDialogSize();
        if (!replace) {
          _dialogOnResult = typeof detail.onResult === 'function' ? detail.onResult : null;
        }

        const embedUrl = withEmbed(detail.url);
        this.currentEmbedUrl = embedUrl;
        await this.$nextTick();

        let html = '';
        try {
          const res = await fetch(embedUrl, {
            headers: csrfHeaders({ Accept: 'text/html' }),
            credentials: 'same-origin',
          });
          html = await res.text();
          if (!res.ok) {
            html = `<p class="text-sm text-fg-danger">Could not load dialog (${res.status}).</p>`;
          }
        } catch {
          html = '<p class="text-sm text-fg-danger">Could not load dialog.</p>';
        }

        this.loading = false;
        await this.$nextTick();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await this.mountBodyWhenReady(html);
      },

      async restoreDialog(stackItem) {
        this.title = stackItem.title;
        this.fullPageUrl = stackItem.fullPageUrl;
        this.resourceSlug = stackItem.resourceSlug;
        this.currentEmbedUrl = stackItem.url;
        _dialogOnResult = stackItem.onResult || null;
        this.confirmMode = false;
        this.loading = true;
        await this.$nextTick();
        let html = '';
        try {
          const res = await fetch(stackItem.url, {
            headers: csrfHeaders({ Accept: 'text/html' }),
            credentials: 'same-origin',
          });
          html = await res.text();
        } catch {
          html = '<p class="text-sm text-fg-danger">Could not load dialog.</p>';
        }
        this.loading = false;
        await this.$nextTick();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await this.mountBodyWhenReady(html);
      },

      openConfirm(detail) {
        if (!this.open) {
          this._previousFocus = document.activeElement;
        }
        this.confirmMode = true;
        this.open = true;
        this.loading = false;
        this.clearContentFooter();
        const rawMode = detail.mode;
        const mode =
          rawMode === 'alert' || rawMode === 'info' || rawMode === 'secret'
            ? rawMode
            : 'confirm';
        const variant =
          detail.variant ||
          (mode === 'secret'
            ? 'warning'
            : mode === 'alert' || mode === 'info'
              ? 'info'
              : detail.color === 'danger'
                ? 'danger'
                : 'danger');
        this.promptMode = mode === 'info' ? 'alert' : mode;
        this.promptVariant = variant;
        this.title =
          detail.title ||
          (this.promptMode === 'secret'
            ? 'Copy your secret'
            : this.promptMode === 'alert'
              ? this.promptVariant === 'danger'
                ? 'Alert'
                : 'Notice'
              : 'Confirm');
        this.confirmMessage = detail.message || 'Are you sure?';
        this.secretText = this.promptMode === 'secret' ? String(detail.secret || '') : '';
        this.secretCopied = false;
        this.confirmAction = detail.action || '';
        this._confirmCallback = typeof detail.onConfirm === 'function' ? detail.onConfirm : null;
        this.confirmLabel =
          detail.confirmLabel ||
          (this.promptMode === 'secret'
            ? "I've copied it"
            : this.promptMode === 'alert'
              ? 'OK'
              : detail.variant === 'danger'
                ? 'Delete'
                : 'Confirm');
        this.cancelLabel = detail.cancelLabel || 'Cancel';
        this.fullPageUrl = '';
        this.fullscreen = false;
        this.width = this.promptMode === 'secret' ? 560 : 420;
        this.height = this.promptMode === 'secret' ? 360 : 240;
        this.x = 0;
        this.y = 0;
        document.body.classList.add('overflow-hidden');
        this.focusDialog();
      },

      async copySecret() {
        const value = String(this.secretText || '');
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          this.secretCopied = true;
          window.setTimeout(() => {
            this.secretCopied = false;
          }, 2000);
        } catch {
          showToast('error', {
            title: 'Copy failed',
            message: 'Select the key and copy it manually.',
          });
        }
      },

      confirmButtonClass() {
        const base = '';
        if (this.promptVariant === 'danger') return 'bg-fg-danger';
        if (this.promptVariant === 'warning') return 'bg-warning-strong';
        if (this.promptVariant === 'success') return 'bg-success-strong';
        return 'bg-fg-brand';
      },

      close() {
        this.open = false;
        this.confirmMode = false;
        this.fullscreen = false;
        this.dialogStack = [];
        this._confirmCallback = null;
        this.secretText = '';
        this.secretCopied = false;
        _dialogOnResult = null;
        this.currentEmbedUrl = '';
        this.clearContentFooter();
        const body = this.bodyEl();
        if (body) body.innerHTML = '';
        document.body.classList.remove('overflow-hidden');
        const prev = this._previousFocus;
        this._previousFocus = null;
        if (prev && typeof prev.focus === 'function') {
          try {
            prev.focus({ preventScroll: true });
          } catch {
            prev.focus();
          }
        }
      },

      async dismissDialog(options = {}) {
        // One-time secrets must be acknowledged — no backdrop / × dismiss.
        if (this.confirmMode && this.promptMode === 'secret') {
          return;
        }
        if (this.confirmMode) {
          this.close();
          return;
        }
        if (this.dialogStack.length > 0) {
          const item = this.dialogStack.pop();
          await this.restoreDialog(item);
          return;
        }
        // Closing without a mutation should not reload the parent (keeps scroll).
        // Pass { refresh: true } when the parent list must reload.
        const shouldRefresh = options.refresh === true;
        this.close();
        if (shouldRefresh) {
          reloadParentView();
        }
      },

      toggleFullscreen() {
        this.fullscreen = !this.fullscreen;
        if (this.fullscreen) {
          this.x = 0;
          this.y = 0;
        }
      },

      startDrag(event) {
        if (this.fullscreen || this.confirmMode) return;
        this.dragging = true;
        this.dragOffsetX = event.clientX - this.x;
        this.dragOffsetY = event.clientY - this.y;
      },

      onDrag(event) {
        if (!this.dragging) return;
        this.x = event.clientX - this.dragOffsetX;
        this.y = event.clientY - this.dragOffsetY;
      },

      startResize(event) {
        if (this.fullscreen || this.confirmMode) return;
        event.preventDefault();
        this.resizing = true;
        this.resizeStartX = event.clientX;
        this.resizeStartY = event.clientY;
        this.resizeStartW = this.width;
        this.resizeStartH = this.height;
      },

      onResize(event) {
        if (!this.resizing) return;
        this.width = Math.max(this.minWidth, this.resizeStartW + (event.clientX - this.resizeStartX));
        this.height = Math.max(this.minHeight, this.resizeStartH + (event.clientY - this.resizeStartY));
      },

      bindForm(root) {
        const importForm = root.querySelector('form[data-shamar-embed-import]');
        if (importForm) {
          this.bindImportForm(importForm);
          return;
        }
        const form = root.querySelector('form[data-shamar-embed-form]');
        if (!form) return;
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const submitBtn =
            this.footerEl()?.querySelector('[type="submit"]') ||
            form.querySelector('[type="submit"]');
          if (submitBtn) submitBtn.disabled = true;
          try {
            const body = new URLSearchParams(new FormData(form));
            if (!body.has('_csrf')) {
              const token = csrfToken();
              if (token) body.set('_csrf', token);
            }
            const res = await fetch(form.action, {
              method: 'POST',
              headers: csrfHeaders({
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                Accept: 'application/json',
              }),
              body,
              redirect: 'follow',
            });
            if (res.redirected) {
              const done = new URL(res.url);
              this.handleRedirect(`${done.pathname}${done.search}`);
              return;
            }
            if (res.status === 422 || !res.ok) {
              let payload = null;
              try {
                payload = await res.json();
              } catch {
                /* ignore */
              }
              const messages = applyFieldErrors(form, payload?.errors);
              showToast('error', {
                title: 'Could not save',
                message: validationToastMessage(messages, payload?.message),
              });
              return;
            }
            let payload = null;
            try {
              payload = await res.json();
            } catch {
              /* ignore */
            }
            if (payload?.id != null || payload?._id != null) {
              const base = (
                form.getAttribute('data-shamar-after-create') ||
                form.action.replace(/\/$/, '')
              ).replace(/\/$/, '');
              const id = payload.id ?? payload._id;
              const view =
                form.getAttribute('data-shamar-after-create-view') ||
                (payload.plainText ? 'show' : 'edit');
              const next =
                view === 'show' ? `${base}/${id}` : `${base}/${id}/edit`;
              if (payload.plainText) {
                revealOneTimeSecret({
                  secret: payload.plainText,
                  title: 'Copy your API key',
                  message:
                    'This secret will only be shown once. Copy it now and store it somewhere safe before continuing.',
                  onConfirm: () => this.handleRedirect(next),
                });
              } else {
                this.handleRedirect(next);
              }
            }
          } catch {
            showToast('error', {
              title: 'Could not save',
              message: 'Please check the form and try again.',
            });
          } finally {
            if (submitBtn) submitBtn.disabled = false;
          }
        });
      },

      bindImportForm(form) {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const submitBtn =
            this.footerEl()?.querySelector('[type="submit"]') ||
            form.querySelector('[type="submit"]');
          if (submitBtn) submitBtn.disabled = true;
          try {
            const body = new URLSearchParams(new FormData(form));
            if (!body.has('_csrf')) {
              const token = csrfToken();
              if (token) body.set('_csrf', token);
            }
            body.set('_shamar_embed', '1');
            const res = await fetch(form.action, {
              method: 'POST',
              headers: csrfHeaders({
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                Accept: 'application/json',
              }),
              body,
            });
            const payload = await res.json().catch(() => null);
            if (!res.ok || !payload) {
              showToast('error', {
                title: 'Import failed',
                message: 'Could not import the CSV file.',
              });
              return;
            }
            const created = Number(payload.created || 0);
            const failed = Number(payload.failed || 0);
            if (created > 0 && failed === 0) {
              showToast('success', {
                title: 'Import complete',
                message: `Created ${created} record(s).`,
              });
            } else if (created > 0) {
              showToast('warning', {
                title: 'Import finished with errors',
                message: `Created ${created}, failed ${failed}.`,
              });
            } else {
              showToast('error', {
                title: 'Import failed',
                message: (payload.errors && payload.errors[0]) || 'No rows were imported.',
              });
              return;
            }
            this.close();
            saveScrollPosition();
            window.location.reload();
          } catch {
            showToast('error', {
              title: 'Import failed',
              message: 'Could not import the CSV file.',
            });
          } finally {
            if (submitBtn) submitBtn.disabled = false;
          }
        });
      },

      async handleRedirect(location) {
        if (!location) return;
        const url = new URL(location, window.location.origin);
        const success = url.searchParams.get('success');
        const error = url.searchParams.get('error');
        const isEmbed = url.searchParams.get('embed') === '1';
        const basePath = document.body.dataset.shamarBasePath || '';
        const flash = flashFromRedirect(success, error);

        if (isEmbed && _dialogOnResult && success === 'created') {
          const record = parseAdminRecordPath(url.pathname);
          if (record) {
            try {
              const response = await fetch(`${basePath}/${record.slug}/${record.id}/summary`);
              if (response.ok) {
                const item = await response.json();
                const callback = _dialogOnResult;
                _dialogOnResult = null;
                if (callback) callback({ id: item.id, label: item.label });
                if (flash) showToast(flash);
                if (this.dialogStack.length > 0) {
                  await this.restoreDialog(this.dialogStack.pop());
                  applyPendingRelationPick();
                  return;
                }
                applyPendingRelationPick();
                this.close();
                return;
              }
            } catch {
              /* fall through */
            }
          }
          _dialogOnResult = null;
        }

        if (isEmbed && this.open) {
          if (success === 'updated' || (success === 'created' && !_dialogOnResult)) {
            // Nested embed dialog: restore the parent dialog form.
            if (this.dialogStack.length > 0) {
              if (flash) showToast(flash);
              await this.restoreDialog(this.dialogStack.pop());
              return;
            }
            // Top-level embed: close and refresh the page that opened the dialog.
            this.dialogStack = [];
            this.close();
            reloadParentView({ success: success || undefined, error: error || undefined });
            return;
          }

          if (error) {
            if (flash) showToast(flash);
            this.loading = true;
            try {
              const res = await fetch(url.pathname + url.search, {
                headers: csrfHeaders({ Accept: 'text/html' }),
                credentials: 'same-origin',
              });
              await this.mountBodyWhenReady(await res.text());
            } finally {
              this.loading = false;
            }
            return;
          }
        }

        // Non-embed success while a dialog is open.
        if (this.open && (success === 'updated' || success === 'created') && !_dialogOnResult) {
          this.dialogStack = [];
          this.close();
          reloadParentView({ success: success || undefined, error: error || undefined });
          return;
        }

        if (this.dialogStack.length > 0) {
          await this.restoreDialog(this.dialogStack.pop());
          return;
        }

        this.close();
        reloadParentView({ success: success || undefined, error: error || undefined });
      },

      submitConfirm() {
        if (this._confirmCallback) {
          const callback = this._confirmCallback;
          this._confirmCallback = null;
          this.close();
          callback();
          return;
        }
        if (this.promptMode === 'alert' || !this.confirmAction) {
          this.close();
          return;
        }
        const form = document.createElement('form');
        form.method = 'post';
        form.action = this.confirmAction;
        const token = csrfToken();
        if (token) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = '_csrf';
          input.value = token;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      },
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    restoreScrollPosition();
    if (!consumeInitialFlash()) {
      consumeQueryFlash();
    }
    maybeRedirectToStoredListView();
    applyListHrefs();
    bindListViewSwitcher();
    bindListRefresh();
    bindListRowNavigation();
    bindMediaUploads();
    bindFormSaveShortcut();
    bindFormAutosave();
    bindRecordPagerNav();
    bindStickyPageHeading();
  });

  function bindStickyPageHeading() {
    const root = document.querySelector('[data-shamar-scroll-root]');
    const heading = document.querySelector('.shamar-page-heading');
    if (!(root instanceof HTMLElement) || !(heading instanceof HTMLElement)) return;
    const sync = () => {
      heading.dataset.stuck = root.scrollTop > 4 ? 'true' : 'false';
    };
    root.addEventListener('scroll', sync, { passive: true });
    sync();
  }
  function bindListRowNavigation() {
    document.addEventListener('click', (event) => {
      if (!(event instanceof MouseEvent) || event.button !== 0) return;
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          'a, button, input, select, textarea, label, [data-shamar-stop-row-nav]',
        )
      ) {
        return;
      }
      const row = target.closest('tr[data-shamar-row-href]');
      if (!row) return;
      const href = row.getAttribute('data-shamar-row-href');
      if (!href) return;
      event.preventDefault();
      window.location.assign(href);
    });
  }

  function relationConfigsFromForm(form) {
    const configs = [];
    if (!(form instanceof HTMLFormElement)) return configs;
    form.querySelectorAll('[data-shamar-m2o-config],[data-shamar-m2m-config]').forEach((el) => {
      const raw =
        el.getAttribute('data-shamar-m2o-config') ||
        el.getAttribute('data-shamar-m2m-config');
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.name) configs.push(parsed);
      } catch {
        /* ignore */
      }
    });
    return configs;
  }

  function notifyRelationFieldChange(componentEl, fieldName) {
    const form = componentEl?.closest?.('form');
    if (!form) return;
    queueMicrotask(() => {
      try {
        const alpine = window.Alpine?.$data?.(form);
        if (typeof alpine?.onFieldChange === 'function') {
          alpine.onFieldChange(fieldName);
        }
      } catch {
        /* ignore */
      }
      const hidden =
        componentEl.querySelector(`input[type="hidden"][name="${fieldName}"]`) ||
        componentEl.querySelector(`input[type="hidden"][name="${fieldName}[]"]`);
      if (hidden) {
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      form.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function syncRelationValuesToFormData(form, data) {
    const alpine = window.Alpine;
    if (!alpine?.$data) return;

    form.querySelectorAll('[data-shamar-m2o-config]').forEach((el) => {
      let cfg;
      try {
        cfg = JSON.parse(el.getAttribute('data-shamar-m2o-config') || '{}');
      } catch {
        return;
      }
      if (!cfg.name) return;
      const component = alpine.$data(el);
      const value =
        component?.value != null && component.value !== ''
          ? String(component.value)
          : '';
      data.set(cfg.name, value);
    });

    form.querySelectorAll('[data-shamar-m2m-config]').forEach((el) => {
      let cfg;
      try {
        cfg = JSON.parse(el.getAttribute('data-shamar-m2m-config') || '{}');
      } catch {
        return;
      }
      if (!cfg.name || cfg.kind === 'hasMany') return;
      const component = alpine.$data(el);
      const selected = Array.isArray(component?.selected) ? component.selected : [];
      data.delete(cfg.name);
      data.delete(`${cfg.name}[]`);
      if (selected.length === 0) {
        if (cfg.kind === 'manyToMany') {
          data.append(`${cfg.name}[]`, '');
        }
        return;
      }
      for (const item of selected) {
        const valueAttr = cfg.valueAttribute ? String(cfg.valueAttribute) : 'id';
        let value = '';
        if (valueAttr === 'name') {
          value = String(item.name || item.id || '').trim();
        } else {
          value = item?.id != null ? String(item.id).trim() : '';
        }
        if (value) {
          data.append(`${cfg.name}[]`, value);
        }
      }
    });
  }

  function formDataFrom(form) {
    try {
      const alpine = window.Alpine?.$data?.(form);
      if (typeof alpine?.syncJsonFields === 'function') alpine.syncJsonFields();
    } catch {
      /* ignore */
    }
    const data = new FormData(form);
    const relationConfigs = relationConfigsFromForm(form);
    const relationFields = new Set(relationConfigs.map((cfg) => cfg.name));
    try {
      const alpine = window.Alpine?.$data?.(form);
      const state = alpine?.state;
      if (state && typeof state === 'object') {
        // Prefer Alpine state so `.disabled()` fields (excluded from FormData) still save.
        // Relation widgets manage their own hidden inputs — do not clobber them with stale state.
        for (const [key, value] of Object.entries(state)) {
          if (value === undefined || relationFields.has(key)) continue;
          appendAlpineStateToFormData(data, key, value);
        }
      }
    } catch {
      /* ignore */
    }

    syncRelationValuesToFormData(form, data);

    return data;
  }

  function appendAlpineStateToFormData(data, key, value) {
    if (typeof value === 'boolean') {
      if (value) data.set(key, 'true');
      else data.delete(key);
      return;
    }
    if (Array.isArray(value)) {
      data.delete(key);
      data.delete(`${key}[]`);
      const hasObjects = value.some((item) => item && typeof item === 'object');
      if (hasObjects) {
        data.set(key, JSON.stringify(value));
        return;
      }
      for (const item of value) {
        data.append(`${key}[]`, item == null ? '' : String(item));
      }
      return;
    }
    if (value && typeof value === 'object') {
      data.set(key, JSON.stringify(value));
      return;
    }
    data.set(key, value == null ? '' : String(value));
  }

  function bindFormSaveShortcut() {
    document.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest('[contenteditable="true"]') ||
          target.closest('.cm-editor, .monaco-editor'))
      ) {
        return;
      }
      const form = document.querySelector('#shamar-form');
      if (!form) return;
      event.preventDefault();
      if (typeof window.shamarSave === 'function') {
        window.shamarSave();
        return;
      }
      const btn =
        document.querySelector('[data-shamar-form-save]:not([disabled])') ||
        form.querySelector('button[type="submit"]:not([disabled])');
      if (btn) btn.click();
    });
  }

  function bindFormAutosave() {
    function getForm() {
      return document.querySelector('#shamar-form[data-shamar-autosave]');
    }

    let allowUnload = false;
    let savingInPlace = false;
    let savingForHref = null;

    function takeSnapshot(form) {
      try {
        form.dataset.shamarSnapshot = JSON.stringify([...formDataFrom(form)]);
      } catch {
        form.dataset.shamarSnapshot = '';
      }
      form.removeAttribute('data-shamar-dirty');
    }

    function isDirty(form) {
      if (!form) return false;
      let now = '';
      try {
        now = JSON.stringify([...formDataFrom(form)]);
      } catch {
        /* ignore */
      }
      return now !== (form.dataset.shamarSnapshot || '');
    }

    function markDirtyFromEvent(event) {
      const form = getForm();
      if (!form || !form.contains(event.target)) return;
      if (isDirty(form)) form.setAttribute('data-shamar-dirty', 'true');
    }

    document.addEventListener('input', markDirtyFromEvent);
    document.addEventListener('change', markDirtyFromEvent);

    const initial = getForm();
    if (initial) {
      // Alpine may hydrate checkbox/x-model after DOMContentLoaded.
      window.setTimeout(() => takeSnapshot(initial), 0);
      window.setTimeout(() => takeSnapshot(initial), 50);
    }

    function editUrlAfterCreate(form, record) {
      const base =
        form.getAttribute('data-shamar-after-create') ||
        form.getAttribute('action') ||
        '';
      const id = record?.id ?? record?._id;
      if (!base || id == null) return null;
      const view =
        form.getAttribute('data-shamar-after-create-view') ||
        (record?.plainText ? 'show' : 'edit');
      const suffix = view === 'show' ? '' : '/edit';
      return `${base.replace(/\/$/, '')}/${id}${suffix}`;
    }

    async function saveFormInPlace(form, { silent = false } = {}) {
      const url =
        form.getAttribute('data-shamar-autosave') ||
        form.getAttribute('action');
      if (!url) return false;
      const res = await fetch(url, {
        method: 'POST',
        body: formDataFrom(form),
        credentials: 'same-origin',
        headers: csrfHeaders({
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        }),
      });
      if (res.status === 422) {
        let payload = null;
        try {
          payload = await res.json();
        } catch {
          /* ignore */
        }
        const messages = applyFieldErrors(form, payload?.errors);
        if (!silent) {
          showToast({
            type: 'error',
            title: 'Save failed',
            message: validationToastMessage(messages, payload?.message),
          });
        }
        return false;
      }
      if (!res.ok) {
        let payload = null;
        try {
          payload = await res.json();
        } catch {
          /* ignore */
        }
        if (payload?.errors) {
          const messages = applyFieldErrors(form, payload.errors);
          if (!silent) {
            showToast({
              type: 'error',
              title: 'Save failed',
              message: validationToastMessage(messages, payload?.message),
            });
          }
          return false;
        }
        if (!silent) {
          showToast({
            type: 'error',
            title: 'Save failed',
            message: validationToastMessage([], payload?.message),
          });
        }
        return false;
      }

      let record = null;
      try {
        record = await res.json();
      } catch {
        /* ignore non-JSON success */
      }

      clearFieldErrors(form);
      takeSnapshot(form);

      const mode = form.getAttribute('data-shamar-save-mode') || 'edit';
      if (mode === 'create') {
        const next = editUrlAfterCreate(form, record);
        if (next) {
          const go = () => {
            allowUnload = true;
            window.location.href = next;
          };
          if (record?.plainText) {
            revealOneTimeSecret({
              secret: record.plainText,
              title: 'Copy your API key',
              message:
                'This secret will only be shown once. Copy it now and store it somewhere safe before continuing.',
              onConfirm: go,
            });
            return true;
          }
          go();
          return true;
        }
      }

      if (!silent) {
        showToast({
          type: 'success',
          title: 'Saved',
          message: 'Your changes have been saved.',
        });
      }
      return true;
    }

    async function runSave() {
      const form = getForm() || document.querySelector('#shamar-form');
      if (!form || savingInPlace) return false;
      if (!form.hasAttribute('data-shamar-autosave') && !form.getAttribute('action')) {
        return false;
      }
      savingInPlace = true;
      const btn = document.querySelector('[data-shamar-form-save]');
      if (btn instanceof HTMLButtonElement) btn.disabled = true;
      try {
        return await saveFormInPlace(form);
      } catch (error) {
        console.error('shamar save failed', error);
        showToast({
          type: 'error',
          title: 'Save failed',
          message: 'Could not save your changes.',
        });
        return false;
      } finally {
        savingInPlace = false;
        if (btn instanceof HTMLButtonElement) btn.disabled = false;
      }
    }

    window.shamarSave = runSave;

    document.addEventListener(
      'click',
      (event) => {
        const btn = event.target?.closest?.('[data-shamar-form-save]');
        if (!btn) return;
        // Embed dialog keep native submit unless autosave is present.
        const form = document.querySelector('#shamar-form');
        if (!form?.hasAttribute('data-shamar-autosave')) return;
        event.preventDefault();
        runSave();
      },
      true,
    );

    document.addEventListener(
      'submit',
      (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.id !== 'shamar-form' || !form.hasAttribute('data-shamar-autosave')) return;
        event.preventDefault();
        runSave();
      },
      true,
    );

    async function autosaveThenNavigate(href) {
      const form = getForm();
      if (!form || !isDirty(form)) {
        allowUnload = true;
        window.location.href = href;
        return;
      }
      try {
        const ok = await saveFormInPlace(form, { silent: true });
        if (!ok) return;
        allowUnload = true;
        window.location.href = href;
      } catch (error) {
        console.error('shamar autosave failed', error);
        allowUnload = true;
        window.location.href = href;
      }
    }

    window.shamarNavigate = function shamarNavigate(href) {
      if (savingForHref) return;
      savingForHref = href;
      autosaveThenNavigate(href).finally(() => {
        savingForHref = null;
      });
    };

    /** Allow the next navigation without a dirty-form beforeunload prompt (e.g. Cancel). */
    window.shamarAllowUnload = function shamarAllowUnload() {
      allowUnload = true;
    };

    document.addEventListener(
      'click',
      (event) => {
        if (savingForHref) return;
        const anchor = event.target?.closest?.('a[href]');
        if (!anchor) return;
        if (anchor.hasAttribute('data-shamar-skip-autosave')) {
          // Intentional discard / leave without saving — don't trap in beforeunload.
          allowUnload = true;
          return;
        }
        const href = anchor.getAttribute('href');
        if (
          !href ||
          href.startsWith('#') ||
          href.startsWith('javascript:') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:')
        ) {
          return;
        }
        if (anchor.target && anchor.target !== '_self') return;
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        const form = getForm();
        if (!form || !isDirty(form)) return;
        event.preventDefault();
        window.shamarNavigate(href);
      },
      true,
    );

    window.addEventListener('beforeunload', (event) => {
      if (allowUnload) return;
      const form = getForm();
      if (form && isDirty(form)) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  function bindRecordPagerNav() {
    function pagerRoot() {
      return document.querySelector('[data-shamar-record-pager]');
    }

    let wheelLockUntil = 0;

    function go(direction) {
      const root = pagerRoot();
      if (!root) return;
      const href =
        direction < 0
          ? root.getAttribute('data-shamar-pager-prev')
          : root.getAttribute('data-shamar-pager-next');
      if (!href) return;
      if (typeof window.shamarNavigate === 'function') {
        window.shamarNavigate(href);
      } else {
        window.location.href = href;
      }
    }

    document.addEventListener('keydown', (event) => {
      if (!pagerRoot()) return;
      if (!event.altKey) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest('input, textarea, select, [contenteditable="true"]') ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      go(event.key === 'ArrowLeft' ? -1 : 1);
    });

    // Rotational scroll: Alt+wheel anywhere, or wheel directly over the pager.
    document.addEventListener(
      'wheel',
      (event) => {
        const root = pagerRoot();
        if (!root) return;
        const overPager =
          event.target instanceof Element && event.target.closest('[data-shamar-record-pager]');
        if (!event.altKey && !overPager) return;
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest('input, textarea, select, [contenteditable="true"]')
        ) {
          return;
        }
        if (Math.abs(event.deltaY) < 8) return;
        const now = Date.now();
        if (now < wheelLockUntil) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        wheelLockUntil = now + 450;
        go(event.deltaY > 0 ? 1 : -1);
      },
      { passive: false },
    );
  }
})();
