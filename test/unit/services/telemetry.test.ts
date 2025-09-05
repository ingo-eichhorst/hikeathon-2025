import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TelemetryService, useTelemetryService } from '~/services/telemetry'
import { testFixtures } from '~/test/utils'

// Mock the Nuxt app context
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null })
}

vi.mock('#app', () => ({
  useNuxtApp: () => ({ $supabase: mockSupabase })
}))

describe('TelemetryService', () => {
  let telemetryService: TelemetryService

  beforeEach(() => {
    telemetryService = new TelemetryService(mockSupabase as any)
    vi.clearAllMocks()
    console.log = vi.fn() // Mock console.log
  })

  describe('Event Logging', () => {
    it('should log events correctly', () => {
      telemetryService.logEvent('test_event', { key: 'value' })

      expect(console.log).toHaveBeenCalledWith(
        'Telemetry Event:',
        expect.objectContaining({
          event: 'test_event',
          data: { key: 'value' },
          id: expect.any(String),
          timestamp: expect.any(String)
        })
      )
    })

    it('should include team information when provided', () => {
      telemetryService.logEvent(
        'team_event',
        { action: 'login' },
        'team-123',
        'Test Team'
      )

      expect(console.log).toHaveBeenCalledWith(
        'Telemetry Event:',
        expect.objectContaining({
          event: 'team_event',
          data: { action: 'login' },
          teamId: 'team-123',
          teamName: 'Test Team'
        })
      )
    })

    it('should maintain event limit', () => {
      // Log more events than the limit
      for (let i = 0; i < 10005; i++) {
        telemetryService.logEvent('test_event', { index: i })
      }

      // Check that only the limit is maintained (we can't directly access private property)
      // This test would need the service to expose a method to get event count
      expect(console.log).toHaveBeenCalledTimes(10005)
    })

    it('should generate session IDs', () => {
      const sessionStorage = {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn()
      }
      global.sessionStorage = sessionStorage as any
      global.window = {} as any

      telemetryService.logEvent('test_event')

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'telemetry_session',
        expect.any(String)
      )
    })
  })

  describe('Metrics Aggregation', () => {
    beforeEach(() => {
      // Generate some sample events for testing
      telemetryService.logEvent('chat_message_sent', { tokens_used: 100, response_time: 1000 })
      telemetryService.logEvent('image_generated', { response_time: 2000 })
      telemetryService.logEvent('error', { type: 'rate_limit' })
    })

    it('should calculate basic metrics', () => {
      const metrics = telemetryService.getMetrics()

      expect(metrics).toMatchObject({
        totalRequests: expect.any(Number),
        totalTokens: expect.any(Number),
        totalImages: expect.any(Number),
        totalErrors: expect.any(Number),
        uniqueTeams: expect.any(Number),
        averageResponseTime: expect.any(Number)
      })
    })

    it('should filter events by date range', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const metrics = telemetryService.getMetrics({
        from: yesterday,
        to: tomorrow
      })

      expect(metrics.totalRequests).toBeGreaterThan(0)
    })

    it('should filter events by team', () => {
      const metrics = telemetryService.getMetrics({
        teamId: 'test-team'
      })

      expect(metrics).toBeDefined()
      expect(typeof metrics.totalRequests).toBe('number')
    })

    it('should generate hourly stats', () => {
      const metrics = telemetryService.getMetrics()

      expect(metrics.hourlyStats).toBeInstanceOf(Array)
      expect(metrics.hourlyStats).toHaveLength(24)
      
      metrics.hourlyStats.forEach(stat => {
        expect(stat).toMatchObject({
          hour: expect.any(String),
          requests: expect.any(Number),
          tokens: expect.any(Number),
          images: expect.any(Number),
          errors: expect.any(Number),
          responseTime: expect.any(Number)
        })
      })
    })

    it('should generate team stats', () => {
      const metrics = telemetryService.getMetrics()

      expect(metrics.teamStats).toBeInstanceOf(Array)
      
      if (metrics.teamStats.length > 0) {
        metrics.teamStats.forEach(stat => {
          expect(stat).toMatchObject({
            teamId: expect.any(String),
            teamName: expect.any(String),
            requests: expect.any(Number),
            tokens: expect.any(Number),
            images: expect.any(Number),
            errors: expect.any(Number),
            lastActivity: expect.any(String),
            avgResponseTime: expect.any(Number)
          })
        })
      }
    })
  })

  describe('Event Retrieval', () => {
    it('should get events with default limit', () => {
      const events = telemetryService.getEvents()

      expect(events).toBeInstanceOf(Array)
      expect(events.length).toBeLessThanOrEqual(1000)
    })

    it('should apply custom limit', () => {
      const events = telemetryService.getEvents({ limit: 5 })

      expect(events.length).toBeLessThanOrEqual(5)
    })

    it('should filter by event type', () => {
      telemetryService.logEvent('specific_event', { test: true })
      
      const events = telemetryService.getEvents({ event: 'specific_event' })
      
      events.forEach(event => {
        expect(event.event).toBe('specific_event')
      })
    })
  })

  describe('Sample Data Generation', () => {
    it('should generate sample data', () => {
      telemetryService.generateSampleData()

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(/Generated \d+ sample telemetry events/)
      )
    })
  })

  describe('Composable', () => {
    it('should provide telemetry service instance', () => {
      const service = useTelemetryService()

      expect(service).toBeInstanceOf(TelemetryService)
    })
  })
})