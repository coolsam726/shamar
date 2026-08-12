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
import MediaFolder from '#models/media_folder'
import MediaFile from '#models/media_file'
import { upsertAppSettings, getAppSettings } from '#models/app_settings'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

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
    await this.seedAppSettings()
    await this.seedCategories()
    await this.seedProducts()
    await this.seedEvents()
    await this.seedArticles()
    await this.seedPreferences()
    await this.seedTickets()
    await this.seedAssets()
    await this.seedMediaLibrary()
    await this.seedCampaigns()
    await this.seedLockedItems()
  }

  async shutdown() {
    await mongoose.disconnect()
  }

  private async seedCompanies() {
    const count = await Company.countDocuments()
    if (count === 0) {
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
  }

  private async seedAppSettings() {
    const existing = await getAppSettings()
    if (!existing) {
      await upsertAppSettings({
        // Leave logo / brandDisplay unset so panel + defineConfig branding win
        // until Settings overrides them.
        notifyEmail: true,
        notifySms: false,
        channels: ['email'],
        theme: 'system',
      })
      return
    }

    let dirty = false

    // Early seed wrote brandDisplay:'both', which blocked panel `.brandDisplay()`.
    if (
      existing.brandDisplay === 'both' &&
      String(existing.logo ?? '').includes('picsum.photos/seed/shamar-logo')
    ) {
      existing.brandDisplay = null
      dirty = true
    }

    // Replace placeholder picsum logos with the framework brand assets.
    if (String(existing.logo ?? '').includes('picsum.photos')) {
      existing.logo = null
      existing.logoDark = null
      dirty = true
    }

    if (dirty) await existing.save()
  }

  private async seedAdminUser() {
    const existing = await User.find({})
    if (existing.length === 0) {
      await User.create({
        fullName: 'Admin User',
        email: 'admin@example.com',
        password: 'password',
        permissions: [],
      })

      await User.create({
        fullName: 'Viewer User',
        email: 'viewer@example.com',
        password: 'password',
        permissions: [],
      })
    }

    const sav = await Company.findOne({ code: 'SAV' }).lean()
    if (sav?._id) {
      await User.updateOne(
        {
          email: 'admin@example.com',
          $or: [{ companyId: null }, { companyId: '' }, { companyId: { $exists: false } }],
        },
        { $set: { companyId: String(sav._id) } },
      )
    }
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
    const companySav = await Company.findOne({ code: 'SAV' }).lean()
    const companyAsc = await Company.findOne({ code: 'ASC' }).lean()
    const categories = await Category.find({}).lean()
    const outdoor = categories.find((item) => item.slug === 'outdoor')
    const office = categories.find((item) => item.slug === 'office')
    const accessories = categories.find((item) => item.slug === 'accessories')
    const savId = companySav?._id ? String(companySav._id) : null
    const ascId = companyAsc?._id ? String(companyAsc._id) : null
    const outdoorId = outdoor?._id ? String(outdoor._id) : null
    const officeId = office?._id ? String(office._id) : null
    const accessoriesId = accessories?._id ? String(accessories._id) : null

    const catalog: Array<{
      sku: string
      name: string
      price: number
      stock: number
      launchDate: Date
      tags: string[]
      color: string
      featured: boolean
      companyId: string | null
      categoryIds: string[]
    }> = [
      {
        sku: 'SKU-100',
        name: 'Trail Bottle',
        price: 24.5,
        stock: 120,
        launchDate: new Date('2026-03-01'),
        tags: ['outdoor', 'hydration'],
        color: '#0ea5e9',
        featured: true,
        companyId: savId,
        categoryIds: outdoorId ? [outdoorId] : [],
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
        companyId: savId,
        categoryIds: officeId ? [officeId] : [],
      },
      {
        sku: 'SKU-110',
        name: 'Summit Daypack',
        price: 189,
        stock: 28,
        launchDate: new Date('2026-02-12'),
        tags: ['outdoor', 'travel'],
        color: '#166534',
        featured: true,
        companyId: savId,
        categoryIds: [outdoorId, accessoriesId].filter(Boolean) as string[],
      },
      {
        sku: 'SKU-120',
        name: 'Alpine Softshell',
        price: 249,
        stock: 16,
        launchDate: new Date('2026-04-08'),
        tags: ['outdoor', 'apparel'],
        color: '#1d4ed8',
        featured: true,
        companyId: savId,
        categoryIds: outdoorId ? [outdoorId] : [],
      },
      {
        sku: 'SKU-130',
        name: 'Camp Lantern',
        price: 58,
        stock: 75,
        launchDate: new Date('2026-01-20'),
        tags: ['outdoor', 'camping'],
        color: '#f59e0b',
        featured: false,
        companyId: ascId,
        categoryIds: outdoorId ? [outdoorId] : [],
      },
      {
        sku: 'SKU-140',
        name: 'Trail Socks (3-pack)',
        price: 22,
        stock: 210,
        launchDate: new Date('2026-05-02'),
        tags: ['outdoor', 'apparel'],
        color: '#64748b',
        featured: false,
        companyId: savId,
        categoryIds: [outdoorId, accessoriesId].filter(Boolean) as string[],
      },
      {
        sku: 'SKU-210',
        name: 'Ergo Chair',
        price: 420,
        stock: 12,
        launchDate: new Date('2026-03-22'),
        tags: ['office', 'furniture'],
        color: '#0f172a',
        featured: true,
        companyId: savId,
        categoryIds: officeId ? [officeId] : [],
      },
      {
        sku: 'SKU-220',
        name: 'Monitor Arm',
        price: 145,
        stock: 34,
        launchDate: new Date('2026-07-01'),
        tags: ['office', 'desk'],
        color: '#334155',
        featured: false,
        companyId: savId,
        categoryIds: officeId ? [officeId] : [],
      },
      {
        sku: 'SKU-230',
        name: 'Wireless Keyboard',
        price: 99,
        stock: 88,
        launchDate: new Date('2026-02-28'),
        tags: ['office', 'electronics'],
        color: '#e2e8f0',
        featured: true,
        companyId: ascId,
        categoryIds: [officeId, accessoriesId].filter(Boolean) as string[],
      },
      {
        sku: 'SKU-240',
        name: 'Standing Desk Converter',
        price: 275,
        stock: 19,
        launchDate: new Date('2026-08-10'),
        tags: ['office', 'furniture'],
        color: '#92400e',
        featured: false,
        companyId: savId,
        categoryIds: officeId ? [officeId] : [],
      },
      {
        sku: 'SKU-250',
        name: 'Noise-cancelling Headset',
        price: 199,
        stock: 47,
        launchDate: new Date('2026-04-18'),
        tags: ['office', 'electronics'],
        color: '#1e293b',
        featured: true,
        companyId: ascId,
        categoryIds: [officeId, accessoriesId].filter(Boolean) as string[],
      },
      {
        sku: 'SKU-310',
        name: 'Cable Organizer Kit',
        price: 18,
        stock: 300,
        launchDate: new Date('2026-01-05'),
        tags: ['accessories', 'desk'],
        color: '#94a3b8',
        featured: false,
        companyId: savId,
        categoryIds: accessoriesId ? [accessoriesId] : [],
      },
      {
        sku: 'SKU-320',
        name: 'Leather Notebook',
        price: 32,
        stock: 64,
        launchDate: new Date('2026-05-20'),
        tags: ['accessories', 'stationery'],
        color: '#78350f',
        featured: false,
        companyId: ascId,
        categoryIds: accessoriesId ? [accessoriesId] : [],
      },
      {
        sku: 'SKU-330',
        name: 'Portable Power Bank',
        price: 49,
        stock: 150,
        launchDate: new Date('2026-06-01'),
        tags: ['accessories', 'electronics'],
        color: '#0369a1',
        featured: true,
        companyId: savId,
        categoryIds: accessoriesId ? [accessoriesId] : [],
      },
      {
        sku: 'SKU-340',
        name: 'Travel Adapter Duo',
        price: 27,
        stock: 95,
        launchDate: new Date('2026-07-14'),
        tags: ['accessories', 'travel'],
        color: '#ffffff',
        featured: false,
        companyId: ascId,
        categoryIds: accessoriesId ? [accessoriesId] : [],
      },
      {
        sku: 'SKU-350',
        name: 'Insulated Tumbler',
        price: 35,
        stock: 110,
        launchDate: new Date('2026-03-30'),
        tags: ['accessories', 'hydration'],
        color: '#be123c',
        featured: false,
        companyId: savId,
        categoryIds: [accessoriesId, outdoorId].filter(Boolean) as string[],
      },
      {
        sku: 'SKU-360',
        name: 'Desk Plant Pot',
        price: 16,
        stock: 72,
        launchDate: new Date('2026-09-01'),
        tags: ['office', 'accessories'],
        color: '#65a30d',
        featured: false,
        companyId: ascId,
        categoryIds: [officeId, accessoriesId].filter(Boolean) as string[],
      },
      {
        sku: 'SKU-370',
        name: 'Folding Camp Stool',
        price: 44,
        stock: 53,
        launchDate: new Date('2026-04-25'),
        tags: ['outdoor', 'camping'],
        color: '#ea580c',
        featured: false,
        companyId: savId,
        categoryIds: outdoorId ? [outdoorId] : [],
      },
      {
        sku: 'SKU-380',
        name: 'Ultralight Rain Shell',
        price: 165,
        stock: 22,
        launchDate: new Date('2026-10-05'),
        tags: ['outdoor', 'apparel'],
        color: '#7c3aed',
        featured: true,
        companyId: ascId,
        categoryIds: outdoorId ? [outdoorId] : [],
      },
      {
        sku: 'SKU-390',
        name: 'USB-C Dock',
        price: 129,
        stock: 31,
        launchDate: new Date('2026-08-20'),
        tags: ['office', 'electronics'],
        color: '#475569',
        featured: false,
        companyId: savId,
        categoryIds: officeId ? [officeId] : [],
      },
    ]

    for (const product of catalog) {
      await Product.findOneAndUpdate(
        { sku: product.sku },
        { $setOnInsert: product },
        { upsert: true, new: true },
      )
    }
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

  /** Seed media folders + a tiny placeholder file on the local media disk. */
  private async seedMediaLibrary() {
    if ((await MediaFolder.countDocuments()) > 0) return

    const branding = await MediaFolder.create({ name: 'Branding', parentId: null })
    const docs = await MediaFolder.create({ name: 'Documents', parentId: null })
    await MediaFolder.create({ name: 'Covers', parentId: String(branding.id) })

    const mediaRoot = join(this.app.makePath('storage/media'))
    await mkdir(mediaRoot, { recursive: true })
    const key = `seed/welcome.txt`
    const abs = join(mediaRoot, key)
    await mkdir(join(mediaRoot, 'seed'), { recursive: true })
    const body = Buffer.from('Welcome to the Shamar media library.\n')
    await writeFile(abs, body)

    await MediaFile.create({
      name: 'welcome.txt',
      folderId: String(docs.id),
      disk: 'shamar',
      key,
      mime: 'text/plain',
      size: body.byteLength,
      checksum: null,
    })
  }
}
