// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const demoUrl = process.env.PUBLIC_DEMO_URL ?? '';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://shamar.savannabits.com',
  integrations: [
    starlight({
      title: 'Shamar',
      description:
        'Filament-inspired admin panel for AdonisJS — resources, forms, tables, pages, and REST.',
      favicon: '/favicon.svg',
      logo: {
        light: './src/assets/shamar-banner.svg',
        dark: './src/assets/shamar-banner-dark.svg',
        alt: 'Shamar',
        replacesTitle: true,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/coolsam726/shamar',
        },
      ],
      customCss: ['./src/styles/custom.css'],
      editLink: {
        baseUrl: 'https://github.com/coolsam726/shamar/edit/main/apps/docs/',
      },
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#f1511b',
          },
        },
      ],
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Installation', slug: 'docs/guides/installation' },
            { label: 'Your first resource', slug: 'docs/guides/first-resource' },
            { label: 'Live demo', slug: 'docs/guides/live-demo' },
            { label: 'Changelog', slug: 'docs/guides/changelog' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Resources', slug: 'docs/concepts/resources' },
            { label: 'Forms & fields', slug: 'docs/concepts/forms' },
            { label: 'Tables & lists', slug: 'docs/concepts/tables' },
            { label: 'Pages', slug: 'docs/concepts/pages' },
            { label: 'Auth & RBAC', slug: 'docs/concepts/auth' },
            { label: 'Media library', slug: 'docs/concepts/media' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Field catalog', slug: 'docs/reference/fields' },
            { label: 'Rich editor', slug: 'docs/reference/rich-editor' },
            { label: 'REST & OpenAPI', slug: 'docs/reference/rest' },
            { label: 'Packages', slug: 'docs/reference/packages' },
          ],
        },
        {
          label: 'Recipes',
          items: [
            { label: 'Settings page', slug: 'docs/recipes/settings-page' },
            { label: 'Branding', slug: 'docs/recipes/branding' },
          ],
        },
      ],
    }),
  ],
  vite: {
    define: {
      'import.meta.env.PUBLIC_DEMO_URL': JSON.stringify(demoUrl),
    },
  },
});
