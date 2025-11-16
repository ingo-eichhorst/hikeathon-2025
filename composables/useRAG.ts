import { onMounted, onUnmounted } from 'vue'
import { RAGService } from '~/services/rag'

export const useRAG = () => {
  const ragService = useState<RAGService>('ragService', () => new RAGService())
  const loadedDocs = useState<Map<string, string>>('loadedDocs', () => new Map())
  const isLoading = useState<boolean>('ragLoading', () => false)
  const error = useState<string | null>('ragError', () => null)
  
  // Default Google Doc IDs (to be configured)
  const defaultDocIds = useState<string[]>('ragDocIds', () => [
    // These should be replaced with actual published Google Doc IDs
    // Example: '1ABC...XYZ'
  ])
  
  /**
   * Loads Google Docs for RAG context
   */
  const loadDocuments = async (docIds?: string[]) => {
    isLoading.value = true
    error.value = null
    
    try {
      const ids = docIds || defaultDocIds.value
      if (ids.length === 0) {
        console.log('No Google Doc IDs configured for RAG')
        return
      }
      
      const docs = await ragService.value.fetchMultipleDocs(ids)
      loadedDocs.value = docs
      
      console.log(`Loaded ${docs.size} documents for RAG`)
    } catch (err) {
      console.error('Error loading documents:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load documents'
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Enhances a message with RAG context
   */
  const enhanceMessage = (message: string): string => {
    if (loadedDocs.value.size === 0) {
      return message
    }
    
    const docIds = Array.from(loadedDocs.value.keys())
    return ragService.value.injectContext(message, docIds)
  }
  
  /**
   * Searches for relevant context
   */
  const searchContext = (query: string) => {
    const docIds = Array.from(loadedDocs.value.keys())
    return ragService.value.searchContext(query, docIds)
  }
  
  /**
   * Adds a new document to the RAG system
   */
  const addDocument = async (docId: string) => {
    try {
      const content = await ragService.value.fetchGoogleDoc(docId)
      loadedDocs.value.set(docId, content)
      
      // Update default doc IDs if not already included
      if (!defaultDocIds.value.includes(docId)) {
        defaultDocIds.value.push(docId)
      }
      
      return content
    } catch (err) {
      console.error(`Error adding document ${docId}:`, err)
      throw err
    }
  }
  
  /**
   * Removes a document from the RAG system
   */
  const removeDocument = (docId: string) => {
    loadedDocs.value.delete(docId)
    defaultDocIds.value = defaultDocIds.value.filter(id => id !== docId)
  }
  
  /**
   * Clears all cached documents
   */
  const clearCache = () => {
    ragService.value.clearCache()
    loadedDocs.value.clear()
  }
  
  /**
   * Sets the default document IDs
   */
  const setDocumentIds = (docIds: string[]) => {
    defaultDocIds.value = docIds
  }
  
  // Auto-load documents on mount
  onMounted(() => {
    if (defaultDocIds.value.length > 0) {
      loadDocuments()
    }
  })
  
  // Cleanup expired cache periodically
  onMounted(() => {
    const interval = setInterval(() => {
      ragService.value.cleanupCache()
    }, 60000) // Every minute
    
    onUnmounted(() => {
      clearInterval(interval)
    })
  })
  
  return {
    loadedDocs: readonly(loadedDocs),
    isLoading: readonly(isLoading),
    error: readonly(error),
    defaultDocIds: readonly(defaultDocIds),
    loadDocuments,
    enhanceMessage,
    searchContext,
    addDocument,
    removeDocument,
    clearCache,
    setDocumentIds
  }
}