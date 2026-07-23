/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())

/**
 * Example custom API route documented by @shamar/rest.
 * Open /api/shamar/docs to see it alongside Shamar resource CRUD.
 */
const { dto, string, optional, number, array } = await import('@shamar/rest')
const vine = (await import('@vinejs/vine')).default

const demoUserDto = dto({
  id: string(),
  email: string({ format: 'email' }),
  name: string(),
  age: optional(number()),
})

const listDemoUsersValidator = vine.create({
  page: vine.number().optional(),
  search: vine.string().optional(),
})

router
  .get('/api/users', async ({ request, response }) => {
    const query = await request.validateUsing(listDemoUsersValidator)
    return response.json({
      data: [
        { id: '1', email: 'demo@example.com', name: 'Demo User', age: null },
      ],
      page: query.page ?? 1,
    })
  })
  .openapi({
    tags: ['Users'],
    summary: 'List demo users',
    query: listDemoUsersValidator,
    response: dto({
      data: array(demoUserDto),
      page: number(),
    }),
  })
