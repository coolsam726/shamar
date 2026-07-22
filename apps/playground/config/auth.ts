import { configProvider } from '@adonisjs/core'
import { defineConfig } from '@adonisjs/auth'
import { sessionGuard } from '@adonisjs/auth/session'
import type { InferAuthenticators, InferAuthEvents, Authenticators } from '@adonisjs/auth/types'

/**
 * Authentication uses Mongoose User model (same DB as Shamar resources).
 */
const authConfig = defineConfig({
  default: 'web',

  guards: {
    web: sessionGuard({
      useRememberMeTokens: false,
      provider: configProvider.create(async () => {
        const { SessionMongooseUserProvider } = await import(
          '#auth/session_mongoose_user_provider'
        )
        return new SessionMongooseUserProvider()
      }),
    }),
  },
})

export default authConfig

declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
