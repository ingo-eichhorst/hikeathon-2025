/**
 * URL Extraction and Validation Utility
 * Detects URLs in text and validates them for fetching
 */

import { sanitizeURL } from './sanitize'

export interface DetectedURL {
  url: string
  position: number
  displayText: string
}

/**
 * Extract all valid URLs from a text string
 * Matches URLs in format: http://, https://, www., or domain.ext
 */
export function extractURLs(text: string): DetectedURL[] {
  if (!text || text.length === 0) {
    return []
  }

  // Regex pattern to match URLs:
  // - Starts with http(s):// or www. or domain-like pattern
  // - Includes characters: alphanumeric, dash, underscore, dot, slash, query params, hash
  // - Does not end with punctuation (., ,, !, ?, ;, :)
  const urlPattern = /https?:\/\/[^\s)]+|www\.[^\s)]+|(?:^|\s)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s)]*)?/gi

  const urls: DetectedURL[] = []
  let match

  while ((match = urlPattern.exec(text)) !== null) {
    let url = match[0].trim()

    // Remove trailing punctuation that's not part of the URL
    url = url.replace(/[.,!?;:\'")\]]*$/, '')

    // Add https:// if no protocol is specified
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Validate the URL
    const sanitized = sanitizeURL(url)
    if (sanitized) {
      urls.push({
        url: sanitized,
        position: match.index,
        displayText: new URL(sanitized).hostname || sanitized
      })
    }
  }

  // Remove duplicates while preserving order
  const seen = new Set<string>()
  return urls.filter(item => {
    if (seen.has(item.url)) {
      return false
    }
    seen.add(item.url)
    return true
  })
}

/**
 * Check if a string is a valid URL
 */
export function isValidURL(url: string): boolean {
  const sanitized = sanitizeURL(url)
  return sanitized !== null
}

/**
 * Get domain name from URL
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname || url
  } catch {
    return url
  }
}

/**
 * Check if URL appears to be a document (PDF, etc.)
 */
export function isDocumentURL(url: string): boolean {
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx']
  const lowerUrl = url.toLowerCase()
  return documentExtensions.some(ext => lowerUrl.endsWith(ext))
}

/**
 * Limit the number of URLs in a message (max 5)
 */
export function limitURLs(urls: DetectedURL[], maxCount: number = 5): DetectedURL[] {
  return urls.slice(0, maxCount)
}
