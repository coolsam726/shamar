import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface CategoryAttrs {
  name: string
  slug?: string | null
  description?: string | null
}

const categorySchema = new Schema<CategoryAttrs>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, default: null, trim: true },
    description: { type: String, default: null, trim: true },
  },
  {
    timestamps: true,
    collection: 'categories',
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

export type CategoryDocument = HydratedDocument<CategoryAttrs>

const Category: Model<CategoryAttrs> =
  (mongoose.models.Category as Model<CategoryAttrs> | undefined) ??
  mongoose.model<CategoryAttrs>('Category', categorySchema)

export default Category
