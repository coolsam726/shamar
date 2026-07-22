import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'

export type ApiKeyKind = 'pat' | 'machine'

export interface ApiKeyAttrs {
  name: string
  /** Optional human-readable purpose for this credential. */
  description?: string | null
  /** `pat` = personal access token (user-owned); `machine` = standalone API key. */
  kind: ApiKeyKind
  tokenHash: string
  tokenPrefix: string
  /**
   * PAT: optional narrow of the user’s permissions (empty = full access).
   * Machine: the key’s permissions.
   */
  abilities?: string[]
  /** Owning user for PATs. */
  userId?: string | null
  /** Who issued the credential (audit). */
  createdByUserId?: string | null
  lastUsedAt?: Date | null
  expiresAt?: Date | null
  revokedAt?: Date | null
}

const apiKeySchema = new Schema<ApiKeyAttrs>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null, trim: true },
    kind: { type: String, enum: ['pat', 'machine'], required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    tokenPrefix: { type: String, required: true, trim: true },
    abilities: { type: [String], default: [] },
    userId: { type: String, default: null, index: true },
    createdByUserId: { type: String, default: null, index: true },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'api_keys',
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id)
        delete ret.tokenHash
        delete ret.__v
        return ret
      },
    },
  },
)

export type ApiKeyDocument = HydratedDocument<ApiKeyAttrs>

const ApiKey: Model<ApiKeyAttrs> =
  (mongoose.models.ApiKey as Model<ApiKeyAttrs> | undefined) ??
  mongoose.model<ApiKeyAttrs>('ApiKey', apiKeySchema)

export default ApiKey
