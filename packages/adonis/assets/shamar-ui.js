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

  function bindMediaUploads() {
    document.querySelectorAll('[data-shamar-media-file]').forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const root = input.closest('[data-shamar-media-field]');
        const hidden = root?.querySelector('[data-shamar-media-value]');
        const status = root?.querySelector('[data-shamar-media-status]');
        const uploadUrl = input.dataset.uploadUrl;
        const fieldName = input.dataset.fieldName;
        const maxBytes = Number(input.dataset.maxBytes || 0);
        if (!uploadUrl || !fieldName || !(hidden instanceof HTMLInputElement)) return;
        if (maxBytes > 0 && file.size > maxBytes) {
          if (status instanceof HTMLElement) {
            status.hidden = false;
            status.textContent = `File exceeds ${maxBytes} bytes.`;
          }
          input.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            if (status instanceof HTMLElement) {
              status.hidden = false;
              status.textContent = 'Uploading…';
            }
            const data = String(reader.result ?? '');
            const res = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-Token': csrfToken() || '',
              },
              credentials: 'same-origin',
              body: JSON.stringify({
                field: fieldName,
                filename: file.name,
                mimeType: file.type || 'application/octet-stream',
                data,
              }),
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.message || 'Upload failed');
            hidden.value = payload.media?.url || '';
            if (status instanceof HTMLElement) {
              status.textContent = 'Uploaded.';
            }
            const preview = root?.querySelector('[data-shamar-media-preview]');
            if (preview instanceof HTMLElement && hidden.value) {
              if (input.dataset.fieldType === 'image') {
                preview.innerHTML = `<img src="${hidden.value}" alt="" class="max-h-32 rounded-md border border-default object-contain" />`;
              } else {
                preview.innerHTML = `<a href="${hidden.value}" class="text-sm text-fg-brand hover:underline" target="_blank" rel="noopener">View file</a>`;
              }
            }
          } catch (error) {
            if (status instanceof HTMLElement) {
              status.textContent =
                error instanceof Error ? error.message : 'Upload failed';
            }
            input.value = '';
          }
        };
        reader.readAsDataURL(file);
      });
    });
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

      init() {
        this.query = this.label;
        this._pickHandler = (event) => {
          const detail = event.detail || {};
          if (detail.field === this.name) {
            this.pick({ id: detail.id, label: detail.label });
          }
        };
        window.addEventListener('shamar-m2o-pick', this._pickHandler);
      },

      destroy() {
        if (this._pickHandler) {
          window.removeEventListener('shamar-m2o-pick', this._pickHandler);
        }
      },

      get exactMatch() {
        const q = this.query.trim().toLowerCase();
        if (!q) return null;
        return this.results.find((item) => item.label.toLowerCase() === q) || null;
      },

      get createCandidate() {
        if (this.readonly) return false;
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
        }
      },

      onFocus() {
        this.open = true;
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
      },

      close() {
        this.open = false;
        this.query = this.label;
      },

      onFocusOut(event) {
        const next = event.relatedTarget;
        if (next && this.$el.contains(next)) return;
        // Defer so a click on a dropdown option can run before we hide it.
        queueMicrotask(() => {
          if (!this.open) return;
          if (this.$el.contains(document.activeElement)) return;
          this.close();
        });
      },

      moveCursor(delta) {
        if (!this.open) {
          this.open = true;
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
        this.value = item.id != null ? String(item.id) : null;
        this.label = item.label || '';
        this.query = this.label;
        this.open = false;
      },

      clearSelection() {
        this.value = null;
        this.label = '';
        this.query = '';
        this.cursor = 0;
        this.open = false;
        this.$refs.input?.focus();
      },

      openRecord() {
        if (!this.value || !this.detailUrlBase) return;
        window.ShamarUI.openDialog({
          url: `${this.detailUrlBase}/${this.value}/edit`,
          title: this.label || 'Edit record',
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
            body: JSON.stringify({ field: this.name, name }),
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
      readonly: !!cfg.readonly,
      required: !!cfg.required,

      selected: Array.isArray(cfg.initialItems)
        ? cfg.initialItems.map((item) => ({
            id: String(item.id),
            label: item.label || String(item.id),
          }))
        : [],
      query: '',
      results: [],
      cursor: 0,
      open: false,
      loading: false,
      _abort: null,
      _initialFetched: false,

      init() {
        this._pickHandler = (event) => {
          const detail = event.detail || {};
          if (detail.field === this.name) {
            this.pick({ id: detail.id, label: detail.label });
          }
        };
        window.addEventListener('shamar-m2m-pick', this._pickHandler);
      },

      destroy() {
        if (this._pickHandler) {
          window.removeEventListener('shamar-m2m-pick', this._pickHandler);
        }
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
        if (this.readonly) return false;
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
        }
      },

      onFocus() {
        if (this.readonly) return;
        this.open = true;
        if (!this._initialFetched) {
          this._initialFetched = true;
          this.fetchResults();
        }
      },

      onInput() {
        this.open = true;
        this.fetchResults();
      },

      close() {
        this.open = false;
        this.query = '';
      },

      onFocusOut(event) {
        const next = event.relatedTarget;
        if (next && this.$el.contains(next)) return;
        // Defer so a click on a dropdown option can run before we hide it.
        queueMicrotask(() => {
          if (!this.open) return;
          if (this.$el.contains(document.activeElement)) return;
          this.close();
        });
      },

      moveCursor(delta) {
        if (!this.open) {
          this.open = true;
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
        this.selected = [...this.selected, { id, label: item.label || id }];
        this.query = '';
        this.cursor = 0;
        this.fetchResults();
        this.$nextTick?.(() => this.$refs.input?.focus());
      },

      remove(id) {
        const target = String(id);
        this.selected = this.selected.filter((item) => String(item.id) !== target);
      },

      openRecord(item) {
        if (!item?.id || !this.detailUrlBase) return;
        window.ShamarUI.openDialog({
          url: `${this.detailUrlBase}/${item.id}/edit`,
          title: item.label || 'Edit record',
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
            body: JSON.stringify({ field: this.name, name }),
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
    self.options = Array.isArray(cfg.options)
      ? cfg.options.map((item) => normalizeCheckboxOption(item))
      : [];
    const prevInit = self.init;
    self.init = function initCheckbox() {
      prevInit.call(this);
      if (this.options.length === 0) {
        this.loadAllOptions();
      } else {
        this.sortOptions();
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
    self.permissionKey = function permissionKey(item) {
      return String(item?.label || item?.id || '').trim();
    };
    self.itemDisplay = function itemDisplay(item) {
      if (item?.ability) {
        return item.ability === '*' ? 'All (*)' : item.ability;
      }
      const key = this.permissionKey(item);
      if (key === '*') return 'All (*)';
      if (key.includes(':')) {
        const ability = key.slice(key.indexOf(':') + 1);
        return ability === '*' ? 'All (*)' : ability || key;
      }
      return item?.label || key;
    };
    self.groupSelectedCount = function groupSelectedCount(group) {
      if (!group?.items) return 0;
      return group.items.filter((item) => this.isSelected(item.id)).length;
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
    self.isSelected = function isSelected(id) {
      return this.selectedIds.has(String(id));
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
      if (this.isCovered(item) && !this.isSelected(item.id)) return;
      if (this.isSelected(item.id)) {
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
    return {
      id,
      label,
      group: item.group || deriveGroupFromLabel(label),
      ability: item.ability || deriveAbilityFromLabel(label),
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
    const prevInit = self.init;
    const prevDestroy = self.destroy;
    const prevPick = self.pick;
    const prevCreateAndEdit = self.createAndEdit;
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
    };
    self.destroy = function destroyTable() {
      prevDestroy.call(this);
      if (this._tablePickHandler) {
        window.removeEventListener('shamar-m2m-pick', this._tablePickHandler);
      }
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
      prevPick.call(this, item);
      this.closeAdd();
    };
    self.createAndEdit = function createAndEditTable() {
      this.closeAdd();
      prevCreateAndEdit.call(this);
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
            label: field.label,
            help: field.help,
            placeholder: field.placeholder,
          };
          if (!(field.name in this.state) && field.value !== undefined) {
            this.state[field.name] = field.value;
          }
        }
      },

      isVisible(name) {
        const meta = this.fieldMeta[name];
        return !meta || meta.visible !== false;
      },

      isDisabled(name) {
        return !!this.fieldMeta[name]?.disabled;
      },

      fieldLabel(name, fallback) {
        return this.fieldMeta[name]?.label || fallback || name;
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
        if (parsed.event === 'change') {
          this.scheduleSync(name, parsed.debounce);
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
                label: field.label,
                help: field.help,
                placeholder: field.placeholder,
              };
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
    };
  }

  // Available before Alpine boots (defer scripts run before Alpine.start).
  window.shamarForm = createShamarForm;

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

    Alpine.data('shamarListToolbar', (cfg = {}) => ({
      searchInput: '',
      chips: [],
      groupBy: cfg.groupBy || null,
      sort: cfg.sort || '',
      direction: cfg.direction || '',
      perPage:
        cfg.perPage === 'all' || Number(cfg.perPage) === Number(cfg.allPerPage)
          ? 'all'
          : String(cfg.perPage || 15),
      trashed: cfg.trashed || false,
      headers: Array.isArray(cfg.headers) ? cfg.headers : [],
      basePath: cfg.basePath || '',
      slug: cfg.slug || '',
      view: cfg.view || 'table',
      allPerPage: cfg.allPerPage || 1000,
      panelOpen: false,
      openFilterField: null,
      m2oQuery: {},
      m2oResults: {},
      init() {
        const chips = [];
        const search = (cfg.search || '').trim();
        if (search) {
          chips.push({ field: null, op: 'ilike', value: search, label: `Search: "${search}"` });
          this.searchInput = search;
        }
        const filters = Array.isArray(cfg.filters) ? cfg.filters : [];
        for (const chip of filters) {
          if (chip && chip.field) chips.push(chip);
        }
        this.chips = chips;
      },
      _searchChipIndex() {
        return this.chips.findIndex((c) => c.field === null);
      },
      get _searchValue() {
        const i = this._searchChipIndex();
        return i >= 0 ? this.chips[i].value : '';
      },
      buildUrl() {
        const fieldChips = this.chips.filter((c) => c.field !== null);
        const path =
          this.view === 'kanban'
            ? `${this.basePath}/${this.slug}/kanban`
            : `${this.basePath}/${this.slug}`;
        const params = new URLSearchParams();
        if (this._searchValue) params.set('search', String(this._searchValue));
        if (this.sort) {
          params.set('sort', this.sort);
          if (this.direction === 'asc' || this.direction === 'desc') {
            params.set('direction', this.direction);
          }
        }
        if (this.perPage && this.perPage !== '15') params.set('perPage', String(this.perPage));
        if (fieldChips.length) params.set('filters', JSON.stringify(fieldChips));
        if (this.groupBy) params.set('groupBy', this.groupBy);
        if (this.trashed === true || this.trashed === 'only' || this.trashed === '1') {
          params.set('trashed', '1');
        }
        const qs = params.toString();
        return qs ? `${path}?${qs}` : path;
      },
      reload() {
        window.location.assign(this.buildUrl());
      },
      onSearchChange() {
        const value = (this.searchInput || '').trim();
        const i = this._searchChipIndex();
        if (!value) {
          if (i >= 0) this.chips.splice(i, 1);
        } else {
          const chip = { field: null, op: 'ilike', value, label: `Search: "${value}"` };
          if (i >= 0) this.chips[i] = chip;
          else this.chips.push(chip);
        }
        this.reload();
      },
      clearSearch() {
        this.searchInput = '';
        this.onSearchChange();
      },
      removeChip(i) {
        const chip = this.chips[i];
        this.chips.splice(i, 1);
        if (chip && chip.field === null) this.searchInput = '';
        this.reload();
      },
      clearAll() {
        this.chips = [];
        this.searchInput = '';
        this.groupBy = null;
        this.reload();
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
        this.chips.push({
          field: h.name,
          op: '=',
          value,
          label: `${h.label}: ${value ? 'Yes' : 'No'}`,
        });
        this.openFilterField = null;
        this.panelOpen = false;
        this.reload();
      },
      addSelectFilter(h, opt) {
        this.chips.push({
          field: h.name,
          op: '=',
          value: opt.value,
          label: `${h.label}: ${opt.label}`,
        });
        this.openFilterField = null;
        this.panelOpen = false;
        this.reload();
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
        this.chips.push({
          field: h.name,
          op: '=',
          value: opt.id,
          label: `${h.label}: ${opt.label}`,
        });
        this.openFilterField = null;
        this.panelOpen = false;
        this.m2oQuery[h.name] = '';
        this.m2oResults[h.name] = [];
        this.reload();
      },
      setGroupBy(name) {
        this.groupBy = name;
        this.panelOpen = false;
        this.reload();
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
      },
      submitBulk(url, action, confirmMessage) {
        if (!this.selected.length && !this.selectAllMatching) return;
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
      fullscreen: false,
      x: 0,
      y: 0,
      width: 720,
      height: 520,
      minWidth: 400,
      minHeight: 280,
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
          btn.addEventListener('click', () => this.close());
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
        this.width = 720;
        this.height = 520;
        this.x = 0;
        this.y = 0;
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
        const mode = detail.mode === 'alert' || detail.mode === 'info' ? detail.mode : 'confirm';
        const variant =
          detail.variant ||
          (mode === 'alert' || mode === 'info' ? 'info' : detail.color === 'danger' ? 'danger' : 'danger');
        this.promptMode = mode === 'info' ? 'alert' : mode;
        this.promptVariant = variant;
        this.title =
          detail.title ||
          (this.promptMode === 'alert'
            ? this.promptVariant === 'danger'
              ? 'Alert'
              : 'Notice'
            : 'Confirm');
        this.confirmMessage = detail.message || 'Are you sure?';
        this.confirmAction = detail.action || '';
        this._confirmCallback = typeof detail.onConfirm === 'function' ? detail.onConfirm : null;
        this.confirmLabel =
          detail.confirmLabel ||
          (this.promptMode === 'alert' ? 'OK' : detail.variant === 'danger' ? 'Delete' : 'Confirm');
        this.cancelLabel = detail.cancelLabel || 'Cancel';
        this.fullPageUrl = '';
        this.fullscreen = false;
        this.width = 420;
        this.height = 240;
        this.x = 0;
        this.y = 0;
        document.body.classList.add('overflow-hidden');
        this.focusDialog();
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
        _dialogOnResult = null;
        this.currentEmbedUrl = '';
        this.clearContentFooter();
        const body = this.bodyEl();
        if (body) body.innerHTML = '';
        document.body.classList.remove('overflow-hidden');
        const prev = this._previousFocus;
        this._previousFocus = null;
        if (prev && typeof prev.focus === 'function') {
          prev.focus();
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
              }),
              body,
              redirect: 'follow',
            });
            if (res.redirected) {
              const done = new URL(res.url);
              this.handleRedirect(`${done.pathname}${done.search}`);
              return;
            }
            if (!res.ok) {
              showToast('error', {
                title: 'Could not save',
                message: 'Please check the form and try again.',
              });
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
            // Nested M2O dialog (create/edit related record): restore the parent form.
            if (this.dialogStack.length > 0) {
              if (flash) showToast(flash);
              await this.restoreDialog(this.dialogStack.pop());
              return;
            }
            // Top-level create/edit: close and refresh the list.
            this.dialogStack = [];
            this.close();
            const record = parseAdminRecordPath(url.pathname);
            const slug =
              this.resourceSlug ||
              record?.slug ||
              resourceSlugFromUrl(basePath, url.pathname) ||
              '';
            if (slug) {
              const target = new URL(
                listPath(basePath, slug, getStoredListView(slug)),
                window.location.origin,
              );
              if (success) target.searchParams.set('success', success);
              if (error) target.searchParams.set('error', error);
              window.location.assign(`${target.pathname}${target.search}`);
              return;
            }
            if (flash) showToast(flash);
            window.location.reload();
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

        // Non-embed success while a dialog is open (e.g. update redirected to list).
        if (this.open && (success === 'updated' || success === 'created') && !_dialogOnResult) {
          this.dialogStack = [];
          this.close();
          const record = parseAdminRecordPath(url.pathname);
          const slug =
            this.resourceSlug ||
            record?.slug ||
            resourceSlugFromUrl(basePath, url.pathname) ||
            '';
          if (slug) {
            const target = new URL(
              listPath(basePath, slug, getStoredListView(slug)),
              window.location.origin,
            );
            if (success) target.searchParams.set('success', success);
            if (error) target.searchParams.set('error', error);
            window.location.assign(`${target.pathname}${target.search}`);
            return;
          }
          if (flash) showToast(flash);
          window.location.reload();
          return;
        }

        if (this.dialogStack.length > 0) {
          await this.restoreDialog(this.dialogStack.pop());
          return;
        }

        this.close();

        const slug =
          this.resourceSlug ||
          parseAdminRecordPath(url.pathname)?.slug ||
          resourceSlugFromUrl(basePath, url.pathname) ||
          '';
        if (slug) {
          const target = new URL(
            listPath(basePath, slug, getStoredListView(slug)),
            window.location.origin,
          );
          if (success) target.searchParams.set('success', success);
          if (error) target.searchParams.set('error', error);
          window.location.assign(`${target.pathname}${target.search}`);
          return;
        }
        window.location.assign(url.pathname + url.search);
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
    if (!consumeInitialFlash()) {
      consumeQueryFlash();
    }
    maybeRedirectToStoredListView();
    applyListHrefs();
    bindListViewSwitcher();
    bindListRefresh();
    bindMediaUploads();
    bindFormSaveShortcut();
    bindFormAutosave();
    bindRecordPagerNav();
  });

  function formDataFrom(form) {
    const data = new FormData(form);
    try {
      const alpine = window.Alpine?.$data?.(form);
      const state = alpine?.state;
      if (!state || typeof state !== 'object') return data;
      // Prefer Alpine state so `.disabled()` fields (excluded from FormData) still save.
      for (const [key, value] of Object.entries(state)) {
        if (value === undefined) continue;
        if (typeof value === 'boolean') {
          if (value) data.set(key, 'true');
          else data.delete(key);
          continue;
        }
        data.set(key, value == null ? '' : String(value));
      }
    } catch {
      /* ignore */
    }
    return data;
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
      const btn =
        document.querySelector('[data-shamar-form-save]:not([disabled])') ||
        form.querySelector('button[type="submit"]:not([disabled])');
      if (!btn) return;
      event.preventDefault();
      btn.click();
    });
  }

  function bindFormAutosave() {
    function getForm() {
      return document.querySelector('#shamar-form[data-shamar-autosave]');
    }

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

    let savingForHref = null;
    let savingInPlace = false;

    function clearFieldErrors(form) {
      form.querySelectorAll('.shamar-field__error').forEach((el) => el.remove());
      form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    }

    function applyFieldErrors(form, errors) {
      clearFieldErrors(form);
      if (!errors || typeof errors !== 'object') return;
      for (const [name, message] of Object.entries(errors)) {
        const field =
          form.querySelector(`[name="${CSS.escape(name)}"]`) ||
          form.querySelector(`#field-${CSS.escape(name)}`);
        if (!field) continue;
        field.classList.add('is-invalid');
        const host = field.closest('.shamar-field') || field.parentElement;
        if (!host) continue;
        const p = document.createElement('p');
        p.className = 'shamar-field__error';
        p.setAttribute('role', 'alert');
        p.textContent = String(message);
        host.appendChild(p);
      }
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
        applyFieldErrors(form, payload?.errors);
        if (!silent) {
          showToast({
            type: 'error',
            title: 'Save failed',
            message: 'Could not save your changes — fix any errors and try again.',
          });
        }
        return false;
      }
      if (!res.ok) {
        if (!silent) {
          showToast({
            type: 'error',
            title: 'Save failed',
            message: 'Could not save your changes — fix any errors and try again.',
          });
        }
        return false;
      }
      clearFieldErrors(form);
      takeSnapshot(form);
      if (!silent) {
        showToast({
          type: 'success',
          title: 'Saved',
          message: 'Your changes have been saved.',
        });
      }
      return true;
    }

    document.addEventListener(
      'submit',
      (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.id !== 'shamar-form' || !form.hasAttribute('data-shamar-autosave')) return;
        if (savingInPlace) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        savingInPlace = true;
        const btn = document.querySelector('[data-shamar-form-save]');
        if (btn instanceof HTMLButtonElement) btn.disabled = true;
        saveFormInPlace(form)
          .catch((error) => {
            console.error('shamar save failed', error);
            showToast({
              type: 'error',
              title: 'Save failed',
              message: 'Could not save your changes.',
            });
          })
          .finally(() => {
            savingInPlace = false;
            if (btn instanceof HTMLButtonElement) btn.disabled = false;
          });
      },
      true,
    );

    async function autosaveThenNavigate(href) {
      const form = getForm();
      if (!form || !isDirty(form)) {
        window.location.href = href;
        return;
      }
      try {
        const ok = await saveFormInPlace(form, { silent: true });
        if (!ok) return;
        window.location.href = href;
      } catch (error) {
        console.error('shamar autosave failed', error);
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

    document.addEventListener(
      'click',
      (event) => {
        if (savingForHref) return;
        const anchor = event.target?.closest?.('a[href]');
        if (!anchor) return;
        if (anchor.hasAttribute('data-shamar-skip-autosave')) return;
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
