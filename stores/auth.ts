import { defineStore } from 'pinia'

interface AuthState {
  isAuthenticated: boolean
  teamName: string | null
  teamCode: string | null
  sessionExpiresAt: number | null
  isLoading: boolean
  error: string | null
}

// Team configurations - simplified without tokens
const VALID_TEAM_CODES = ['HIKEMIKE', 'LIKEHIKE']

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    teamName: null,
    teamCode: null,
    sessionExpiresAt: null,
    isLoading: false,
    error: null
  }),

  getters: {
    isSessionValid: (state) => {
      if (!state.sessionExpiresAt) return false
      return Date.now() < state.sessionExpiresAt
    },
    
    timeUntilExpiry: (state) => {
      if (!state.sessionExpiresAt) return 0
      return Math.max(0, state.sessionExpiresAt - Date.now())
    },
    
    currentTeam: (state) => {
      if (!state.isAuthenticated || !state.teamCode) return null
      return {
        id: state.teamCode,
        name: state.teamName || state.teamCode
      }
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

        // Check if team code is valid
        const normalizedCode = teamCode.toUpperCase()
        if (!VALID_TEAM_CODES.includes(normalizedCode)) {
          throw new Error('Invalid team code')
        }

        // Store session
        const sessionExpiresAt = Date.now() + (48 * 60 * 60 * 1000) // 48 hours
        
        // Update state
        this.isAuthenticated = true
        this.teamName = normalizedCode
        this.teamCode = normalizedCode
        this.sessionExpiresAt = sessionExpiresAt
        
        // Store in sessionStorage for persistence
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('auth_session', JSON.stringify({
            teamName: normalizedCode,
            teamCode: normalizedCode,
            sessionExpiresAt
          }))
        }
        
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
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth_session')
      }
      
      this.isAuthenticated = false
      this.teamName = null
      this.teamCode = null
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
        if (typeof window === 'undefined') return false
        
        const stored = sessionStorage.getItem('auth_session')
        if (!stored) return false
        
        const session = JSON.parse(stored)
        if (!session.sessionExpiresAt || Date.now() >= session.sessionExpiresAt) {
          sessionStorage.removeItem('auth_session')
          return false
        }
        
        // Restore state
        this.isAuthenticated = true
        this.teamName = session.teamName
        this.teamCode = session.teamCode
        this.sessionExpiresAt = session.sessionExpiresAt
        
        // Set up auto-refresh
        this.setupAutoRefresh()
        
        return true
      } catch (error) {
        console.error('Failed to restore session:', error)
        return false
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
    refreshSession() {
      if (!this.teamCode) return
      
      // Simply extend the session
      this.sessionExpiresAt = Date.now() + (48 * 60 * 60 * 1000)
      
      // Update sessionStorage
      if (typeof window !== 'undefined' && this.teamName) {
        sessionStorage.setItem('auth_session', JSON.stringify({
          teamName: this.teamName,
          teamCode: this.teamCode,
          sessionExpiresAt: this.sessionExpiresAt
        }))
      }
      
      // Set up next refresh
      this.setupAutoRefresh()
    },

    /**
     * Checks if the user has access to admin features
     */
    isAdmin(): boolean {
      // For now, both teams have admin access
      return this.isAuthenticated
    }
  },

  persist: false // We handle persistence manually with sessionStorage
})