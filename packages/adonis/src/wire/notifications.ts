import { randomUUID } from 'node:crypto';
import { escapeHtml, WireKernel, type WireComponent, type WireRequest } from '@shamar/wire';
import { panelWireSecret } from './secret.js';

const secretKey = 'shamar.notifications';

export interface PanelNotification {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  readAt: string | null;
}

/** Enough of an Adonis session for this store. */
export interface NotificationSession {
  get?(key: string): unknown;
  put?(key: string, value: unknown): void;
}

export function listNotifications(session: NotificationSession): PanelNotification[] {
  const raw = session.get?.(secretKey);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isNotification);
}

export function pushNotification(
  session: NotificationSession,
  input: { title: string; body?: string },
): PanelNotification {
  const note: PanelNotification = {
    id: randomUUID(),
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  session.put?.(secretKey, [note, ...listNotifications(session)].slice(0, 30));
  return note;
}

export function markNotificationRead(session: NotificationSession, id: string): void {
  session.put?.(
    secretKey,
    listNotifications(session).map((note) =>
      note.id === id && !note.readAt ? { ...note, readAt: new Date().toISOString() } : note,
    ),
  );
}

export function markAllNotificationsRead(session: NotificationSession): void {
  const now = new Date().toISOString();
  session.put?.(
    secretKey,
    listNotifications(session).map((note) => (note.readAt ? note : { ...note, readAt: now })),
  );
}

function isNotification(value: unknown): value is PanelNotification {
  if (!value || typeof value !== 'object') return false;
  const note = value as PanelNotification;
  return typeof note.id === 'string' && typeof note.title === 'string' && typeof note.createdAt === 'string';
}

function renderBell(component: WireComponent): string {
  const open = component.data.open === true;
  const items = Array.isArray(component.data.items)
    ? (component.data.items as PanelNotification[])
    : [];
  const unread = items.filter((item) => !item.readAt).length;
  const rows = items
    .map((item) => {
      const dim = item.readAt ? ' text-body-subtle' : '';
      return `<button type="button" wire:click="read('${escapeHtml(item.id)}')" wire:key="${escapeHtml(item.id)}" class="block w-full text-left px-3 py-2 text-sm hover:bg-surface-hover${dim}"><span class="block text-heading">${escapeHtml(item.title)}</span>${item.body ? `<span class="block text-xs">${escapeHtml(item.body)}</span>` : ''}</button>`;
    })
    .join('');
  const panel = open
    ? `<div class="absolute right-0 z-50 mt-1 w-72 max-h-80 overflow-auto shamar-card rounded-xl py-1">
        <div class="flex items-center justify-between px-3 py-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-body-subtle">Notifications</span>
          <button type="button" wire:click="readAll" class="text-xs text-fg-brand">Mark all read</button>
        </div>
        ${rows || '<p class="px-3 py-2 text-sm text-body-subtle">No notifications</p>'}
      </div>`
    : '';
  return `<div class="relative">
    <button type="button" wire:click="toggle" class="relative p-1.5 rounded-md text-body hover:bg-surface-hover" aria-label="Notifications" aria-expanded="${open ? 'true' : 'false'}">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"/></svg>
      ${unread ? `<span class="absolute -top-0.5 -right-0.5 min-w-[1rem] rounded-full bg-fg-brand px-1 text-[10px] leading-4 text-white">${unread}</span>` : ''}
    </button>
    ${panel}
  </div>`;
}

function bellComponent(items: PanelNotification[], session?: NotificationSession): WireComponent {
  const reload = () => (session ? listNotifications(session) : items);
  return {
    data: { open: false, items: reload() },
    async read(id: string) {
      if (session) markNotificationRead(session, id);
      this.data.items = reload();
    },
    async readAll() {
      if (session) markAllNotificationsRead(session);
      this.data.items = reload();
    },
    toggle() {
      this.data.open = this.data.open !== true;
    },
  } as WireComponent;
}

export function mountNotifications(basePath: string, items: PanelNotification[] = []): string {
  const endpoint = `${basePath.replace(/\/+$/, '')}/wire`;
  const kernel = new WireKernel(panelWireSecret(), {
    notifications: {
      create: () => bellComponent(items),
      render: renderBell,
    },
  });
  return kernel.mount('notifications', endpoint).html;
}

export function updateNotifications(
  basePath: string,
  session: NotificationSession,
  request: WireRequest,
) {
  const endpoint = `${basePath.replace(/\/+$/, '')}/wire`;
  const kernel = new WireKernel(panelWireSecret(), {
    notifications: {
      create: () => bellComponent([], session),
      refresh(component) {
        const open = component.data.open === true;
        component.data.items = listNotifications(session);
        component.data.open = open;
      },
      render: renderBell,
    },
  });
  return kernel.update(request, endpoint);
}
