import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface PreferenceAttrs {
  key: string
  label?: string | null
  channels?: string[]
  notifyEmail?: boolean
  notifySms?: boolean
  theme?: string | null
  metaJson?: string | null
}

const preferenceSchema = new Schema<PreferenceAttrs>(
  {
    key: { type: String, required: true, trim: true, unique: true },
    label: { type: String, default: null, trim: true },
    channels: { type: [String], default: [] },
    notifyEmail: { type: Boolean, default: true },
    notifySms: { type: Boolean, default: false },
    theme: { type: String, default: 'system', trim: true },
    metaJson: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'preferences',
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

export type PreferenceDocument = HydratedDocument<PreferenceAttrs>

const Preference: Model<PreferenceAttrs> =
  (mongoose.models.Preference as Model<PreferenceAttrs> | undefined) ??
  mongoose.model<PreferenceAttrs>('Preference', preferenceSchema)

export default Preference
