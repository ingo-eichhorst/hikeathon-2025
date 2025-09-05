<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              Telemetry Dashboard
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Real-time analytics and usage metrics
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <select
              v-model="selectedTeam"
              @change="refreshData"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              data-testid="team-filter"
            >
              <option value="">All Teams</option>
              <option v-for="team in uniqueTeams" :key="team" :value="team">
                {{ team }}
              </option>
            </select>
            <button
              @click="exportData"
              data-testid="export-csv"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Export CSV
            </button>
            <button
              @click="refreshData"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Key Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Requests</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white" data-testid="total-requests">
                {{ formatNumber(metrics.totalRequests) }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tokens</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ formatNumber(metrics.totalTokens) }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Images</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ formatNumber(metrics.totalImages) }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Errors</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ formatNumber(metrics.totalErrors) }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Active Teams</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-white">
                {{ metrics.uniqueTeams }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Requests Chart -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Requests Over Time</h3>
          <div class="h-64">
            <canvas ref="requestsChart" data-testid="requests-chart"></canvas>
          </div>
        </div>

        <!-- Tokens Chart -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Token Usage</h3>
          <div class="h-64">
            <canvas ref="tokensChart" data-testid="tokens-chart"></canvas>
          </div>
        </div>

        <!-- Errors Chart -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Error Distribution</h3>
          <div class="h-64">
            <canvas ref="errorsChart" data-testid="errors-chart"></canvas>
          </div>
        </div>

        <!-- Response Time Chart -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Average Response Time</h3>
          <div class="h-64">
            <canvas ref="responseTimeChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Team Statistics -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Team Statistics</h3>
        </div>
        <div class="overflow-x-auto" data-testid="team-stats">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Team
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Requests
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tokens
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Images
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Errors
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="team in metrics.teamStats" :key="team.teamId">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {{ team.teamName }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ formatNumber(team.requests) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ formatNumber(team.tokens) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ formatNumber(team.images) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ formatNumber(team.errors) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatTime(team.lastActivity) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Model Usage -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">Most Popular Models</h3>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div v-for="model in metrics.topModels" :key="model.model" class="flex items-center justify-between">
              <div class="flex-1">
                <h4 class="text-sm font-medium text-gray-900 dark:text-white">{{ getModelDisplayName(model.model) }}</h4>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    class="bg-blue-600 h-2 rounded-full" 
                    :style="`width: ${getModelPercentage(model.requests)}%`"
                  ></div>
                </div>
              </div>
              <div class="ml-4 text-right">
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatNumber(model.requests) }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatNumber(model.tokens) }} tokens</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js'
import type { TelemetryMetrics } from '~/services/telemetry'

// Register Chart.js components
Chart.register(...registerables)

const telemetryService = useTelemetryService()
const adminStore = useAdminStore()

// Reactive state
const metrics = ref<TelemetryMetrics>({
  totalRequests: 0,
  totalTokens: 0,
  totalImages: 0,
  totalErrors: 0,
  uniqueTeams: 0,
  averageResponseTime: 0,
  hourlyStats: [],
  teamStats: [],
  topModels: [],
  errorsByType: []
})

const selectedTeam = ref('')
const uniqueTeams = ref<string[]>([])

// Chart refs
const requestsChart = ref<HTMLCanvasElement>()
const tokensChart = ref<HTMLCanvasElement>()
const errorsChart = ref<HTMLCanvasElement>()
const responseTimeChart = ref<HTMLCanvasElement>()

// Chart instances
let requestsChartInstance: Chart | null = null
let tokensChartInstance: Chart | null = null
let errorsChartInstance: Chart | null = null
let responseTimeChartInstance: Chart | null = null

