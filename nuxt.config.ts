export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL: '/hikeathon-2025/',
    buildAssetsDir: 'assets/',
    head: {
      title: 'HIKEathon 2025',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'HIKEathon 2025 Event Management Platform' },
        // Security headers
        { 
          'http-equiv': 'Content-Security-Policy', 
          content: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://ai-proxy.ionos.com https://google.serper.dev; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        },
        { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
        { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
        { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
        { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/hikeathon-2025/favicon.ico' },
        { rel: 'manifest', href: '/hikeathon-2025/manifest.json' }
      ],
      script: [
        {
          innerHTML: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/hikeathon-2025/sw.js')
                  .then(function(registration) {
                    console.log('SW registered: ', registration);
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `,
          type: 'text/javascript'
        }
      ]
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true
  },
  nitro: {
    preset: 'static',
    output: {
      publicDir: '.output/public'
    }
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'pinia', '@vueuse/core'],
            supabase: ['@supabase/supabase-js'],
            crypto: ['bcryptjs', 'jsonwebtoken'],
            ui: ['chart.js', 'vue-chartjs'],
            markdown: ['marked', 'highlight.js']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    }
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || ''
    }
  },
  devtools: { enabled: true }
})