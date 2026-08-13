// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { buildSidebar } from './sidebar.mjs';

const demoUrl = process.env.PUBLIC_DEMO_URL ?? '';
const sidebar = await buildSidebar();

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
      components: {
        PageFrame: './src/components/PageFrame.astro',
      },
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
      sidebar,
    }),
  ],
  vite: {
    define: {
      'import.meta.env.PUBLIC_DEMO_URL': JSON.stringify(demoUrl),
    },
  },
});
