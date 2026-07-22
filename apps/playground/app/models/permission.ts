import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface PermissionAttrs {
  /** Full permission key, e.g. `products:create` or `*`. */
  name: string
  resource: string
  ability: string
  label?: string | null
}

const permissionSchema = new Schema<PermissionAttrs>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    resource: { type: String, required: true, trim: true, index: true },
    ability: { type: String, required: true, trim: true },
    label: { type: String, default: null, trim: true },
  },
  {
    timestamps: true,
    collection: 'permissions',
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

export type PermissionDocument = HydratedDocument<PermissionAttrs>

const Permission: Model<PermissionAttrs> =
  (mongoose.models.Permission as Model<PermissionAttrs> | undefined) ??
  mongoose.model<PermissionAttrs>('Permission', permissionSchema)

export default Permission
