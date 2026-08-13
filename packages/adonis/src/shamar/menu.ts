/** Shared nav shape for resources and pages. */
export interface NavItem {
  slug: string;
  label: string;
  icon?: string;
  navigationGroup?: string;
  navigationSubGroup?: string;
  navigationSort?: number;
}

export interface MenuRoot {
  label: string;
  icon: string;
  href: string;
  rootIndex: number;
  active: boolean;
}

export interface MenuSecondaryChild {
  label: string;
  href: string;
  active: boolean;
  icon?: string;
}

export interface MenuSecondaryItem {
  label: string;
  href?: string;
  active: boolean;
  icon?: string;
  children?: MenuSecondaryChild[];
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface MenuLayoutContext {
  menuRoots: MenuRoot[];
  menuActiveRoot: MenuRoot | null;
  menuActiveRootIndex: number | null;
  menuSecondary: MenuSecondaryItem[];
  breadcrumbs: Breadcrumb[];
}

export interface NavigationGroup {
  name: string;
  icon?: string;
  sort?: number;
  items: NavItem[];
}

/** Extra crumbs for create / show / edit record pages. */
export interface RecordBreadcrumbOptions {
  mode?: 'create' | 'edit' | 'show';
  /** Human record title (e.g. company name). */
  recordTitle?: string;
  /** Show/detail URL — linked from the record crumb on edit. */
  recordHref?: string;
}

const GROUP_ICONS: Record<string, string> = {
  Administration: 'cog',
  General: 'squares-2x2',
  CRM: 'users',
  Settings: 'cog',
};

function compareNavigationItems(a: NavItem, b: NavItem): number {
  const sortA = a.navigationSort ?? Number.POSITIVE_INFINITY;
  const sortB = b.navigationSort ?? Number.POSITIVE_INFINITY;
  if (sortA !== sortB) return sortA - sortB;
  return a.label.localeCompare(b.label);
}

function firstGroupHref(group: NavigationGroup, basePath: string): string {
  const sorted = [...group.items].sort(compareNavigationItems);
  return `${basePath}/${sorted[0]?.slug ?? ''}`;
}

/**
 * Build top-bar secondary items. Items with `navigationSubGroup` collapse
 * into a dropdown (`children`); others remain direct links. Relative order
 * follows each item/cluster's minimum `navigationSort`.
 */
export function buildMenuSecondary(
  items: NavItem[],
  basePath: string,
  currentSlug?: string,
): MenuSecondaryItem[] {
  const sorted = [...items].sort(compareNavigationItems);
  type Entry = { sort: number; item: MenuSecondaryItem };
  const entries: Entry[] = [];
  const subgroups = new Map<string, NavItem[]>();
  const subgroupOrder: string[] = [];

  for (const item of sorted) {
    const subgroup = item.navigationSubGroup?.trim();
    if (!subgroup) {
      entries.push({
        sort: item.navigationSort ?? Number.POSITIVE_INFINITY,
        item: {
          label: item.label,
          href: `${basePath}/${item.slug}`,
          active: item.slug === currentSlug,
          icon: item.icon,
        },
      });
      continue;
    }
    if (!subgroups.has(subgroup)) {
      subgroups.set(subgroup, []);
      subgroupOrder.push(subgroup);
    }
    subgroups.get(subgroup)!.push(item);
  }

  for (const name of subgroupOrder) {
    const members = subgroups.get(name)!;
    const children: MenuSecondaryChild[] = members.map((item) => ({
      label: item.label,
      href: `${basePath}/${item.slug}`,
      active: item.slug === currentSlug,
      icon: item.icon,
    }));
    entries.push({
      sort: Math.min(...members.map((m) => m.navigationSort ?? Number.POSITIVE_INFINITY)),
      item: {
        label: name,
        active: children.some((child) => child.active),
        children,
      },
    });
  }

  return entries.sort((a, b) => a.sort - b.sort).map((entry) => entry.item);
}

export function menuLayoutContext(
  groups: NavigationGroup[],
  basePath: string,
  currentSlug?: string,
  pageTitle?: string,
  record?: RecordBreadcrumbOptions,
): MenuLayoutContext {
  const menuRoots: MenuRoot[] = [
    {
      label: 'Dashboard',
      icon: 'home',
      href: basePath,
      rootIndex: 0,
      active: !currentSlug,
    },
    ...groups.map((group, index) => {
      const href = firstGroupHref(group, basePath);
      const active = Boolean(
        currentSlug && group.items.some((item) => item.slug === currentSlug),
      );
      return {
        label: group.name,
        icon: group.icon ?? GROUP_ICONS[group.name] ?? 'squares-2x2',
        href,
        rootIndex: index + 1,
        active,
      };
    }),
  ];

  const menuActiveRootIndex = currentSlug
    ? (menuRoots.find((root) => root.active)?.rootIndex ?? null)
    : 0;

  const menuActiveRoot =
    menuActiveRootIndex !== null
      ? (menuRoots.find((root) => root.rootIndex === menuActiveRootIndex) ?? null)
      : null;

  const activeGroup = currentSlug
    ? groups.find((group) => group.items.some((item) => item.slug === currentSlug))
    : undefined;

  const menuSecondary = activeGroup
    ? buildMenuSecondary(activeGroup.items, basePath, currentSlug)
    : [];

  const breadcrumbs: Breadcrumb[] = [{ label: 'Home', href: basePath }];

  if (menuActiveRoot && menuActiveRoot.label !== 'Dashboard') {
    breadcrumbs.push({ label: menuActiveRoot.label, href: menuActiveRoot.href });
  }

  if (currentSlug && activeGroup) {
    const navItem = activeGroup.items.find((item) => item.slug === currentSlug);
    if (navItem) {
      breadcrumbs.push({ label: navItem.label, href: `${basePath}/${navItem.slug}` });
    }
  }

  const mode = record?.mode;
  const recordTitle = record?.recordTitle?.trim();
  const recordHref = record?.recordHref;

  if (mode === 'create') {
    breadcrumbs.push({ label: pageTitle || 'New' });
  } else if (mode === 'edit' && recordTitle) {
    breadcrumbs.push({
      label: recordTitle,
      href: recordHref,
    });
    breadcrumbs.push({ label: 'Edit' });
  } else if (mode === 'show' && recordTitle) {
    breadcrumbs.push({ label: recordTitle });
  } else if (pageTitle && breadcrumbs[breadcrumbs.length - 1]?.label !== pageTitle) {
    breadcrumbs.push({ label: pageTitle });
  }

  return {
    menuRoots,
    menuActiveRoot,
    menuActiveRootIndex,
    menuSecondary,
    breadcrumbs,
  };
}

/**
 * Merge resource + page nav items into groups (by `navigationGroup`).
 * Preserves optional `icon` on resource/media groups (used for top-level roots).
 */
export function mergeNavigationGroups(
  resourceGroups: Array<{ name: string; icon?: string; items: NavItem[] }>,
  pageItems: NavItem[],
): NavigationGroup[] {
  const groups = new Map<string, { icon?: string; items: NavItem[] }>();

  for (const group of resourceGroups) {
    groups.set(group.name, { icon: group.icon, items: [...group.items] });
  }

  for (const page of pageItems) {
    const name = page.navigationGroup ?? 'General';
    const entry = groups.get(name) ?? { items: [] };
    entry.items.push(page);
    groups.set(name, entry);
  }

  return [...groups.entries()].map(([name, entry]) => ({
    name,
    icon: entry.icon,
    items: entry.items.sort(compareNavigationItems),
  }));
}
