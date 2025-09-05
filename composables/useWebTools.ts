import { callSupabaseFunction } from '~/utils/api-client'

export interface WebSearchResult {
  title: string
  link: string
  snippet: string
  position: number
}

export interface WebSearchResponse {
  query: string
  results: WebSearchResult[]
  knowledgeGraph?: any
  answerBox?: any
  searchTime?: number
}

export interface URLFetchResponse {
  url: string
  contentType: string
  content: string
  fetchedAt: string
}

export const useWebTools = () => {
  const isSearching = useState<boolean>('webSearching', () => false)
  const isFetching = useState<boolean>('urlFetching', () => false)
  const searchResults = useState<WebSearchResponse | null>('searchResults', () => null)
  const fetchedContent = useState<URLFetchResponse | null>('fetchedContent', () => null)
  const searchError = useState<string | null>('searchError', () => null)
  const fetchError = useState<string | null>('fetchError', () => null)
  
  // Rate limiting
  const searchRateLimit = useState<number>('searchRateLimit', () => 0)
  const fetchRateLimit = useState<number>('fetchRateLimit', () => 0)
  const maxSearchesPerMinute = 10
  const maxFetchesPerMinute = 20
  
  // Cache
  const searchCache = useState<Map<string, WebSearchResponse>>('searchCache', () => new Map())
  const fetchCache = useState<Map<string, URLFetchResponse>>('fetchCache', () => new Map())
  const cacheExpiry = 15 * 60 * 1000 // 15 minutes
  
  /**
   * Performs a web search
   */
  const searchWeb = async (query: string, num: number = 10): Promise<WebSearchResponse> => {
    // Check rate limit
    const now = Date.now()
    if (now - searchRateLimit.value < 60000 / maxSearchesPerMinute) {
      throw new Error('Rate limit exceeded. Please wait before searching again.')
    }
    
    // Check cache
    const cacheKey = `${query}-${num}`
    const cached = searchCache.value.get(cacheKey)
    if (cached && Date.now() - new Date(cached.searchTime || 0).getTime() < cacheExpiry) {
      console.log('Returning cached search results')
      searchResults.value = cached
      return cached
    }
    
    isSearching.value = true
    searchError.value = null
    
    try {
      const response = await callSupabaseFunction('search-web', {
        query,
        num
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to search web')
      }
      
      const data = await response.json()
      
      // Update cache
      searchCache.value.set(cacheKey, data)
      
      // Clean old cache entries
      if (searchCache.value.size > 50) {
        const firstKey = searchCache.value.keys().next().value
        searchCache.value.delete(firstKey)
      }
      
      searchResults.value = data
      searchRateLimit.value = now
      
      return data
    } catch (err) {
      console.error('Web search error:', err)
      searchError.value = err instanceof Error ? err.message : 'Failed to search web'
      throw err
    } finally {
      isSearching.value = false
    }
  }
  
  /**
   * Fetches content from a URL
   */
  const fetchURL = async (url: string): Promise<URLFetchResponse> => {
    // Check rate limit
    const now = Date.now()
    if (now - fetchRateLimit.value < 60000 / maxFetchesPerMinute) {
      throw new Error('Rate limit exceeded. Please wait before fetching another URL.')
    }
    
    // Check cache
    const cached = fetchCache.value.get(url)
    if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < cacheExpiry) {
      console.log('Returning cached URL content')
      fetchedContent.value = cached
      return cached
    }
    
    isFetching.value = true
    fetchError.value = null
    
    try {
      const response = await callSupabaseFunction('fetch-url', { url })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch URL')
      }
      
      const data = await response.json()
      
      // Update cache
      fetchCache.value.set(url, data)
      
      // Clean old cache entries
      if (fetchCache.value.size > 50) {
        const firstKey = fetchCache.value.keys().next().value
        fetchCache.value.delete(firstKey)
      }
      
      fetchedContent.value = data
      fetchRateLimit.value = now
      
      return data
    } catch (err) {
      console.error('URL fetch error:', err)
      fetchError.value = err instanceof Error ? err.message : 'Failed to fetch URL'
      throw err
    } finally {
      isFetching.value = false
    }
  }
  
  /**
   * Searches and fetches top results
   */
  const searchAndFetch = async (
    query: string,
    numResults: number = 3
  ): Promise<{ search: WebSearchResponse; fetched: URLFetchResponse[] }> => {
    const search = await searchWeb(query)
    const fetched: URLFetchResponse[] = []
    
    // Fetch top results
    const topResults = search.results.slice(0, numResults)
    for (const result of topResults) {
      try {
        const content = await fetchURL(result.link)
        fetched.push(content)
      } catch (err) {
        console.warn(`Failed to fetch ${result.link}:`, err)
      }
    }
    
    return { search, fetched }
  }
  
  /**
   * Clears search results
   */
  const clearSearchResults = () => {
    searchResults.value = null
    searchError.value = null
  }
  
  /**
   * Clears fetched content
   */
  const clearFetchedContent = () => {
    fetchedContent.value = null
    fetchError.value = null
  }
  
  /**
   * Clears all caches
   */
  const clearCaches = () => {
    searchCache.value.clear()
    fetchCache.value.clear()
  }
  
  /**
   * Formats search results for display
   */
  const formatSearchResults = (results: WebSearchResult[]): string => {
    return results
      .map((r, i) => `${i + 1}. [${r.title}](${r.link})\n   ${r.snippet}`)
      .join('\n\n')
  }
  
  /**
   * Extracts relevant content from fetched URLs
   */
  const extractRelevantContent = (
    fetched: URLFetchResponse[],
    query: string,
    maxLength: number = 2000
  ): string[] => {
    const queryWords = query.toLowerCase().split(/\s+/)
    
    return fetched.map(response => {
      const content = response.content
      const sentences = content.match(/[^.!?]+[.!?]+/g) || []
      
      // Score sentences by keyword relevance
      const scoredSentences = sentences.map(sentence => {
        const sentenceLower = sentence.toLowerCase()
        let score = 0
        
        for (const word of queryWords) {
          if (word.length > 2 && sentenceLower.includes(word)) {
            score++
          }
        }
        
        return { sentence, score }
      })
      
      // Sort by relevance and take top sentences
      const relevant = scoredSentences
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(s => s.sentence)
        .join(' ')
      
      return relevant.substring(0, maxLength)
    })
  }
  
  return {
    isSearching: readonly(isSearching),
    isFetching: readonly(isFetching),
    searchResults: readonly(searchResults),
    fetchedContent: readonly(fetchedContent),
    searchError: readonly(searchError),
    fetchError: readonly(fetchError),
    searchWeb,
    fetchURL,
    searchAndFetch,
    clearSearchResults,
    clearFetchedContent,
    clearCaches,
    formatSearchResults,
    extractRelevantContent
  }
}