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

router
  .group(() => {
    router.get('demo-status', [controllers.DemoSandbox, 'status'])
    router.route('demo-status', ['OPTIONS'], [controllers.DemoSandbox, 'statusOptions'])
    router.post('demo-reset', [controllers.DemoSandbox, 'reset'])
  })

/**
 * Marketing landing is the Astro build synced into public/index.html.
 * Keep this ahead of catch-alls; static middleware also serves /docs/*.
 */
router.get('/', async ({ response, view }) => {
  const { default: app } = await import('@adonisjs/core/services/app')
  const { access } = await import('node:fs/promises')
  const landing = app.publicPath('index.html')
  try {
    await access(landing)
    return response.download(landing)
  } catch {
    return view.render('pages/home')
  }
})

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
 * Open /api/docs to see it alongside Shamar resource CRUD.
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
