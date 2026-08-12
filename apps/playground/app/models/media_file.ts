import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface MediaFileAttrs {
  name: string
  folderId?: string | null
  disk: string
  key: string
  mime: string
  size: number
  visibility?: 'private' | 'public'
  checksum?: string | null
  width?: number | null
  height?: number | null
}

const mediaFileSchema = new Schema<MediaFileAttrs>(
  {
    name: { type: String, required: true, trim: true },
    folderId: { type: String, default: null, index: true },
    disk: { type: String, required: true, trim: true, default: 'shamar' },
    key: { type: String, required: true, trim: true },
    mime: { type: String, required: true, trim: true, default: 'application/octet-stream' },
    size: { type: Number, required: true, default: 0 },
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
      index: true,
    },
    checksum: { type: String, default: null, trim: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  {
    timestamps: true,
    collection: 'media_files',
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

mediaFileSchema.index({ folderId: 1, name: 1 })
mediaFileSchema.index({ key: 1 }, { unique: true })

export type MediaFileDocument = HydratedDocument<MediaFileAttrs>

const MediaFile: Model<MediaFileAttrs> =
  (mongoose.models.MediaFile as Model<MediaFileAttrs> | undefined) ??
  mongoose.model<MediaFileAttrs>('MediaFile', mediaFileSchema)

export default MediaFile
