import { defineStore } from 'pinia'
import { apiClient } from '~/utils/api-client'
import { useAuthStore } from './auth'

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
    id: 'flux-1-schnell', 
    name: 'FLUX.1 Schnell', 
    description: 'Fastest image generation, good quality',
    maxPromptLength: 1000,
    sizes: ['512x512', '768x768', '1024x1024'],
    provider: 'Black Forest Labs'
  },
  { 
    id: 'flux-1-dev', 
    name: 'FLUX.1 Dev', 
    description: 'Balanced speed and quality',
    maxPromptLength: 1000,
    sizes: ['512x512', '768x768', '1024x1024', '1024x576', '576x1024'],
    provider: 'Black Forest Labs'
  },
  { 
    id: 'stable-diffusion-xl', 
    name: 'Stable Diffusion XL', 
    description: 'High quality, versatile',
    maxPromptLength: 1000,
    sizes: ['512x512', '768x768', '1024x1024', '1024x576', '576x1024'],
    provider: 'Stability AI'
  },
  { 
    id: 'stable-diffusion-3', 
    name: 'Stable Diffusion 3', 
    description: 'Latest SD version, excellent quality',
    maxPromptLength: 1000,
    sizes: ['512x512', '768x768', '1024x1024', '1024x576', '576x1024'],
    provider: 'Stability AI'
  },
  { 
    id: 'dall-e-3', 
    name: 'DALL-E 3', 
    description: 'Advanced creativity and understanding',
    maxPromptLength: 4000,
    sizes: ['1024x1024', '1024x1792', '1792x1024'],
    provider: 'OpenAI'
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

export const useImagesStore = defineStore('images', {
  state: (): ImagesState => ({
    history: [],
    currentModel: 'flux-1-schnell',
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
      return [...state.history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
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
        const authStore = useAuthStore()
        const token = await authStore.getToken()
        
        if (!token) {
          throw new Error('Not authenticated')
        }
        
        const { $supabase } = useNuxtApp()
        const response = await fetch(
          `${$supabase.functions.url}/proxy-images`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              model: this.currentModel,
              prompt,
              size: this.currentSize,
              n: 1,
              quality: 'standard',
              response_format: 'url'
            })
          }
        )
        
        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Failed to generate image: ${error}`)
        }
        
        const data = await response.json()
        
        // Extract image URL from response
        const imageUrl = data.data?.[0]?.url || data.url
        if (!imageUrl) {
          throw new Error('No image URL in response')
        }
        
        // Create image record
        const generatedImage: GeneratedImage = {
          id: crypto.randomUUID(),
          prompt,
          model: this.currentModel,
          url: imageUrl,
          timestamp: new Date(),
          size: this.currentSize,
          revised_prompt: data.data?.[0]?.revised_prompt
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
    paths: ['history', 'currentModel', 'currentSize', 'galleryView', 'maxHistory']
  }
})