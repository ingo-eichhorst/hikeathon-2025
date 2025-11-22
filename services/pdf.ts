import { extractText, getMeta } from 'unpdf'

export interface PDFProcessingResult {
  text: string
  pageCount: number
  metadata?: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
    creationDate?: Date
    modificationDate?: Date
  }
}

export interface PDFProcessingProgress {
  currentPage: number
  totalPages: number
  percentage: number
  status: 'loading' | 'processing' | 'complete' | 'error'
}

export class PDFProcessor {
  private maxFileSize = 50 * 1024 * 1024 // 50MB
  private progressCallback?: (progress: PDFProcessingProgress) => void

  constructor() {
    console.log('[pdf.ts] PDFProcessor initialized with unpdf')
  }

  /**
   * Sets a callback for progress updates
   */
  onProgress(callback: (progress: PDFProcessingProgress) => void) {
    this.progressCallback = callback
  }

  /**
   * Processes a PDF file and extracts text using unpdf
   */
  async processPDF(file: File): Promise<PDFProcessingResult> {
    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`)
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      throw new Error('Invalid file type. Please provide a PDF file.')
    }

    try {
      this.updateProgress(0, 0, 'loading')
      console.log('[pdf.ts] Starting PDF processing with unpdf:', file.name)

      // Convert file to buffer (copy the data to avoid ArrayBuffer detachment)
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(new ArrayBuffer(arrayBuffer.byteLength))
      uint8Array.set(new Uint8Array(arrayBuffer))

      // Extract text using unpdf
      console.log('[pdf.ts] Extracting text...')
      const textResult = await extractText(uint8Array)

      // Get metadata
      console.log('[pdf.ts] Extracting metadata...')
      const metaResult = await getMeta(uint8Array)
      const metadata = this.formatMetadata(metaResult)

      // Calculate page count from metadata
      const pageCount = metaResult.pages || 1

      this.updateProgress(pageCount, pageCount, 'complete')
      console.log('[pdf.ts] ✓ PDF processing complete:', file.name, 'Pages:', pageCount)

      return {
        text: textResult || '',
        pageCount,
        metadata
      }
    } catch (error) {
      this.updateProgress(0, 0, 'error')
      console.error('[pdf.ts] Error processing PDF:', file.name, error)
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Format metadata from unpdf into our format
   */
  private formatMetadata(metaResult: any) {
    if (!metaResult) return undefined

    return {
      title: metaResult.title || undefined,
      author: metaResult.author || undefined,
      subject: metaResult.subject || undefined,
      keywords: metaResult.keywords || undefined,
      creationDate: metaResult.creationDate ? new Date(metaResult.creationDate) : undefined,
      modificationDate: metaResult.modificationDate ? new Date(metaResult.modificationDate) : undefined
    }
  }

  /**
   * Processes a PDF from a URL
   */
  async processPDFFromURL(url: string): Promise<PDFProcessingResult> {
    try {
      this.updateProgress(0, 0, 'loading')
      console.log('[pdf.ts] Fetching PDF from URL:', url)

      // Fetch the PDF
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      // Copy the data to avoid ArrayBuffer detachment
      const uint8Array = new Uint8Array(new ArrayBuffer(arrayBuffer.byteLength))
      uint8Array.set(new Uint8Array(arrayBuffer))

      // Extract text
      console.log('[pdf.ts] Extracting text from URL PDF...')
      const textResult = await extractText(uint8Array)

      // Get metadata
      console.log('[pdf.ts] Extracting metadata from URL PDF...')
      const metaResult = await getMeta(uint8Array)
      const metadata = this.formatMetadata(metaResult)

      const pageCount = metaResult.pages || 1

      this.updateProgress(pageCount, pageCount, 'complete')
      console.log('[pdf.ts] ✓ PDF from URL processed successfully:', url)

      return {
        text: textResult || '',
        pageCount,
        metadata
      }
    } catch (error) {
      this.updateProgress(0, 0, 'error')
      console.error('[pdf.ts] Error processing PDF from URL:', url, error)
      throw new Error(`Failed to process PDF from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Chunks PDF text for context windows
   */
  chunkText(text: string, maxChunkSize: number = 2000): string[] {
    const chunks: string[] = []
    const pages = text.split(/--- Page \d+ ---/)

    for (const page of pages) {
      if (!page.trim()) continue

      if (page.length <= maxChunkSize) {
        chunks.push(page.trim())
      } else {
        // Split large pages into smaller chunks by sentences
        const sentences = page.match(/[^.!?]+[.!?]+/g) || [page]
        let currentChunk = ''

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim())
            currentChunk = sentence
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence
          }
        }

        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
      }
    }

    return chunks
  }

  /**
   * Validates if a file is a valid PDF
   */
  async validatePDF(file: File): Promise<boolean> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Check PDF magic number (%PDF)
      return bytes[0] === 0x25 &&
             bytes[1] === 0x50 &&
             bytes[2] === 0x44 &&
             bytes[3] === 0x46
    } catch {
      return false
    }
  }

  /**
   * Updates the progress callback
   */
  private updateProgress(currentPage: number, totalPages: number, status: PDFProcessingProgress['status']) {
    if (this.progressCallback) {
      const percentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0

      this.progressCallback({
        currentPage,
        totalPages,
        percentage,
        status
      })
    }
  }
}
