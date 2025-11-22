import { ref } from 'vue'
import * as mammoth from 'mammoth'

interface DOCXResult {
  text: string
  pageCount?: number
  metadata?: {
    title?: string
    author?: string
    createdTime?: string
    modifiedTime?: string
  }
}

interface CachedDocument {
  result: DOCXResult
  timestamp: number
}

const CACHE_LIMIT = 10 // Limit cache to 10 documents
const documentCache = new Map<string, CachedDocument>()

export const useDOCX = () => {
  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  const validateDOCX = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    const validMimeTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
    const validExtensions = ['.docx', '.doc']

    const isValidMimeType = validMimeTypes.includes(file.type)
    const isValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!isValidMimeType && !isValidExtension) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a DOCX or DOC file.'
      }
    }

    // Check file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
      }
    }

    return { valid: true }
  }

  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer)
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  const processDOCX = async (file: File): Promise<DOCXResult> => {
    error.value = null
    isProcessing.value = true

    try {
      // Check cache first
      const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
      const cached = documentCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
        isProcessing.value = false
        return cached.result
      }

      // Validate file
      const validation = validateDOCX(file)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid DOCX file')
      }

      // Convert file to ArrayBuffer
      const arrayBuffer = await fileToArrayBuffer(file)

      // Extract text using Mammoth
      const result = await mammoth.extractRawText({ arrayBuffer })

      if (result.messages && result.messages.length > 0) {
        // Log warnings but continue
        console.warn('DOCX extraction warnings:', result.messages)
      }

      // Create result object
      const docxResult: DOCXResult = {
        text: result.value || '',
        pageCount: undefined, // DOCX doesn't have page concept like PDF
        metadata: {
          createdTime: new Date(file.lastModified).toISOString()
        }
      }

      // Cache the result
      documentCache.set(cacheKey, {
        result: docxResult,
        timestamp: Date.now()
      })

      // Manage cache size
      if (documentCache.size > CACHE_LIMIT) {
        const firstKey = documentCache.keys().next().value
        if (firstKey) {
          documentCache.delete(firstKey)
        }
      }

      return docxResult
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process DOCX file'
      error.value = errorMessage
      throw new Error(errorMessage)
    } finally {
      isProcessing.value = false
    }
  }

  const clearCache = () => {
    documentCache.clear()
  }

  return {
    processDOCX,
    isProcessing,
    error,
    validateDOCX,
    clearCache
  }
}
