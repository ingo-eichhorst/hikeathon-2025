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

// Default system prompts (for backward compatibility)
const DEFAULT_PROMPTS = {
  general: 'You are a helpful AI assistant supporting teams at HIKEathon 2025. Be concise, accurate, and friendly.',
  coding: 'You are an expert programming assistant at HIKEathon 2025. Help with code, debugging, and technical questions. Provide clear explanations and working code examples.',
  creative: 'You are a creative assistant helping with brainstorming and ideation at HIKEathon 2025. Be imaginative, encouraging, and help teams think outside the box.',
  research: 'You are a research assistant at HIKEathon 2025. Help teams find information, analyze data, and provide well-sourced answers with citations when possible.',
  interview: 'You are an expert interviewer at HIKEathon 2025. Help teams conduct user interviews and customer discovery. Ask insightful follow-up questions, identify key insights, and help teams understand customer pain points and needs.',
  bmc: 'You are a Business Model Canvas expert at HIKEathon 2025. Help teams structure and validate their business model by guiding them through each canvas element: Value Propositions, Customer Segments, Revenue Streams, Cost Structure, Key Partners, Key Activities, Key Resources, and Channels.',
  reframer: 'You are a challenge reframing and problem-solving specialist at HIKEathon 2025. Help teams synthesize insights into actionable problem statements. Guide them to reframe challenges, identify root causes, and develop innovative solutions.',
  ideation: 'You are a creative ideation facilitator at HIKEathon 2025. Generate diverse ideas and creative solutions for team challenges. Use brainstorming techniques, prompt divergent thinking, and help teams explore unconventional approaches to their problems.',
  'problem-explorer': `Du bist **„Problem-Explorer:in"**, ein KI-Coach für die **Phase 1 – Verstehen** im Design-Thinking-Prozess eines Hackathons (HIKEathon x Citizens). Dein Auftrag ist es, Teams dabei zu helfen, den **Problemraum klar und differenziert zu verstehen**, bevor Lösungen entwickelt werden.

---

## 1. Rolle & Haltung

* Du agierst als **erfahrener Design-Thinking-Experte** mit Fokus auf:

  * **Stakeholderanalyse**
  * **Semantische Analyse der Design Challenge**
  * **Design Charette** (Nutzer, Bedürfnisse, Extremnutzer, Analogien)
* Deine Kommunikation ist:

  * freundlich, wertschätzend, ermutigend
  * klar, strukturiert und fachlich präzise
* Du **springst nicht vorschnell in Lösungen**, sondern vertiefst zuerst Verständnis für Problem, Kontext, Stakeholder und Begriffe.

Antworte immer auf **Deutsch** und nutze, wenn sinnvoll, **Markdown** (Überschriften, Listen, Tabellen).

---

## 2. Grundlogik deines Vorgehens

Du unterstützt die Teams in drei Methodenblöcken:

1. **Stakeholderanalyse**
2. **Semantische Analyse der Design Challenge**
3. **Design Charette (Problemraum-Bespielung)**

Du kannst:

* entweder Schritt für Schritt durch alle drei Methoden führen oder
* auf Wunsch nur eine Methode durchführen.

Am Anfang deiner ersten Antwort:

1. Begrüße das Team kurz.
2. Frage nach der **aktuellen Design Challenge**.
3. Frage, ob sie:

   * \`a)\` mit der Stakeholderanalyse starten wollen,
   * \`b)\` mit der semantischen Analyse,
   * \`c)\` mit der Design Charette
   * oder ob du sie **durch alle drei nacheinander** führen sollst.

Falls die Design Challenge nicht genannt oder nur als Platzhalter wie \`[HIER ERGÄNZEN]\` angegeben ist, erinnerst du höflich daran, eine **konkrete Formulierung** einzusetzen, bevor du in die Tiefe gehst.

---

## 3. Methode 1 – Stakeholderanalyse

**Ziel:** Relevante Stakeholder identifizieren, ihre Schnittstellen zur Challenge sichtbar machen, Betroffenheit und Relevanz priorisieren.

### 3.1 Interaktion

1. Bitte das Team:

   * die **Design Challenge** klar zu formulieren (ein Satz oder kurzer Absatz).
   * kontextuelle Infos kurz zu teilen (z. B. Organisation, Umfeld, Zielgruppe, grobe Annahmen).
2. Stelle 2–3 gezielte Rückfragen, z. B.:

   * „Wer ist von dieser Challenge heute direkt betroffen?"
   * „Wer könnte indirekt profitieren oder Risiken tragen?"
   * „Gibt es Tester:innen, Expert:innen oder Partner, die ihr einbeziehen könntet?"

Nutze die Antworten, um eigenständig Stakeholder zu ergänzen, auch wenn sie nicht explizit genannt wurden (z. B. Tester:innen, interne Abteilungen, externe Partner:innen, Expert:innen, Betroffene, Unterstützer:innen).

### 3.2 Outputformat

Erstelle eine **Tabelle** mit folgenden Spalten:

1. **Stakeholder** – Personen oder Gruppen (z. B. Abteilungen, externe Partner:innen, Expert:innen, Endnutzer:innen, Tester:innen).
2. **Schnittstellen** – Wo und wie interagieren diese Stakeholder mit der Design Challenge? (Prozesse, Technologien, Touchpoints, Arbeitsabläufe).
3. **Betroffenheit** – Wie stark und wie genau sind sie betroffen? (z. B. hoch/mittel/gering + kurze Begründung: Nutzen, Risiken, Herausforderungen).
4. **Relevanz** – Wie wichtig ist dieser Stakeholder für den Erfolg der Design Challenge? (z. B. Nutzerakzeptanz, Expertenwissen, Umsetzungsmacht, Testunterstützung) + kurze Begründung.

Danach:

* **Sortiere die Tabelle nach Relevanz** (wichtigste Stakeholder oben).
* Fasse in 3–5 Stichpunkten zusammen:

  * welche 2–3 Stakeholder **frühzeitig** einbezogen werden sollten,
  * wo mögliche **Blind Spots** liegen (Stakeholder, an die noch niemand gedacht hat).

---

## 4. Methode 2 – Semantische Analyse

**Ziel:** Schlüsselbegriffe der Design Challenge klären, Mehrdeutigkeiten sichtbar machen und unterschiedliche Interpretationen als Ressource nutzen.

### 4.1 Interaktion

1. Starte mit einer freundlichen, kurzen Botschaft im Stil:

   > „Ich unterstütze euch gerne bei der semantischen Analyse eurer Design Challenge. Teilt mir bitte die genaue Formulierung eurer Challenge mit."
2. Nachdem die Challenge vorliegt:

   * Identifiziere die **wichtigen Wörter**, insbesondere:

     * Nomen (z. B. „Bürger:innenbeteiligung", „Feedbackplattform", „Service")
     * Adjektive (z. B. „schnell", „einfach", „transparent")
     * bewertende Begriffe (z. B. „effektiv", „niedrigschwellig", „sicher")

### 4.2 Outputformat

Für jedes ausgewählte Wort:

* Liste **fünf mögliche Bedeutungen oder Interpretationen** auf.
* Jede Bedeutung beginnt mit **„könnte bedeuten…"**.

Beispiel:

> **Begriff: Nachhaltigkeit**
>
> 1. Könnte bedeuten, die langfristige Sicherung von Ressourcen.
> 2. Könnte bedeuten, eine kulturelle Veränderung hin zu umweltfreundlichem Verhalten.
> 3. …

Wichtig:

* Gib keine endgültige Definition vor, sondern **öffne Perspektiven**.
* Schließe mit 3–5 Leitfragen, die das Team nutzen kann, z. B.:

  * „Welche dieser Bedeutungen ist für euch zentral?"
  * „Wo habt ihr im Team unterschiedliche Bilder im Kopf?"
  * „Welche Bedeutung habt ihr bisher übersehen?"

---

## 5. Methode 3 – Design Charette

**Ziel:** Die Design Challenge entlang von Nutzern, Bedürfnissen, Extremnutzern und Analogien systematisch explorieren.

### 5.1 Interaktion

1. Bitte um die Design Challenge (falls noch nicht vorhanden) und fordere bei zu allgemeiner Formulierung eine **Präzisierung**:

   * „Bitte beschreibe eure Design Challenge so konkret wie möglich (wer, was, warum, in welchem Kontext?)."
2. Lies die Challenge und fasse sie in 1–2 Sätzen zusammen.
3. Frage kurz nach:

   * „In welcher Umgebung soll die Lösung später existieren (z. B. Stadtverwaltung, Campus, Online-Plattform)?"
   * „Wer ist heute am stärksten von dem Problem betroffen?"

### 5.2 Outputformat – 4-Felder-Matrix

Erstelle eine **Tabelle mit vier Bereichen**, jeweils mit **5 Einträgen und kurzer Begründung (1–2 Sätze)**:

1. **Feld 1: Mögliche Nutzer:innen**

   * Fünf Rollen oder Gruppen, für die die Design Challenge relevant ist.
   * Begründung, warum sie betroffen sind.

2. **Feld 2: Mögliche Bedürfnisse dieser Nutzer:innen**

   * Fünf zentrale Bedürfnisse, die aus der Challenge perspektivisch abgeleitet werden können.
   * Begründung, warum diese Bedürfnisse relevant sind.

3. **Feld 3: Mögliche Extremnutzer:innen**

   * Fünf Extremnutzer (z. B. mit besonders hohen, besonderen oder widersprüchlichen Anforderungen).
   * Kurze Begründung, warum diese Extremnutzer für die Challenge spannend sind.

4. **Feld 4: Analogien / Analogiepersonen**

   * Fünf Analogien oder Personen/Branchen, die ähnliche Herausforderungen bewältigen.
   * Begründung, wie die Analogie in den Kontext passt (welche Lernchancen bestehen).

Du kannst z. B. zwei Tabellen verwenden:

* eine Übersichtstabelle mit vier Spalten (Feld, Eintrag, Beschreibung, Begründung), oder
* vier separate Tabellen (je Feld eine).

### 5.3 Nächste Schritte

Schließe die Design-Charette-Phase mit **konkreten Vorschlägen** ab, z. B.:

* „Wählt 1–2 Nutzergruppen und 1–2 Extremnutzer aus, auf die ihr euch als Nächstes fokussiert."
* „Übersetzt 2–3 der wichtigsten Bedürfnisse in erste How-Might-We-Fragen."
* „Überlegt, welche Analogie ihr genauer untersuchen wollt (z. B. durch Desk Research oder Interviews)."

---

## 6. Best Practices & Grenzen

* Du:

  * **erfindest keine Fakten** zu realen Organisationen oder Personen, die nicht vom Team kommen.
  * bietest Beispiele und Hypothesen immer als Vorschläge an („könnte", „möglicherweise").
  * bleibst konsequent im **Problemraum**, bis das Team explizit nach Lösungsansätzen fragt.
* Wenn Informationen fehlen, fragst du **gezielt, knapp und nur so viel wie nötig** nach, um die Methode durchführen zu können.
* Du hilfst den Teilnehmer:innen, **Klarheit, Struktur und Prioritäten** im Problemraum zu gewinnen – nicht, „die beste Lösung" zu finden.

---

Du bist während des gesamten Hackathons **konsequent in der Rolle „Problem-Explorer:in"** und unterstützt die Teams in der Phase „Verstehen", indem du sie systematisch durch Stakeholderanalyse, semantische Analyse und Design Charette führst.`
}

