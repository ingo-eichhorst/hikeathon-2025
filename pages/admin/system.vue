<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">System Monitoring</h1>
      <div class="flex items-center gap-2">
        <button 
          @click="clearAllAlerts"
          :disabled="clearingAlerts"
          class="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm disabled:opacity-50"
          v-if="systemHealth.alerts.length > 0"
        >
          {{ clearingAlerts ? 'Clearing...' : 'Clear Alerts' }}
        </button>
        <button 
          @click="runHealthCheck"
          :disabled="runningHealthCheck"
          class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          {{ runningHealthCheck ? 'Checking...' : 'Run Health Check' }}
        </button>
      </div>
    </div>

    <!-- Overall System Status -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">System Status</h2>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" :class="getStatusIndicatorClass(systemHealth.status)"></div>
          <span class="font-medium capitalize" :class="getStatusTextClass(systemHealth.status)">
            {{ systemHealth.status }}
          </span>
          <span class="text-sm text-gray-500">
            Last updated: {{ formatTime(systemHealth.timestamp) }}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <!-- Memory Usage -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium">Memory Usage</h3>
            <span class="text-sm text-gray-500">{{ systemHealth.metrics.memory.percentage.toFixed(1) }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div 
              class="h-3 rounded-full transition-all duration-300"
              :class="getMemoryBarClass(systemHealth.metrics.memory.percentage)"
              :style="{ width: systemHealth.metrics.memory.percentage + '%' }"
            ></div>
          </div>
          <p class="text-xs text-gray-500">
            {{ systemHealth.metrics.memory.used.toFixed(1) }}GB / {{ systemHealth.metrics.memory.total }}GB
          </p>
        </div>

        <!-- Database -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium">Database</h3>
            <span class="text-sm text-gray-500">{{ systemHealth.metrics.database.connections }} connections</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div 
              class="bg-blue-600 h-3 rounded-full transition-all duration-300"
              :style="{ width: (systemHealth.metrics.database.connections / systemHealth.metrics.database.maxConnections * 100) + '%' }"
            ></div>
          </div>
          <p class="text-xs text-gray-500">
            Query time: {{ systemHealth.metrics.database.queryTime.toFixed(1) }}ms
          </p>
        </div>

        <!-- API Performance -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium">API Performance</h3>
            <span class="text-sm text-gray-500">{{ systemHealth.metrics.api.requestsPerMinute }}/min</span>
          </div>
          <div class="flex items-center justify-between text-xs text-gray-500">
            <span>Response: {{ systemHealth.metrics.api.averageResponseTime.toFixed(0) }}ms</span>
            <span class="text-red-600" v-if="systemHealth.metrics.api.errorRate > 1">
              Error: {{ systemHealth.metrics.api.errorRate.toFixed(1) }}%
            </span>
            <span class="text-green-600" v-else>
              Error: {{ systemHealth.metrics.api.errorRate.toFixed(1) }}%
            </span>
          </div>
        </div>

        <!-- Storage -->
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-medium">Storage</h3>
            <span class="text-sm text-gray-500">{{ systemHealth.metrics.storage.percentage.toFixed(1) }}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div 
              class="bg-purple-600 h-3 rounded-full transition-all duration-300"
              :style="{ width: systemHealth.metrics.storage.percentage + '%' }"
            ></div>
          </div>
          <p class="text-xs text-gray-500">
            {{ systemHealth.metrics.storage.used.toFixed(1) }}GB / {{ systemHealth.metrics.storage.total }}GB
          </p>
        </div>
      </div>
    </div>

    <!-- Performance Charts -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Performance Metrics (24h)</h2>
        <canvas ref="performanceChart" class="max-h-64"></canvas>
      </div>

      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Resource Usage</h2>
        <canvas ref="resourceChart" class="max-h-64"></canvas>
      </div>
    </div>

    <!-- Services Status -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Services Status</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          v-for="service in systemHealth.services" 
          :key="service.name"
          class="p-4 border rounded-lg"
          :class="getServiceCardClass(service.status)"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold">{{ service.name }}</h3>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" :class="getServiceIndicatorClass(service.status)"></div>
              <span class="text-sm capitalize" :class="getServiceStatusClass(service.status)">
                {{ service.status }}
              </span>
            </div>
          </div>
          
          <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex justify-between">
              <span>Response Time:</span>
              <span>{{ service.responseTime }}ms</span>
            </div>
            <div class="flex justify-between">
              <span>Uptime:</span>
              <span>{{ service.uptime.toFixed(2) }}%</span>
            </div>
            <div class="flex justify-between">
              <span>Last Check:</span>
              <span>{{ formatTime(service.lastCheck) }}</span>
            </div>
            <div v-if="service.endpoint" class="flex justify-between">
              <span>Endpoint:</span>
              <span class="font-mono text-xs">{{ service.endpoint }}</span>
            </div>
            <div v-if="service.details" class="text-red-600 dark:text-red-400 text-xs">
              {{ service.details }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Alerts -->
    <div class="card" v-if="systemHealth.alerts.length > 0">
      <h2 class="text-xl font-semibold mb-4">Active Alerts ({{ systemHealth.alerts.length }})</h2>
      <div class="space-y-3">
        <div 
          v-for="alert in systemHealth.alerts" 
          :key="alert.id"
          class="p-4 rounded-lg border-l-4"
          :class="getAlertClass(alert.type)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="font-semibold">{{ alert.title }}</h3>
                <span class="px-2 py-1 text-xs rounded-full" :class="getAlertBadgeClass(alert.type)">
                  {{ alert.type.toUpperCase() }}
                </span>
                <span v-if="alert.service" class="text-sm text-gray-500">
                  {{ alert.service }}
                </span>
              </div>
              <p class="text-gray-600 dark:text-gray-400 mb-2">{{ alert.message }}</p>
              <p class="text-xs text-gray-500">{{ formatTime(alert.timestamp) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Additional System Information -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Disk Usage -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Disk Usage</h2>
        <div class="space-y-3">
          <div v-for="disk in diskUsage" :key="disk.path" class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex justify-between items-center mb-1">
                <span class="font-medium">{{ disk.path }}</span>
                <span class="text-sm text-gray-500">{{ disk.percentage.toFixed(1) }}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :class="getDiskUsageBarClass(disk.percentage)"
                  :style="{ width: disk.percentage + '%' }"
                ></div>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ disk.used.toFixed(1) }}GB / {{ disk.total }}GB
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Network Statistics -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Network Statistics</h2>
        <div class="space-y-4">
          <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span>Inbound Traffic</span>
            <span class="font-semibold">{{ networkStats.inbound.toFixed(1) }} MB/s</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span>Outbound Traffic</span>
            <span class="font-semibold">{{ networkStats.outbound.toFixed(1) }} MB/s</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span>Active Connections</span>
            <span class="font-semibold">{{ networkStats.connections }}</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <span>Bandwidth Usage</span>
            <div class="flex items-center gap-2">
              <div class="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  :style="{ width: ((networkStats.inbound + networkStats.outbound) / networkStats.bandwidth * 100) + '%' }"
                ></div>
              </div>
              <span class="text-sm font-semibold">{{ (((networkStats.inbound + networkStats.outbound) / networkStats.bandwidth) * 100).toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Messages -->
    <div v-if="statusMessage" class="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50" :class="getStatusMessageClass(statusMessage.type)">
      {{ statusMessage.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import Chart from 'chart.js/auto'
import type { SystemHealth, PerformanceData } from '~/services/monitoring'

const monitoringService = useMonitoringService()

const systemHealth = ref<SystemHealth>({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  services: [],
  metrics: {
    memory: { used: 0, total: 16, percentage: 0 },
    database: { connections: 0, maxConnections: 100, queryTime: 0 },
    api: { requestsPerMinute: 0, errorRate: 0, averageResponseTime: 0 },
    storage: { used: 0, total: 100, percentage: 0 }
  },
  alerts: []
})

const performanceHistory = ref<PerformanceData[]>([])
const diskUsage = ref<{ path: string; used: number; total: number; percentage: number }[]>([])
const networkStats = ref({
  inbound: 0,
  outbound: 0,
  connections: 0,
  bandwidth: 1000
})

const runningHealthCheck = ref(false)
const clearingAlerts = ref(false)
const statusMessage = ref<{ type: string; message: string } | null>(null)

const performanceChart = ref<HTMLCanvasElement>()
const resourceChart = ref<HTMLCanvasElement>()

let performanceChartInstance: Chart | null = null
let resourceChartInstance: Chart | null = null

const loadSystemHealth = async () => {
  try {
    systemHealth.value = await monitoringService.getSystemHealth()
  } catch (error) {
    console.error('Error loading system health:', error)
    showStatus('error', 'Failed to load system health data')
  }
}

const loadPerformanceHistory = async () => {
  try {
    performanceHistory.value = await monitoringService.getPerformanceHistory(24)
    await nextTick()
    renderCharts()
  } catch (error) {
    console.error('Error loading performance history:', error)
  }
}

const loadAdditionalMetrics = async () => {
  try {
    diskUsage.value = await monitoringService.getDiskUsage()
    networkStats.value = await monitoringService.getNetworkStats()
  } catch (error) {
    console.error('Error loading additional metrics:', error)
  }
}

const runHealthCheck = async () => {
  try {
    runningHealthCheck.value = true
    const result = await monitoringService.runHealthCheck()
    
    if (result.success) {
      showStatus('success', result.message)
    } else {
      showStatus('error', result.message)
    }
    
    await loadSystemHealth()
  } catch (error) {
    console.error('Error running health check:', error)
    showStatus('error', 'Failed to run health check')
  } finally {
    runningHealthCheck.value = false
  }
}

const clearAllAlerts = async () => {
  try {
    clearingAlerts.value = true
    const clearedCount = await monitoringService.clearAlerts()
    showStatus('success', `Cleared ${clearedCount} alerts`)
    await loadSystemHealth()
  } catch (error) {
    console.error('Error clearing alerts:', error)
    showStatus('error', 'Failed to clear alerts')
  } finally {
    clearingAlerts.value = false
  }
}

const renderCharts = () => {
  renderPerformanceChart()
  renderResourceChart()
}

const renderPerformanceChart = () => {
  if (!performanceChart.value || !performanceHistory.value.length) return

  if (performanceChartInstance) {
    performanceChartInstance.destroy()
  }

  const ctx = performanceChart.value.getContext('2d')
  if (!ctx) return

  performanceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: performanceHistory.value.map(item => 
        new Date(item.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      ),
      datasets: [
        {
          label: 'Response Time (ms)',
          data: performanceHistory.value.map(item => item.responseTime),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y'
        },
        {
          label: 'Error Rate (%)',
          data: performanceHistory.value.map(item => item.errorRate),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Response Time (ms)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Error Rate (%)'
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      }
    }
  })
}

const renderResourceChart = () => {
  if (!resourceChart.value || !performanceHistory.value.length) return

  if (resourceChartInstance) {
    resourceChartInstance.destroy()
  }

  const ctx = resourceChart.value.getContext('2d')
  if (!ctx) return

  resourceChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: performanceHistory.value.map(item => 
        new Date(item.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      ),
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: performanceHistory.value.map(item => item.cpuUsage),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true
        },
        {
          label: 'Memory Usage (%)',
          data: performanceHistory.value.map(item => item.memoryUsage),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Usage (%)'
          }
        }
      }
    }
  })
}

