import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface RoleAttrs {
  name: string
  slug: string
  description?: string | null
  permissionIds?: string[]
  active?: boolean
}

const roleSchema = new Schema<RoleAttrs>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: null, trim: true },
    permissionIds: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'roles',
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

export type RoleDocument = HydratedDocument<RoleAttrs>

const Role: Model<RoleAttrs> =
  (mongoose.models.Role as Model<RoleAttrs> | undefined) ??
  mongoose.model<RoleAttrs>('Role', roleSchema)

export default Role
