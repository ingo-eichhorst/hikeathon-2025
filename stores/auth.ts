import { defineStore } from 'pinia'
import { tokenSecurity, type EncryptedToken } from '~/utils/crypto'

interface TeamConfig {
  teamCode: string
  teamName: string
  tokenId: string
  tokenValue: string
}

interface AuthState {
  isAuthenticated: boolean
  teamName: string | null
  teamCode: string | null
  encryptedToken: EncryptedToken | null
  sessionExpiresAt: number | null
  isLoading: boolean
  error: string | null
}

// Team configurations - tokens will be fetched from edge function
const TEAM_CONFIGS: TeamConfig[] = [
  {
    teamCode: 'HIKEMIKE',
    teamName: 'HIKEMIKE',
    tokenId: 'a0f5fb73-85e2-4284-9882-bef264e4a907',
    tokenValue: ''
  },
  {
    teamCode: 'LIKEHIKE',
    teamName: 'LIKEHIKE', 
    tokenId: 'fa879af0-7821-42e6-81cc-a1e4aa1a15e8',
    tokenValue: ''
  }
]

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    teamName: null,
    teamCode: null,
    encryptedToken: null,
    sessionExpiresAt: null,
    isLoading: false,
    error: null
  }),

  getters: {
    isSessionValid: (state) => {
      if (!state.encryptedToken || !state.sessionExpiresAt) return false
      return Date.now() < state.sessionExpiresAt
    },
    
    timeUntilExpiry: (state) => {
      if (!state.sessionExpiresAt) return 0
      return Math.max(0, state.sessionExpiresAt - Date.now())
    }
  },

  actions: {
    /**
     * Authenticates a team with their code
     */
    async login(teamCode: string): Promise<boolean> {
      this.isLoading = true
      this.error = null

      try {
        // Validate team code format
        if (teamCode.length !== 8) {
          throw new Error('Team code must be exactly 8 characters')
        }

        // Find team configuration
        const teamConfig = TEAM_CONFIGS.find(
          t => t.teamCode.toUpperCase() === teamCode.toUpperCase()
        )

        if (!teamConfig) {
          throw new Error('Invalid team code')
        }

        // Call Supabase Edge Function to validate and get token
        const { $supabase } = useNuxtApp()
        if (!$supabase) {
          throw new Error('Supabase client not initialized')
        }
        
        const { data, error } = await $supabase.functions.invoke('auth-validate', {
          body: { teamCode: teamCode.toUpperCase() }
        })
        
        if (error) {
          throw new Error('Authentication failed: ' + error.message)
        }
        
        if (!data || !data.token) {
          throw new Error('Invalid response from authentication server')
        }
        
        const token = data.token

        // Encrypt the token
        const encryptedToken = await tokenSecurity.encryptToken(token, teamCode.toUpperCase())
        
        // Store session
        const sessionExpiresAt = Date.now() + (48 * 60 * 60 * 1000) // 48 hours
        tokenSecurity.storeSession(encryptedToken, teamConfig.teamName)
        
        // Update state
        this.isAuthenticated = true
        this.teamName = teamConfig.teamName
        this.teamCode = teamCode.toUpperCase()
        this.encryptedToken = encryptedToken
        this.sessionExpiresAt = sessionExpiresAt
        
        // Set up auto-refresh
        this.setupAutoRefresh()
        
        return true
      } catch (error: any) {
        this.error = error.message || 'Authentication failed'
        console.error('Login error:', error)
        return false
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Logs out the current team
     */
    logout() {
      tokenSecurity.clearSession()
      this.isAuthenticated = false
      this.teamName = null
      this.teamCode = null
      this.encryptedToken = null
      this.sessionExpiresAt = null
      this.error = null
      
      // Navigate to login
      const router = useRouter()
      router.push('/login')
    },

    /**
     * Restores session from storage
     */
    async restoreSession(): Promise<boolean> {
      try {
        const session = tokenSecurity.getStoredSession()
        if (!session || !tokenSecurity.isSessionValid(session)) {
          return false
        }

        // Restore state
        this.isAuthenticated = true
        this.teamName = session.teamName
        this.teamCode = sessionStorage.getItem('team-code') || null
        this.encryptedToken = {
          ciphertext: session.ciphertext,
          salt: session.salt,
          iv: session.iv,
          timestamp: session.timestamp
        }
        this.sessionExpiresAt = session.expiresAt
        
        // Set up auto-refresh
        this.setupAutoRefresh()
        
        return true
      } catch (error) {
        console.error('Failed to restore session:', error)
        return false
      }
    },

    /**
     * Gets the decrypted token for API calls
     */
    async getToken(): Promise<string | null> {
      if (!this.encryptedToken || !this.teamCode) {
        return null
      }

      try {
        return await tokenSecurity.decryptToken(this.encryptedToken, this.teamCode)
      } catch (error) {
        console.error('Failed to decrypt token:', error)
        this.logout()
        return null
      }
    },

    /**
     * Sets up automatic session refresh
     */
    setupAutoRefresh() {
      if (!this.sessionExpiresAt) return
      
      // Refresh 5 minutes before expiry
      const refreshTime = this.sessionExpiresAt - (5 * 60 * 1000)
      const timeUntilRefresh = refreshTime - Date.now()
      
      if (timeUntilRefresh > 0) {
        setTimeout(() => {
          this.refreshSession()
        }, timeUntilRefresh)
      }
    },

    /**
     * Refreshes the session
     */
    async refreshSession() {
      if (!this.teamCode) return
      
      try {
        // Re-authenticate with the same team code
        await this.login(this.teamCode)
      } catch (error) {
        console.error('Failed to refresh session:', error)
        this.logout()
      }
    },

    /**
     * Checks if the user has access to admin features
     */
    isAdmin(): boolean {
      // For now, both teams have admin access
      // This can be modified based on requirements
      return this.isAuthenticated
    }
  },

  persist: false // We handle persistence manually with sessionStorage
})