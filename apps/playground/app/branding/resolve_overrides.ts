import type { BrandingOverride, BrandingOverrideContext } from '@shamar/adonis'
import { getAppSettings } from '#models/app_settings'

function nonEmpty(value: unknown): string | undefined {
  if (value == null) return undefined
  const raw = String(value).trim()
  return raw === '' ? undefined : raw
}

function hexColor(value: unknown): string | undefined {
  const raw = nonEmpty(value)
  if (!raw) return undefined
  const hex = raw.startsWith('#') ? raw : `#${raw}`
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : undefined
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
    primaryColor: hexColor(settings?.primaryColor),
    accentColor: hexColor(settings?.accentColor),
  }

  return hasAny(global) ? global : undefined
}

function hasAny(override: BrandingOverride): boolean {
  return Boolean(
    override.name ||
      override.logo ||
      override.logoDark ||
      override.logoHeight ||
      override.brandDisplay ||
      override.primaryColor ||
      override.accentColor,
  )
}
