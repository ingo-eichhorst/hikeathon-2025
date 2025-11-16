import { readonly } from 'vue'
import { PDFProcessor, type PDFProcessingResult, type PDFProcessingProgress } from '~/services/pdf'

export const usePDF = () => {
  const processor = useState<PDFProcessor>('pdfProcessor', () => new PDFProcessor())
  const isProcessing = useState<boolean>('pdfProcessing', () => false)
  const progress = useState<PDFProcessingProgress | null>('pdfProgress', () => null)
  const lastResult = useState<PDFProcessingResult | null>('pdfResult', () => null)
  const error = useState<string | null>('pdfError', () => null)
  
  // Store processed PDFs for reuse
  const processedPDFs = useState<Map<string, PDFProcessingResult>>('processedPDFs', () => new Map())
  
  /**
   * Processes a PDF file
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
        console.log('Returning cached PDF processing result')
        lastResult.value = cached
        return cached
      }
      
      // Set up progress callback
      processor.value.onProgress((p) => {
        progress.value = p
      })
      
      // Process the PDF
      const result = await processor.value.processPDF(file)
      
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
      console.error('Error processing PDF:', err)
      error.value = err instanceof Error ? err.message : 'Failed to process PDF'
      throw err
    } finally {
      isProcessing.value = false
    }
  }
  
  /**
   * Processes a PDF from URL
   */
  const processPDFFromURL = async (url: string): Promise<PDFProcessingResult> => {
    isProcessing.value = true
    error.value = null
    progress.value = null
    
    try {
      // Check if already processed
      const cached = processedPDFs.value.get(url)
      if (cached) {
        console.log('Returning cached PDF processing result')
        lastResult.value = cached
        return cached
      }
      
      // Set up progress callback
      processor.value.onProgress((p) => {
        progress.value = p
      })
      
      // Process the PDF
      const result = await processor.value.processPDFFromURL(url)
      
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
      console.error('Error processing PDF from URL:', err)
      error.value = err instanceof Error ? err.message : 'Failed to process PDF from URL'
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