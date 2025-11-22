import * as mammoth from 'mammoth'

export interface WordExtractionResult {
  text: string
  error?: string
}

/**
 * Extract text from a DOCX file using mammoth library
 * Handles extraction asynchronously and returns formatted result with comprehensive error logging
 * @param file - The DOCX File object to extract from
 * @returns WordExtractionResult with text and optional error
 */
export async function extractDocxText(file: File): Promise<WordExtractionResult> {
  // Log immediately to verify function is being called
  console.log('[DOCX] extractDocxText called with file:', file.name)

  try {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.docx')) {
      console.warn('[DOCX] Invalid file type:', file.type, 'Expected .docx')
      return {
        text: '',
        error: 'Only .docx files are supported. Legacy .doc format is not supported.'
      }
    }

    // Validate file size (5MB limit)
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > 5) {
      console.warn('[DOCX] File too large:', fileSizeMB.toFixed(2), 'MB')
      return {
        text: '',
        error: `File size exceeds 5MB limit (current: ${fileSizeMB.toFixed(2)}MB)`
      }
    }

    console.log('[DOCX] File validation passed, size:', file.size, 'bytes')

    // Convert File to ArrayBuffer
    console.log('[DOCX] Converting file to ArrayBuffer...')
    const arrayBuffer = await file.arrayBuffer()
    console.log('[DOCX] ArrayBuffer created, size:', arrayBuffer.byteLength, 'bytes')

    // Extract text using mammoth
    console.log('[DOCX] Extracting text from DOCX...')
    const result = await mammoth.extractRawText({ arrayBuffer })
    console.log('[DOCX] Extraction complete, text length:', result.value.length, 'chars')

    // Log any warnings from mammoth
    if (result.messages && result.messages.length > 0) {
      console.warn('[DOCX] Mammoth warnings:', result.messages)
    }

    const extractedText = result.value.trim()

    if (!extractedText) {
      console.warn('[DOCX] No text content extracted from DOCX')
      return {
        text: '',
        error: 'No text could be extracted from DOCX file'
      }
    }

    return {
      text: extractedText,
      error: undefined
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during DOCX extraction'
    const errorStack = error instanceof Error ? error.stack : ''

    console.error('[DOCX] Extraction failed:', errorMessage)
    console.error('[DOCX] Error stack:', errorStack)

    return {
      text: '',
      error: `Failed to extract DOCX: ${errorMessage}`
    }
  }
}
