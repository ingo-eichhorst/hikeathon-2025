import { defineStore } from 'pinia'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'moderator'
  permissions: string[]
  lastLogin?: string
  mfaEnabled: boolean
}

export interface AdminSession {
  token: string
  expiresAt: number
  mfaVerified: boolean
}

interface AdminState {
  currentAdmin: AdminUser | null
  session: AdminSession | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  auditLogs: AuditLog[]
  mfaPending: boolean
  mfaSecret?: string
}

export interface AuditLog {
  id: string
  adminId: string
  adminEmail: string
  action: string
  resource: string
  details: Record<string, any>
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

// Default admin credentials (in production, these would be in a secure database)
const DEFAULT_ADMINS = [
  {
    id: 'admin-1',
    email: 'admin@hikeathon.com',
    name: 'HIKEathon Admin',
    role: 'super_admin' as const,
    permissions: ['*'], // All permissions
    passwordHash: '$2a$10$rQ0yKm5xGf.Kd6PvJLmhIOkGzLzYXqGmHf3vL4VwZWx8hX2VlBGJm', // 'admin123'
    mfaEnabled: true,
    mfaSecret: 'JBSWY3DPEHPK3PXP'
  }
]

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    currentAdmin: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    auditLogs: [],
    mfaPending: false
  }),

  getters: {
    hasPermission: (state) => (permission: string): boolean => {
      if (!state.currentAdmin) return false
      if (state.currentAdmin.permissions.includes('*')) return true
      return state.currentAdmin.permissions.includes(permission)
    },
    
    isSessionValid: (state): boolean => {
      if (!state.session) return false
      return Date.now() < state.session.expiresAt && state.session.mfaVerified
    },
    
    sessionTimeRemaining: (state): number => {
      if (!state.session) return 0
      return Math.max(0, state.session.expiresAt - Date.now())
    }
  },

  actions: {
    /**
     * Admin login with email and password
     */
    async login(email: string, password: string): Promise<{ requiresMFA: boolean }> {
      this.isLoading = true
      this.error = null

      try {
        // Find admin by email
        const adminData = DEFAULT_ADMINS.find(admin => admin.email === email)
        if (!adminData) {
          throw new Error('Invalid credentials')
        }

        // Verify password (in production, use proper bcrypt verification)
        if (password !== 'admin123') {
          throw new Error('Invalid credentials')
        }

        // Create admin user object
        this.currentAdmin = {
          id: adminData.id,
          email: adminData.email,
          name: adminData.name,
          role: adminData.role,
          permissions: adminData.permissions,
          mfaEnabled: adminData.mfaEnabled
        }

        // Log the login attempt
        await this.logAction('admin_login_attempt', 'auth', { 
          email,
          success: true 
        })

        if (adminData.mfaEnabled) {
          this.mfaPending = true
          this.mfaSecret = adminData.mfaSecret
          return { requiresMFA: true }
        }

        // Complete login if no MFA required
        await this.completeLogin()
        return { requiresMFA: false }

      } catch (error: any) {
        this.error = error.message
        await this.logAction('admin_login_attempt', 'auth', { 
          email,
          success: false,
          error: error.message 
        })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Verify MFA code
     */
    async verifyMFA(code: string): Promise<boolean> {
      if (!this.mfaPending || !this.currentAdmin) {
        throw new Error('MFA verification not required')
      }

      try {
        // Simple MFA verification (in production, use proper TOTP)
        const isValid = code === '123456' || code === '000000'
        
        if (!isValid) {
          throw new Error('Invalid MFA code')
        }

        await this.completeLogin()
        this.mfaPending = false
        this.mfaSecret = undefined

        await this.logAction('admin_mfa_verified', 'auth', { 
          adminId: this.currentAdmin.id 
        })

        return true
      } catch (error: any) {
        this.error = error.message
        await this.logAction('admin_mfa_failed', 'auth', { 
          adminId: this.currentAdmin?.id,
          error: error.message 
        })
        throw error
      }
    },

    /**
     * Complete the login process
     */
    async completeLogin() {
      if (!this.currentAdmin) return

      // Create session token (2 hour expiration)
      const sessionToken = this.generateSessionToken()
      const expiresAt = Date.now() + (2 * 60 * 60 * 1000) // 2 hours

      this.session = {
        token: sessionToken,
        expiresAt,
        mfaVerified: true
      }

      this.isAuthenticated = true
      this.currentAdmin.lastLogin = new Date().toISOString()

      // Store in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_session', JSON.stringify({
          admin: this.currentAdmin,
          session: this.session
        }))
      }

      await this.logAction('admin_login_success', 'auth', { 
        adminId: this.currentAdmin.id,
        sessionDuration: '2h'
      })
    },

    /**
     * Logout admin
     */
    async logout() {
      const adminId = this.currentAdmin?.id

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_session')
      }

      this.currentAdmin = null
      this.session = null
      this.isAuthenticated = false
      this.mfaPending = false
      this.error = null

      if (adminId) {
        await this.logAction('admin_logout', 'auth', { adminId })
      }
    },

    /**
     * Restore session from storage
     */
    async restoreSession(): Promise<boolean> {
      try {
        if (typeof window === 'undefined') return false

        const stored = sessionStorage.getItem('admin_session')
        if (!stored) return false

        const data = JSON.parse(stored)
        const { admin, session } = data

        // Check if session is still valid
        if (Date.now() >= session.expiresAt) {
          sessionStorage.removeItem('admin_session')
          return false
        }

        this.currentAdmin = admin
        this.session = session
        this.isAuthenticated = true

        return true
      } catch (error) {
        console.error('Failed to restore admin session:', error)
        return false
      }
    },

    /**
     * Generate session token
     */
    generateSessionToken(): string {
      return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },

    /**
     * Log admin action for audit trail
     */
    async logAction(
      action: string, 
      resource: string, 
      details: Record<string, any> = {}
    ) {
      const log: AuditLog = {
        id: crypto.randomUUID(),
        adminId: this.currentAdmin?.id || 'unknown',
        adminEmail: this.currentAdmin?.email || 'unknown',
        action,
        resource,
        details,
        timestamp: new Date().toISOString(),
        ipAddress: 'localhost', // In production, get real IP
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      }

      this.auditLogs.unshift(log)
      
      // Keep only last 1000 logs in memory
      if (this.auditLogs.length > 1000) {
        this.auditLogs = this.auditLogs.slice(0, 1000)
      }

      console.log('Admin Action:', log)
    },

    /**
     * Get audit logs with filtering
     */
    getAuditLogs(
      filters: {
        adminId?: string
        action?: string
        resource?: string
        from?: string
        to?: string
        limit?: number
      } = {}
    ): AuditLog[] {
      let logs = [...this.auditLogs]

      if (filters.adminId) {
        logs = logs.filter(log => log.adminId === filters.adminId)
      }

      if (filters.action) {
        logs = logs.filter(log => log.action.includes(filters.action))
      }

      if (filters.resource) {
        logs = logs.filter(log => log.resource === filters.resource)
      }

      if (filters.from) {
        const fromDate = new Date(filters.from)
        logs = logs.filter(log => new Date(log.timestamp) >= fromDate)
      }

      if (filters.to) {
        const toDate = new Date(filters.to)
        logs = logs.filter(log => new Date(log.timestamp) <= toDate)
      }

      return logs.slice(0, filters.limit || 100)
    },

    /**
     * Check if admin has specific permission
     */
    checkPermission(permission: string): boolean {
      return this.hasPermission(permission)
    },

    /**
     * Require specific permission (throws if not authorized)
     */
    requirePermission(permission: string) {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated')
      }

      if (!this.hasPermission(permission)) {
        throw new Error(`Permission denied: ${permission}`)
      }
    }
  },

  persist: false // Admin sessions managed manually for security
})