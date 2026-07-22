import mongoose, { Schema, type HydratedDocument, type Model } from 'mongoose'
import app from '@adonisjs/core/services/app'
import { errors } from '@adonisjs/auth'

export interface UserAttrs {
  fullName?: string | null
  email: string
  password: string
}

async function hasher() {
  // Resolve from the container at call time — the `@adonisjs/core/services/hash`
  // singleton is only assigned after `app.booted`, which is too late for
  // provider-boot seeding and unreliable inside Mongoose hooks.
  return app.container.make('hash')
}

const userSchema = new Schema<UserAttrs>(
  {
    fullName: { type: String, default: null, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
  },
  {
    timestamps: true,
    collection: 'users',
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id)
        delete ret.password
        delete ret.__v
        return ret
      },
    },
  },
)

userSchema.virtual('initials').get(function (this: UserDocument) {
  const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
  if (first && last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
  }
  return `${String(first).slice(0, 2)}`.toUpperCase()
})

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  const hash = await hasher()
  this.password = await hash.make(this.password)
})

userSchema.statics.verifyCredentials = async function (
  email: string,
  password: string,
): Promise<UserDocument> {
  const user = await this.findOne({ email: email.toLowerCase() }).select('+password')
  if (!user) {
    throw new errors.E_INVALID_CREDENTIALS('Invalid user credentials')
  }

  const hash = await hasher()
  const valid = await hash.verify(user.password, password)
  if (!valid) {
    throw new errors.E_INVALID_CREDENTIALS('Invalid user credentials')
  }

  user.password = '' as unknown as string
  return user
}

export type UserDocument = HydratedDocument<UserAttrs> & {
  initials: string
}

export interface UserModel extends Model<UserAttrs> {
  verifyCredentials(email: string, password: string): Promise<UserDocument>
}

const User =
  (mongoose.models.User as UserModel | undefined) ??
  mongoose.model<UserAttrs, UserModel>('User', userSchema)

export default User
