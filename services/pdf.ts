import * as pdfjsLib from 'pdfjs-dist'

// Configure the worker path
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

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
  
  /**
   * Sets a callback for progress updates
   */
  onProgress(callback: (progress: PDFProcessingProgress) => void) {
    this.progressCallback = callback
  }
  
  /**
   * Processes a PDF file and extracts text
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
      // Update progress
      this.updateProgress(0, 0, 'loading')
      
      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + pdfjsLib.version + '/standard_fonts/'
      })
      
      const pdf = await loadingTask.promise
      const pageCount = pdf.numPages
      
      // Extract metadata
      const metadata = await this.extractMetadata(pdf)
      
      // Extract text from all pages
      let fullText = ''
      
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        this.updateProgress(pageNum, pageCount, 'processing')
        
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        // Combine text items into a single string
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        
        fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`
        
        // Clean up page resources
        page.cleanup()
      }
      
      // Clean up document resources
      pdf.cleanup()
      
      this.updateProgress(pageCount, pageCount, 'complete')
      
      return {
        text: fullText.trim(),
        pageCount,
        metadata
      }
    } catch (error) {
      this.updateProgress(0, 0, 'error')
      console.error('Error processing PDF:', error)
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Processes a PDF from a URL
   */
  async processPDFFromURL(url: string): Promise<PDFProcessingResult> {
    try {
      this.updateProgress(0, 0, 'loading')
      
      // Load the PDF document from URL
      const loadingTask = pdfjsLib.getDocument(url)
      const pdf = await loadingTask.promise
      const pageCount = pdf.numPages
      
      // Extract metadata
      const metadata = await this.extractMetadata(pdf)
      
      // Extract text from all pages
      let fullText = ''
      
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        this.updateProgress(pageNum, pageCount, 'processing')
        
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        
        fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`
        
        page.cleanup()
      }
      
      pdf.cleanup()
      
      this.updateProgress(pageCount, pageCount, 'complete')
      
      return {
        text: fullText.trim(),
        pageCount,
        metadata
      }
    } catch (error) {
      this.updateProgress(0, 0, 'error')
      console.error('Error processing PDF from URL:', error)
      throw new Error(`Failed to process PDF from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Extracts metadata from a PDF document
   */
  private async extractMetadata(pdf: any): Promise<PDFProcessingResult['metadata']> {
    try {
      const metadata = await pdf.getMetadata()
      
      if (!metadata || !metadata.info) {
        return undefined
      }
      
      const info = metadata.info
      
      return {
        title: info.Title || undefined,
        author: info.Author || undefined,
        subject: info.Subject || undefined,
        keywords: info.Keywords || undefined,
        creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
        modificationDate: info.ModDate ? new Date(info.ModDate) : undefined
      }
    } catch (error) {
      console.warn('Could not extract PDF metadata:', error)
      return undefined
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
        // Split large pages into smaller chunks
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
}