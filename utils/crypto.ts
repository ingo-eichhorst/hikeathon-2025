/**
 * Token Security Service using Web Crypto API
 * Implements AES-256-GCM encryption with PBKDF2 key derivation
 */

export interface EncryptedToken {
  ciphertext: string
  salt: string
  iv: string
  timestamp: number
}

export class TokenSecurityService {
  private readonly PBKDF2_ITERATIONS = 600000
  private readonly SALT_LENGTH = 16
  private readonly IV_LENGTH = 12
  private readonly TAG_LENGTH = 16
  private readonly encoder = new TextEncoder()
  private readonly decoder = new TextDecoder()

  /**
   * Generates a random salt for PBKDF2
   */
  private generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
  }

  /**
   * Generates a random IV for AES-GCM
   */
  private generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
  }

  /**
   * Derives an AES key from a team code using PBKDF2
   */
  private async deriveKey(teamCode: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(teamCode),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypts a token using the team code
   */
  async encryptToken(token: string, teamCode: string): Promise<EncryptedToken> {
    if (!token || !teamCode) {
      throw new Error('Token and team code are required')
    }

    if (teamCode.length !== 8) {
      throw new Error('Team code must be exactly 8 characters')
    }

    try {
      const salt = this.generateSalt()
      const iv = this.generateIV()
      const key = await this.deriveKey(teamCode, salt)

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          tagLength: this.TAG_LENGTH * 8
        },
        key,
        this.encoder.encode(token)
      )

      return {
        ciphertext: this.arrayBufferToBase64(encrypted),
        salt: this.arrayBufferToBase64(salt),
        iv: this.arrayBufferToBase64(iv),
        timestamp: Date.now()
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt token')
    }
  }

  /**
   * Decrypts a token using the team code
   */
  async decryptToken(encrypted: EncryptedToken, teamCode: string): Promise<string> {
    if (!encrypted || !teamCode) {
      throw new Error('Encrypted token and team code are required')
    }

    if (teamCode.length !== 8) {
      throw new Error('Team code must be exactly 8 characters')
    }

    try {
      const salt = this.base64ToArrayBuffer(encrypted.salt)
      const iv = this.base64ToArrayBuffer(encrypted.iv)
      const ciphertext = this.base64ToArrayBuffer(encrypted.ciphertext)
      
      const key = await this.deriveKey(teamCode, salt)

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          tagLength: this.TAG_LENGTH * 8
        },
        key,
        ciphertext
      )

      return this.decoder.decode(decrypted)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt token - invalid team code or corrupted data')
    }
  }

  /**
   * Converts ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
    return btoa(binary)
  }

  /**
   * Converts base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Validates if a session is still valid (48 hours)
   */
  isSessionValid(encrypted: EncryptedToken): boolean {
    const MAX_SESSION_AGE = 48 * 60 * 60 * 1000 // 48 hours in milliseconds
    return Date.now() - encrypted.timestamp < MAX_SESSION_AGE
  }

  /**
   * Clears all sensitive data from storage
   */
  clearSession(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('team-session')
      sessionStorage.removeItem('team-code')
      localStorage.removeItem('team-session-backup')
    }
  }

  /**
   * Stores encrypted session data
   */
  storeSession(encrypted: EncryptedToken, teamName: string): void {
    if (typeof window !== 'undefined') {
      const sessionData = {
        ...encrypted,
        teamName,
        expiresAt: Date.now() + (48 * 60 * 60 * 1000)
      }
      sessionStorage.setItem('team-session', JSON.stringify(sessionData))
      // Backup in localStorage for recovery
      localStorage.setItem('team-session-backup', JSON.stringify(sessionData))
    }
  }

  /**
   * Retrieves stored session data
   */
  getStoredSession(): (EncryptedToken & { teamName: string, expiresAt: number }) | null {
    if (typeof window === 'undefined') return null
    
    try {
      const sessionData = sessionStorage.getItem('team-session')
      if (sessionData) {
        return JSON.parse(sessionData)
      }
      
      // Try to recover from localStorage
      const backupData = localStorage.getItem('team-session-backup')
      if (backupData) {
        const parsed = JSON.parse(backupData)
        // Restore to sessionStorage if still valid
        if (this.isSessionValid(parsed)) {
          sessionStorage.setItem('team-session', backupData)
          return parsed
        }
        // Clean up expired backup
        localStorage.removeItem('team-session-backup')
      }
    } catch (error) {
      console.error('Failed to retrieve session:', error)
    }
    
    return null
  }
}

export const tokenSecurity = new TokenSecurityService()