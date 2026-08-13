import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

/** One calendar day of demo analytics for dashboard charts. */
export interface DailyMetricAttrs {
  /** UTC midnight for the day. */
  date: Date
  visits: number
  orders: number
  revenue: number
  signups: number
}

const dailyMetricSchema = new Schema<DailyMetricAttrs>(
  {
    date: { type: Date, required: true, unique: true, index: true },
    visits: { type: Number, required: true, default: 0 },
    orders: { type: Number, required: true, default: 0 },
    revenue: { type: Number, required: true, default: 0 },
    signups: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    collection: 'daily_metrics',
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

export type DailyMetricDocument = HydratedDocument<DailyMetricAttrs>

const DailyMetric: Model<DailyMetricAttrs> =
  (mongoose.models.DailyMetric as Model<DailyMetricAttrs> | undefined) ??
  mongoose.model<DailyMetricAttrs>('DailyMetric', dailyMetricSchema)

export default DailyMetric
