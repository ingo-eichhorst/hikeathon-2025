import { defineStore } from 'pinia'

export type Language = 'en' | 'de'
export type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  language: Language
  systemPrompts: Record<string, string>
  currentSystemPromptKey: string
  eventStartDate: string
  eventEndDate: string
  broadcastMessage: string | null
  broadcastDismissed: boolean
  showCountdown: boolean
  autoSaveChat: boolean
  soundEnabled: boolean
}

// Default system prompts
const DEFAULT_PROMPTS = {
  general: 'You are a helpful AI assistant supporting teams at HIKEathon 2025. Be concise, accurate, and friendly.',
  coding: 'You are an expert programming assistant at HIKEathon 2025. Help with code, debugging, and technical questions. Provide clear explanations and working code examples.',
  creative: 'You are a creative assistant helping with brainstorming and ideation at HIKEathon 2025. Be imaginative, encouraging, and help teams think outside the box.',
  research: 'You are a research assistant at HIKEathon 2025. Help teams find information, analyze data, and provide well-sourced answers with citations when possible.'
}

// Translations
export const translations = {
  en: {
    // Navigation
    home: 'Home',
    chat: 'Chat',
    images: 'Images',
    info: 'Info',
    settings: 'Settings',
    map: 'Map',
    todos: 'Todos',
    admin: 'Admin',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    send: 'Send',
    generate: 'Generate',
    download: 'Download',
    copy: 'Copy',
    clear: 'Clear',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Chat
    typeMessage: 'Type your message...',
    stopGenerating: 'Stop',
    regenerate: 'Regenerate',
    tokens: 'tokens',
    model: 'Model',
    temperature: 'Temperature',
    maxTokens: 'Max Tokens',
    attachFile: 'Attach File',
    
    // Images
    prompt: 'Prompt',
    imageModel: 'Image Model',
    generating: 'Generating...',
    downloadImage: 'Download Image',
    viewFullscreen: 'View Fullscreen',
    
    // Settings
    settingsTitle: 'Settings',
    theme: 'Theme',
    language: 'Language',
    systemPrompt: 'System Prompt',
    teamInfo: 'Team Information',
    exportSettings: 'Export Settings',
    importSettings: 'Import Settings',
    logout: 'Logout',
    
    // Info
    schedule: 'Schedule',
    rules: 'Rules',
    methodology: 'Methodology',
    todoList: 'Todo List',
    
    // Time
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
    
    // Messages
    saveSuccess: 'Settings saved successfully',
    copySuccess: 'Copied to clipboard',
    downloadSuccess: 'Download started',
    errorOccurred: 'An error occurred'
  },
  de: {
    // Navigation
    home: 'Startseite',
    chat: 'Chat',
    images: 'Bilder',
    info: 'Info',
    settings: 'Einstellungen',
    map: 'Karte',
    todos: 'Aufgaben',
    admin: 'Admin',
    
    // Common
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    send: 'Senden',
    generate: 'Generieren',
    download: 'Herunterladen',
    copy: 'Kopieren',
    clear: 'Löschen',
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolg',
    
    // Chat
    typeMessage: 'Nachricht eingeben...',
    stopGenerating: 'Stopp',
    regenerate: 'Neu generieren',
    tokens: 'Token',
    model: 'Modell',
    temperature: 'Temperatur',
    maxTokens: 'Max. Token',
    attachFile: 'Datei anhängen',
    
    // Images
    prompt: 'Eingabe',
    imageModel: 'Bildmodell',
    generating: 'Generiere...',
    downloadImage: 'Bild herunterladen',
    viewFullscreen: 'Vollbild anzeigen',
    
    // Settings
    settingsTitle: 'Einstellungen',
    theme: 'Design',
    language: 'Sprache',
    systemPrompt: 'System-Prompt',
    teamInfo: 'Team-Informationen',
    exportSettings: 'Einstellungen exportieren',
    importSettings: 'Einstellungen importieren',
    logout: 'Abmelden',
    
    // Info
    schedule: 'Zeitplan',
    rules: 'Regeln',
    methodology: 'Methodik',
    todoList: 'Aufgabenliste',
    
    // Time
    days: 'Tage',
    hours: 'Stunden',
    minutes: 'Minuten',
    seconds: 'Sekunden',
    
    // Messages
    saveSuccess: 'Einstellungen erfolgreich gespeichert',
    copySuccess: 'In Zwischenablage kopiert',
    downloadSuccess: 'Download gestartet',
    errorOccurred: 'Ein Fehler ist aufgetreten'
  }
}

