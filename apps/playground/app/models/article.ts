import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface ArticleAttrs {
  slug: string
  title: string
  body?: string | null
  publishedAt?: Date | null
  coverUrl?: string | null
  draft?: boolean
  deletedAt?: Date | null
}

const articleSchema = new Schema<ArticleAttrs>(
  {
    slug: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: null },
    publishedAt: { type: Date, default: null },
    coverUrl: { type: String, default: null, trim: true },
    draft: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'articles',
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

export type ArticleDocument = HydratedDocument<ArticleAttrs>

const Article: Model<ArticleAttrs> =
  (mongoose.models.Article as Model<ArticleAttrs> | undefined) ??
  mongoose.model<ArticleAttrs>('Article', articleSchema)

export default Article
