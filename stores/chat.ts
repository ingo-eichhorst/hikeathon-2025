import { defineStore } from 'pinia'
import { apiClient } from '~/utils/api-client'
import { useAuthStore } from './auth'
import { useChatHistoryStore } from './chatHistory'
import { useSettingsStore } from './settings'
import { fetchMultipleURLs } from '~/composables/useURLFetching'
import { extractURLs } from '~/utils/urlExtractor'
import type { UploadedImage } from '~/types/image'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
  attachments?: Attachment[]
  isStreaming?: boolean
  error?: string
}

export interface Attachment {
  id: string
  name: string
  type: 'image' | 'text' | 'url'
  size: number
  content?: string
  url?: string
  processedData?: any
}

export interface URLAttachment {
  id: string
  url: string
  fetchedAt: Date
  contentType: string
  content: string
  summary?: string
  error?: string
  isLoading: boolean
}

export interface ChatModel {
  id: string
  name: string
  description: string
  contextLength: number
  provider: string
}

// Model descriptions and metadata
const MODEL_METADATA: Record<string, Partial<ChatModel>> = {
  'openai/gpt-oss-120b': { name: 'GPT OSS 120B', description: 'Most capable open-source model', contextLength: 32768, provider: 'OpenAI' },
  'meta-llama/Llama-3.3-70B-Instruct': { name: 'Llama 3.3 70B', description: 'Latest Llama model', contextLength: 128000, provider: 'Meta' },
  'meta-llama/Meta-Llama-3.1-405B-Instruct-FP8': { name: 'Llama 3.1 405B', description: 'Largest Llama model', contextLength: 128000, provider: 'Meta' },
  'meta-llama/Meta-Llama-3.1-8B-Instruct': { name: 'Llama 3.1 8B', description: 'Efficient Llama model', contextLength: 128000, provider: 'Meta' },
  'meta-llama/CodeLlama-13b-Instruct-hf': { name: 'CodeLlama 13B', description: 'Optimized for coding', contextLength: 16384, provider: 'Meta' },
  'mistralai/Mistral-Small-24B-Instruct': { name: 'Mistral Small 24B', description: 'Compact Mistral model', contextLength: 32768, provider: 'Mistral' },
  'mistralai/Mistral-Nemo-Instruct-2407': { name: 'Mistral Nemo', description: 'Fast and efficient', contextLength: 128000, provider: 'Mistral' },
  'mistralai/Mixtral-8x7B-Instruct-v0.1': { name: 'Mixtral 8x7B', description: 'MoE architecture', contextLength: 32768, provider: 'Mistral' },
  'openGPT-X/Teuken-7B-instruct-commercial': { name: 'Teuken 7B', description: 'Commercial model', contextLength: 8192, provider: 'OpenGPT-X' }
}

interface ChatState {
  messages: Message[]
  currentModel: string
  systemPrompt: string
  currentGPTKey: string
  isGenerating: boolean
  currentStreamingMessage: Message | null
  totalTokens: number
  contextTokens: number
  temperature: number
  maxTokens: number
  topP: number
  abortController: AbortController | null
  availableModels: ChatModel[]
  currentSessionId: string | null
}

interface ChatGetters {
  currentModelInfo: (state: ChatState) => ChatModel | undefined
  contextUsagePercent: (state: ChatState) => number
  conversationHistory: (state: ChatState) => Message[]
}

