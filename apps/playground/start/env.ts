/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

/**
 * The public site is https://demo.shamar.dev. Render also injects RENDER_EXTERNAL_URL
 * (the *.onrender.com hostname) and chooses PORT. Use the public URL when it is set;
 * otherwise fall back to the onrender.com hostname so a first boot still has an APP_URL.
 */
const renderUrl = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '')
if (!process.env.APP_URL && renderUrl) process.env.APP_URL = renderUrl
if (!process.env.DEMO_DOCS_ORIGIN && renderUrl) process.env.DEMO_DOCS_ORIGIN = renderUrl
if (!process.env.HOST) process.env.HOST = '0.0.0.0'
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'info'
if (!process.env.SESSION_DRIVER) process.env.SESSION_DRIVER = 'cookie'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // MongoDB (Shamar resources when orm: 'mongoose')
  MONGO_URI: Env.schema.string(),

  // Public sandbox (docs live demo). Optional — defaults off.
  SHAMAR_DEMO_MODE: Env.schema.boolean.optional(),
  DEMO_RESET_TOKEN: Env.schema.string.optional(),
  DEMO_DOCS_ORIGIN: Env.schema.string.optional(),
})
