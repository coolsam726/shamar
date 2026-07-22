import { symbols } from '@adonisjs/auth'
import type {
  SessionGuardUser,
  SessionUserProviderContract,
} from '@adonisjs/auth/types/session'
import User, { type UserDocument } from '#models/user'

/**
 * Session user provider for Mongoose User documents.
 * Replaces Lucid's sessionUserProvider.
 */
export class SessionMongooseUserProvider implements SessionUserProviderContract<UserDocument> {
  declare [symbols.PROVIDER_REAL_USER]: UserDocument

  async createUserForGuard(user: UserDocument): Promise<SessionGuardUser<UserDocument>> {
    return {
      getId() {
        return String(user.id ?? user._id)
      },
      getOriginal() {
        return user
      },
    }
  }

  async findById(
    identifier: string | number | bigint,
  ): Promise<SessionGuardUser<UserDocument> | null> {
    const id = String(identifier)
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return null
    }

    const user = await User.findById(id)
    if (!user) {
      return null
    }

    return this.createUserForGuard(user)
  }
}
