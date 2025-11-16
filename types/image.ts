/**
 * Image upload and vision types
 */

export interface UploadedImage {
  id: string
  name: string
  size: number
  type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
  base64: string
  timestamp: number
  width?: number
  height?: number
}

export interface ImagePreviewData {
  id: string
  src: string // Data URL
  name: string
  size: number
}

export interface VisionMessage {
  role: 'user' | 'assistant'
  content: string
  images?: UploadedImage[]
}

export const IMAGE_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  VISION_MODEL: 'mistral-small-24b', // Only model supporting images
}
