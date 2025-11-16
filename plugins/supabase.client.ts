import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // Get from runtime config first (which reads from .env)
  let supabaseUrl = config.public.supabaseUrl
  let supabaseAnonKey = config.public.supabaseAnonKey

  // Fallback to import.meta.env for dev mode
  if (!supabaseUrl) {
    supabaseUrl = import.meta.env.VITE_NUXT_PUBLIC_SUPABASE_URL || import.meta.env.NUXT_PUBLIC_SUPABASE_URL
  }
  if (!supabaseAnonKey) {
    supabaseAnonKey = import.meta.env.VITE_NUXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
  }

  console.log('🔍 Supabase Plugin Debug:')
  console.log('- URL present:', !!supabaseUrl, supabaseUrl?.substring(0, 20) + '...' || 'none')
  console.log('- Key present:', !!supabaseAnonKey, supabaseAnonKey?.substring(0, 20) + '...' || 'none')

  let supabase: SupabaseClient | null = null

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase credentials not configured:', { url: !!supabaseUrl, key: !!supabaseAnonKey })
  } else {
    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      })
      console.log('✅ Supabase client created successfully')
    } catch (error) {
      console.error('❌ Error creating Supabase client:', error)
    }
  }

  return {
    provide: {
      supabase
    }
  }
})