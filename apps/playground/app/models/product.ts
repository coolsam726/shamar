import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface ProductAttrs {
  sku: string
  name: string
  price?: number | null
  stock?: number | null
  launchDate?: Date | null
  tags?: string[]
  color?: string | null
  featured?: boolean
}

const productSchema = new Schema<ProductAttrs>(
  {
    sku: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: null },
    stock: { type: Number, default: 0 },
    launchDate: { type: Date, default: null },
    tags: { type: [String], default: [] },
    color: { type: String, default: null, trim: true },
    featured: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'products',
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

export type ProductDocument = HydratedDocument<ProductAttrs>

const Product: Model<ProductAttrs> =
  (mongoose.models.Product as Model<ProductAttrs> | undefined) ??
  mongoose.model<ProductAttrs>('Product', productSchema)

export default Product
