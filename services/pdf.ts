import { extractText, getMeta } from 'unpdf'

export interface PDFExtractionResult {
  text: string
  pageCount: number
  error?: string
}

/**
 * Extract text from a PDF file using unpdf library
 * Handles extraction asynchronously and returns formatted result
 * @param file - The PDF File object to extract from
 * @returns PDFExtractionResult with text, page count, and optional error
 */
export async function extractPDFText(file: File): Promise<PDFExtractionResult> {
  try {
    // Convert File to ArrayBuffer for unpdf processing
    const buffer = await file.arrayBuffer()

    // Extract text from PDF
    const { text: rawText } = await extractText(buffer)

    // Handle text extraction result (can be string or array)
    const extractedText = Array.isArray(rawText) ? rawText.join('\n') : (rawText || '')

    // Get metadata to determine page count
    const metadata = await getMeta(buffer)

    // Try to get page count from metadata.info or metadata.metadata
    let pageCount = 0
    if (metadata && typeof metadata === 'object') {
      // unpdf returns metadata object with info property
      if ('info' in metadata && metadata.info && typeof metadata.info === 'object') {
        pageCount = (metadata.info as any).numPages || 0
      }
      // Fallback: count pages another way if available
      if (pageCount === 0 && 'metadata' in metadata && metadata.metadata) {
        pageCount = (metadata.metadata as any).numPages || 0
      }
    }

    return {
      text: extractedText,
      pageCount,
      error: !extractedText ? 'No text could be extracted from PDF' : undefined
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during PDF extraction'
    console.error('[PDF] Extraction failed:', errorMessage)

    return {
      text: '',
      pageCount: 0,
      error: `Failed to extract PDF: ${errorMessage}`
    }
  }
}
