interface DocumentContent {
  id: string
  content: string
  markdown: string
  chunks: string[]
  lastFetched: Date
}

interface RAGContext {
  content: string
  relevance: number
  source: string
}

export class RAGService {
  private cache = new Map<string, DocumentContent>()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes
  
  /**
   * Fetches a published Google Doc by its ID
   */
  async fetchGoogleDoc(docId: string): Promise<string> {
    const cacheKey = this.getCacheKey(docId)
    const cached = this.cache.get(cacheKey)
    
    // Return cached if still valid
    if (cached && Date.now() - cached.lastFetched.getTime() < this.cacheTTL) {
      console.log(`Returning cached Google Doc: ${docId}`)
      return cached.markdown
    }
    
    try {
      // Construct the published Google Doc URL
      const url = `https://docs.google.com/document/d/${docId}/export?format=html`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch Google Doc: ${response.statusText}`)
      }
      
      const html = await response.text()
      const markdown = this.htmlToMarkdown(html)
      const chunks = this.chunkContent(markdown)
      
      const document: DocumentContent = {
        id: docId,
        content: html,
        markdown,
        chunks,
        lastFetched: new Date()
      }
      
      this.cache.set(cacheKey, document)
      console.log(`Cached Google Doc: ${docId} with ${chunks.length} chunks`)
      
      return markdown
    } catch (error) {
      console.error('Error fetching Google Doc:', error)
      throw error
    }
  }
  
  /**
   * Fetches multiple Google Docs
   */
  async fetchMultipleDocs(docIds: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    
    await Promise.all(
      docIds.map(async (docId) => {
        try {
          const content = await this.fetchGoogleDoc(docId)
          results.set(docId, content)
        } catch (error) {
          console.error(`Failed to fetch doc ${docId}:`, error)
        }
      })
    )
    
    return results
  }
  
  /**
   * Converts HTML to Markdown
   */
  htmlToMarkdown(html: string): string {
    // Remove style tags and their content
    let markdown = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    
    // Remove script tags and their content
    markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    
    // Convert headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    
    // Convert bold and italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    
    // Convert links
    markdown = markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    
    // Convert lists
    markdown = markdown.replace(/<ul[^>]*>/gi, '\n')
    markdown = markdown.replace(/<\/ul>/gi, '\n')
    markdown = markdown.replace(/<ol[^>]*>/gi, '\n')
    markdown = markdown.replace(/<\/ol>/gi, '\n')
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    
    // Convert paragraphs
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    
    // Convert line breaks
    markdown = markdown.replace(/<br[^>]*>/gi, '\n')
    
    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '')
    
    // Decode HTML entities
    markdown = markdown.replace(/&nbsp;/g, ' ')
    markdown = markdown.replace(/&amp;/g, '&')
    markdown = markdown.replace(/&lt;/g, '<')
    markdown = markdown.replace(/&gt;/g, '>')
    markdown = markdown.replace(/&quot;/g, '"')
    markdown = markdown.replace(/&#39;/g, "'")
    
    // Clean up excessive whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n')
    markdown = markdown.trim()
    
    return markdown
  }
  
  /**
   * Chunks content into smaller pieces for context windows
   */
  chunkContent(content: string, maxChunkSize: number = 2000): string[] {
    const chunks: string[] = []
    const paragraphs = content.split('\n\n')
    
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed the limit, save current chunk
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      
      // If a single paragraph is too long, split it
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim())
            currentChunk = sentence
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence
          }
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }
    
    // Add any remaining content
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }
    
    return chunks
  }
  
  /**
   * Searches for relevant context based on a query
   */
  searchContext(query: string, docIds: string[]): RAGContext[] {
    const contexts: RAGContext[] = []
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/)
    
    for (const docId of docIds) {
      const cacheKey = this.getCacheKey(docId)
      const document = this.cache.get(cacheKey)
      
      if (!document) continue
      
      // Score each chunk based on keyword matches
      for (const chunk of document.chunks) {
        const chunkLower = chunk.toLowerCase()
        let relevance = 0
        
        // Check for exact phrase match
        if (chunkLower.includes(queryLower)) {
          relevance += 10
        }
        
        // Check for individual word matches
        for (const word of queryWords) {
          if (word.length > 2 && chunkLower.includes(word)) {
            relevance += 1
          }
        }
        
        if (relevance > 0) {
          contexts.push({
            content: chunk,
            relevance,
            source: `Google Doc: ${docId}`
          })
        }
      }
    }
    
    // Sort by relevance and return top results
    return contexts
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
  }
  
  /**
   * Injects context into a chat message
   */
  injectContext(message: string, docIds: string[]): string {
    const contexts = this.searchContext(message, docIds)
    
    if (contexts.length === 0) {
      return message
    }
    
    let contextText = 'Relevant context from documentation:\n\n'
    for (const context of contexts) {
      contextText += `---\nSource: ${context.source}\n${context.content}\n\n`
    }
    
    return `${contextText}---\n\nUser question: ${message}`
  }
  
  /**
   * Gets cache key for a document
   */
  getCacheKey(docId: string): string {
    return `gdoc:${docId}`
  }
  
  /**
   * Clears the cache
   */
  clearCache(): void {
    this.cache.clear()
  }
  
  /**
   * Removes expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now()
    for (const [key, document] of this.cache.entries()) {
      if (now - document.lastFetched.getTime() > this.cacheTTL) {
        this.cache.delete(key)
      }
    }
  }
}