import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface EventAttrs {
  title: string
  startsAt?: Date | null
  endsAt?: Date | null
  capacity?: number | null
  waitlistHint?: string | null
  status?: string | null
  venue?: string | null
}

const eventSchema = new Schema<EventAttrs>(
  {
    title: { type: String, required: true, trim: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    capacity: { type: Number, default: null },
    waitlistHint: { type: String, default: null, trim: true },
    status: { type: String, default: 'draft', trim: true },
    venue: { type: String, default: null, trim: true },
  },
  {
    timestamps: true,
    collection: 'events',
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

export type EventDocument = HydratedDocument<EventAttrs>

const Event: Model<EventAttrs> =
  (mongoose.models.Event as Model<EventAttrs> | undefined) ??
  mongoose.model<EventAttrs>('Event', eventSchema)

export default Event
