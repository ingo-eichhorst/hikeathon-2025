export interface PDFExtractionResult {
  text: string
  pageCount: number
  error?: string
}

/**
 * Extract text from a PDF file using pdfjs-dist library
 * Handles extraction asynchronously and returns formatted result with comprehensive error logging
 * @param file - The PDF File object to extract from
 * @returns PDFExtractionResult with text, page count, and optional error
 */
export async function extractPDFText(file: File): Promise<PDFExtractionResult> {
  // Log immediately to verify function is being called
  console.log('[PDF] extractPDFText called with file:', file.name)

  try {
    // Dynamically import pdfjs-dist to allow Nuxt to handle worker setup correctly
    const pdfjsLib = await import('pdfjs-dist')
    console.log('[PDF] pdfjs-dist library loaded')

    // Set up the worker using absolute path from public directory
    // Absolute path works in both development and production (GitHub Pages)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    console.log('[PDF] Worker configured from local file:', pdfjsLib.GlobalWorkerOptions.workerSrc)

    // Convert File to ArrayBuffer
    console.log('[PDF] Converting file to ArrayBuffer...')
    const buffer = await file.arrayBuffer()
    console.log('[PDF] ArrayBuffer created, size:', buffer.byteLength, 'bytes')

    // Create a safe copy of the buffer to prevent detachment issues
    // When buffer is passed to worker, it might be detached if library uses structuredClone
    console.log('[PDF] Creating buffer copy for safe worker communication...')
    const bufferCopy = new Uint8Array(buffer).slice()
    console.log('[PDF] Buffer copy created, size:', bufferCopy.byteLength, 'bytes')

    // Load the PDF document with timeout protection
    // If worker doesn't respond within 15 seconds, throw error instead of hanging
    console.log('[PDF] Loading PDF document...')
    const processingPromise = pdfjsLib.getDocument(bufferCopy).promise
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('PDF processing timeout (15s) - worker may not have loaded or PDF is corrupted')),
        15000
      )
    )
    const pdf = await Promise.race([processingPromise, timeoutPromise])
    console.log('[PDF] Document loaded successfully, pages:', pdf.numPages)

    // Extract text from all pages
    const allText: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        console.log(`[PDF] Extracting text from page ${pageNum}/${pdf.numPages}...`)
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()

        // Extract text items and join them
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join('')

        allText.push(pageText)
        console.log(`[PDF] Page ${pageNum} extracted, length: ${pageText.length} chars`)
      } catch (pageError) {
        const pageErrorMsg = pageError instanceof Error ? pageError.message : 'Unknown error'
        console.warn(`[PDF] Error extracting page ${pageNum}:`, pageErrorMsg)
        // Continue with next page even if one fails
        allText.push(`[Error extracting page ${pageNum}]`)
      }
    }

    const extractedText = allText.join('\n')
    console.log('[PDF] Extraction complete, total text length:', extractedText.length, 'chars')

    if (!extractedText || extractedText.length === 0) {
      console.warn('[PDF] No text content extracted from PDF')
      return {
        text: '',
        pageCount: pdf.numPages,
        error: 'No text could be extracted from PDF'
      }
    }

    return {
      text: extractedText,
      pageCount: pdf.numPages,
      error: undefined
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during PDF extraction'
    const errorStack = error instanceof Error ? error.stack : ''

    console.error('[PDF] Extraction failed:', errorMessage)
    console.error('[PDF] Error stack:', errorStack)

    return {
      text: '',
      pageCount: 0,
      error: `Failed to extract PDF: ${errorMessage}`
    }
  }
}
