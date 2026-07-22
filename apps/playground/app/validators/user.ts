import vine from '@vinejs/vine'
import User from '#models/user'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use when performing self-signup
 */
export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique(async (_db, value) => {
    const exists = await User.exists({ email: String(value).toLowerCase() })
    return !exists
  }),
  password: password().confirmed({
    confirmationField: 'passwordConfirmation',
  }),
})
