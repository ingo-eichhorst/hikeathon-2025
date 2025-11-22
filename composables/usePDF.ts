import { readonly, ref } from 'vue'
import { PDFProcessor, type PDFProcessingResult, type PDFProcessingProgress } from '~/services/pdf'

export const usePDF = () => {
  // Use ref instead of useState for client-side only composable
  // useState is for SSR state management, causing initialization issues
  const processor = ref<PDFProcessor>(new PDFProcessor())
  const isProcessing = ref<boolean>(false)
  const progress = ref<PDFProcessingProgress | null>(null)
  const lastResult = ref<PDFProcessingResult | null>(null)
  const error = ref<string | null>(null)

  // Store processed PDFs for reuse
  const processedPDFs = ref<Map<string, PDFProcessingResult>>(new Map())
  
  /**
   * Processes a PDF file with timeout protection
   */
  const processPDF = async (file: File): Promise<PDFProcessingResult> => {
    isProcessing.value = true
    error.value = null
    progress.value = null

    try {
      // Check if already processed
      const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
      const cached = processedPDFs.value.get(cacheKey)
      if (cached) {
        console.log('[usePDF] Returning cached PDF processing result:', file.name)
        lastResult.value = cached
        return cached
      }

      // Set up progress callback
      processor.value.onProgress((p) => {
        progress.value = p
      })

      console.log('[usePDF] Starting PDF processing with timeout protection:', file.name)

      // Add timeout protection to prevent hanging
      const processingPromise = processor.value.processPDF(file)
      const timeoutPromise = new Promise<PDFProcessingResult>((_, reject) =>
        setTimeout(
          () => reject(new Error('PDF processing timeout (15s) - worker may not have loaded or PDF is corrupted')),
          15000
        )
      )

      const result = await Promise.race([processingPromise, timeoutPromise])

      console.log('[usePDF] PDF processed successfully:', file.name)

      // Cache the result
      processedPDFs.value.set(cacheKey, result)

      // Limit cache size
      if (processedPDFs.value.size > 10) {
        const firstKey = processedPDFs.value.keys().next().value
        processedPDFs.value.delete(firstKey)
      }

      lastResult.value = result
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process PDF'
      console.error('[usePDF] Error processing PDF:', file.name, errorMsg)
      error.value = errorMsg
      throw err
    } finally {
      isProcessing.value = false
    }
  }
  
  /**
   * Processes a PDF from URL with timeout protection
   */
  const processPDFFromURL = async (url: string): Promise<PDFProcessingResult> => {
    isProcessing.value = true
    error.value = null
    progress.value = null

    try {
      // Check if already processed
      const cached = processedPDFs.value.get(url)
      if (cached) {
        console.log('[usePDF] Returning cached PDF processing result from URL:', url)
        lastResult.value = cached
        return cached
      }

      // Set up progress callback
      processor.value.onProgress((p) => {
        progress.value = p
      })

      console.log('[usePDF] Starting PDF processing from URL with timeout protection:', url)

      // Add timeout protection to prevent hanging
      const processingPromise = processor.value.processPDFFromURL(url)
      const timeoutPromise = new Promise<PDFProcessingResult>((_, reject) =>
        setTimeout(
          () => reject(new Error('PDF processing timeout (30s) - worker may not have loaded or PDF is corrupted')),
          30000
        )
      )

      const result = await Promise.race([processingPromise, timeoutPromise])

      console.log('[usePDF] PDF from URL processed successfully:', url)

      // Cache the result
      processedPDFs.value.set(url, result)

      // Limit cache size
      if (processedPDFs.value.size > 10) {
        const firstKey = processedPDFs.value.keys().next().value
        processedPDFs.value.delete(firstKey)
      }

      lastResult.value = result
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process PDF from URL'
      console.error('[usePDF] Error processing PDF from URL:', url, errorMsg)
      error.value = errorMsg
      throw err
    } finally {
      isProcessing.value = false
    }
  }
  
  /**
   * Chunks PDF text for context
   */
  const chunkPDFText = (text: string, maxChunkSize?: number): string[] => {
    return processor.value.chunkText(text, maxChunkSize)
  }
  
  /**
   * Validates if a file is a valid PDF
   */
  const validatePDF = async (file: File): Promise<boolean> => {
    return processor.value.validatePDF(file)
  }
  
  /**
   * Clears all cached PDFs
   */
  const clearCache = () => {
    processedPDFs.value.clear()
    lastResult.value = null
  }
  
  /**
   * Gets text from the last processed PDF
   */
  const getLastPDFText = (): string | null => {
    return lastResult.value?.text ?? null
  }
  
  /**
   * Gets chunks from the last processed PDF
   */
  const getLastPDFChunks = (maxChunkSize?: number): string[] => {
    const text = lastResult.value?.text
    if (!text) return []
    return chunkPDFText(text, maxChunkSize)
  }
  
  return {
    isProcessing: readonly(isProcessing),
    progress: readonly(progress),
    lastResult: readonly(lastResult),
    error: readonly(error),
    processedPDFs: readonly(processedPDFs),
    processPDF,
    processPDFFromURL,
    chunkPDFText,
    validatePDF,
    clearCache,
    getLastPDFText,
    getLastPDFChunks
  }
}