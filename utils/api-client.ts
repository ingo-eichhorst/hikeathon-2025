import { useAuthStore } from '~/stores/auth'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
  retries?: number
  retryDelay?: number
}

interface QueuedRequest {
  resolve: (value: Response) => void
  reject: (error: any) => void
  url: string
  options: RequestOptions
}

export class AuthenticatedAPIClient {
  private baseURL: string
  private requestQueue: QueuedRequest[] = []
  private isRefreshing = false

  constructor(baseURL?: string) {
    const config = useRuntimeConfig()
    this.baseURL = baseURL || config.public.supabaseUrl
  }

  /**
   * Prepares headers with authentication
   */
  private async prepareHeaders(options: RequestOptions = {}): Promise<Headers> {
    const headers = new Headers(options.headers || {})
    
    if (!options.skipAuth) {
      const authStore = useAuthStore()
      const token = await authStore.getToken()
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    }
    
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    
    return headers
  }

  /**
   * Makes an authenticated request
   */
  async request(url: string, options: RequestOptions = {}): Promise<Response> {
    // If we're refreshing, queue the request
    if (this.isRefreshing && !options.skipAuth) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ resolve, reject, url, options })
      })
    }

    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`
    const headers = await this.prepareHeaders(options)
    
    const requestOptions: RequestInit = {
      ...options,
      headers
    }

    try {
      const response = await fetch(fullURL, requestOptions)
      
      // Handle 401 Unauthorized
      if (response.status === 401 && !options.skipAuth) {
        return this.handle401(url, options)
      }
      
      // Handle rate limiting
      if (response.status === 429) {
        return this.handleRateLimit(response, url, options)
      }
      
      return response
    } catch (error) {
      // Handle network errors with retry
      if (options.retries && options.retries > 0) {
        const delay = options.retryDelay || 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        
        return this.request(url, {
          ...options,
          retries: options.retries - 1,
          retryDelay: delay * 2 // Exponential backoff
        })
      }
      
      throw error
    }
  }

  /**
   * Handles 401 Unauthorized responses
   */
  private async handle401(url: string, options: RequestOptions): Promise<Response> {
    const authStore = useAuthStore()
    
    if (!this.isRefreshing) {
      this.isRefreshing = true
      
      try {
        // Try to refresh the session
        await authStore.refreshSession()
        
        // Process queued requests
        this.processQueue(null)
        
        // Retry the original request
        return this.request(url, options)
      } catch (error) {
        // Refresh failed, redirect to login
        this.processQueue(error)
        authStore.logout()
        throw error
      } finally {
        this.isRefreshing = false
      }
    }
    
    // Wait for refresh to complete
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, url, options })
    })
  }

  /**
   * Handles rate limiting with retry-after
   */
  private async handleRateLimit(response: Response, url: string, options: RequestOptions): Promise<Response> {
    const retryAfter = response.headers.get('Retry-After')
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000
    
    console.warn(`Rate limited. Retrying after ${delay}ms`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    return this.request(url, options)
  }

  /**
   * Processes queued requests after token refresh
   */
  private processQueue(error: any) {
    this.requestQueue.forEach(({ resolve, reject, url, options }) => {
      if (error) {
        reject(error)
      } else {
        this.request(url, options).then(resolve).catch(reject)
      }
    })
    
    this.requestQueue = []
  }

  /**
   * GET request
   */
  async get(url: string, options?: RequestOptions): Promise<Response> {
    return this.request(url, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post(url: string, body?: any, options?: RequestOptions): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * PUT request
   */
  async put(url: string, body?: any, options?: RequestOptions): Promise<Response> {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * DELETE request
   */
  async delete(url: string, options?: RequestOptions): Promise<Response> {
    return this.request(url, { ...options, method: 'DELETE' })
  }

  /**
   * Stream request for Server-Sent Events
   */
  async stream(url: string, onMessage: (data: any) => void, options?: RequestOptions): Promise<() => void> {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`
    const headers = await this.prepareHeaders(options)
    headers.set('Accept', 'text/event-stream')
    
    const response = await fetch(fullURL, {
      ...options,
      headers
    })
    
    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed: ${response.statusText}`)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    
    const readLoop = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                return
              }
              try {
                const parsed = JSON.parse(data)
                onMessage(parsed)
              } catch (e) {
                console.error('Failed to parse SSE data:', e)
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream reading error:', error)
        throw error
      }
    }
    
    readLoop()
    
    // Return cleanup function
    return () => {
      reader.cancel()
    }
  }
}

// Export singleton instance
export const apiClient = new AuthenticatedAPIClient()