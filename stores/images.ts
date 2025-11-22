import { defineStore } from 'pinia'
import { apiClient } from '~/utils/api-client'
import { useAuthStore } from './auth'
import { useSettingsStore } from './settings'

export interface GeneratedImage {
  id: string
  prompt: string
  model: string
  url: string
  timestamp: Date
  size: string
  seed?: number
  revised_prompt?: string
}

export interface ImageModel {
  id: string
  name: string
  description: string
  maxPromptLength: number
  sizes: string[]
  provider: string
}

// Available IONOS image models
export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'black-forest-labs/FLUX.1-schnell',
    name: 'FLUX.1 Schnell',
    description: 'Fastest image generation, good quality',
    maxPromptLength: 1000,
    sizes: ['1024x1024'],
    provider: 'Black Forest Labs'
  },
  {
    id: 'stabilityai/stable-diffusion-xl-base-1.0',
    name: 'Stable Diffusion XL',
    description: 'High quality, versatile',
    maxPromptLength: 1000,
    sizes: ['1024x1024'],
    provider: 'Stability AI'
  }
]

interface ImagesState {
  history: GeneratedImage[]
  currentModel: string
  currentSize: string
  isGenerating: boolean
  currentPrompt: string
  error: string | null
  galleryView: 'grid' | 'list'
  maxHistory: number
}

interface ImagesGetters {
  currentModelInfo: (state: ImagesState) => ImageModel | undefined
  availableSizes: (state: ImagesState) => string[]
  sortedHistory: (state: ImagesState) => GeneratedImage[]
}

interface ImagesActions {
  setModel(modelId: string): void
  setSize(size: string): void
  setPrompt(prompt: string): void
  generateImage(prompt: string): Promise<void>
  deleteImage(imageId: string): void
  clearHistory(): void
  setGalleryView(view: 'grid' | 'list'): void
  stopGenerating(): void
}

export const useImagesStore = defineStore('images', {
  state: (): ImagesState => ({
    history: [],
    currentModel: 'black-forest-labs/FLUX.1-schnell',
    currentSize: '1024x1024',
    isGenerating: false,
    currentPrompt: '',
    error: null,
    galleryView: 'grid',
    maxHistory: 20
  }),

  getters: {
    currentModelInfo: (state): ImageModel | undefined => {
      return IMAGE_MODELS.find(m => m.id === state.currentModel)
    },
    
    availableSizes: (state): string[] => {
      const model = IMAGE_MODELS.find(m => m.id === state.currentModel)
      return model?.sizes || ['1024x1024']
    },
    
    sortedHistory: (state): GeneratedImage[] => {
      return [...state.history].sort((a, b) => {
        const aTime = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp)
        const bTime = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp)
        return bTime.getTime() - aTime.getTime()
      })
    },
    
    todayImages: (state): GeneratedImage[] => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return state.history.filter(img => new Date(img.timestamp) >= today)
    }
  },

  actions: {
    async generateImage(prompt: string) {
      if (!prompt.trim() || this.isGenerating) return
      
      this.isGenerating = true
      this.error = null
      this.currentPrompt = prompt
      
      try {
        const { $supabase } = useNuxtApp()
        const response = await fetch(
          `${$supabase.functions.url}/proxy-images`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${$supabase.supabaseKey}`,
              'apikey': $supabase.supabaseKey
            },
            body: JSON.stringify({
              model: this.currentModel,
              prompt,
              size: this.currentSize,
              n: 1
            })
          }
        )
        
        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Failed to generate image: ${error}`)
        }
        
        const data = await response.json()

        // Extract image from response - IONOS returns base64-encoded images
        const imageData = data.data?.[0]
        if (!imageData) {
          throw new Error('No image data in response')
        }

        // Convert base64 to data URL (persists across sessions, unlike blob URLs)
        let imageUrl: string
        if (imageData.b64_json) {
          // Use data URL instead of blob URL for persistence across page reloads
          const base64Data = imageData.b64_json
          imageUrl = `data:image/png;base64,${base64Data}`
        } else if (imageData.url) {
          // Fallback to URL if provided
          imageUrl = imageData.url
        } else {
          throw new Error('No image data (b64_json or url) in response')
        }

        // Create image record
        const generatedImage: GeneratedImage = {
          id: crypto.randomUUID(),
          prompt,
          model: this.currentModel,
          url: imageUrl,
          timestamp: new Date(),
          size: this.currentSize,
          revised_prompt: imageData.revised_prompt
        }
        
        // Add to history
        this.addToHistory(generatedImage)
        
        // Play success sound
        const settingsStore = useSettingsStore()
        settingsStore.playSound('success')
        
        return generatedImage
        
      } catch (error: any) {
        console.error('Image generation error:', error)
        this.error = error.message
        
        const settingsStore = useSettingsStore()
        settingsStore.playSound('error')
        
        throw error
      } finally {
        this.isGenerating = false
      }
    },
    
    addToHistory(image: GeneratedImage) {
      this.history.unshift(image)
      
      // Limit history size
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(0, this.maxHistory)
      }
    },
    
    removeFromHistory(id: string) {
      const index = this.history.findIndex(img => img.id === id)
      if (index !== -1) {
        this.history.splice(index, 1)
      }
    },
    
    clearHistory() {
      this.history = []
    },
    
    setModel(modelId: string) {
      this.currentModel = modelId
      
      // Update size if current size is not available for new model
      const model = IMAGE_MODELS.find(m => m.id === modelId)
      if (model && !model.sizes.includes(this.currentSize)) {
        this.currentSize = model.sizes[0]
      }
    },
    
    setSize(size: string) {
      this.currentSize = size
    },
    
    setGalleryView(view: 'grid' | 'list') {
      this.galleryView = view
    },
    
    async downloadImage(image: GeneratedImage) {
      try {
        // Fetch image as blob
        const response = await fetch(image.url)
        const blob = await response.blob()
        
        // Create download link
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `hikeathon-image-${image.id.substring(0, 8)}.png`
        a.click()
        
        URL.revokeObjectURL(url)
        
        const settingsStore = useSettingsStore()
        settingsStore.playSound('success')
        
      } catch (error) {
        console.error('Failed to download image:', error)
        this.error = 'Failed to download image'
      }
    },
    
    copyPrompt(prompt: string) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(prompt)
        const settingsStore = useSettingsStore()
        settingsStore.playSound('success')
      }
    }
  },

  persist: {
    paths: ['history', 'currentModel', 'currentSize', 'galleryView', 'maxHistory'],
    hydrate: (state: any) => {
      // Normalize timestamps when restoring from storage
      // Persisted timestamps are strings, need to convert back to Date objects
      if (state.history && Array.isArray(state.history)) {
        state.history = state.history.map((img: any) => ({
          ...img,
          timestamp: img.timestamp instanceof Date ? img.timestamp : new Date(img.timestamp)
        }))
      }
    }
  }
})