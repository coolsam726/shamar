import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface LockedItemAttrs {
  title: string
  ownerEmail?: string | null
  locked?: boolean
  notes?: string | null
}

const lockedItemSchema = new Schema<LockedItemAttrs>(
  {
    title: { type: String, required: true, trim: true },
    ownerEmail: { type: String, default: null, trim: true, lowercase: true },
    locked: { type: Boolean, default: false },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'locked_items',
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

export type LockedItemDocument = HydratedDocument<LockedItemAttrs>

const LockedItem: Model<LockedItemAttrs> =
  (mongoose.models.LockedItem as Model<LockedItemAttrs> | undefined) ??
  mongoose.model<LockedItemAttrs>('LockedItem', lockedItemSchema)

export default LockedItem
