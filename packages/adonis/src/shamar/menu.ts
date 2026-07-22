import type { ResourceMeta } from '@shamar/core';

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
  items: ResourceMeta[];
}

const GROUP_ICONS: Record<string, string> = {
  Administration: 'cog',
  General: 'squares-2x2',
  CRM: 'users',
  Settings: 'cog',
};

function compareNavigationItems(a: ResourceMeta, b: ResourceMeta): number {
  const sortA = a.navigationSort ?? Number.POSITIVE_INFINITY;
  const sortB = b.navigationSort ?? Number.POSITIVE_INFINITY;
  if (sortA !== sortB) return sortA - sortB;
  return a.label.localeCompare(b.label);
}

function firstGroupHref(group: NavigationGroup, basePath: string): string {
  const sorted = [...group.items].sort(compareNavigationItems);
  return `${basePath}/${sorted[0]?.slug ?? ''}`;
}

export function menuLayoutContext(
  groups: NavigationGroup[],
  basePath: string,
  currentSlug?: string,
  pageTitle?: string,
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
    ? activeGroup.items.sort(compareNavigationItems).map((item) => ({
        label: item.label,
        href: `${basePath}/${item.slug}`,
        active: item.slug === currentSlug,
        icon: item.icon,
      }))
    : [];

  const breadcrumbs: Breadcrumb[] = [{ label: 'Home', href: basePath }];

  if (menuActiveRoot && menuActiveRoot.label !== 'Dashboard') {
    breadcrumbs.push({ label: menuActiveRoot.label, href: menuActiveRoot.href });
  }

  if (currentSlug && activeGroup) {
    const resource = activeGroup.items.find((item) => item.slug === currentSlug);
    if (resource) {
      breadcrumbs.push({ label: resource.label, href: `${basePath}/${resource.slug}` });
    }
  }

  if (pageTitle && breadcrumbs[breadcrumbs.length - 1]?.label !== pageTitle) {
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
