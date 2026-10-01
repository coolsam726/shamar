import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { isDemoMode, touchDemoPresence } from '#services/demo_sandbox'

/**
 * Silent auth middleware can be used as a global middleware to silent check
 * if the user is logged-in or not.
 *
 * The request continues as usual, even when the user is not logged-in.
 * In demo mode it also refreshes `lastSeenAt` for idle reset gating.
 */
export default class SilentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await ctx.auth.check()

    if (isDemoMode()) {
      const user = ctx.auth.user as { id?: string; _id?: string } | undefined
      const id = user?.id ?? user?._id
      if (id != null) {
        void touchDemoPresence(id)
      }
    }

    return next()
  }
}
