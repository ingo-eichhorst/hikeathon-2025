import { defineStore } from 'pinia'
import type { Message } from './chat'

export interface ChatSession {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  selectedGPT: string
  initialPrompt: string
  model: string
  temperature: number
  maxTokens: number
  topP: number
}

interface ChatHistoryState {
  sessions: ChatSession[]
  currentSessionId: string | null
}

export const useChatHistoryStore = defineStore('chatHistory', {
  state: (): ChatHistoryState => ({
    sessions: [],
    currentSessionId: null,
  }),

  getters: {
    currentSession: (state) => {
      if (!state.currentSessionId) return null
      return state.sessions.find(s => s.id === state.currentSessionId) || null
    },

    allSessions: (state) => state.sessions,

    sessionCount: (state) => state.sessions.length,
  },

  actions: {
    /**
     * Create a new chat session
     */
    createSession(initialPrompt: string, selectedGPT: string, model: string, temperature: number, maxTokens: number, topP: number): string {
      const id = Math.random().toString(36).substr(2, 9)
      const name = this.generateSessionName(initialPrompt)

      const session: ChatSession = {
        id,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
        selectedGPT,
        initialPrompt,
        model,
        temperature,
        maxTokens,
        topP,
      }

      this.sessions.push(session)
      this.currentSessionId = id

      return id
    },

    /**
     * Generate a session name from the initial prompt
     */
    generateSessionName(prompt: string): string {
      // Clean up the prompt and take first 40 characters
      const cleaned = prompt.trim().slice(0, 40)
      return cleaned.length > 0 ? cleaned : 'New Chat'
    },

    /**
     * Switch to a different session
     */
    switchSession(sessionId: string) {
      const session = this.sessions.find(s => s.id === sessionId)
      if (!session) {
        console.warn(`Session ${sessionId} not found`)
        return
      }
      this.currentSessionId = sessionId
    },

    /**
     * Update current session's messages
     */
    updateSessionMessages(messages: Message[]) {
      if (!this.currentSessionId) return

      const session = this.sessions.find(s => s.id === this.currentSessionId)
      if (!session) return

      session.messages = messages
      session.updatedAt = new Date()
    },

    /**
     * Update current session's GPT selection
     */
    updateSessionGPT(gptKey: string) {
      if (!this.currentSessionId) return

      const session = this.sessions.find(s => s.id === this.currentSessionId)
      if (!session) return

      session.selectedGPT = gptKey
      session.updatedAt = new Date()
    },

    /**
     * Update current session's model and parameters
     */
    updateSessionSettings(model: string, temperature: number, maxTokens: number, topP: number) {
      if (!this.currentSessionId) return

      const session = this.sessions.find(s => s.id === this.currentSessionId)
      if (!session) return

      session.model = model
      session.temperature = temperature
      session.maxTokens = maxTokens
      session.topP = topP
      session.updatedAt = new Date()
    },

    /**
     * Rename a session
     */
    renameSession(sessionId: string, newName: string) {
      const session = this.sessions.find(s => s.id === sessionId)
      if (!session) return

      session.name = newName
      session.updatedAt = new Date()
    },

    /**
     * Delete a session
     */
    deleteSession(sessionId: string) {
      const index = this.sessions.findIndex(s => s.id === sessionId)
      if (index === -1) return

      this.sessions.splice(index, 1)

      // If we deleted the current session, switch to another one
      if (this.currentSessionId === sessionId) {
        if (this.sessions.length > 0) {
          this.currentSessionId = this.sessions[0].id
        } else {
          this.currentSessionId = null
        }
      }
    },

    /**
     * Delete all sessions
     */
    deleteAllSessions() {
      this.sessions = []
      this.currentSessionId = null
    },

    /**
     * Clear messages from a session
     */
    clearSessionMessages(sessionId: string) {
      const session = this.sessions.find(s => s.id === sessionId)
      if (!session) return

      session.messages = []
      session.updatedAt = new Date()
    },
  },

  persist: true,
})
