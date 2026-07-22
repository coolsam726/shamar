import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface AssetAttrs {
  name: string
  path?: string | null
  mime?: string | null
  size?: number | null
  checksum?: string | null
  isImage?: boolean
}

const assetSchema = new Schema<AssetAttrs>(
  {
    name: { type: String, required: true, trim: true },
    path: { type: String, default: null, trim: true },
    mime: { type: String, default: null, trim: true },
    size: { type: Number, default: null },
    checksum: { type: String, default: null, trim: true },
    isImage: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'assets',
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

export type AssetDocument = HydratedDocument<AssetAttrs>

const Asset: Model<AssetAttrs> =
  (mongoose.models.Asset as Model<AssetAttrs> | undefined) ??
  mongoose.model<AssetAttrs>('Asset', assetSchema)

export default Asset
