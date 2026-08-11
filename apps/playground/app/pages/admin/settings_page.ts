import {
  FormPage,
  form,
  Tabs,
  Tab,
  Section,
  TextInput,
  Select,
  Checkbox,
  Toggle,
  type PageRequestContext,
  type PageSaveResult,
} from '@shamar/core'
import { getAppSettings, upsertAppSettings } from '#models/app_settings'

/**
 * Singleton Settings page — Branding + Preferences categories in one form.
 */
export default class SettingsPage extends FormPage {
  static override slug = 'settings'
  static override label = 'Settings'
  static override navigationGroup = 'Settings'
  static override navigationSort = 1
  static override icon = 'cog'

  static override form() {
    return form((f) => {
      f.schema([
        Tabs.make()
          .columnSpanFull()
          .tabs([
            Tab.make('Branding')
              .icon('sparkles')
              .schema([
                Section.make('App branding')
                  .description(
                    'Overrides panel defaults for logo and display name. Company logos still win per user.',
                  )
                  .columns(2)
                  .schema([
                    TextInput.make('name')
                      .label('Brand name')
                      .placeholder('Shamar Playground')
                      .helperText('Optional override for the shell brand name.')
                      .columnSpanFull(),
                    TextInput.make('logo')
                      .url()
                      .label('Logo URL')
                      .helperText('Light-mode logo.')
                      .columnSpanFull(),
                    TextInput.make('logoDark')
                      .url()
                      .label('Dark logo URL')
                      .helperText('Optional dark-mode variant.')
                      .columnSpanFull(),
                    TextInput.make('logoHeight')
                      .label('Logo height')
                      .placeholder('36 or 2.5rem')
                      .helperText('Pixels (number) or CSS length.'),
                    Select.make('brandDisplay')
                      .label('Brand mark')
                      .options([
                        { label: 'Logo and name', value: 'both' },
                        { label: 'Logo only', value: 'logo' },
                        { label: 'Name only', value: 'name' },
                      ])
                      .placeholder('Use panel default')
                      .helperText(
                        'Overrides panel `.brandDisplay()`. Clear to honor config.',
                      ),
                  ]),
              ]),
            Tab.make('Preferences')
              .icon('bell')
              .schema([
                Section.make('Notifications')
                  .description('Default notification preferences for the application.')
                  .columns(2)
                  .schema([
                    Select.make('channels')
                      .multiple()
                      .options([
                        { label: 'Email', value: 'email' },
                        { label: 'SMS', value: 'sms' },
                        { label: 'Push', value: 'push' },
                        { label: 'In-app', value: 'in_app' },
                      ])
                      .columnSpanFull()
                      .helperText('Channels used for system alerts.'),
                    Toggle.make('notifyEmail').inline().default(true).label('Email alerts'),
                    Checkbox.make('notifySms').inline().label('SMS alerts'),
                    Select.make('theme')
                      .options([
                        { label: 'System', value: 'system' },
                        { label: 'Light', value: 'light' },
                        { label: 'Dark', value: 'dark' },
                      ])
                      .selectablePlaceholder(false)
                      .default('system')
                      .helperText('Default UI theme preference.'),
                  ]),
              ]),
          ]),
      ])
    })
  }

  static override async fill(_ctx: PageRequestContext) {
    const doc = await getAppSettings()
    if (!doc) {
      return {
        name: '',
        logo: '',
        logoDark: '',
        logoHeight: '',
        brandDisplay: '',
        channels: [],
        notifyEmail: true,
        notifySms: false,
        theme: 'system',
      }
    }
    return {
      name: doc.name ?? '',
      logo: doc.logo ?? '',
      logoDark: doc.logoDark ?? '',
      logoHeight: doc.logoHeight ?? '',
      brandDisplay: doc.brandDisplay ?? '',
      channels: Array.isArray(doc.channels) ? doc.channels : [],
      notifyEmail: doc.notifyEmail !== false,
      notifySms: Boolean(doc.notifySms),
      theme: doc.theme ?? 'system',
    }
  }

  static override async save(
    data: Record<string, unknown>,
    _ctx: PageRequestContext,
  ): Promise<PageSaveResult> {
    const brandDisplayRaw = String(data.brandDisplay ?? '').trim()
    const brandDisplay =
      brandDisplayRaw === 'logo' || brandDisplayRaw === 'name' || brandDisplayRaw === 'both'
        ? brandDisplayRaw
        : null

    await upsertAppSettings({
      name: String(data.name ?? '').trim() || null,
      logo: String(data.logo ?? '').trim() || null,
      logoDark: String(data.logoDark ?? '').trim() || null,
      logoHeight: String(data.logoHeight ?? '').trim() || null,
      brandDisplay,
      channels: Array.isArray(data.channels)
        ? data.channels.map((value) => String(value))
        : [],
      notifyEmail: data.notifyEmail !== false && data.notifyEmail !== 'false',
      notifySms: data.notifySms === true || data.notifySms === 'true' || data.notifySms === 'on',
      theme: String(data.theme ?? 'system').trim() || 'system',
    })
    return { message: 'Settings saved' }
  }
}
