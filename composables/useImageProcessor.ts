import { ImageProcessor, type ImageProcessingResult, type ImageProcessingOptions } from '~/services/image'

export const useImageProcessor = () => {
  const processor = useState<ImageProcessor>('imageProcessor', () => new ImageProcessor())
  const isProcessing = useState<boolean>('imageProcessing', () => false)
  const processedImages = useState<ImageProcessingResult[]>('processedImages', () => [])
  const error = useState<string | null>('imageError', () => null)
  
  // Cache for processed images
  const imageCache = useState<Map<string, ImageProcessingResult>>('imageCache', () => new Map())
  
  /**
   * Processes a single image
   */
  const processImage = async (
    file: File,
    options?: ImageProcessingOptions
  ): Promise<ImageProcessingResult> => {
    isProcessing.value = true
    error.value = null
    
    try {
      // Check cache
      const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
      const cached = imageCache.value.get(cacheKey)
      if (cached) {
        console.log('Returning cached image processing result')
        return cached
      }
      
      // Process the image
      const result = await processor.value.processImage(file, options)
      
      // Cache the result
      imageCache.value.set(cacheKey, result)
      
      // Limit cache size
      if (imageCache.value.size > 20) {
        const firstKey = imageCache.value.keys().next().value
        imageCache.value.delete(firstKey)
      }
      
      // Add to processed images list
      processedImages.value.push(result)
      
      return result
    } catch (err) {
      console.error('Error processing image:', err)
      error.value = err instanceof Error ? err.message : 'Failed to process image'
      throw err
    } finally {
      isProcessing.value = false
    }
  }
  
  /**
   * Processes multiple images
   */
  const processImages = async (
    files: File[],
    options?: ImageProcessingOptions
  ): Promise<ImageProcessingResult[]> => {
    isProcessing.value = true
    error.value = null
    
    try {
      const results = await processor.value.processImages(files, options)
      processedImages.value.push(...results)
      
      // Cache results
      files.forEach((file, index) => {
        const result = results[index]
        if (result) {
          const cacheKey = `${file.name}-${file.size}-${file.lastModified}`
          imageCache.value.set(cacheKey, result)
        }
      })
      
      return results
    } catch (err) {
      console.error('Error processing images:', err)
      error.value = err instanceof Error ? err.message : 'Failed to process images'
      throw err
    } finally {
      isProcessing.value = false
    }
  }
  
  /**
   * Generates a thumbnail
   */
  const generateThumbnail = async (file: File, maxSize?: number): Promise<string> => {
    try {
      return await processor.value.generateThumbnail(file, maxSize)
    } catch (err) {
      console.error('Error generating thumbnail:', err)
      throw err
    }
  }
  
  /**
   * Converts image format
   */
  const convertFormat = async (
    file: File,
    targetFormat: 'jpeg' | 'png' | 'webp'
  ): Promise<ImageProcessingResult> => {
    isProcessing.value = true
    error.value = null
    
    try {
      const result = await processor.value.convertFormat(file, targetFormat)
      processedImages.value.push(result)
      return result
    } catch (err) {
      console.error('Error converting image format:', err)
      error.value = err instanceof Error ? err.message : 'Failed to convert image format'
      throw err
    } finally {
      isProcessing.value = false
    }
  }
  
  /**
   * Validates an image file
   */
  const validateImage = async (file: File): Promise<boolean> => {
    return processor.value.validateImage(file)
  }
  
  /**
   * Gets image metadata
   */
  const getImageMetadata = async (file: File) => {
    return processor.value.getImageMetadata(file)
  }
  
  /**
   * Clears processed images
   */
  const clearProcessedImages = () => {
    processedImages.value = []
    imageCache.value.clear()
  }
  
  /**
   * Removes a processed image
   */
  const removeProcessedImage = (index: number) => {
    if (index >= 0 && index < processedImages.value.length) {
      processedImages.value.splice(index, 1)
    }
  }
  
  /**
   * Gets the total size of processed images
   */
  const getTotalSize = computed(() => {
    return processedImages.value.reduce((total, img) => total + img.size, 0)
  })
  
  /**
   * Gets the total original size
   */
  const getTotalOriginalSize = computed(() => {
    return processedImages.value.reduce((total, img) => total + img.originalSize, 0)
  })
  
  /**
   * Gets the average compression ratio
   */
  const getAverageCompression = computed(() => {
    if (processedImages.value.length === 0) return 0
    const totalRatio = processedImages.value.reduce((sum, img) => sum + img.compressionRatio, 0)
    return totalRatio / processedImages.value.length
  })
  
  return {
    isProcessing: readonly(isProcessing),
    processedImages: readonly(processedImages),
    error: readonly(error),
    getTotalSize,
    getTotalOriginalSize,
    getAverageCompression,
    processImage,
    processImages,
    generateThumbnail,
    convertFormat,
    validateImage,
    getImageMetadata,
    clearProcessedImages,
    removeProcessedImage
  }
}