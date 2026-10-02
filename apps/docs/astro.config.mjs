// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import almasixTheme from '@almasix/starlight-theme';
import { buildSidebar } from './sidebar.mjs';

const demoUrl = process.env.PUBLIC_DEMO_URL ?? '';
const sidebar = await buildSidebar();

// Landing and docs: https://shamar.dev (Cloudflare). The panel is https://demo.shamar.dev.
// GitHub Pages serves this repo at /shamar — set PUBLIC_BASE_PATH=/shamar there.
const base = process.env.PUBLIC_BASE_PATH || '/';
const site = process.env.PUBLIC_SITE_URL || 'https://shamar.dev';
const ogImage = new URL('/og.png', site).href;
const ogImageAlt = 'Shamar admin panel for AdonisJS — resources, forms, and tables';

// https://astro.build/config
export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  redirects: {
    // Legacy concept stubs → canonical reference / guide URLs
    '/docs/concepts/forms': '/docs/reference/forms/',
    '/docs/concepts/forms/': '/docs/reference/forms/',
    '/docs/concepts/resources': '/docs/reference/resources/',
    '/docs/concepts/resources/': '/docs/reference/resources/',
    '/docs/concepts/tables': '/docs/reference/tables/',
    '/docs/concepts/tables/': '/docs/reference/tables/',
    '/docs/concepts/pages': '/docs/reference/pages/',
    '/docs/concepts/pages/': '/docs/reference/pages/',
    '/docs/concepts/wire': '/docs/wire/',
    '/docs/concepts/wire/': '/docs/wire/',
    '/docs/reference/packages': '/docs/packages/',
    '/docs/reference/packages/': '/docs/packages/',
  },
  integrations: [
    starlight({
      title: 'Shamar',
      description:
        'Filament-inspired admin panel for AdonisJS — resources, forms, tables, pages, Wire, RBAC, and REST.',
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
        {
          tag: 'meta',
          attrs: {
            name: 'robots',
            content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            href: '/apple-touch-icon.png',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: ogImage,
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:alt',
            content: ogImageAlt,
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:width',
            content: '1200',
          },
        },
        {
          tag: 'meta',
          attrs: {
            property: 'og:image:height',
            content: '630',
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image',
            content: ogImage,
          },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:image:alt',
            content: ogImageAlt,
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
