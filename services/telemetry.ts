export interface TelemetryEvent {
  id: string
  teamId?: string
  teamName?: string
  event: string
  data: Record<string, any>
  timestamp: string
  sessionId?: string
}

export interface TelemetryMetrics {
  totalRequests: number
  totalTokens: number
  totalImages: number
  totalErrors: number
  uniqueTeams: number
  averageResponseTime: number
  hourlyStats: HourlyStats[]
  teamStats: TeamStats[]
  topModels: ModelStats[]
  errorsByType: ErrorStats[]
}

export interface HourlyStats {
  hour: string
  requests: number
  tokens: number
  images: number
  errors: number
  responseTime: number
}

export interface TeamStats {
  teamId: string
  teamName: string
  requests: number
  tokens: number
  images: number
  errors: number
  lastActivity: string
  avgResponseTime: number
}

export interface ModelStats {
  model: string
  requests: number
  tokens: number
  avgResponseTime: number
}

export interface ErrorStats {
  type: string
  count: number
  percentage: number
}

export class TelemetryService {
  private events: TelemetryEvent[] = []
  private maxEvents = 10000 // Keep last 10k events in memory
  
  /**
   * Log a telemetry event
   */
  logEvent(
    event: string,
    data: Record<string, any> = {},
    teamId?: string,
    teamName?: string
  ): void {
    const telemetryEvent: TelemetryEvent = {
      id: crypto.randomUUID(),
      teamId,
      teamName,
      event,
      data,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    }
    
    this.events.unshift(telemetryEvent)
    
    // Maintain size limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents)
    }
    
