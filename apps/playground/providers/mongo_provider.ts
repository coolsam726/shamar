import type { ApplicationService } from '@adonisjs/core/types'
import mongoose from 'mongoose'
import env from '#start/env'
import Company from '#models/company'
import User from '#models/user'
import Product from '#models/product'
import Event from '#models/event'
import Article from '#models/article'
import Preference from '#models/preference'
import Ticket from '#models/ticket'
import Asset from '#models/asset'
import Campaign from '#models/campaign'
import LockedItem from '#models/locked_item'
import Category from '#models/category'

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
    await this.seedCategories()
    await this.seedProducts()
    await this.seedEvents()
    await this.seedArticles()
    await this.seedPreferences()
    await this.seedTickets()
    await this.seedAssets()
    await this.seedCampaigns()
    await this.seedLockedItems()
  }

  async shutdown() {
    await mongoose.disconnect()
  }

  private async seedCompanies() {
    const count = await Company.countDocuments()
    if (count > 0) return

    await Company.create([
      {
        name: 'Savannabits Ltd',
        code: 'SAV',
        email: 'hello@savannabits.com',
        phone: '+254 700 000 001',
        website: 'https://savannabits.com',
        industry: 'technology',
        notes: 'Primary demo company.',
        active: true,
      },
      {
        name: 'All Saints Cathedral',
        code: 'ASC',
        email: 'ops@allsaints.example',
        phone: '+254 700 000 002',
        website: 'https://example.com',
        industry: 'education',
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

  private async seedCategories() {
    if ((await Category.countDocuments()) > 0) return
    await Category.create([
      { name: 'Outdoor', slug: 'outdoor', description: 'Gear for the trail.' },
      { name: 'Office', slug: 'office', description: 'Desk and workspace.' },
      { name: 'Accessories', slug: 'accessories', description: 'Small goods.' },
    ])
  }

  private async seedProducts() {
    if ((await Product.countDocuments()) > 0) return
    const company = await Company.findOne({ code: 'SAV' }).lean()
    const categories = await Category.find({}).lean()
    const outdoor = categories.find((item) => item.slug === 'outdoor')
    const office = categories.find((item) => item.slug === 'office')
    const companyId = company?._id ? String(company._id) : null

    await Product.create([
      {
        sku: 'SKU-100',
        name: 'Trail Bottle',
        price: 24.5,
        stock: 120,
        launchDate: new Date('2026-03-01'),
        tags: ['outdoor', 'hydration'],
        color: '#0ea5e9',
        featured: true,
        companyId,
        categoryIds: outdoor?._id ? [String(outdoor._id)] : [],
      },
      {
        sku: 'SKU-200',
        name: 'Desk Mat',
        price: 39,
        stock: 40,
        launchDate: new Date('2026-06-15'),
        tags: ['office'],
        color: '#111827',
        featured: false,
        companyId,
        categoryIds: office?._id ? [String(office._id)] : [],
      },
    ])
  }

  private async seedEvents() {
    if ((await Event.countDocuments()) > 0) return
    await Event.create([
      {
        title: 'Shamar Launch Meetup',
        startsAt: new Date('2026-08-01T09:00:00.000Z'),
        endsAt: new Date('2026-08-01T12:00:00.000Z'),
        capacity: 40,
        status: 'published',
        venue: 'Main Hall',
      },
      {
        title: 'Admin Workshop',
        startsAt: new Date('2026-09-12T14:00:00.000Z'),
        endsAt: new Date('2026-09-12T17:00:00.000Z'),
        capacity: 200,
        status: 'draft',
        venue: 'Virtual — Zoom',
      },
    ])
  }

  private async seedArticles() {
    if ((await Article.countDocuments()) > 0) return
    await Article.create([
      {
        slug: 'welcome-to-shamar',
        title: 'Welcome to Shamar',
        body: '## Hello\n\nThis article demos **markdown** on the detail page.',
        publishedAt: new Date('2026-07-01'),
        coverUrl: 'https://picsum.photos/seed/shamar/640/360',
        draft: false,
      },
      {
        slug: 'draft-notes',
        title: 'Draft notes',
        body: 'Work in progress…',
        draft: true,
      },
    ])
  }

  private async seedPreferences() {
    if ((await Preference.countDocuments()) > 0) return
    await Preference.create([
      {
        key: 'billing.alerts',
        label: 'Billing alerts',
        channels: ['email', 'in_app'],
        notifyEmail: true,
        notifySms: false,
        theme: 'system',
        metaJson: '{"source":"seed"}',
      },
      {
        key: 'security.login',
        label: 'Login alerts',
        channels: ['email', 'sms'],
        notifyEmail: true,
        notifySms: true,
        theme: 'dark',
        metaJson: '{}',
      },
    ])
  }

  private async seedTickets() {
    if ((await Ticket.countDocuments()) > 0) return
    await Ticket.create([
      {
        code: 'TCK-1001',
        subject: 'Cannot save company form',
        priority: 'high',
        assigneeEmail: 'admin@example.com',
        dueOn: new Date('2026-07-25'),
        resolved: false,
      },
      {
        code: 'TCK-1002',
        subject: 'Export CSV request',
        priority: 'normal',
        assigneeEmail: 'ops@example.com',
        dueOn: new Date('2026-08-01'),
        resolved: true,
      },
    ])
  }

  private async seedAssets() {
    if ((await Asset.countDocuments()) > 0) return
    await Asset.create([
      {
        name: 'Brand logo',
        path: 'https://picsum.photos/seed/logo/200/200',
        mime: 'image/jpeg',
        size: 20480,
        checksum: 'demo-logo-sha',
        isImage: true,
      },
      {
        name: 'Spec sheet',
        path: '/uploads/spec.pdf',
        mime: 'application/pdf',
        size: 102400,
        checksum: 'demo-pdf-sha',
        isImage: false,
      },
    ])
  }

  private async seedCampaigns() {
    if ((await Campaign.countDocuments()) > 0) return
    await Campaign.create([
      {
        name: 'Spring Launch',
        budget: 5000,
        startsOn: new Date('2026-03-01'),
        endsOn: new Date('2026-03-31'),
        channel: 'email',
        active: true,
      },
      {
        name: 'Partner Outreach',
        budget: 12000,
        startsOn: new Date('2026-05-01'),
        endsOn: new Date('2026-06-30'),
        channel: 'events',
        active: false,
      },
    ])
  }

  private async seedLockedItems() {
    if ((await LockedItem.countDocuments()) > 0) return
    await LockedItem.create([
      {
        title: 'Editable policy record',
        ownerEmail: 'admin@example.com',
        locked: false,
        notes: 'You should be able to edit and delete this one.',
      },
      {
        title: 'Locked policy record',
        ownerEmail: 'security@example.com',
        locked: true,
        notes: 'canEdit/canDelete return false while locked.',
      },
    ])
  }
}
