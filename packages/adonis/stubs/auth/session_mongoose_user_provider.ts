import { symbols } from '@adonisjs/auth'
import type { SessionGuardUser, SessionUserProviderContract } from '@adonisjs/auth/types/session'
import User from '#models/user'

/**
 * Session lookup for a Mongoose user. Adonis's default provider expects a
 * Lucid model and a numeric id. MongoDB ids are 24-character hex strings.
 */
type UserLike = { id?: unknown; _id?: unknown }

export class SessionMongooseUserProvider implements SessionUserProviderContract<UserLike> {
  declare [symbols.PROVIDER_REAL_USER]: UserLike

  async createUserForGuard(user: UserLike): Promise<SessionGuardUser<UserLike>> {
    return {
      getId() {
        return String(user.id ?? user._id)
      },
      getOriginal() {
        return user
      },
    }
  }

  async findById(identifier: string | number | bigint) {
    const id = String(identifier)
    if (!/^[a-f\d]{24}$/i.test(id)) return null
    const user = await User.findById(id)
    if (!user) return null
    return this.createUserForGuard(user as UserLike)
  }
}
