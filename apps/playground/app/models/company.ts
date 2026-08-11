import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface CompanyAttrs {
  name: string
  code?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  industry?: string | null
  notes?: string | null
  active?: boolean
  /** Overrides global / panel logo when the user belongs to this company. */
  logo?: string | null
  logoDark?: string | null
  /** CSS length or px number as string (e.g. `40`, `2.5rem`). */
  logoHeight?: string | null
}

const companySchema = new Schema<CompanyAttrs>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, default: null, trim: true, unique: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    phone: { type: String, default: null, trim: true },
    website: { type: String, default: null, trim: true },
    industry: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
    active: { type: Boolean, default: true },
    logo: { type: String, default: null, trim: true },
    logoDark: { type: String, default: null, trim: true },
    logoHeight: { type: String, default: null, trim: true },
  },
  {
    timestamps: true,
    collection: 'companies',
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

export type CompanyDocument = HydratedDocument<CompanyAttrs>

const Company: Model<CompanyAttrs> =
  (mongoose.models.Company as Model<CompanyAttrs> | undefined) ??
  mongoose.model<CompanyAttrs>('Company', companySchema)

export default Company
