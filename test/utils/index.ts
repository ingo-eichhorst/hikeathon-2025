import { vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { ComponentMountingOptions } from '@vue/test-utils'

// Test utilities for creating mocks and fixtures
export const createMockSupabase = () => ({
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    send: vi.fn(),
    unsubscribe: vi.fn(),
    track: vi.fn()
  }),
  realtime: {
    channel: vi.fn(),
    removeChannel: vi.fn()
  },
  storage: {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn().mockResolvedValue({ data: null, error: null }),
    download: vi.fn().mockResolvedValue({ data: null, error: null }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://example.com/file' } })
  }
})

// Create a wrapper for components with common providers
export const createTestWrapper = (component: any, options: ComponentMountingOptions<any> = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(component, {
    global: {
      plugins: [pinia],
      provide: {
        $supabase: createMockSupabase()
      },
      stubs: {
        NuxtLink: true,
        NuxtPage: true,
        ClientOnly: true,
        Teleport: true
      }
    },
    ...options
  })
}

// Mock router
export const createMockRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  beforeEach: vi.fn(),
  afterEach: vi.fn(),
  currentRoute: {
    value: {
      path: '/',
      params: {},
      query: {},
      meta: {}
    }
  }
})

// Common test data fixtures
export const testFixtures = {
  team: {
    id: 'test-team-id',
    name: 'Test Team',
    code: 'TEAM1234',
    members: ['Alice', 'Bob', 'Charlie'],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  
  chatMessage: {
    id: 'msg-1',
    content: 'Hello, this is a test message',
    role: 'user' as const,
    timestamp: '2025-01-01T12:00:00Z',
    teamId: 'test-team-id'
  },
  
  aiResponse: {
    id: 'msg-2',
    content: 'This is a test AI response',
    role: 'assistant' as const,
    timestamp: '2025-01-01T12:01:00Z',
    teamId: 'test-team-id',
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    tokensUsed: 50
  },
  
  generatedImage: {
    id: 'img-1',
    url: 'https://example.com/generated-image.jpg',
    prompt: 'A beautiful sunset over mountains',
    teamId: 'test-team-id',
    created_at: '2025-01-01T12:00:00Z',
    model: 'stable-diffusion',
    width: 512,
    height: 512
  },
  
  telemetryEvent: {
    id: 'tel-1',
    teamId: 'test-team-id',
    teamName: 'Test Team',
    event: 'chat_message_sent',
    data: { tokens_used: 50, response_time: 1200 },
    timestamp: '2025-01-01T12:00:00Z',
    sessionId: 'session-1'
  },
  
  broadcast: {
    id: 'bcast-1',
    title: 'Test Announcement',
    message: 'This is a test broadcast message',
    priority: 'normal' as const,
    active: true,
    created_at: '2025-01-01T12:00:00Z',
    expires_at: null
  },
  
  todo: {
    id: 'todo-1',
    title: 'Complete project setup',
    description: 'Set up the development environment',
    is_global: true,
    priority: 1,
    category: 'setup',
    status: 'open' as const,
    estimated_points: 3,
    created_at: '2025-01-01T12:00:00Z',
    updated_at: '2025-01-01T12:00:00Z'
  }
}

// Wait for next tick helper
export const nextTick = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock fetch responses
export const mockFetchResponse = (data: any, ok = true, status = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers()
  } as Response)
}

// Create mock intersection observer
export const mockIntersectionObserver = () => {
  const mockObserver = vi.fn()
  const mockUnobserve = vi.fn()
  const mockDisconnect = vi.fn()

  ;(global as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: mockObserver,
    unobserve: mockUnobserve,
    disconnect: mockDisconnect
  }))

  return { mockObserver, mockUnobserve, mockDisconnect }
}

// Helper to wait for component updates
export const flushPromises = () => new Promise(resolve => setImmediate(resolve))

// Create mock WebSocket
export const createMockWebSocket = () => {
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED
  }

  ;(global as any).WebSocket = vi.fn().mockImplementation(() => mockWs)
  return mockWs
}

// Helper to create test environment with all necessary mocks
export const setupTestEnvironment = () => {
  const mockSupabase = createMockSupabase()
  const mockRouter = createMockRouter()
  const pinia = createPinia()
  
  setActivePinia(pinia)
  
  return {
    mockSupabase,
    mockRouter,
    pinia
  }
}