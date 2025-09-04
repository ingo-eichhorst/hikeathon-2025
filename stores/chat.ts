import { defineStore } from 'pinia'
import { apiClient } from '~/utils/api-client'

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
  type: 'image' | 'pdf' | 'text'
  size: number
  content?: string
  url?: string
}

export interface ChatModel {
  id: string
  name: string
  description: string
  contextLength: number
  provider: string
}

// Available IONOS chat models
export const CHAT_MODELS: ChatModel[] = [
  { id: 'gpt-oss-120b', name: 'GPT OSS 120B', description: 'Most capable open-source model', contextLength: 32768, provider: 'IONOS' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', description: 'Latest Llama model', contextLength: 16384, provider: 'Meta' },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', description: 'Previous Llama generation', contextLength: 8192, provider: 'Meta' },
  { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B', description: 'Alibaba multilingual model', contextLength: 32768, provider: 'Alibaba' },
  { id: 'mistral-nemo-12b', name: 'Mistral Nemo 12B', description: 'Fast and efficient', contextLength: 8192, provider: 'Mistral' },
  { id: 'codestral-22b', name: 'Codestral 22B', description: 'Optimized for coding', contextLength: 16384, provider: 'Mistral' },
  { id: 'gemma-2-27b', name: 'Gemma 2 27B', description: 'Google\'s efficient model', contextLength: 8192, provider: 'Google' },
  { id: 'phi-3.5-mini', name: 'Phi 3.5 Mini', description: 'Smallest, fastest model', contextLength: 4096, provider: 'Microsoft' }
]

interface ChatState {
  messages: Message[]
  currentModel: string
  systemPrompt: string
  isGenerating: boolean
  currentStreamingMessage: Message | null
  totalTokens: number
  contextTokens: number
  temperature: number
  maxTokens: number
  topP: number
  abortController: AbortController | null
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    messages: [],
    currentModel: 'gpt-oss-120b',
    systemPrompt: 'You are a helpful AI assistant supporting teams at HIKEathon 2025. Be concise, accurate, and friendly.',
    isGenerating: false,
    currentStreamingMessage: null,
    totalTokens: 0,
    contextTokens: 0,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    abortController: null
  }),

  getters: {
    currentModelInfo: (state): ChatModel | undefined => {
      return CHAT_MODELS.find(m => m.id === state.currentModel)
    },
    
    contextUsagePercent: (state): number => {
      const model = CHAT_MODELS.find(m => m.id === state.currentModel)
      if (!model) return 0
      return Math.min(100, (state.contextTokens / model.contextLength) * 100)
    },
    
    conversationHistory: (state): Message[] => {
      return state.messages.filter(m => m.role !== 'system')
    }
  },

  actions: {
    async sendMessage(content: string, attachments?: Attachment[]) {
      if (this.isGenerating) return
      
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
        attachments
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
      
      this.messages.push(assistantMessage)
      this.currentStreamingMessage = assistantMessage
      
      try {
        // Prepare messages for API
        const apiMessages = [
          { role: 'system', content: this.systemPrompt },
          ...this.messages.slice(-20).map(m => ({
            role: m.role,
            content: m.content
          }))
        ]
        
        // Create abort controller
        this.abortController = new AbortController()
        
        // Call streaming API
        const { $supabase } = useNuxtApp()
        const response = await fetch(
          `${$supabase.functions.url}/proxy-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await useAuthStore().getToken()}`
            },
            body: JSON.stringify({
              model: this.currentModel,
              messages: apiMessages,
              temperature: this.temperature,
              max_tokens: this.maxTokens,
              top_p: this.topP,
              stream: true
            }),
            signal: this.abortController.signal
          }
        )
        
        if (!response.ok) {
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                assistantMessage.isStreaming = false
                this.currentStreamingMessage = null
                break
              }
              
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  assistantMessage.content += content
                }
              } catch (e) {
                console.error('Failed to parse SSE:', e)
              }
            }
          }
        }
        
        // Update token counts
        assistantMessage.tokens = this.estimateTokens(assistantMessage.content)
        this.updateTokenCounts()
        
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Chat error:', error)
          assistantMessage.error = error.message
          assistantMessage.content = 'Sorry, an error occurred while generating the response.'
        }
        assistantMessage.isStreaming = false
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
    }
  },

  persist: {
    paths: ['messages', 'currentModel', 'systemPrompt', 'temperature', 'maxTokens', 'topP']
  }
})