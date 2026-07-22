import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface TicketAttrs {
  code: string
  subject: string
  priority?: string | null
  assigneeEmail?: string | null
  dueOn?: Date | null
  resolved?: boolean
}

const ticketSchema = new Schema<TicketAttrs>(
  {
    code: { type: String, required: true, trim: true, unique: true },
    subject: { type: String, required: true, trim: true },
    priority: { type: String, default: 'normal', trim: true },
    assigneeEmail: { type: String, default: null, trim: true, lowercase: true },
    dueOn: { type: Date, default: null },
    resolved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'tickets',
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

export type TicketDocument = HydratedDocument<TicketAttrs>

const Ticket: Model<TicketAttrs> =
  (mongoose.models.Ticket as Model<TicketAttrs> | undefined) ??
  mongoose.model<TicketAttrs>('Ticket', ticketSchema)

export default Ticket
