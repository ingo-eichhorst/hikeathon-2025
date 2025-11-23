// Determine baseURL based on deployment domain
const getBaseURL = () => {
  // For GitHub Pages deployment
  if (process.env.NODE_ENV === 'production') {
    return '/'
  }
  // For development
  return '/'
}

const baseURL = getBaseURL()

export default defineNuxtConfig({
  ssr: false,
  app: {
    baseURL,
    buildAssetsDir: 'assets/',
    head: {
      title: 'HIKEathon 2025',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'HIKEathon 2025 Event Management Platform' },
        // Note: Security headers should be set via HTTP headers in production, not meta tags
        // CSP via meta tags has limitations (frame-ancestors, X-Frame-Options ignored)
        { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
        { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: `${baseURL}favicon.ico` },
        { rel: 'manifest', href: `${baseURL}manifest.json` }
      ],
      script: [
        {
          innerHTML: `
            // Only register service worker in production
            if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('${baseURL}sw.js')
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
    '@vueuse/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  typescript: {
    strict: true
  },
  nitro: {
    preset: 'static'
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
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