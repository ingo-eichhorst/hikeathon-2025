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
        { name: 'description', content: 'HIKEathon 2025 Event Management Platform' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/hikeathon-2025/favicon.ico' }
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
    output: {
      publicDir: '.output/public'
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