import type { BrandingOverride, BrandingOverrideContext } from '@shamar/adonis'
import { getAppSettings } from '#models/app_settings'

function nonEmpty(value: unknown): string | undefined {
  if (value == null) return undefined
  const raw = String(value).trim()
  return raw === '' ? undefined : raw
}

/**
 * Merge order: AppSettings singleton overrides panel / `defineConfig({ branding })`.
 */
export async function resolvePlaygroundBrandingOverrides(
  _ctx: BrandingOverrideContext,
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

  return hasAny(global) ? global : undefined
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
