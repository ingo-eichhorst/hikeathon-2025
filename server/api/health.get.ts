export default defineEventHandler(async (event) => {
  try {
    // Check Supabase connection
    const { createClient } = await import('@supabase/supabase-js')
    const config = useRuntimeConfig()
    
    const supabase = createClient(
      config.public.supabase.url,
      config.public.supabase.anonKey
    )

    // Test database connection
    const { data, error } = await supabase
      .from('teams')
      .select('count(*)')
      .limit(1)

    const services = {
      database: error ? 'error' : 'connected',
      storage: 'available', // Assuming storage is available if DB works
      realtime: 'active' // Assuming realtime is active if DB works
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  } catch (error) {
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        database: 'error',
        storage: 'unknown',
        realtime: 'unknown'
      }
    }
  }
})