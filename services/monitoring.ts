export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: ServiceStatus[]
  metrics: SystemMetrics
  alerts: SystemAlert[]
}

export interface ServiceStatus {
  name: string
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  lastCheck: string
  endpoint?: string
  details?: string
  uptime: number
}

export interface SystemMetrics {
  memory: {
    used: number
    total: number
    percentage: number
  }
  database: {
    connections: number
    maxConnections: number
    queryTime: number
  }
  api: {
    requestsPerMinute: number
    errorRate: number
    averageResponseTime: number
  }
  storage: {
    used: number
    total: number
    percentage: number
  }
}

export interface SystemAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  timestamp: string
  service?: string
  resolved?: boolean
}

export interface PerformanceData {
  timestamp: string
  cpuUsage: number
  memoryUsage: number
  responseTime: number
  errorRate: number
  requestCount: number
}

export class MonitoringService {
  private supabase: any
  private healthHistory: PerformanceData[] = []

  constructor(supabase: any) {
    this.supabase = supabase
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const services = await this.checkServices()
    const metrics = await this.getSystemMetrics()
    const alerts = await this.getActiveAlerts()
    
    const overallStatus = this.determineOverallStatus(services, alerts)
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      metrics,
      alerts
    }
  }

  private async checkServices(): Promise<ServiceStatus[]> {
    const services: ServiceStatus[] = []
    
    // Check Supabase
    services.push(await this.checkSupabase())
    
    // Check IONOS API
    services.push(await this.checkIONOSAPI())
    
    // Check other services
    services.push(await this.checkWebServices())
    
    return services
  }

  private async checkSupabase(): Promise<ServiceStatus> {
    const startTime = Date.now()
    
    try {
      const { data, error } = await this.supabase
        .from('settings')
        .select('key')
        .limit(1)
      
      const responseTime = Date.now() - startTime
      
      if (error) {
        return {
          name: 'Supabase Database',
          status: 'down',
          responseTime,
          lastCheck: new Date().toISOString(),
          details: error.message,
          uptime: 95.5 // Mock uptime percentage
        }
      }
      
      return {
        name: 'Supabase Database',
        status: responseTime > 1000 ? 'degraded' : 'up',
        responseTime,
        lastCheck: new Date().toISOString(),
        uptime: 99.8
      }
    } catch (error) {
      return {
        name: 'Supabase Database',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        details: (error as Error).message,
        uptime: 95.5
      }
    }
  }

  private async checkIONOSAPI(): Promise<ServiceStatus> {
    const startTime = Date.now()
    
    try {
      // Try to fetch available models as a health check
      const response = await fetch('/api/models')
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        return {
          name: 'IONOS Model Hub',
          status: 'down',
          responseTime,
          lastCheck: new Date().toISOString(),
          endpoint: '/api/models',
          details: `HTTP ${response.status}`,
          uptime: 98.2
        }
      }
      
      return {
        name: 'IONOS Model Hub',
        status: responseTime > 2000 ? 'degraded' : 'up',
        responseTime,
        lastCheck: new Date().toISOString(),
        endpoint: '/api/models',
        uptime: 99.1
      }
    } catch (error) {
      return {
        name: 'IONOS Model Hub',
        status: 'down',
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        endpoint: '/api/models',
        details: (error as Error).message,
        uptime: 98.2
      }
    }
  }

  private async checkWebServices(): Promise<ServiceStatus> {
    // Mock web services check
    return {
      name: 'Web Application',
      status: 'up',
      responseTime: Math.floor(Math.random() * 200) + 50,
      lastCheck: new Date().toISOString(),
      uptime: 99.9
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    // In a real application, these would come from actual system monitoring
    // For now, we'll simulate realistic metrics
    
    const now = Date.now()
    const memoryUsage = 45 + Math.sin(now / 60000) * 15 // Oscillating between 30-60%
    const cpuUsage = 25 + Math.random() * 30 // Random 25-55%
    
    return {
      memory: {
        used: memoryUsage * 16 / 100, // Simulate 16GB total
        total: 16,
        percentage: memoryUsage
      },
      database: {
        connections: Math.floor(Math.random() * 50) + 10,
        maxConnections: 100,
        queryTime: Math.random() * 100 + 10
      },
      api: {
        requestsPerMinute: Math.floor(Math.random() * 500) + 100,
        errorRate: Math.random() * 2, // 0-2% error rate
        averageResponseTime: Math.random() * 200 + 100
      },
      storage: {
        used: 45.6,
        total: 100,
        percentage: 45.6
      }
    }
  }

  private async getActiveAlerts(): Promise<SystemAlert[]> {
    const alerts: SystemAlert[] = []
    
    // Get telemetry data for analysis
    try {
      const { data: telemetryData } = await this.supabase
        .from('telemetry')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      
      if (telemetryData) {
        const errorCount = telemetryData.filter((event: any) => 
          event.event_type === 'error'
        ).length
        
        if (errorCount > 10) {
          alerts.push({
            id: crypto.randomUUID(),
            type: 'warning',
            title: 'High Error Rate',
            message: `${errorCount} errors detected in the last hour`,
            timestamp: new Date().toISOString(),
            service: 'API'
          })
        }
        
        const requestCount = telemetryData.length
        if (requestCount > 1000) {
          alerts.push({
            id: crypto.randomUUID(),
            type: 'info',
            title: 'High Traffic',
            message: `${requestCount} requests in the last hour`,
            timestamp: new Date().toISOString(),
            service: 'API'
          })
        }
      }
    } catch (error) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'error',
        title: 'Monitoring Error',
        message: 'Failed to fetch telemetry data for analysis',
        timestamp: new Date().toISOString()
      })
    }
    
    // Add some example alerts
    if (Math.random() > 0.8) {
      alerts.push({
        id: crypto.randomUUID(),
        type: 'warning',
        title: 'High Memory Usage',
        message: 'System memory usage is above 80%',
        timestamp: new Date().toISOString(),
        service: 'System'
      })
    }
    
    return alerts
  }

  private determineOverallStatus(services: ServiceStatus[], alerts: SystemAlert[]): 'healthy' | 'degraded' | 'unhealthy' {
    const downServices = services.filter(s => s.status === 'down').length
    const degradedServices = services.filter(s => s.status === 'degraded').length
    const criticalAlerts = alerts.filter(a => a.type === 'critical').length
    const errorAlerts = alerts.filter(a => a.type === 'error').length
    
    if (downServices > 0 || criticalAlerts > 0) {
      return 'unhealthy'
    }
    
    if (degradedServices > 0 || errorAlerts > 0) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  async getPerformanceHistory(hours: number = 24): Promise<PerformanceData[]> {
    // In a real application, this would fetch from a time-series database
    // For now, we'll generate mock historical data
    
    const history: PerformanceData[] = []
    const now = Date.now()
    const intervalMs = (hours * 60 * 60 * 1000) / 100 // 100 data points
    
    for (let i = 99; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs)
      
      history.push({
        timestamp: timestamp.toISOString(),
        cpuUsage: 20 + Math.sin(timestamp.getTime() / 60000) * 20 + Math.random() * 10,
        memoryUsage: 40 + Math.sin(timestamp.getTime() / 120000) * 15 + Math.random() * 5,
        responseTime: 150 + Math.sin(timestamp.getTime() / 180000) * 50 + Math.random() * 30,
        errorRate: Math.max(0, Math.sin(timestamp.getTime() / 300000) * 2 + Math.random() * 1),
        requestCount: 50 + Math.sin(timestamp.getTime() / 240000) * 30 + Math.random() * 20
      })
    }
    
    return history
  }

  async runHealthCheck(): Promise<{ success: boolean; message: string }> {
    try {
      const health = await this.getSystemHealth()
      
      if (health.status === 'unhealthy') {
        return {
          success: false,
          message: `System is unhealthy. ${health.services.filter(s => s.status === 'down').length} services are down.`
        }
      }
      
      if (health.status === 'degraded') {
        return {
          success: true,
          message: `System is operational but degraded. ${health.services.filter(s => s.status === 'degraded').length} services are experiencing issues.`
        }
      }
      
      return {
        success: true,
        message: 'All systems operational'
      }
    } catch (error) {
      return {
        success: false,
        message: `Health check failed: ${(error as Error).message}`
      }
    }
  }

  async getDiskUsage(): Promise<{ path: string; used: number; total: number; percentage: number }[]> {
    // Mock disk usage data
    return [
      {
        path: '/',
        used: 45.6,
        total: 100,
        percentage: 45.6
      },
      {
        path: '/var/log',
        used: 2.1,
        total: 10,
        percentage: 21.0
      },
      {
        path: '/tmp',
        used: 0.8,
        total: 5,
        percentage: 16.0
      }
    ]
  }

  async getNetworkStats(): Promise<{
    inbound: number
    outbound: number
    connections: number
    bandwidth: number
  }> {
    // Mock network statistics
    return {
      inbound: Math.random() * 100 + 50, // MB/s
      outbound: Math.random() * 50 + 20,  // MB/s
      connections: Math.floor(Math.random() * 200) + 50,
      bandwidth: 1000 // Total bandwidth in MB/s
    }
  }

  async clearAlerts(): Promise<number> {
    // In a real system, this would mark alerts as resolved in the database
    // For now, we'll just return a mock count
    return Math.floor(Math.random() * 5)
  }

  startHealthChecks(intervalMinutes: number = 5): () => void {
    const interval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth()
        console.log(`Health check completed - Status: ${health.status}`)
        
        // In a real system, you might want to store these results
        // or trigger notifications for critical issues
      } catch (error) {
        console.error('Health check failed:', error)
      }
    }, intervalMinutes * 60 * 1000)
    
    return () => clearInterval(interval)
  }
}

export const useMonitoringService = () => {
  const { $supabase } = useNuxtApp()
  return new MonitoringService($supabase)
}