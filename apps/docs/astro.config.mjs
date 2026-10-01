// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import almasixTheme from '@almasix/starlight-theme';
import { buildSidebar } from './sidebar.mjs';

const demoUrl = process.env.PUBLIC_DEMO_URL ?? '';
const sidebar = await buildSidebar();

// The public site is https://demo.shamar.dev (Render). Local and that host serve at the domain root.
// GitHub Pages serves this repo at /shamar — set PUBLIC_BASE_PATH=/shamar there.
const base = process.env.PUBLIC_BASE_PATH || '/';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://demo.shamar.dev',
  base,
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
      plugins: [
        almasixTheme({
          github: 'coolsam726/shamar',
          // Theme lightbox only matches /examples/ screenshots.
          lightbox: false,
          pageBanner: './src/components/Lightbox.astro',
        }),
      ],
      customCss: ['./src/styles/custom.css'],
      components: {
        // Theme SiteTitle is hard-wired to the Almasix wordmark.
        SiteTitle: './src/components/SiteTitle.astro',
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
