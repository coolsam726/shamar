import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export interface CampaignAttrs {
  name: string
  budget?: number | null
  startsOn?: Date | null
  endsOn?: Date | null
  channel?: string | null
  active?: boolean
}

const campaignSchema = new Schema<CampaignAttrs>(
  {
    name: { type: String, required: true, trim: true },
    budget: { type: Number, default: null },
    startsOn: { type: Date, default: null },
    endsOn: { type: Date, default: null },
    channel: { type: String, default: null, trim: true },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'campaigns',
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

export type CampaignDocument = HydratedDocument<CampaignAttrs>

const Campaign: Model<CampaignAttrs> =
  (mongoose.models.Campaign as Model<CampaignAttrs> | undefined) ??
  mongoose.model<CampaignAttrs>('Campaign', campaignSchema)

export default Campaign
