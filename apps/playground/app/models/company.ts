import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface CompanyAttrs {
  name: string
  code?: string | null
  email?: string | null
  active?: boolean
}

const companySchema = new Schema<CompanyAttrs>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, default: null, trim: true, unique: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    active: { type: Boolean, default: true },
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
