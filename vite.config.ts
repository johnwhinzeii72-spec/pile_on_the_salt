import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const communityAuthFlow = (): Plugin => ({
  name: 'pile-on-the-salt-community-auth-flow',
  enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('/src/App.tsx') && !id.endsWith('\\src\\App.tsx')) return null;
    return code
      .replace("import { fetchProduct } from './openFoodFacts';", "import { fetchProduct } from './openFoodFacts';\nimport CommunityChatV2 from './community';")
      .replace("{page === 'community' && <CommunityChat />}", "{page === 'community' && <CommunityChatV2 />}");
  }
});

export default defineConfig({
  plugins: [
    communityAuthFlow(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Pile On The Salt',
        short_name: 'Salt',
        description: 'A mobile-first POTS hydration, sodium, nutrition, and symptom tracker.',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['health', 'lifestyle', 'food'],
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/.*\.json$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-food-facts',
              expiration: { maxEntries: 80, maxAgeSeconds: 604800 },
              networkTimeoutSeconds: 6
            }
          }
        ]
      }
    })
  ]
});