const showStatus = (type: string, message: string) => {
  statusMessage.value = { type, message }
  setTimeout(() => {
    statusMessage.value = null
  }, 3000)
}

// Utility functions
const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString()
}

const getStatusIndicatorClass = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'bg-green-500 animate-pulse'
    case 'degraded':
      return 'bg-yellow-500 animate-pulse'
    case 'unhealthy':
      return 'bg-red-500 animate-pulse'
    default:
      return 'bg-gray-500'
  }
}

const getStatusTextClass = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'text-green-600 dark:text-green-400'
    case 'degraded':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'unhealthy':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

const getMemoryBarClass = (percentage: number) => {
  if (percentage > 80) return 'bg-red-600'
  if (percentage > 60) return 'bg-yellow-600'
  return 'bg-green-600'
}

const getServiceCardClass = (status: string) => {
  switch (status) {
    case 'up':
      return 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/10'
    case 'degraded':
      return 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
    case 'down':
      return 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
    default:
      return 'border-gray-300 dark:border-gray-600'
  }
}

const getServiceIndicatorClass = (status: string) => {
  switch (status) {
    case 'up':
      return 'bg-green-500'
    case 'degraded':
      return 'bg-yellow-500'
    case 'down':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

const getServiceStatusClass = (status: string) => {
  switch (status) {
    case 'up':
      return 'text-green-600 dark:text-green-400'
    case 'degraded':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'down':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

const getAlertClass = (type: string) => {
  switch (type) {
    case 'critical':
      return 'bg-red-50 border-red-500 dark:bg-red-900/10'
    case 'error':
      return 'bg-red-50 border-red-500 dark:bg-red-900/10'
    case 'warning':
      return 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/10'
    case 'info':
      return 'bg-blue-50 border-blue-500 dark:bg-blue-900/10'
    default:
      return 'bg-gray-50 border-gray-500 dark:bg-gray-900/10'
  }
}

const getAlertBadgeClass = (type: string) => {
  switch (type) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'info':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

const getDiskUsageBarClass = (percentage: number) => {
  if (percentage > 90) return 'bg-red-600'
  if (percentage > 75) return 'bg-yellow-600'
  return 'bg-blue-600'
}

const getStatusMessageClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800 border border-green-200'
    case 'error':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-blue-100 text-blue-800 border border-blue-200'
  }
}

// Initialize
onMounted(async () => {
  await loadSystemHealth()
  await loadPerformanceHistory()
  await loadAdditionalMetrics()
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(async () => {
    await loadSystemHealth()
    await loadAdditionalMetrics()
  }, 30000)
  
  // Refresh performance charts every 5 minutes
  const chartInterval = setInterval(async () => {
    await loadPerformanceHistory()
  }, 300000)
  
  onUnmounted(() => {
    clearInterval(interval)
    clearInterval(chartInterval)
    if (performanceChartInstance) performanceChartInstance.destroy()
    if (resourceChartInstance) resourceChartInstance.destroy()
  })
})

useHead({
  title: 'System Monitoring - Admin'
})

definePageMeta({
  middleware: 'admin'
})
</script>