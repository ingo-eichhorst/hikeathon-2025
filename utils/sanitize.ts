import DOMPurify from 'dompurify'

/**
 * Sanitizes HTML input to prevent XSS attacks
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: remove all HTML tags
    return html.replace(/<[^>]*>/g, '')
  }
  
  // Configure DOMPurify
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SAFE_FOR_TEMPLATES: true,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true
  }
  
  return DOMPurify.sanitize(html, config)
}

/**
 * Sanitizes user input for display
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  // Remove any script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove any event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '')
  
  // Escape HTML entities
  const div = document?.createElement('div')
  if (div) {
    div.textContent = sanitized
    sanitized = div.innerHTML
  }
  
  return sanitized
}

/**
 * Validates and sanitizes URLs
 */
export function sanitizeURL(url: string): string | null {
  if (!url) return null
  
  try {
    const parsed = new URL(url)
    
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    
    // Remove any javascript: or data: URLs
    if (url.includes('javascript:') || url.includes('data:')) {
      return null
    }
    
    return parsed.toString()
  } catch {
    // Try to add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return sanitizeURL('https://' + url)
    }
    return null
  }
}

/**
 * Sanitizes file names
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unnamed'
  
  // Remove any path components
  fileName = fileName.split(/[/\\]/).pop() || fileName
  
  // Remove special characters
  fileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  
  // Limit length
  if (fileName.length > 255) {
    const ext = fileName.split('.').pop()
    fileName = fileName.substring(0, 250) + '.' + ext
  }
  
  return fileName
}

/**
 * CSRF token generation and validation
 */
export class CSRFProtection {
  private static TOKEN_KEY = 'csrf-token'
  private static TOKEN_LENGTH = 32
  
  /**
   * Generates a new CSRF token
   */
  static generateToken(): string {
    if (typeof window === 'undefined') return ''
    
    const array = new Uint8Array(this.TOKEN_LENGTH)
    crypto.getRandomValues(array)
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    
    sessionStorage.setItem(this.TOKEN_KEY, token)
    return token
  }
  
  /**
   * Gets the current CSRF token
   */
  static getToken(): string {
    if (typeof window === 'undefined') return ''
    
    let token = sessionStorage.getItem(this.TOKEN_KEY)
    if (!token) {
      token = this.generateToken()
    }
    return token
  }
  
  /**
   * Validates a CSRF token
   */
  static validateToken(token: string): boolean {
    if (typeof window === 'undefined') return false
    
    const storedToken = sessionStorage.getItem(this.TOKEN_KEY)
    return storedToken === token && token.length === this.TOKEN_LENGTH * 2
  }
  
  /**
   * Adds CSRF token to request headers
   */
  static addToHeaders(headers: Headers): void {
    headers.set('X-CSRF-Token', this.getToken())
  }
}