import { ref } from 'vue'
import { IMAGE_CONFIG, type UploadedImage } from '~/types/image'

export const useImageUpload = () => {
  const images = ref<UploadedImage[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const validateImage = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${IMAGE_CONFIG.ALLOWED_TYPES.join(', ')}`
      }
    }

    // Check file size
    if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds ${IMAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit`
      }
    }

    return { valid: true }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] || ''
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          resolve({ width: img.width, height: img.height })
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const addImage = async (file: File) => {
    error.value = null
    isLoading.value = true

    try {
      // Validate
      const validation = validateImage(file)
      if (!validation.valid) {
        error.value = validation.error || 'Invalid image'
        return false
      }

      // Convert to base64
      const base64 = await fileToBase64(file)

      // Get dimensions
      const { width, height } = await getImageDimensions(file)

      // Create image object
      const image: UploadedImage = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type as any,
        base64,
        timestamp: Date.now(),
        width,
        height
      }

      images.value.push(image)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to upload image'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const removeImage = (id: string) => {
    images.value = images.value.filter(img => img.id !== id)
  }

  const clearImages = () => {
    images.value = []
    error.value = null
  }

  const handleFileInput = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = input.files

    if (!files) return

    for (let i = 0; i < files.length; i++) {
      await addImage(files[i])
    }

    // Reset input
    input.value = ''
  }

  const handlePaste = async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items

    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          await addImage(file)
        }
      }
    }
  }

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  }

  return {
    images,
    isLoading,
    error,
    addImage,
    removeImage,
    clearImages,
    handleFileInput,
    handlePaste,
    isMobile,
    validateImage
  }
}
