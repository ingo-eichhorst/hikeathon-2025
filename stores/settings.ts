import { defineStore } from 'pinia'

export type Language = 'en' | 'de'
export type Theme = 'light' | 'dark' | 'system'

export interface GPT {
  key: string
  name: string
  description: string
  icon: string
  systemPrompt: string
  defaultModel?: string
}

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

// Load system prompts from markdown files
const promptModules = import.meta.glob<string>(
  '../prompts/gpts/*.md',
  { as: 'raw' }
)

async function loadPrompts() {
  const prompts: Record<string, string> = {}
  for (const [path, loadPrompt] of Object.entries(promptModules)) {
    const match = path.match(/\/([^/]+)\.md$/)
    if (match) {
      const key = match[1]
      prompts[key] = await loadPrompt()
    }
  }
  return prompts
}

// Default system prompts (loaded dynamically)
let DEFAULT_PROMPTS: Record<string, string> = {}

// Initialize prompts on module load
if (typeof import.meta !== 'undefined') {
  loadPrompts().then((prompts) => {
    DEFAULT_PROMPTS = prompts
  }).catch((error) => {
    console.error('Failed to load prompts:', error)
    // Fallback to minimal defaults if loading fails
    DEFAULT_PROMPTS = {
      'phase1-understanding-coach': 'You are the Phase 1 – Understanding Coach for the HIKEathon x Citizens hackathon.',
      'phase2-observation-coach': 'You are the Phase 2 – Observation Coach for the HIKEathon x Citizens hackathon.',
      'phase3-synthesis-architect': 'You are the Phase 3 – Synthesis Architect for the HIKEathon x Citizens hackathon.',
      'phase4-ideation-coach': 'You are the Phase 4 – Ideation Coach for the HIKEathon x Citizens hackathon.',
      'phase5-prototyping-maker': 'You are the Phase 5 – Prototyping Maker for the HIKEathon x Citizens hackathon.',
      'phase6-testing-navigator': 'You are the Phase 6 – Testing Navigator for the HIKEathon x Citizens hackathon.',
      'phase7-prompt-companion': 'You are the Phase 7 – Prompt Companion for the HIKEathon x Citizens hackathon.'
    }
  })
}

// Function to create GPTs with loaded prompts
function createDefaultGPTs(prompts: Record<string, string>): Record<string, GPT> {
  return {
    'phase1-understanding-coach': {
      key: 'phase1-understanding-coach',
      name: 'Phase 1 - Understanding Coach',
      description: 'Verstehen: Definiert euer Problemfeld mit Stakeholder-Analysen und semantischen Analysen',
      icon: '🔎',
      systemPrompt: prompts['phase1-understanding-coach'] || DEFAULT_PROMPTS['phase1-understanding-coach']
    },
    'phase2-observation-coach': {
      key: 'phase2-observation-coach',
      name: 'Phase 2 - Observation Coach',
      description: 'Beobachten: Versteht eure Zielgruppe durch Interviews, Forschung und Personas',
      icon: '👥',
      systemPrompt: prompts['phase2-observation-coach'] || DEFAULT_PROMPTS['phase2-observation-coach']
    },
    'phase3-synthesis-architect': {
      key: 'phase3-synthesis-architect',
      name: 'Phase 3 - Synthesis Architect',
      description: 'Synthese: Strukturiert Insights in How-Might-We-Fragen, Customer Journeys und Personas',
      icon: '🏗️',
      systemPrompt: prompts['phase3-synthesis-architect'] || DEFAULT_PROMPTS['phase3-synthesis-architect']
    },
    'phase4-ideation-coach': {
      key: 'phase4-ideation-coach',
      name: 'Phase 4 - Ideation Coach',
      description: 'Ideation: Generiert kreative Lösungsideen und innovative Variationen',
      icon: '💡',
      systemPrompt: prompts['phase4-ideation-coach'] || DEFAULT_PROMPTS['phase4-ideation-coach']
    },
    'phase5-prototyping-maker': {
      key: 'phase5-prototyping-maker',
      name: 'Phase 5 - Prototyping Maker',
      description: 'Prototyping: Baut schnelle Prototypen und MVP-Mockups',
      icon: '🛠️',
      systemPrompt: prompts['phase5-prototyping-maker'] || DEFAULT_PROMPTS['phase5-prototyping-maker']
    },
    'phase6-testing-navigator': {
      key: 'phase6-testing-navigator',
      name: 'Phase 6 - Testing Navigator',
      description: 'Testing: Testet mit echten Nutzern und sammelt wertvolles Feedback',
      icon: '✅',
      systemPrompt: prompts['phase6-testing-navigator'] || DEFAULT_PROMPTS['phase6-testing-navigator']
    },
    'phase7-prompt-companion': {
      key: 'phase7-prompt-companion',
      name: 'Phase 7 - Prompt Companion',
      description: 'KI-Prompting: Optimiert KI-Prompts iterativ für bessere Ergebnisse',
      icon: '🤖',
      systemPrompt: prompts['phase7-prompt-companion'] || DEFAULT_PROMPTS['phase7-prompt-companion']
    }
  }
}

// Initial GPTs (will be updated once prompts are loaded)
export let DEFAULT_GPTS: Record<string, GPT> = createDefaultGPTs(DEFAULT_PROMPTS)

// Update DEFAULT_GPTS once prompts are loaded
if (typeof import.meta !== 'undefined') {
  loadPrompts().then((prompts) => {
    DEFAULT_PROMPTS = prompts
    DEFAULT_GPTS = createDefaultGPTs(prompts)
  }).catch((error) => {
    console.error('Failed to load prompts:', error)
    // Fallback defaults already set
  })
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
  allGPTs: () => Record<string, GPT>
  currentGPT: () => GPT
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
    },

    allGPTs: (): Record<string, GPT> => {
      return DEFAULT_GPTS
    },

    currentGPT: (state): GPT => {
      return DEFAULT_GPTS[state.currentSystemPromptKey] || DEFAULT_GPTS.general
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
    
    async setSystemPrompt(key: string, prompt: string) {
      this.systemPrompts[key] = prompt
      if (key === this.currentSystemPromptKey) {
        // Update chat store (lazy import to avoid circular dependency)
        const { useChatStore } = await import('./chat')
        const chatStore = useChatStore()
        chatStore.setSystemPrompt(prompt)
      }
    },
    
    async selectSystemPrompt(key: string) {
      this.currentSystemPromptKey = key
      // Lazy import to avoid circular dependency
      const { useChatStore } = await import('./chat')
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