import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface ProductAttrs {
  sku: string
  name: string
  price?: number | null
  stock?: number | null
  launchDate?: Date | null
  launchAt?: Date | null
  restockAt?: string | null
  tags?: string[]
  color?: string | null
  featured?: boolean
  description?: string | null
  documentBody?: string | null
  bodyMd?: string | null
  themeJson?: string | null
  quality?: number | null
  rating?: number | null
  size?: string | null
  condition?: string | null
  channels?: string[]
  meta?: Record<string, string> | null
  variants?: Array<Record<string, unknown>>
  /** BelongsTo Company */
  companyId?: string | null
  /** ManyToMany Category ids */
  categoryIds?: string[]
}

const productSchema = new Schema<ProductAttrs>(
  {
    sku: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, default: null },
    stock: { type: Number, default: 0 },
    launchDate: { type: Date, default: null },
    launchAt: { type: Date, default: null },
    restockAt: { type: String, default: null, trim: true },
    tags: { type: [String], default: [] },
    color: { type: String, default: null, trim: true },
    featured: { type: Boolean, default: false },
    description: { type: String, default: null },
    documentBody: { type: String, default: null },
    bodyMd: { type: String, default: null },
    themeJson: { type: String, default: null },
    quality: { type: Number, default: 50 },
    rating: { type: Number, default: 0 },
    size: { type: String, default: null, trim: true },
    condition: { type: String, default: null, trim: true },
    channels: { type: [String], default: [] },
    meta: { type: Schema.Types.Mixed, default: {} },
    variants: { type: [Schema.Types.Mixed], default: [] },
    companyId: { type: String, default: null, index: true },
    categoryIds: { type: [String], default: [] },
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
