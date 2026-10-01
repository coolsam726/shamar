import { randomBytes } from 'node:crypto';
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

export interface GlobalSearchHit {
  label: string;
  url: string;
  group: string;
}

const secret = randomBytes(32).toString('hex');

function renderSearch(component: WireComponent): string {
  const query = String(component.data.query ?? '');
  const results = Array.isArray(component.data.results)
    ? (component.data.results as GlobalSearchHit[])
    : [];
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
    ? `<div class="absolute right-0 z-50 mt-1 w-full min-w-[16rem] max-h-80 overflow-auto shamar-card rounded-xl py-1">${rows}${empty}</div>`
    : '';
  return `<div class="relative w-56 max-w-[40vw]">
    <input wire:model.debounce.250ms="query" type="search" value="${escapeHtml(query)}" placeholder="Search" aria-label="Search panel" class="w-full rounded-md border border-default bg-transparent px-2.5 py-1.5 text-sm text-body placeholder:text-body-subtle focus:outline-none focus:ring-2 focus:ring-fg-brand" />
    ${panel}
  </div>`;
}

export function globalSearchKernel(
  panel: PanelRuntime,
  authorizer: Authorizer,
  authCtx: AuthorizationContext,
): WireKernel {
  const endpoint = `${panel.path.replace(/\/+$/, '')}/wire`;
  const definition = {
    create(): WireComponent {
      const component: WireComponent & { data: { query: string; results: GlobalSearchHit[] } } = {
        data: { query: '', results: [] },
        async updated(key) {
          if (key !== 'query') return;
          component.data.results = await searchPanel(panel, authorizer, authCtx, component.data.query);
        },
      };
      return component;
    },
    render: renderSearch,
  };
  return new WireKernel(secret, { 'global-search': definition });
}

export function mountGlobalSearch(basePath: string): string {
  const endpoint = `${basePath.replace(/\/+$/, '')}/wire`;
  const kernel = new WireKernel(secret, {
    'global-search': {
      create: () => ({ data: { query: '', results: [] } }),
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
  const endpoint = `${panel.path.replace(/\/+$/, '')}/wire`;
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
  const basePath = panel.path.replace(/\/+$/, '');
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
