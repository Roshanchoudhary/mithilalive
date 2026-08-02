import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    }
  }),
  integrations: [tailwind()],
  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  },
  site: 'https://your-domain.com',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto'
  }
});
