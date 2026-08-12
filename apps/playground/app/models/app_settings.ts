import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

/** Singleton key for the global app settings document. */
export const APP_SETTINGS_KEY = 'global'

export type BrandDisplayMode = 'both' | 'logo' | 'name'

export interface AppSettingsAttrs {
  key: string
  /** Branding */
  name?: string | null
  logo?: string | null
  logoDark?: string | null
  logoMediaId?: string | null
  logoDarkMediaId?: string | null
  logoHeight?: string | null
  brandDisplay?: BrandDisplayMode | null
  /** Preferences */
  channels?: string[]
  notifyEmail?: boolean
  notifySms?: boolean
  theme?: string | null
}

const appSettingsSchema = new Schema<AppSettingsAttrs>(
  {
    key: { type: String, required: true, unique: true, default: APP_SETTINGS_KEY },
    name: { type: String, default: null, trim: true },
    logo: { type: String, default: null, trim: true },
    logoDark: { type: String, default: null, trim: true },
    logoMediaId: { type: String, default: null, trim: true },
    logoDarkMediaId: { type: String, default: null, trim: true },
    logoHeight: { type: String, default: null, trim: true },
    brandDisplay: {
      type: String,
      enum: ['both', 'logo', 'name', null],
      default: null,
    },
    channels: { type: [String], default: [] },
    notifyEmail: { type: Boolean, default: true },
    notifySms: { type: Boolean, default: false },
    theme: { type: String, default: 'system', trim: true },
  },
  {
    timestamps: true,
    collection: 'app_settings',
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id)
        delete ret.__v
        return ret
      },
    },
  },
)

export type AppSettingsDocument = HydratedDocument<AppSettingsAttrs>

const AppSettings: Model<AppSettingsAttrs> =
  (mongoose.models.AppSettings as Model<AppSettingsAttrs> | undefined) ??
  mongoose.model<AppSettingsAttrs>('AppSettings', appSettingsSchema)

export async function getAppSettings(): Promise<AppSettingsDocument | null> {
  return AppSettings.findOne({ key: APP_SETTINGS_KEY })
}

/** @deprecated Prefer {@link getAppSettings}. */
export async function getAppBranding(): Promise<AppSettingsDocument | null> {
  return getAppSettings()
}

export async function upsertAppSettings(
  data: Partial<Omit<AppSettingsAttrs, 'key'>>,
): Promise<AppSettingsDocument> {
  const brandDisplay =
    data.brandDisplay === 'both' || data.brandDisplay === 'logo' || data.brandDisplay === 'name'
      ? data.brandDisplay
      : null

  const doc = await AppSettings.findOneAndUpdate(
    { key: APP_SETTINGS_KEY },
    {
      $set: {
        name: data.name ?? null,
        logo: data.logo ?? null,
        logoDark: data.logoDark ?? null,
        logoMediaId: data.logoMediaId ?? null,
        logoDarkMediaId: data.logoDarkMediaId ?? null,
        logoHeight: data.logoHeight ?? null,
        brandDisplay,
        channels: Array.isArray(data.channels) ? data.channels : [],
        notifyEmail: data.notifyEmail !== false,
        notifySms: Boolean(data.notifySms),
        theme: String(data.theme ?? 'system').trim() || 'system',
      },
      $setOnInsert: { key: APP_SETTINGS_KEY },
    },
    { upsert: true, new: true },
  )
  return doc!
}

/** @deprecated Prefer {@link upsertAppSettings}. */
export async function upsertAppBranding(
  data: Partial<Omit<AppSettingsAttrs, 'key'>>,
): Promise<AppSettingsDocument> {
  return upsertAppSettings(data)
}

export default AppSettings
