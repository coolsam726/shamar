import type { ApplicationService } from '@adonisjs/core/types'
import mongoose from 'mongoose'
import env from '#start/env'
import Company from '#models/company'
import User from '#models/user'

/**
 * Connects Mongoose for Shamar resources and app auth (User).
 * Seeding runs in `ready` so Hash and other services are available.
 */
export default class MongoProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    const uri = env.get('MONGO_URI')
    mongoose.set('strictQuery', true)
    await mongoose.connect(uri)
  }

  async ready() {
    await this.seedCompanies()
    await this.seedAdminUser()
  }

  async shutdown() {
    await mongoose.disconnect()
  }

  private async seedCompanies() {
    const count = await Company.countDocuments()
    if (count > 0) return

    await Company.create([
      {
        name: 'Savannabits',
        code: 'SAV',
        email: 'hello@savannabits.com',
        active: true,
      },
      {
        name: 'Acme Corp',
        code: 'ACM',
        email: 'ops@acme.example',
        active: true,
      },
    ])
  }

  private async seedAdminUser() {
    const count = await User.countDocuments()
    if (count > 0) return

    await User.create({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'password',
    })
  }
}
