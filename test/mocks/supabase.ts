import { vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock Supabase client with comprehensive functionality
export const mockSupabaseClient = {
  // Auth methods
  auth: {
    getUser: vi.fn().mockResolvedValue({ 
      data: { user: null }, 
      error: null 
    }),
    getSession: vi.fn().mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
  },

  // Database operations
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  
  // Query filters
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  and: vi.fn().mockReturnThis(),
  
  // Query modifiers
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),

  // Realtime
  channel: vi.fn().mockImplementation((channelName: string) => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockImplementation((callback?: (status: string) => void) => {
      if (callback) callback('SUBSCRIBED')
      return Promise.resolve('ok')
    }),
    unsubscribe: vi.fn().mockResolvedValue('ok'),
    send: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    presenceState: vi.fn().mockReturnValue({}),
    presence: {
      state: vi.fn().mockReturnValue({}),
      track: vi.fn(),
      untrack: vi.fn()
    }
  })),
  
  removeChannel: vi.fn(),
  removeAllChannels: vi.fn(),
  getChannels: vi.fn().mockReturnValue([]),

  // Storage
  storage: {
    from: vi.fn().mockImplementation((bucket: string) => ({
      upload: vi.fn().mockResolvedValue({ 
        data: { path: 'test-path' }, 
        error: null 
      }),
      download: vi.fn().mockResolvedValue({ 
        data: new Blob(), 
        error: null 
      }),
      remove: vi.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
      list: vi.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      }),
      getPublicUrl: vi.fn().mockReturnValue({ 
        data: { publicUrl: 'https://example.com/file' } 
      }),
      createSignedUrl: vi.fn().mockResolvedValue({ 
        data: { signedUrl: 'https://example.com/signed' }, 
        error: null 
      }),
      createSignedUrls: vi.fn().mockResolvedValue({ 
        data: [], 
        error: null 
      })
    }))
  },

  // Edge Functions
  functions: {
    invoke: vi.fn().mockResolvedValue({ 
      data: null, 
      error: null 
    })
  },

  // RPC
  rpc: vi.fn().mockResolvedValue({ 
    data: null, 
    error: null 
  })
}

// Helper functions to configure mock responses
export const mockSupabaseResponse = (data: any, error: any = null) => {
  mockSupabaseClient.single.mockResolvedValueOnce({ data, error })
  return mockSupabaseClient
}

export const mockSupabaseSelect = (data: any[], error: any = null) => {
  mockSupabaseClient.select.mockResolvedValueOnce({ data, error })
  return mockSupabaseClient
}

export const mockSupabaseInsert = (data: any, error: any = null) => {
  mockSupabaseClient.insert.mockResolvedValueOnce({ data, error })
  return mockSupabaseClient
}

export const mockSupabaseUpdate = (data: any, error: any = null) => {
  mockSupabaseClient.update.mockResolvedValueOnce({ data, error })
  return mockSupabaseClient
}

export const mockSupabaseDelete = (data: any = null, error: any = null) => {
  mockSupabaseClient.delete.mockResolvedValueOnce({ data, error })
  return mockSupabaseClient
}

// Mock authentication responses
export const mockAuthSuccess = (user: any, session: any) => {
  mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ 
    data: { user }, 
    error: null 
  })
  mockSupabaseClient.auth.getSession.mockResolvedValueOnce({ 
    data: { session }, 
    error: null 
  })
}

export const mockAuthError = (error: any) => {
  mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ 
    data: { user: null }, 
    error 
  })
  mockSupabaseClient.auth.getSession.mockResolvedValueOnce({ 
    data: { session: null }, 
    error 
  })
}

// Reset all mocks
export const resetSupabaseMocks = () => {
  Object.values(mockSupabaseClient).forEach(method => {
    if (typeof method === 'object' && method !== null) {
      Object.values(method).forEach(subMethod => {
        if (vi.isMockFunction(subMethod)) {
          subMethod.mockReset()
        }
      })
    } else if (vi.isMockFunction(method)) {
      method.mockReset()
    }
  })
}

// Export as default for easier importing
export default mockSupabaseClient