import User, { type UserDocument } from '#models/user'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import { isDemoMode } from '#services/demo_sandbox'

/**
 * NewAccountController handles user registration.
 * It provides methods for displaying the signup page and creating
 * new user accounts.
 */
export default class NewAccountController {
  /**
   * Display the signup page
   */
  async create({ view, response }: HttpContext) {
    if (isDemoMode()) {
      return response.redirect().toRoute('session.create')
    }
    return view.render('pages/auth/signup')
  }

  /**
   * Create a new user account and authenticate the user
   */
  async store({ request, response, auth, session }: HttpContext) {
    if (isDemoMode()) {
      session.flash('error', 'Sign-up is disabled on the shared demo. Use the published credentials.')
      return response.redirect().toRoute('session.create')
    }

    const payload = await request.validateUsing(signupValidator)
    const user = (await User.create({ ...payload })) as UserDocument

    await auth.use('web').login(user)
    response.redirect('/')
  }
}