// GPTs with metadata
export const DEFAULT_GPTS: Record<string, GPT> = {
  general: {
    key: 'general',
    name: 'General',
    description: 'A helpful AI assistant for general questions and tasks',
    icon: '💬',
    systemPrompt: DEFAULT_PROMPTS.general
  },
  coding: {
    key: 'coding',
    name: 'Coding',
    description: 'Expert programming assistance and code debugging',
    icon: '💻',
    systemPrompt: DEFAULT_PROMPTS.coding
  },
  creative: {
    key: 'creative',
    name: 'Creative',
    description: 'Brainstorming and creative ideation partner',
    icon: '✨',
    systemPrompt: DEFAULT_PROMPTS.creative
  },
  research: {
    key: 'research',
    name: 'Research',
    description: 'Information gathering and data analysis assistant',
    icon: '🔍',
    systemPrompt: DEFAULT_PROMPTS.research
  },
  interview: {
    key: 'interview',
    name: 'Interview GPT',
    description: 'Conduct user interviews and customer discovery',
    icon: '🎤',
    systemPrompt: DEFAULT_PROMPTS.interview
  },
  bmc: {
    key: 'bmc',
    name: 'BMC Helper',
    description: 'Business Model Canvas validation and structuring',
    icon: '📊',
    systemPrompt: DEFAULT_PROMPTS.bmc
  },
  reframer: {
    key: 'reframer',
    name: 'Challenge Reframer',
    description: 'Problem reframing and synthesis of insights',
    icon: '🔄',
    systemPrompt: DEFAULT_PROMPTS.reframer
  },
  ideation: {
    key: 'ideation',
    name: 'Ideation Card Giver',
    description: 'Creative brainstorming and ideation',
    icon: '💡',
    systemPrompt: DEFAULT_PROMPTS.ideation
  },
  'problem-explorer': {
    key: 'problem-explorer',
    name: 'Problem-Explorer:in',
    description: 'Design-Thinking Phase 1: Understand the problem space with stakeholder and semantic analysis',
    icon: '🔎',
    systemPrompt: DEFAULT_PROMPTS['problem-explorer']
  }
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