interface ChatActions {
  sendMessage(content: string, images?: UploadedImage[], urlAttachments?: URLAttachment[], fileAttachments?: Attachment[]): Promise<void>
  stopGenerating(): void
  clearMessages(): void
  setModel(modelId: string): void
  setSystemPrompt(prompt: string): void
  addMessage(message: Message): void
  updateStreamingMessage(content: string): void
  finalizeStreamingMessage(tokens?: number): void
  editMessage(messageId: string, content: string): Promise<void>
  resendMessage(messageId: string): Promise<void>
  deleteMessage(messageId: string): void
  setTemperature(temperature: number): void
  setMaxTokens(maxTokens: number): void
  setTopP(topP: number): void
  setCurrentSessionId(sessionId: string | null): void
  setCurrentGPTKey(key: string): void
  initializeSystemPrompt(): void
  saveCurrentSession(): void
  loadSession(sessionId: string): void
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    messages: [],
    currentModel: 'openai/gpt-oss-120b',
    systemPrompt: 'You are a helpful AI assistant supporting teams at HIKEathon 2025. Be concise, accurate, and friendly.',
    currentGPTKey: 'hikeathon-coach',
    isGenerating: false,
    currentStreamingMessage: null,
    totalTokens: 0,
    contextTokens: 0,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    abortController: null,
    availableModels: [
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: 'Most capable open-source model', contextLength: 32768, provider: 'OpenAI' },
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', description: 'Latest Llama model', contextLength: 128000, provider: 'Meta' }
    ],
    currentSessionId: null
  }),

  getters: {
    currentModelInfo: (state): ChatModel | undefined => {
      return state.availableModels.find(m => m.id === state.currentModel)
    },
    
    contextUsagePercent: (state): number => {
      const model = state.availableModels.find(m => m.id === state.currentModel)
      if (!model) return 0
      return Math.min(100, (state.contextTokens / model.contextLength) * 100)
    },
    
    conversationHistory: (state): Message[] => {
      return state.messages.filter(m => m.role !== 'system')
    }
  },

  actions: {
    async fetchURLAttachments(urls: string[]): Promise<URLAttachment[]> {
      if (urls.length === 0) return []

      try {
        const attachments = await fetchMultipleURLs(urls)
        return attachments
      } catch (error: any) {
        console.error('Error fetching URLs:', error)
        throw error
      }
    },

    async sendMessage(content: string, images?: UploadedImage[], urlAttachments?: URLAttachment[], fileAttachments?: Attachment[]) {
      if (this.isGenerating) return

      // Sync system prompt from settings store to ensure the selected persona is used
      const settingsStore = useSettingsStore()
      const currentGPT = settingsStore.currentGPT
      if (currentGPT && currentGPT.systemPrompt) {
        this.systemPrompt = currentGPT.systemPrompt
      }

      // Convert UploadedImage[] to Attachment[]
      const imageAttachments: Attachment[] | undefined = images?.map(img => ({
        id: img.id,
        name: img.name,
        type: 'image' as const,
        size: img.size,
        content: `data:${img.type};base64,${img.base64}`
      }))

      // Convert URLAttachment[] to Attachment[]
      const urlAttachmentsConverted: Attachment[] | undefined = urlAttachments?.map(url => ({
        id: url.id,
        name: new URL(url.url).hostname || url.url,
        type: 'url' as const,
        size: url.content.length,
        content: url.content,
        url: url.url,
        processedData: {
          contentType: url.contentType,
          fetchedAt: url.fetchedAt,
          summary: url.summary,
          error: url.error
        }
      }))

      // Combine all attachments
      const attachments = [
        ...(imageAttachments || []),
        ...(urlAttachmentsConverted || []),
        ...(fileAttachments || [])
      ].filter(a => a) as Attachment[]

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
        attachments: attachments.length > 0 ? attachments : undefined
      }

      this.messages.push(userMessage)
      this.isGenerating = true
      
      // Create assistant message for streaming
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: this.currentModel,
        isStreaming: true
      }
      
      console.log('Created assistant message:', assistantMessage.id, 'Content:', assistantMessage.content)
      this.messages.push(assistantMessage)
      this.currentStreamingMessage = assistantMessage
      console.log('Messages array now has:', this.messages.length, 'messages')
      
      try {
        // Prepare messages for API (exclude the empty assistant message we just created)
        const apiMessages = [
          { role: 'system', content: this.systemPrompt },
          ...this.messages.slice(-21, -1).map(m => {
            const msg: any = {
              role: m.role
            }

            // Handle multimodal messages with images, URLs, and text files
            if (m.attachments && m.attachments.length > 0) {
              const images = m.attachments.filter(a => a.type === 'image')
              const urls = m.attachments.filter(a => a.type === 'url')
              const textFiles = m.attachments.filter(a => a.type === 'text')

              // Build combined content from URLs and text files
              const urlContent = urls
                .map(url => `[Web Content from ${url.name}]:\n${url.content}`)
                .join('\n\n')

              const textFileContent = textFiles
                .map(file => `[File Content from ${file.name}]:\n${file.content}`)
                .join('\n\n')

              const combinedContent = [urlContent, textFileContent].filter(c => c).join('\n\n')

              if (images.length > 0) {
                // For multimodal requests with images, content must be an array
                const textContent = m.content || ''
                const fullText = combinedContent
                  ? `${textContent}\n\n${combinedContent}`
                  : textContent

                msg.content = [
                  {
                    type: 'text',
                    text: fullText
                  },
                  ...images.map(img => ({
                    type: 'image_url',
                    image_url: {
                      url: img.content, // Already in data:image/...;base64,... format
                      detail: 'auto'
                    }
                  }))
                ]
              } else if (urls.length > 0 || textFiles.length > 0) {
                // Text-only message with URL and/or text file content
                const fullText = combinedContent
                  ? `${m.content}\n\n${combinedContent}`
                  : m.content
                msg.content = fullText
              } else {
                // Text-only message
                msg.content = m.content
              }
            } else {
              // Text-only message
              msg.content = m.content
            }

            return msg
          })
        ]
        
        // Create abort controller
        this.abortController = new AbortController()
        
        // Check if user is authenticated
        const authStore = useAuthStore()
        if (!authStore.isAuthenticated) {
          throw new Error('Not authenticated. Please login first.')
        }
        
        // Call streaming API through Supabase Functions
        const { $supabase } = useNuxtApp()
        
        // Just use the Supabase anon key - token is hardcoded in edge function
        const response = await fetch(
          `${$supabase.functions.url}/proxy-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${$supabase.supabaseKey}`, // Use Supabase anon key
              'apikey': $supabase.supabaseKey // Also send as apikey header
            },
            body: JSON.stringify({
              model: this.currentModel,
              messages: apiMessages,
              temperature: this.temperature,
              max_tokens: this.maxTokens,
              top_p: this.topP,
              stream: true
              // No token needed - hardcoded in edge function
            }),
            signal: this.abortController.signal
          }
        )
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API error response:', errorText)
          throw new Error(`API error: ${response.statusText}`)
        }
        
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')
        
        const decoder = new TextDecoder()
        let buffer = ''
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (line.trim() === '') continue // Skip empty lines
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                const msgIndex = this.messages.findIndex(m => m.id === assistantMessage.id)
                if (msgIndex !== -1) {
                  console.log('Stream completed, final content:', this.messages[msgIndex].content)
                  this.messages[msgIndex].isStreaming = false
                }
                this.currentStreamingMessage = null
                break
              }
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  // Find the message in the array and update it directly for reactivity
                  const msgIndex = this.messages.findIndex(m => m.id === assistantMessage.id)
                  if (msgIndex !== -1) {
                    this.messages[msgIndex].content += content
                    console.log('Added content chunk:', content, 'Total length:', this.messages[msgIndex].content.length)
                  }
                }
              } catch (e) {
                console.warn('Failed to parse SSE line:', line, e)
              }
            }
          }
        }
        
        // Update token counts
        const msgIndex = this.messages.findIndex(m => m.id === assistantMessage.id)
        if (msgIndex !== -1) {
          this.messages[msgIndex].tokens = this.estimateTokens(this.messages[msgIndex].content)
        }
        this.updateTokenCounts()
        
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Chat error:', error)
          const msgIndex = this.messages.findIndex(m => m.id === assistantMessage.id)
          if (msgIndex !== -1) {
            this.messages[msgIndex].error = error.message
            this.messages[msgIndex].content = 'Sorry, an error occurred while generating the response.'
            this.messages[msgIndex].isStreaming = false
          }
        }
        this.currentStreamingMessage = null
      } finally {
        this.isGenerating = false
        this.abortController = null
      }
    },
    
    stopGeneration() {
      if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
      }
      if (this.currentStreamingMessage) {
        this.currentStreamingMessage.isStreaming = false
        this.currentStreamingMessage = null
      }
      this.isGenerating = false
    },
    
    clearMessages() {
      this.messages = []
      this.totalTokens = 0
      this.contextTokens = 0
    },
    
    deleteMessage(id: string) {
      const index = this.messages.findIndex(m => m.id === id)
      if (index !== -1) {
        this.messages.splice(index, 1)
        this.updateTokenCounts()
      }
    },
    
    editMessage(id: string, newContent: string) {
      const message = this.messages.find(m => m.id === id)
      if (message) {
        message.content = newContent
        this.updateTokenCounts()
      }
    },
    
    setModel(modelId: string) {
      this.currentModel = modelId
    },
    
    setSystemPrompt(prompt: string) {
      this.systemPrompt = prompt
    },
    
    setTemperature(temp: number) {
      this.temperature = Math.max(0, Math.min(2, temp))
    },
    
    setMaxTokens(tokens: number) {
      this.maxTokens = Math.max(1, Math.min(4096, tokens))
    },
    
    estimateTokens(text: string): number {
      // Rough estimation: ~4 characters per token
      if (!text) return 0
      return Math.ceil(text.length / 4)
    },
    
    updateTokenCounts() {
      let total = 0
      let context = this.estimateTokens(this.systemPrompt)

      for (const msg of this.messages) {
        const tokens = msg.tokens || this.estimateTokens(msg.content)
        total += tokens
        if (this.messages.indexOf(msg) >= this.messages.length - 20) {
          context += tokens
        }
      }

      this.totalTokens = total
      this.contextTokens = context
    },

    setCurrentSessionId(sessionId: string | null) {
      this.currentSessionId = sessionId
    },

    setCurrentGPTKey(key: string) {
      this.currentGPTKey = key
    },

    // Initialize system prompt from persisted GPT key (called on app startup)
    initializeSystemPrompt() {
      const settingsStore = useSettingsStore()
      const gpt = settingsStore.allGPTs[this.currentGPTKey]
      if (gpt && gpt.systemPrompt) {
        this.systemPrompt = gpt.systemPrompt
      }
    },

    saveCurrentSession() {
      if (!this.currentSessionId) return

      const historyStore = useChatHistoryStore()

      historyStore.updateSessionMessages(this.messages)
      historyStore.updateSessionSettings(
        this.currentModel,
        this.temperature,
        this.maxTokens,
        this.topP
      )
    },

    async loadSession(sessionId: string) {
      const historyStore = useChatHistoryStore()

      const session = historyStore.sessions.find(s => s.id === sessionId)
      if (!session) return

      // Update both chat store and history store to track current session
      this.currentSessionId = sessionId
      historyStore.currentSessionId = sessionId

      this.messages = [...session.messages]
      this.currentModel = session.model
      this.temperature = session.temperature
      this.maxTokens = session.maxTokens
      this.topP = session.topP

      const settingsStore = useSettingsStore()
      await settingsStore.selectSystemPrompt(session.selectedGPT)

      // Also update currentGPTKey in chat store to match
      this.currentGPTKey = session.selectedGPT

      this.updateTokenCounts()
    }
  },

  persist: {
    paths: ['currentModel', 'currentGPTKey', 'temperature', 'maxTokens', 'topP', 'currentSessionId']
  }
})