const refreshData = () => {
  const filters: any = {}
  if (selectedTeam.value) {
    filters.teamId = selectedTeam.value
  }
  
  // Get last 24 hours of data
  filters.from = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  metrics.value = telemetryService.getMetrics(filters)
  
  // Get unique teams for filter
  const events = telemetryService.getEvents({})
  uniqueTeams.value = [...new Set(events.map(e => e.teamId).filter(Boolean))]
  
  // Update charts
  nextTick(() => {
    updateCharts()
  })

  // Log admin action
  adminStore.logAction('view_telemetry', 'telemetry', {
    filters,
    metricsCount: {
      requests: metrics.value.totalRequests,
      tokens: metrics.value.totalTokens,
      images: metrics.value.totalImages,
      errors: metrics.value.totalErrors
    }
  })
}

const updateCharts = () => {
  if (requestsChart.value) {
    if (requestsChartInstance) {
      requestsChartInstance.destroy()
    }
    requestsChartInstance = createRequestsChart()
  }
  
  if (tokensChart.value) {
    if (tokensChartInstance) {
      tokensChartInstance.destroy()
    }
    tokensChartInstance = createTokensChart()
  }
  
  if (errorsChart.value) {
    if (errorsChartInstance) {
      errorsChartInstance.destroy()
    }
    errorsChartInstance = createErrorsChart()
  }
  
  if (responseTimeChart.value) {
    if (responseTimeChartInstance) {
      responseTimeChartInstance.destroy()
    }
    responseTimeChartInstance = createResponseTimeChart()
  }
}

const createRequestsChart = () => {
  const ctx = requestsChart.value!.getContext('2d')!
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: metrics.value.hourlyStats.map(h => new Date(h.hour).getHours() + ':00'),
      datasets: [{
        label: 'Requests',
        data: metrics.value.hourlyStats.map(h => h.requests),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  })
}

const createTokensChart = () => {
  const ctx = tokensChart.value!.getContext('2d')!
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: metrics.value.hourlyStats.map(h => new Date(h.hour).getHours() + ':00'),
      datasets: [{
        label: 'Tokens',
        data: metrics.value.hourlyStats.map(h => h.tokens),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  })
}

const createErrorsChart = () => {
  const ctx = errorsChart.value!.getContext('2d')!
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: metrics.value.errorsByType.map(e => e.type),
      datasets: [{
        data: metrics.value.errorsByType.map(e => e.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  })
}

const createResponseTimeChart = () => {
  const ctx = responseTimeChart.value!.getContext('2d')!
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: metrics.value.hourlyStats.map(h => new Date(h.hour).getHours() + ':00'),
      datasets: [{
        label: 'Response Time (ms)',
        data: metrics.value.hourlyStats.map(h => h.responseTime),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      }
    }
  })
}

const exportData = () => {
  const data = telemetryService.getEvents({ 
    teamId: selectedTeam.value || undefined 
  })
  
  // Convert to CSV
  const headers = ['timestamp', 'teamId', 'teamName', 'event', 'data']
  const csvContent = [
    headers.join(','),
    ...data.map(event => [
      event.timestamp,
      event.teamId || '',
      event.teamName || '',
      event.event,
      JSON.stringify(event.data).replace(/,/g, ';')
    ].join(','))
  ].join('\n')
  
  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `telemetry-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)

  adminStore.logAction('export_telemetry', 'telemetry', {
    teamFilter: selectedTeam.value,
    recordCount: data.length
  })
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num)
}

const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString()
}

const getModelDisplayName = (model: string): string => {
  return model.split('/').pop()?.replace(/[-_]/g, ' ') || model
}

const getModelPercentage = (requests: number): number => {
  const total = metrics.value.topModels.reduce((sum, m) => sum + m.requests, 0)
  return total > 0 ? (requests / total) * 100 : 0
}

// Auto-refresh every 30 seconds
onMounted(() => {
  refreshData()
  
  const interval = setInterval(() => {
    refreshData()
  }, 30000)
  
  onUnmounted(() => {
    clearInterval(interval)
    if (requestsChartInstance) requestsChartInstance.destroy()
    if (tokensChartInstance) tokensChartInstance.destroy()
    if (errorsChartInstance) errorsChartInstance.destroy()
    if (responseTimeChartInstance) responseTimeChartInstance.destroy()
  })
})

useHead({
  title: 'Telemetry Dashboard - Admin'
})

definePageMeta({
  middleware: 'admin'
})
</script>