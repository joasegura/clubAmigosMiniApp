import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'brand/apple-touch-icon.png', 'brand/logo.png'],
      manifest: {
        name: 'Club Entre amigos',
        short_name: 'Club Entre amigos',
        description: 'El club de amigos de la vinoteca Entre amigos: subí los vinos que tomás, puntualos y descubrí el ranking del club.',
        lang: 'es-AR',
        theme_color: '#FFFFFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // La fuente (solo los alfabetos latinos) también queda disponible sin conexión
        globPatterns: ['**/*.{js,css,html}', '**/*latin*.woff2'],
      },
    }),
  ],
})
