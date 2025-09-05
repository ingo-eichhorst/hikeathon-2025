import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { mockSupabaseClient } from '~/test/mocks/supabase'
import { testFixtures } from '~/test/utils'

// Mock the Nuxt app context
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $supabase: mockSupabaseClient
  })
}))

// Mock crypto utilities
vi.mock('~/utils/crypto', () => ({
  encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
  decryptToken: vi.fn().mockResolvedValue('decrypted-token'),
  deriveKey: vi.fn().mockResolvedValue('derived-key')
}))

// Mock navigateTo
const mockNavigateTo = vi.fn()
vi.mock('#app', () => ({
  useNuxtApp: () => ({ $supabase: mockSupabaseClient }),
  navigateTo: mockNavigateTo
}))

describe('Auth Store', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    vi.clearAllMocks()
    
    // Reset localStorage mock
    vi.mocked(localStorage.setItem).mockClear()
    vi.mocked(localStorage.getItem).mockClear()
    vi.mocked(localStorage.removeItem).mockClear()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(authStore.currentTeam).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.sessionExpiry).toBeNull()
    })
  })

  describe('Authentication', () => {
    it('should authenticate successfully with valid team code', async () => {
      // Mock successful API response
      mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          team: testFixtures.team,
          token: 'valid-token',
          expiresIn: 3600
        },
        error: null
      })

      const result = await authStore.authenticate('TEAM1234')

      expect(result.success).toBe(true)
      expect(authStore.currentTeam).toEqual(testFixtures.team)
      expect(authStore.token).toBe('encrypted-token')
      expect(authStore.isAuthenticated).toBe(true)
      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('should fail authentication with invalid team code', async () => {
      // Mock failed API response
      mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
        data: { success: false },
        error: { message: 'Invalid team code' }
      })

      const result = await authStore.authenticate('INVALID')

      expect(result.success).toBe(false)
      expect(authStore.currentTeam).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockSupabaseClient.functions.invoke.mockRejectedValueOnce(
        new Error('Network error')
      )

      const result = await authStore.authenticate('TEAM1234')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('Session Management', () => {
    beforeEach(() => {
      // Set up authenticated state
      authStore.$patch({
        currentTeam: testFixtures.team,
        token: 'test-token',
        sessionExpiry: Date.now() + 3600000 // 1 hour from now
      })
    })

    it('should detect valid session', () => {
      expect(authStore.isSessionValid).toBe(true)
    })

    it('should detect expired session', () => {
      authStore.$patch({
        sessionExpiry: Date.now() - 1000 // 1 second ago
      })

      expect(authStore.isSessionValid).toBe(false)
    })

    it('should restore session from localStorage', async () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        const storage = {
          'hikeathon_team': JSON.stringify(testFixtures.team),
          'hikeathon_token': 'encrypted-token',
          'hikeathon_expiry': String(Date.now() + 3600000)
        }
        return storage[key] || null
      })

      const restored = await authStore.restoreSession()

      expect(restored).toBe(true)
      expect(authStore.currentTeam).toEqual(testFixtures.team)
      expect(authStore.token).toBe('decrypted-token')
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should not restore expired session', async () => {
      vi.mocked(localStorage.getItem).mockImplementation((key) => {
        const storage = {
          'hikeathon_team': JSON.stringify(testFixtures.team),
          'hikeathon_token': 'encrypted-token',
          'hikeathon_expiry': String(Date.now() - 1000) // Expired
        }
        return storage[key] || null
      })

      const restored = await authStore.restoreSession()

      expect(restored).toBe(false)
      expect(authStore.currentTeam).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Logout', () => {
    beforeEach(() => {
      // Set up authenticated state
      authStore.$patch({
        currentTeam: testFixtures.team,
        token: 'test-token',
        sessionExpiry: Date.now() + 3600000
      })
    })

    it('should clear all auth data on logout', () => {
      authStore.logout()

      expect(authStore.currentTeam).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.sessionExpiry).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(localStorage.removeItem).toHaveBeenCalledWith('hikeathon_team')
      expect(localStorage.removeItem).toHaveBeenCalledWith('hikeathon_token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('hikeathon_expiry')
    })

    it('should redirect to home on logout', () => {
      authStore.logout()
      expect(mockNavigateTo).toHaveBeenCalledWith('/')
    })
  })

  describe('Computed Properties', () => {
    beforeEach(() => {
      authStore.$patch({
        currentTeam: testFixtures.team,
        token: 'test-token',
        sessionExpiry: Date.now() + 3600000
      })
    })

    it('should compute isAuthenticated correctly', () => {
      expect(authStore.isAuthenticated).toBe(true)

      authStore.$patch({ token: null })
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('should compute teamName correctly', () => {
      expect(authStore.teamName).toBe(testFixtures.team.name)

      authStore.$patch({ currentTeam: null })
      expect(authStore.teamName).toBeNull()
    })

    it('should compute timeUntilExpiry correctly', () => {
      const expiry = Date.now() + 3600000 // 1 hour from now
      authStore.$patch({ sessionExpiry: expiry })

      const timeLeft = authStore.timeUntilExpiry
      expect(timeLeft).toBeGreaterThan(3590000) // Should be close to 1 hour
      expect(timeLeft).toBeLessThan(3600000)
    })
  })
})