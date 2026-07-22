import { defineConfig, panel } from '@shamar/adonis'

export default defineConfig({
  orm: 'mongoose',
  branding: {
    name: 'Shamar Playground',
    primaryColor: '#f1511b',
    accentColor: '#286291',
  },
  panels: [
    panel('admin')
      .path('/admin')
      .branding({ name: 'Admin' })
      .discoverResources('app/resources/admin'),
    panel('app')
      .path('/app')
      .branding({ name: 'App' })
      .discoverResources('app/resources/app'),
  ],
})
