/**
 * URL Fetching Composable
 * Handles fetching URL content via fetch-url Edge Function with caching and error handling
 */

import { ref, computed } from 'vue'
import type { URLAttachment } from '~/stores/chat'

interface URLCache {
  content: string
  contentType: string
  fetchedAt: Date
  expiresAt: Date
}

// In-memory cache with 15-minute expiry
const urlCache = new Map<string, URLCache>()

// Track in-flight requests to avoid duplicates
const inFlightRequests = new Map<string, Promise<URLAttachment>>()

// Rate limiting: track fetches per minute
const fetchTimes = ref<number[]>([])
const MAX_FETCHES_PER_MINUTE = 20

const FETCH_TIMEOUT = 30000 // 30 seconds
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

export interface URLFetchOptions {
  timeout?: number
  bypassCache?: boolean
}

export interface URLFetchError {
  code: 'network' | 'timeout' | 'invalid_url' | 'unsupported_content' | 'access_denied' | 'unknown'
  message: string
}

/**
 * Clear expired cache entries
 */
function cleanCache(): void {
  const now = new Date()
  for (const [key, value] of urlCache.entries()) {
    if (value.expiresAt < now) {
      urlCache.delete(key)
    }
  }
}

/**
 * Check rate limiting
 */
function checkRateLimit(): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60 * 1000

  // Remove old timestamps
  fetchTimes.value = fetchTimes.value.filter(time => time > oneMinuteAgo)

  // Check if we've exceeded the limit
  return fetchTimes.value.length < MAX_FETCHES_PER_MINUTE
}

/**
 * Record a fetch attempt
 */
function recordFetchAttempt(): void {
  fetchTimes.value.push(Date.now())
}

/**
 * Get domain and path for summary
 */
function generateSummary(content: string, url: string): string {
  // Return first 200 characters of content as summary
  return content.substring(0, 200).trim()
}

/**
 * Fetch a single URL and return URLAttachment
 */
export async function fetchURL(
  url: string,
  options: URLFetchOptions = {}
): Promise<URLAttachment> {
  const { timeout = FETCH_TIMEOUT, bypassCache = false } = options

  // Check for in-flight request first
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!
  }

  // Create the fetch promise
  const fetchPromise = (async () => {
    const id = crypto.randomUUID()

    try {
      // Check cache first
      if (!bypassCache) {
        cleanCache()
        const cached = urlCache.get(url)
        if (cached && cached.expiresAt > new Date()) {
          return {
            id,
            url,
            fetchedAt: cached.fetchedAt,
            contentType: cached.contentType,
            content: cached.content,
            summary: generateSummary(cached.content, url),
            isLoading: false
          }
        }
      }

      // Check rate limiting
      if (!checkRateLimit()) {
        throw {
          code: 'network',
          message: 'Rate limit exceeded: 20 fetches per minute'
        } as URLFetchError
      }

      recordFetchAttempt()

      // Validate URL before fetching
      try {
        new URL(url)
      } catch {
        throw {
          code: 'invalid_url',
          message: `Invalid URL format: ${url}`
        } as URLFetchError
      }

      // Fetch from Edge Function with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const { $supabase } = useNuxtApp()
      const response = await fetch(
        `${$supabase.functions.url}/fetch-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${$supabase.supabaseKey}`,
            'apikey': $supabase.supabaseKey
          },
          body: JSON.stringify({ url }),
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      // Handle response
      if (!response.ok) {
        if (response.status === 400) {
          throw {
            code: 'invalid_url',
            message: `Invalid URL or format: ${url}`
          } as URLFetchError
        } else if (response.status === 401 || response.status === 403) {
          throw {
            code: 'access_denied',
            message: `Access denied to ${new URL(url).hostname}`
          } as URLFetchError
        } else if (response.status === 415) {
          throw {
            code: 'unsupported_content',
            message: `Unsupported content type from ${new URL(url).hostname}`
          } as URLFetchError
        } else {
          throw {
            code: 'network',
            message: `HTTP ${response.status}: Failed to fetch ${url}`
          } as URLFetchError
        }
      }

      const data = await response.json()
      const { content, contentType } = data

      if (!content) {
        throw {
          code: 'unknown',
          message: 'Empty response from server'
        } as URLFetchError
      }

      // Cache the result
      const now = new Date()
      urlCache.set(url, {
        content,
        contentType,
        fetchedAt: now,
        expiresAt: new Date(now.getTime() + CACHE_DURATION)
      })

      return {
        id,
        url,
        fetchedAt: now,
        contentType,
        content,
        summary: generateSummary(content, url),
        isLoading: false
      }
    } catch (error) {
      // Handle different error types
      let errorMsg: URLFetchError

      if (error instanceof TypeError) {
        // Network error or abort
        if (error.name === 'AbortError') {
          errorMsg = {
            code: 'timeout',
            message: `Timeout fetching ${new URL(url).hostname} (>${timeout / 1000}s)`
          }
        } else {
          errorMsg = {
            code: 'network',
            message: `Network error: ${error.message}`
          }
        }
      } else if (error && typeof error === 'object' && 'code' in error) {
        // Already formatted error
        errorMsg = error as URLFetchError
      } else {
        errorMsg = {
          code: 'unknown',
          message: `Unknown error: ${String(error)}`
        }
      }

      return {
        id,
        url,
        fetchedAt: new Date(),
        contentType: '',
        content: '',
        error: errorMsg.message,
        isLoading: false
      }
    } finally {
      // Remove from in-flight requests
      inFlightRequests.delete(url)
    }
  })()

  // Store in-flight request
  inFlightRequests.set(url, fetchPromise)

  return fetchPromise
}

