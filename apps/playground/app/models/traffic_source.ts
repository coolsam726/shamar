import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

/** Demo traffic-source breakdown for pie charts. */
export interface TrafficSourceAttrs {
  name: string
  sessions: number
  sort: number
}

const trafficSourceSchema = new Schema<TrafficSourceAttrs>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    sessions: { type: Number, required: true, default: 0 },
    sort: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'traffic_sources',
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

export type TrafficSourceDocument = HydratedDocument<TrafficSourceAttrs>

const TrafficSource: Model<TrafficSourceAttrs> =
  (mongoose.models.TrafficSource as Model<TrafficSourceAttrs> | undefined) ??
  mongoose.model<TrafficSourceAttrs>('TrafficSource', trafficSourceSchema)

export default TrafficSource
