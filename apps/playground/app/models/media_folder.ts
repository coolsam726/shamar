import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface MediaFolderAttrs {
  name: string
  parentId?: string | null
}

const mediaFolderSchema = new Schema<MediaFolderAttrs>(
  {
    name: { type: String, required: true, trim: true },
    parentId: { type: String, default: null, index: true },
  },
  {
    timestamps: true,
    collection: 'media_folders',
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

mediaFolderSchema.index({ parentId: 1, name: 1 })

export type MediaFolderDocument = HydratedDocument<MediaFolderAttrs>

const MediaFolder: Model<MediaFolderAttrs> =
  (mongoose.models.MediaFolder as Model<MediaFolderAttrs> | undefined) ??
  mongoose.model<MediaFolderAttrs>('MediaFolder', mediaFolderSchema)

export default MediaFolder