/**
 * Fetch multiple URLs in parallel with timeout
 */
export async function fetchMultipleURLs(
  urls: string[],
  options: URLFetchOptions = {}
): Promise<URLAttachment[]> {
  if (urls.length === 0) {
    return []
  }

  // Limit to max 5 URLs
  const limitedUrls = urls.slice(0, 5)

  // Fetch all in parallel
  const promises = limitedUrls.map(url =>
    fetchURL(url, options).catch(error => {
      // Ensure we return a valid URLAttachment even on error
      return {
        id: crypto.randomUUID(),
        url,
        fetchedAt: new Date(),
        contentType: '',
        content: '',
        error: `Failed to fetch: ${String(error)}`,
        isLoading: false
      } as URLAttachment
    })
  )

  return Promise.all(promises)
}

/**
 * Clear the URL cache
 */
export function clearURLCache(): void {
  urlCache.clear()
}

/**
 * Get cache info for debugging
 */
export function getCacheInfo() {
  return {
    cacheSize: urlCache.size,
    cachedUrls: Array.from(urlCache.keys()),
    fetchesThisMinute: fetchTimes.value.length
  }
}

/**
 * Composable hook for URL fetching
 */
export function useURLFetching() {
  const isLoading = ref(false)
  const error = ref<URLFetchError | null>(null)

  const fetchURLWithLoading = async (url: string) => {
    isLoading.value = true
    error.value = null

    try {
      const result = await fetchURL(url)
      if (result.error) {
        error.value = {
          code: 'unknown',
          message: result.error
        }
      }
      return result
    } catch (err) {
      error.value = {
        code: 'unknown',
        message: String(err)
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchMultipleWithLoading = async (urls: string[]) => {
    isLoading.value = true
    error.value = null

    try {
      const results = await fetchMultipleURLs(urls)
      const hasErrors = results.some(r => r.error)
      if (hasErrors) {
        error.value = {
          code: 'unknown',
          message: 'Some URLs failed to fetch'
        }
      }
      return results
    } catch (err) {
      error.value = {
        code: 'unknown',
        message: String(err)
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    fetchURL: fetchURLWithLoading,
    fetchMultipleURLs: fetchMultipleWithLoading,
    clearCache: clearURLCache
  }
}
