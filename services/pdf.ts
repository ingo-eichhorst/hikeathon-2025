import * as pdfjsLib from 'pdfjs-dist'

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
  console.log('[PDF] Starting extraction for file:', file.name, 'Size:', file.size, 'bytes')

  try {
    // Set up the PDF.js worker
    // Use the bundled worker from pdfjs-dist
    const workerScript = `/pdfjs-dist/build/pdf.worker.min.js`
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerScript
    console.log('[PDF] Worker configured:', workerScript)

    // Convert File to ArrayBuffer
    console.log('[PDF] Converting file to ArrayBuffer...')
    const buffer = await file.arrayBuffer()
    console.log('[PDF] ArrayBuffer created, size:', buffer.byteLength, 'bytes')

    // Load the PDF document
    console.log('[PDF] Loading PDF document...')
    const pdf = await pdfjsLib.getDocument(buffer).promise
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
