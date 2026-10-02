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

export function markNotificationUnread(session: NotificationSession, id: string): void {
  session.put?.(
    secretKey,
    listNotifications(session).map((note) =>
      note.id === id && note.readAt ? { ...note, readAt: null } : note,
    ),
  );
}

export function toggleNotificationRead(session: NotificationSession, id: string): void {
  const note = listNotifications(session).find((item) => item.id === id);
  if (!note) return;
  if (note.readAt) markNotificationUnread(session, id);
  else markNotificationRead(session, id);
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

const BELL_ICON = `<svg class="shamar-notifications__bell-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>`;

const ENVELOPE_CLOSED = `<svg class="shamar-notifications__envelope" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>`;

const ENVELOPE_OPEN = `<svg class="shamar-notifications__envelope" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.603L10.5 15.166m0 0l-6.478-3.488M10.5 15.166l6.478 3.488M3.433 7.669l6.478 3.489a2.25 2.25 0 002.178 0l6.478-3.489M3.433 7.669l-.682-.368A2.25 2.25 0 012.25 5.25h19.5a2.25 2.25 0 01.682 2.051l-.682.368"/></svg>`;

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function asItems(component: WireComponent): PanelNotification[] {
  return Array.isArray(component.data.items)
    ? (component.data.items as PanelNotification[])
    : [];
}

function renderDropdown(unread: PanelNotification[]): string {
  const rows = unread
    .map((item) => {
      const when = formatWhen(item.createdAt);
      return `<button type="button" wire:click="openDetail('${escapeHtml(item.id)}')" wire:key="drop-${escapeHtml(item.id)}" class="shamar-notifications__drop-item">
        <span class="shamar-notifications__drop-title">${escapeHtml(item.title)}</span>
        ${item.body ? `<span class="shamar-notifications__drop-body">${escapeHtml(item.body)}</span>` : ''}
        ${when ? `<span class="shamar-notifications__drop-when">${escapeHtml(when)}</span>` : ''}
      </button>`;
    })
    .join('');

  const empty = `<p class="shamar-notifications__empty">No unread notifications</p>`;

  return `<div class="shamar-notifications__dropdown" role="menu">
    <div class="shamar-notifications__dropdown-head">
      <span class="shamar-notifications__dropdown-label">Unread</span>
    </div>
    <div class="shamar-notifications__dropdown-list">
      ${rows || empty}
    </div>
    <div class="shamar-notifications__dropdown-foot">
      <button type="button" wire:click="openAside" class="shamar-notifications__view-all">View all</button>
    </div>
  </div>`;
}

function renderAside(items: PanelNotification[]): string {
  const rows = items
    .map((item) => {
      const unread = !item.readAt;
      const when = formatWhen(item.createdAt);
      const envelope = unread ? ENVELOPE_CLOSED : ENVELOPE_OPEN;
      const toggleLabel = unread ? 'Mark as read' : 'Mark as unread';
      return `<div class="shamar-notifications__aside-row${unread ? ' is-unread' : ''}" wire:key="aside-${escapeHtml(item.id)}">
        <button type="button" wire:click="openDetail('${escapeHtml(item.id)}')" class="shamar-notifications__aside-main">
          <span class="shamar-notifications__aside-title">${escapeHtml(item.title)}</span>
          ${item.body ? `<span class="shamar-notifications__aside-body">${escapeHtml(item.body)}</span>` : ''}
          ${when ? `<span class="shamar-notifications__aside-when">${escapeHtml(when)}</span>` : ''}
        </button>
        <button type="button" wire:click="toggleRead('${escapeHtml(item.id)}')" class="shamar-notifications__toggle" aria-label="${toggleLabel}" title="${toggleLabel}">
          ${envelope}
        </button>
      </div>`;
    })
    .join('');

  return `<div class="shamar-notifications__aside-backdrop" wire:click="closeAside" aria-hidden="true"></div>
    <aside class="shamar-notifications__aside" role="dialog" aria-label="All notifications">
      <header class="shamar-notifications__aside-head">
        <span class="shamar-notifications__aside-label">Notifications</span>
        <div class="shamar-notifications__aside-actions">
          <button type="button" wire:click="readAll" class="shamar-notifications__text-btn">Mark all read</button>
          <button type="button" wire:click="closeAside" class="shamar-notifications__icon-btn" aria-label="Close">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" width="18" height="18" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </header>
      <div class="shamar-notifications__aside-list">
        ${rows || '<p class="shamar-notifications__empty">No notifications yet</p>'}
      </div>
    </aside>`;
}

function renderDetail(item: PanelNotification): string {
  const when = formatWhen(item.createdAt);
  return `<div class="shamar-notifications__detail-backdrop" wire:click="closeDetail" aria-hidden="true"></div>
    <div class="shamar-notifications__detail" role="dialog" aria-modal="true" aria-label="${escapeHtml(item.title)}">
      <header class="shamar-notifications__detail-head">
        <h2 class="shamar-notifications__detail-title">${escapeHtml(item.title)}</h2>
        <button type="button" wire:click="closeDetail" class="shamar-notifications__icon-btn" aria-label="Close">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.75" width="18" height="18" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </header>
      <div class="shamar-notifications__detail-body">
        ${item.body ? `<p class="shamar-notifications__detail-text">${escapeHtml(item.body)}</p>` : '<p class="shamar-notifications__detail-text is-muted">No additional details.</p>'}
        ${when ? `<p class="shamar-notifications__detail-when">${escapeHtml(when)}</p>` : ''}
      </div>
    </div>`;
}

function renderBell(component: WireComponent): string {
  const open = component.data.open === true;
  const aside = component.data.aside === true;
  const detailId = typeof component.data.detailId === 'string' ? component.data.detailId : null;
  const items = asItems(component);
  const unreadItems = items.filter((item) => !item.readAt);
  const unreadCount = unreadItems.length;
  const detail = detailId ? items.find((item) => item.id === detailId) : undefined;

  return `<div class="shamar-notifications relative">
    <button type="button" wire:click="toggle" class="shamar-notifications__bell" aria-label="Notifications" aria-expanded="${open ? 'true' : 'false'}">
      ${BELL_ICON}
      ${unreadCount ? `<span class="shamar-notifications__badge">${unreadCount}</span>` : ''}
    </button>
    ${open ? renderDropdown(unreadItems) : ''}
    ${aside ? renderAside(items) : ''}
    ${detail ? renderDetail(detail) : ''}
  </div>`;
}

type BellData = {
  open: boolean;
  aside: boolean;
  detailId: string | null;
  items: PanelNotification[];
};

function bellComponent(items: PanelNotification[], session?: NotificationSession): WireComponent {
  const reload = () => (session ? listNotifications(session) : items);
  return {
    data: {
      open: false,
      aside: false,
      detailId: null,
      items: reload(),
    } satisfies BellData,
    toggle() {
      this.data.open = this.data.open !== true;
    },
    openAside() {
      this.data.open = false;
      this.data.aside = true;
    },
    closeAside() {
      this.data.aside = false;
    },
    openDetail(id: string) {
      if (session) markNotificationRead(session, id);
      this.data.items = reload();
      this.data.open = false;
      this.data.detailId = id;
    },
    closeDetail() {
      this.data.detailId = null;
    },
    toggleRead(id: string) {
      if (session) toggleNotificationRead(session, id);
      this.data.items = reload();
    },
    async readAll() {
      if (session) markAllNotificationsRead(session);
      this.data.items = reload();
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
        const aside = component.data.aside === true;
        const detailId =
          typeof component.data.detailId === 'string' ? component.data.detailId : null;
        component.data.items = listNotifications(session);
        component.data.open = open;
        component.data.aside = aside;
        component.data.detailId = detailId;
      },
      render: renderBell,
    },
  });
  return kernel.update(request, endpoint);
}