    console.log('Telemetry Event:', telemetryEvent)
  }
  
  /**
   * Get comprehensive metrics
   */
  getMetrics(
    filters: {
      from?: Date
      to?: Date
      teamId?: string
    } = {}
  ): TelemetryMetrics {
    let filteredEvents = this.events
    
    // Apply filters
    if (filters.from) {
      filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= filters.from!)
    }
    if (filters.to) {
      filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= filters.to!)
    }
    if (filters.teamId) {
      filteredEvents = filteredEvents.filter(e => e.teamId === filters.teamId)
    }
    
    // Calculate metrics
    const totalRequests = this.countEventType(filteredEvents, 'chat_message_sent')
    const totalTokens = this.sumEventData(filteredEvents, 'tokens_used')
    const totalImages = this.countEventType(filteredEvents, 'image_generated')
    const totalErrors = this.countEventType(filteredEvents, 'error')
    const uniqueTeams = new Set(filteredEvents.map(e => e.teamId).filter(Boolean)).size
    const averageResponseTime = this.averageEventData(filteredEvents, 'response_time')
    
    return {
      totalRequests,
      totalTokens,
      totalImages,
      totalErrors,
      uniqueTeams,
      averageResponseTime,
      hourlyStats: this.generateHourlyStats(filteredEvents),
      teamStats: this.generateTeamStats(filteredEvents),
      topModels: this.generateModelStats(filteredEvents),
      errorsByType: this.generateErrorStats(filteredEvents)
    }
  }
  
  /**
   * Get events for export
   */
  getEvents(
    filters: {
      from?: Date
      to?: Date
      teamId?: string
      event?: string
      limit?: number
    } = {}
  ): TelemetryEvent[] {
    let events = [...this.events]
    
    if (filters.from) {
      events = events.filter(e => new Date(e.timestamp) >= filters.from!)
    }
    if (filters.to) {
      events = events.filter(e => new Date(e.timestamp) <= filters.to!)
    }
    if (filters.teamId) {
      events = events.filter(e => e.teamId === filters.teamId)
    }
    if (filters.event) {
      events = events.filter(e => e.event === filters.event)
    }
    
    return events.slice(0, filters.limit || 1000)
  }
  
  /**
   * Generate hourly statistics
   */
  private generateHourlyStats(events: TelemetryEvent[]): HourlyStats[] {
    const hourlyMap = new Map<string, HourlyStats>()
    const now = new Date()
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
      const hourKey = hour.toISOString().slice(0, 13) + ':00:00.000Z'
      hourlyMap.set(hourKey, {
        hour: hourKey,
        requests: 0,
        tokens: 0,
        images: 0,
        errors: 0,
        responseTime: 0
      })
    }
    
    // Populate with actual data
    events.forEach(event => {
      const hourKey = event.timestamp.slice(0, 13) + ':00:00.000Z'
      const stats = hourlyMap.get(hourKey)
      if (stats) {
        if (event.event === 'chat_message_sent') stats.requests++
        if (event.event === 'image_generated') stats.images++
        if (event.event === 'error') stats.errors++
        if (event.data.tokens_used) stats.tokens += event.data.tokens_used
        if (event.data.response_time) stats.responseTime += event.data.response_time
      }
    })
    
    return Array.from(hourlyMap.values()).sort((a, b) => 
      new Date(a.hour).getTime() - new Date(b.hour).getTime()
    )
  }
  
  /**
   * Generate team statistics
   */
  private generateTeamStats(events: TelemetryEvent[]): TeamStats[] {
    const teamMap = new Map<string, TeamStats>()
    
    events.forEach(event => {
      if (!event.teamId) return
      
      let stats = teamMap.get(event.teamId)
      if (!stats) {
        stats = {
          teamId: event.teamId,
          teamName: event.teamName || event.teamId,
          requests: 0,
          tokens: 0,
          images: 0,
          errors: 0,
          lastActivity: event.timestamp,
          avgResponseTime: 0
        }
        teamMap.set(event.teamId, stats)
      }
      
      if (event.event === 'chat_message_sent') stats.requests++
      if (event.event === 'image_generated') stats.images++
      if (event.event === 'error') stats.errors++
      if (event.data.tokens_used) stats.tokens += event.data.tokens_used
      
      // Update last activity
      if (event.timestamp > stats.lastActivity) {
        stats.lastActivity = event.timestamp
      }
    })
    
    return Array.from(teamMap.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 20)
  }
  
  /**
   * Generate model statistics
   */
  private generateModelStats(events: TelemetryEvent[]): ModelStats[] {
    const modelMap = new Map<string, ModelStats>()
    
    events
      .filter(e => e.event === 'chat_message_sent' && e.data.model)
      .forEach(event => {
        const model = event.data.model
        let stats = modelMap.get(model)
        if (!stats) {
          stats = {
            model,
            requests: 0,
            tokens: 0,
            avgResponseTime: 0
          }
          modelMap.set(model, stats)
        }
        
        stats.requests++
        if (event.data.tokens_used) stats.tokens += event.data.tokens_used
        if (event.data.response_time) stats.avgResponseTime += event.data.response_time
      })
    
    // Calculate averages
    Array.from(modelMap.values()).forEach(stats => {
      if (stats.requests > 0) {
        stats.avgResponseTime = stats.avgResponseTime / stats.requests
      }
    })
    
    return Array.from(modelMap.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)
  }
  
  /**
   * Generate error statistics
   */
  private generateErrorStats(events: TelemetryEvent[]): ErrorStats[] {
    const errorEvents = events.filter(e => e.event === 'error')
    const totalErrors = errorEvents.length
    const errorMap = new Map<string, number>()
    
    errorEvents.forEach(event => {
      const errorType = event.data.type || 'unknown'
      errorMap.set(errorType, (errorMap.get(errorType) || 0) + 1)
    })
    
    return Array.from(errorMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }
  
  /**
   * Helper methods
   */
  private countEventType(events: TelemetryEvent[], eventType: string): number {
    return events.filter(e => e.event === eventType).length
  }
  
  private sumEventData(events: TelemetryEvent[], field: string): number {
    return events.reduce((sum, e) => sum + (e.data[field] || 0), 0)
  }
  
  private averageEventData(events: TelemetryEvent[], field: string): number {
    const values = events
      .filter(e => e.data[field])
      .map(e => e.data[field])
    
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
  }
  
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('telemetry_session')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        sessionStorage.setItem('telemetry_session', sessionId)
      }
      return sessionId
    }
    return 'server'
  }
  
  /**
   * Simulate some sample data for demo
   */
  generateSampleData(): void {
    const teams = ['TEAM001', 'TEAM002', 'TEAM003', 'TEAM004', 'TEAM005']
    const models = [
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'meta-llama/Meta-Llama-3.1-405B-Instruct-FP8',
      'mistralai/Mistral-Small-24B-Instruct'
    ]
    
    // Generate events for the last 24 hours
    const now = Date.now()
    for (let i = 0; i < 1000; i++) {
      const timestamp = new Date(now - Math.random() * 24 * 60 * 60 * 1000)
      const teamId = teams[Math.floor(Math.random() * teams.length)]
      
      // Chat message
      if (Math.random() > 0.3) {
        this.events.push({
          id: crypto.randomUUID(),
          teamId,
          teamName: teamId,
          event: 'chat_message_sent',
          data: {
            model: models[Math.floor(Math.random() * models.length)],
            tokens_used: Math.floor(Math.random() * 500) + 50,
            response_time: Math.floor(Math.random() * 2000) + 200
          },
          timestamp: timestamp.toISOString(),
          sessionId: 'sample'
        })
      }
      
      // Image generation
      if (Math.random() > 0.7) {
        this.events.push({
          id: crypto.randomUUID(),
          teamId,
          teamName: teamId,
          event: 'image_generated',
          data: {
            model: 'stable-diffusion',
            response_time: Math.floor(Math.random() * 5000) + 1000
          },
          timestamp: timestamp.toISOString(),
          sessionId: 'sample'
        })
      }
      
      // Error
      if (Math.random() > 0.9) {
        this.events.push({
          id: crypto.randomUUID(),
          teamId,
          teamName: teamId,
          event: 'error',
          data: {
            type: ['rate_limit', 'api_error', 'validation_error'][Math.floor(Math.random() * 3)],
            message: 'Sample error'
          },
          timestamp: timestamp.toISOString(),
          sessionId: 'sample'
        })
      }
    }
    
    console.log(`Generated ${this.events.length} sample telemetry events`)
  }
}

// Global telemetry instance
let telemetryInstance: TelemetryService | null = null

export const useTelemetryService = (): TelemetryService => {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryService()
    
    // Generate sample data for demo
    if (typeof window !== 'undefined') {
      telemetryInstance.generateSampleData()
    }
  }
  return telemetryInstance
}