import {
  WireKernel,
  escapeHtml,
  type WireComponent,
  type WireRequest,
} from '@shamar/wire';
import type { ResourceMeta } from '@shamar/core';
import type { AuthorizationContext } from '@shamar/cherubim';
import type { PanelRuntime } from '../runtime.js';
import type { Authorizer } from '@shamar/cherubim';
import { canViewResource } from '../shamar/auth.js';
import { recordTitle } from '../shamar/list-query.js';
import { panelWireSecret } from './secret.js';
import { panelPathPrefix } from '../shamar/paths.js';

export interface GlobalSearchHit {
  label: string;
  url: string;
  group: string;
}

/**
 * Adonis bodyparser turns `""` into `null`. Keep empty query as `null` in the
 * signed snapshot so mount → POST round-trips verify cleanly.
 */
function normalizeQuery(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

const SEARCH_ICON = `<svg class="shamar-global-search__glyph" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>`;

function renderSearch(component: WireComponent): string {
  const query = String(component.data.query ?? '');
  const results = Array.isArray(component.data.results)
    ? (component.data.results as GlobalSearchHit[])
    : [];
  const expanded = component.data.expanded === true;
  const open = query.trim().length > 0;
  const rows = results
    .map(
      (hit) =>
        `<a href="${escapeHtml(hit.url)}" class="block px-3 py-2 text-sm hover:bg-surface-hover"><span class="block text-heading">${escapeHtml(hit.label)}</span><span class="block text-xs text-body-subtle">${escapeHtml(hit.group)}</span></a>`,
    )
    .join('');
  const empty = open && results.length === 0
    ? '<p class="px-3 py-2 text-sm text-body-subtle">No matching records</p>'
    : '';
  const panel = open
    ? `<div class="shamar-global-search__results">${rows}${empty}</div>`
    : '';
  const panelClass = `shamar-global-search__panel${expanded ? ' is-expanded' : ''}`;

  return `<div class="shamar-global-search" data-shamar-global-search>
    <button type="button" wire:click="expand" class="shamar-global-search__icon-btn" aria-label="Search (Ctrl+K)" title="Search (Ctrl+K)">
      ${SEARCH_ICON}
    </button>
    <div class="${panelClass}">
      <div class="shamar-global-search__field">
        ${SEARCH_ICON}
        <input
          data-shamar-search-input
          wire:model.debounce.250ms="query"
          type="search"
          value="${escapeHtml(query)}"
          placeholder="Search"
          aria-label="Search panel"
          class="shamar-global-search__input"
        />
        <kbd class="shamar-global-search__kbd" aria-hidden="true">Ctrl K</kbd>
        <button type="button" wire:click="collapse" class="shamar-global-search__close" aria-label="Close search">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" width="16" height="16" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      ${panel}
    </div>
  </div>`;
}

function emptySearchData() {
  return {
    query: null as string | null,
    results: [] as GlobalSearchHit[],
    expanded: false,
  };
}

export function globalSearchKernel(
  panel: PanelRuntime,
  authorizer: Authorizer,
  authCtx: AuthorizationContext,
): WireKernel {
  const definition = {
    create(): WireComponent {
      const component = {
        data: emptySearchData(),
        async updated(key: string) {
          if (key !== 'query') return;
          component.data.query = normalizeQuery(component.data.query);
          component.data.results = await searchPanel(
            panel,
            authorizer,
            authCtx,
            component.data.query ?? '',
          );
        },
        expand() {
          component.data.expanded = true;
        },
        collapse() {
          component.data.expanded = false;
          component.data.query = null;
          component.data.results = [];
        },
      };
      return component as WireComponent;
    },
    refresh(component: WireComponent) {
      const expanded = component.data.expanded === true;
      component.data.expanded = expanded;
    },
    render: renderSearch,
  };
  return new WireKernel(panelWireSecret(), { 'global-search': definition });
}

export function mountGlobalSearch(basePath: string): string {
  const endpoint = `${basePath.replace(/\/+$/, '')}/wire`;
  const kernel = new WireKernel(panelWireSecret(), {
    'global-search': {
      create: () =>
        ({
          data: emptySearchData(),
          expand() {
            this.data.expanded = true;
          },
          collapse() {
            this.data.expanded = false;
            this.data.query = null;
            this.data.results = [];
          },
        }) as WireComponent,
      render: renderSearch,
    },
  });
  return kernel.mount('global-search', endpoint).html;
}

export async function updateGlobalSearch(
  panel: PanelRuntime,
  authorizer: Authorizer,
  authCtx: AuthorizationContext,
  request: WireRequest,
) {
  const endpoint = `${panelPathPrefix(panel.path)}/wire`;
  const kernel = globalSearchKernel(panel, authorizer, authCtx);
  return kernel.update(request, endpoint);
}

async function searchPanel(
  panel: PanelRuntime,
  authorizer: Authorizer,
  authCtx: AuthorizationContext,
  rawQuery: string,
): Promise<GlobalSearchHit[]> {
  const q = rawQuery.trim();
  if (q.length < 1) return [];
  const basePath = panelPathPrefix(panel.path);
  const hits: GlobalSearchHit[] = [];
  for (const meta of searchableResources(panel)) {
    if (!canViewResource(authorizer, authCtx, panel.registry, meta.slug)) continue;
    try {
      const page = await panel.adapter.list(meta, { page: 1, perPage: 5, search: q });
      for (const record of page.items) {
        const id = record.id;
        if (id == null || id === '') continue;
        hits.push({
          label: recordTitle(meta, record),
          url: `${basePath}/${meta.slug}/${id}`,
          group: meta.label,
        });
        if (hits.length >= 8) return hits;
      }
    } catch {
      /* one resource failing should not blank the rest of the search */
    }
  }
  return hits;
}

function searchableResources(panel: PanelRuntime): ResourceMeta[] {
  return panel.registry.all().filter((meta) => !meta.navigationHidden && meta.searchableFields.length > 0);
}
