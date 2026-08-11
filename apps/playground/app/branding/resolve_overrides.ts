import type { BrandingOverride, BrandingOverrideContext } from '@shamar/adonis'
import Company from '#models/company'
import { getAppSettings } from '#models/app_settings'

function nonEmpty(value: unknown): string | undefined {
  if (value == null) return undefined
  const raw = String(value).trim()
  return raw === '' ? undefined : raw
}

/**
 * Merge order (later wins): AppSettings singleton → company (when `companyId` is set).
 * Panel / `defineConfig({ branding })` remains the base under these overrides.
 */
export async function resolvePlaygroundBrandingOverrides(
  ctx: BrandingOverrideContext,
): Promise<BrandingOverride | undefined> {
  const settings = await getAppSettings()
  const brandDisplay =
    settings?.brandDisplay === 'both' ||
    settings?.brandDisplay === 'logo' ||
    settings?.brandDisplay === 'name'
      ? settings.brandDisplay
      : undefined

  const global: BrandingOverride = {
    name: nonEmpty(settings?.name),
    logo: nonEmpty(settings?.logo),
    logoDark: nonEmpty(settings?.logoDark),
    logoHeight: nonEmpty(settings?.logoHeight),
    brandDisplay,
  }

  const companyId = ctx.companyId ?? ctx.user?.companyId
  if (!companyId) {
    return hasAny(global) ? global : undefined
  }

  const company = await Company.findById(companyId).lean()
  if (!company) {
    return hasAny(global) ? global : undefined
  }

  const merged: BrandingOverride = {
    name: global.name,
    logo: nonEmpty(company.logo) ?? global.logo,
    logoDark: nonEmpty(company.logoDark) ?? global.logoDark,
    logoHeight:
      company.logoHeight != null && company.logoHeight !== ''
        ? company.logoHeight
        : global.logoHeight,
    brandDisplay: global.brandDisplay,
  }

  return hasAny(merged) ? merged : undefined
}

function hasAny(override: BrandingOverride): boolean {
  return Boolean(
    override.name ||
      override.logo ||
      override.logoDark ||
      override.logoHeight ||
      override.brandDisplay,
  )
}