interface SettingsGetters {
  t: (state: SettingsState) => (key: keyof typeof translations.en) => string
  currentSystemPrompt: (state: SettingsState) => string
  timeUntilEvent: (state: SettingsState) => number
  timeRemaining: (state: SettingsState) => number
  eventStatus: (state: SettingsState) => 'before' | 'during' | 'after'
}

interface SettingsActions {
  setTheme(theme: Theme): void
  setLanguage(language: Language): void
  setSystemPrompt(key: string, prompt: string): void
  selectSystemPrompt(key: string): void
  setBroadcast(message: string | null): void
  dismissBroadcast(): void
  exportSettings(): void
  importSettings(file: File): Promise<boolean>
  applyTheme(): void
  playSound(type: 'message' | 'success' | 'error'): void
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    theme: 'system',
    language: 'en',
    systemPrompts: DEFAULT_PROMPTS,
    currentSystemPromptKey: 'general',
    eventStartDate: '2025-02-01T09:00:00',
    eventEndDate: '2025-02-02T18:00:00',
    broadcastMessage: null,
    broadcastDismissed: false,
    showCountdown: true,
    autoSaveChat: true,
    soundEnabled: true
  }),

  getters: {
    t: (state) => {
      return (key: keyof typeof translations.en): string => {
        return translations[state.language][key] || key
      }
    },
    
    currentSystemPrompt: (state): string => {
      return state.systemPrompts[state.currentSystemPromptKey] || DEFAULT_PROMPTS.general
    },
    
    timeUntilEvent: (state): number => {
      const start = new Date(state.eventStartDate).getTime()
      const now = Date.now()
      return Math.max(0, start - now)
    },
    
    timeRemaining: (state): number => {
      const end = new Date(state.eventEndDate).getTime()
      const now = Date.now()
      return Math.max(0, end - now)
    },
    
    eventStatus: (state): 'before' | 'during' | 'after' => {
      const now = Date.now()
      const start = new Date(state.eventStartDate).getTime()
      const end = new Date(state.eventEndDate).getTime()
      
      if (now < start) return 'before'
      if (now > end) return 'after'
      return 'during'
    }
  },

  actions: {
    setTheme(theme: Theme) {
      this.theme = theme
      this.applyTheme()
    },
    
    setLanguage(language: Language) {
      this.language = language
    },
    
    setSystemPrompt(key: string, prompt: string) {
      this.systemPrompts[key] = prompt
      if (key === this.currentSystemPromptKey) {
        // Update chat store
        const chatStore = useChatStore()
        chatStore.setSystemPrompt(prompt)
      }
    },
    
    selectSystemPrompt(key: string) {
      this.currentSystemPromptKey = key
      const chatStore = useChatStore()
      chatStore.setSystemPrompt(this.systemPrompts[key])
    },
    
    setBroadcast(message: string | null) {
      this.broadcastMessage = message
      this.broadcastDismissed = false
    },
    
    dismissBroadcast() {
      this.broadcastDismissed = true
    },
    
    exportSettings() {
      const settings = {
        theme: this.theme,
        language: this.language,
        systemPrompts: this.systemPrompts,
        currentSystemPromptKey: this.currentSystemPromptKey,
        showCountdown: this.showCountdown,
        autoSaveChat: this.autoSaveChat,
        soundEnabled: this.soundEnabled
      }
      
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hikeathon-settings-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    
    async importSettings(file: File) {
      try {
        const text = await file.text()
        const settings = JSON.parse(text)
        
        // Validate and apply settings
        if (settings.theme) this.theme = settings.theme
        if (settings.language) this.language = settings.language
        if (settings.systemPrompts) this.systemPrompts = { ...DEFAULT_PROMPTS, ...settings.systemPrompts }
        if (settings.currentSystemPromptKey) this.currentSystemPromptKey = settings.currentSystemPromptKey
        if (typeof settings.showCountdown === 'boolean') this.showCountdown = settings.showCountdown
        if (typeof settings.autoSaveChat === 'boolean') this.autoSaveChat = settings.autoSaveChat
        if (typeof settings.soundEnabled === 'boolean') this.soundEnabled = settings.soundEnabled
        
        this.applyTheme()
        return true
      } catch (error) {
        console.error('Failed to import settings:', error)
        return false
      }
    },
    
    applyTheme() {
      if (typeof window === 'undefined') return
      
      const root = document.documentElement
      
      if (this.theme === 'dark' || 
          (this.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    },
    
    playSound(type: 'message' | 'success' | 'error') {
      if (!this.soundEnabled || typeof window === 'undefined') return
      
      // Simple beep sounds using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      const frequencies = {
        message: 800,
        success: 1000,
        error: 400
      }
      
      oscillator.frequency.value = frequencies[type]
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    }
  },

  persist: true
})