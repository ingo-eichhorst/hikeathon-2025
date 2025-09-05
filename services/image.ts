export interface ImageProcessingResult {
  base64: string
  mimeType: string
  width: number
  height: number
  size: number
  originalSize: number
  compressionRatio: number
}

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  removeExif?: boolean
}

export class ImageProcessor {
  private maxFileSize = 10 * 1024 * 1024 // 10MB input limit
  private targetFileSize = 1024 * 1024 // 1MB target size for API
  
  /**
   * Processes an image file with compression and EXIF removal
   */
  async processImage(
    file: File,
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult> {
    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds ${this.maxFileSize / (1024 * 1024)}MB limit`)
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please provide an image file.')
    }
    
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format,
      removeExif = true
    } = options
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        
        img.onload = () => {
          try {
            // Calculate dimensions
            let { width, height } = this.calculateDimensions(
              img.width,
              img.height,
              maxWidth,
              maxHeight
            )
            
            // Create canvas
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              throw new Error('Failed to get canvas context')
            }
            
            // Fill background (for transparent images)
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, width, height)
            
            // Draw image (this removes EXIF data)
            ctx.drawImage(img, 0, 0, width, height)
            
            // Determine output format
            const outputFormat = format || this.getFormatFromMimeType(file.type)
            const mimeType = `image/${outputFormat}`
            
            // Convert to base64 with compression
            let currentQuality = quality
            let base64 = ''
            let size = Infinity
            
            // Iteratively reduce quality if needed to meet size target
            while (size > this.targetFileSize && currentQuality > 0.1) {
              base64 = canvas.toDataURL(mimeType, currentQuality)
              size = this.getBase64Size(base64)
              
              if (size > this.targetFileSize) {
                currentQuality -= 0.1
              }
            }
            
            // If still too large, reduce dimensions
            if (size > this.targetFileSize) {
              const scaleFactor = Math.sqrt(this.targetFileSize / size)
              width = Math.floor(width * scaleFactor)
              height = Math.floor(height * scaleFactor)
              
              canvas.width = width
              canvas.height = height
              ctx.fillStyle = '#FFFFFF'
              ctx.fillRect(0, 0, width, height)
              ctx.drawImage(img, 0, 0, width, height)
              
              base64 = canvas.toDataURL(mimeType, quality)
              size = this.getBase64Size(base64)
            }
            
            resolve({
              base64,
              mimeType,
              width,
              height,
              size,
              originalSize: file.size,
              compressionRatio: file.size / size
            })
          } catch (error) {
            reject(error)
          }
        }
        
        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }
        
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(file)
    })
  }
  
  /**
   * Processes multiple images in batch
   */
  async processImages(
    files: File[],
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult[]> {
    const results: ImageProcessingResult[] = []
    
    for (const file of files) {
      try {
        const result = await this.processImage(file, options)
        results.push(result)
      } catch (error) {
        console.error(`Error processing image ${file.name}:`, error)
        // Continue processing other images
      }
    }
    
    return results
  }
  
  /**
   * Generates a thumbnail preview
   */
  async generateThumbnail(
    file: File,
    maxSize: number = 200
  ): Promise<string> {
    const result = await this.processImage(file, {
      maxWidth: maxSize,
      maxHeight: maxSize,
      quality: 0.7,
      format: 'jpeg'
    })
    
    return result.base64
  }
  
  /**
   * Converts image to a specific format
   */
  async convertFormat(
    file: File,
    targetFormat: 'jpeg' | 'png' | 'webp'
  ): Promise<ImageProcessingResult> {
    return this.processImage(file, {
      format: targetFormat,
      removeExif: true
    })
  }
  
  /**
   * Validates if a file is a valid image
   */
  async validateImage(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(true)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(false)
      }
      
      img.src = url
    })
  }
  
  /**
   * Calculates optimal dimensions while maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth
    let height = originalHeight
    
    // Calculate scaling factor
    const widthRatio = maxWidth / originalWidth
    const heightRatio = maxHeight / originalHeight
    const scaleFactor = Math.min(widthRatio, heightRatio, 1)
    
    if (scaleFactor < 1) {
      width = Math.floor(originalWidth * scaleFactor)
      height = Math.floor(originalHeight * scaleFactor)
    }
    
    return { width, height }
  }
  
  /**
   * Gets the size of a base64 string in bytes
   */
  private getBase64Size(base64: string): number {
    const base64Length = base64.length - (base64.indexOf(',') + 1)
    const padding = (base64.charAt(base64.length - 2) === '=') ? 2 : 
                    (base64.charAt(base64.length - 1) === '=') ? 1 : 0
    return (base64Length * 0.75) - padding
  }
  
  /**
   * Determines output format from MIME type
   */
  private getFormatFromMimeType(mimeType: string): 'jpeg' | 'png' | 'webp' {
    if (mimeType.includes('png')) return 'png'
    if (mimeType.includes('webp')) return 'webp'
    return 'jpeg' // Default to JPEG for better compression
  }
  
  /**
   * Extracts image metadata
   */
  async getImageMetadata(file: File): Promise<{
    width: number
    height: number
    aspectRatio: string
    format: string
    size: number
    sizeFormatted: string
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        const width = img.width
        const height = img.height
        const gcd = this.calculateGCD(width, height)
        const aspectRatio = `${width / gcd}:${height / gcd}`
        
        URL.revokeObjectURL(url)
        
        resolve({
          width,
          height,
          aspectRatio,
          format: file.type.split('/')[1] || 'unknown',
          size: file.size,
          sizeFormatted: this.formatFileSize(file.size)
        })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image metadata'))
      }
      
      img.src = url
    })
  }
  
  /**
   * Calculates greatest common divisor (for aspect ratio)
   */
  private calculateGCD(a: number, b: number): number {
    return b === 0 ? a : this.calculateGCD(b, a % b)
  }
  
  /**
   * Formats file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }
}