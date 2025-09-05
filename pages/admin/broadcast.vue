<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Broadcast Management</h1>
      <button 
        @click="showCreateForm = true"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        New Broadcast
      </button>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Broadcasts</p>
            <p class="text-2xl font-bold">{{ stats.total }}</p>
          </div>
          <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats.active }}</p>
          </div>
          <div class="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <div class="w-6 h-6 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Expired</p>
            <p class="text-2xl font-bold text-gray-600 dark:text-gray-400">{{ stats.expired }}</p>
          </div>
          <div class="p-3 bg-gray-100 dark:bg-gray-900 rounded-full">
            <svg class="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Urgent Priority</p>
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ stats.byPriority.urgent }}</p>
          </div>
          <div class="p-3 bg-red-100 dark:bg-red-900 rounded-full">
            <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Chart -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Recent Activity (Last 7 Days)</h2>
      <canvas ref="activityChart" class="max-h-64"></canvas>
    </div>

    <!-- Filters -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Filters</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Priority</label>
          <select 
            v-model="filters.priority" 
            @change="loadBroadcasts"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Status</label>
          <select 
            v-model="filters.active" 
            @change="loadBroadcasts"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">All Statuses</option>
            <option :value="true">Active</option>
            <option :value="false">Inactive</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Expiry Status</label>
          <select 
            v-model="filters.expired" 
            @change="loadBroadcasts"
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="">All</option>
            <option :value="false">Not Expired</option>
            <option :value="true">Expired</option>
          </select>
        </div>

        <div class="flex items-end">
          <button 
            @click="clearFilters" 
            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Broadcast List -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">Broadcasts</h2>
        <div class="flex gap-2">
          <button 
            @click="expireOldBroadcasts"
            :disabled="expiringBroadcasts"
            class="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm disabled:opacity-50"
          >
            {{ expiringBroadcasts ? 'Expiring...' : 'Expire Old' }}
          </button>
          <button 
            @click="loadBroadcasts" 
            :disabled="loading"
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
          >
            {{ loading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="broadcasts.length === 0" class="text-center py-8 text-gray-500">
        No broadcasts found matching your criteria.
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="broadcast in broadcasts" 
          :key="broadcast.id" 
          class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          :class="getBroadcastCardClass(broadcast)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="font-semibold">{{ broadcast.title }}</h3>
                <span class="px-2 py-1 text-xs rounded-full" :class="getPriorityClass(broadcast.priority)">
                  {{ broadcast.priority.toUpperCase() }}
                </span>
                <span class="px-2 py-1 text-xs rounded-full" :class="getStatusClass(broadcast)">
                  {{ getBroadcastStatus(broadcast) }}
                </span>
              </div>
              <p class="text-gray-600 dark:text-gray-400 mb-2">{{ broadcast.message }}</p>
              <div class="flex items-center gap-4 text-sm text-gray-500">
                <span>Created: {{ formatDate(broadcast.created_at) }}</span>
                <span v-if="broadcast.expires_at">
                  Expires: {{ formatDate(broadcast.expires_at) }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 ml-4">
              <button 
                @click="sendRealtime(broadcast)"
                :disabled="sendingRealtime[broadcast.id]"
                class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
                title="Send as realtime broadcast"
              >
                {{ sendingRealtime[broadcast.id] ? 'Sending...' : 'Send Live' }}
              </button>
              <button 
                @click="toggleBroadcastStatus(broadcast)"
                :disabled="togglingStatus[broadcast.id]"
                class="px-3 py-1 rounded text-sm disabled:opacity-50"
                :class="broadcast.active ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'"
              >
                {{ togglingStatus[broadcast.id] ? 'Updating...' : (broadcast.active ? 'Deactivate' : 'Activate') }}
              </button>
              <button 
                @click="editBroadcast(broadcast)"
                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Edit
              </button>
              <button 
                @click="deleteBroadcast(broadcast)"
                :disabled="deleting[broadcast.id]"
                class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
              >
                {{ deleting[broadcast.id] ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Form Modal -->
    <div v-if="showCreateForm || editingBroadcast" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 class="text-2xl font-semibold mb-4">
          {{ editingBroadcast ? 'Edit Broadcast' : 'Create New Broadcast' }}
        </h2>
        
        <form @submit.prevent="submitBroadcast" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Title</label>
            <input 
              v-model="form.title"
              type="text" 
              required
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              placeholder="Enter broadcast title..."
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Message</label>
            <textarea 
              v-model="form.message"
              required
              rows="4"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              placeholder="Enter broadcast message..."
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2">Priority</label>
              <select 
                v-model="form.priority"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">Expires At (Optional)</label>
              <input 
                v-model="form.expires_at"
                type="datetime-local" 
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input 
              v-model="form.active"
              type="checkbox" 
              id="active"
              class="rounded"
            />
            <label for="active" class="text-sm font-medium">Active immediately</label>
          </div>

          <div class="flex items-center justify-end gap-4 pt-4">
            <button 
              type="button" 
              @click="cancelForm"
              class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              :disabled="submitting"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {{ submitting ? 'Saving...' : (editingBroadcast ? 'Update Broadcast' : 'Create Broadcast') }}
            </button>
          </div>
        </form>
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
import type { BroadcastRecord, BroadcastFormData, BroadcastFilters, BroadcastStats } from '~/services/broadcast'

const { $supabase } = useNuxtApp()
const broadcastService = useBroadcastService()

const broadcasts = ref<BroadcastRecord[]>([])
const stats = ref<BroadcastStats>({
  total: 0,
  active: 0,
  expired: 0,
  byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
  recentActivity: []
})

const loading = ref(true)
const submitting = ref(false)
const expiringBroadcasts = ref(false)
const showCreateForm = ref(false)
const editingBroadcast = ref<BroadcastRecord | null>(null)

const deleting = ref<Record<string, boolean>>({})
const togglingStatus = ref<Record<string, boolean>>({})
const sendingRealtime = ref<Record<string, boolean>>({})

const filters = ref<BroadcastFilters>({})
const statusMessage = ref<{ type: string; message: string } | null>(null)
const activityChart = ref<HTMLCanvasElement>()

const form = ref<BroadcastFormData>({
  title: '',
  message: '',
  priority: 'normal',
  expires_at: '',
  active: true
})

let chartInstance: Chart | null = null

const loadBroadcasts = async () => {
  try {
    loading.value = true
    broadcasts.value = await broadcastService.getBroadcasts(filters.value)
  } catch (error) {
    showStatus('error', 'Failed to load broadcasts')
    console.error('Error loading broadcasts:', error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    stats.value = await broadcastService.getBroadcastStats()
    await nextTick()
    renderActivityChart()
  } catch (error) {
    console.error('Error loading stats:', error)
  }
}

const renderActivityChart = () => {
  if (!activityChart.value || !stats.value.recentActivity.length) return

  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = activityChart.value.getContext('2d')
  if (!ctx) return

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: stats.value.recentActivity.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
      ),
      datasets: [{
        label: 'Broadcasts Created',
        data: stats.value.recentActivity.map(item => item.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  })
}

const submitBroadcast = async () => {
  try {
    submitting.value = true
    
    if (editingBroadcast.value) {
      await broadcastService.updateBroadcast(editingBroadcast.value.id, form.value)
      showStatus('success', 'Broadcast updated successfully')
    } else {
      const newBroadcast = await broadcastService.createBroadcast(form.value)
      showStatus('success', 'Broadcast created successfully')
      
      // Optionally send as realtime if active
      if (form.value.active) {
        await broadcastService.sendRealtimeBroadcast(newBroadcast)
      }
    }
    
    cancelForm()
    await loadBroadcasts()
    await loadStats()
  } catch (error) {
    showStatus('error', 'Failed to save broadcast')
    console.error('Error saving broadcast:', error)
  } finally {
    submitting.value = false
  }
}

const editBroadcast = (broadcast: BroadcastRecord) => {
  editingBroadcast.value = broadcast
  form.value = {
    title: broadcast.title,
    message: broadcast.message,
    priority: broadcast.priority,
    expires_at: broadcast.expires_at ? new Date(broadcast.expires_at).toISOString().slice(0, 16) : '',
    active: broadcast.active
  }
  showCreateForm.value = true
}

const deleteBroadcast = async (broadcast: BroadcastRecord) => {
  if (!confirm(`Are you sure you want to delete "${broadcast.title}"?`)) return
  
  try {
    deleting.value[broadcast.id] = true
    await broadcastService.deleteBroadcast(broadcast.id)
    showStatus('success', 'Broadcast deleted successfully')
    await loadBroadcasts()
    await loadStats()
  } catch (error) {
    showStatus('error', 'Failed to delete broadcast')
    console.error('Error deleting broadcast:', error)
  } finally {
    delete deleting.value[broadcast.id]
  }
}

const toggleBroadcastStatus = async (broadcast: BroadcastRecord) => {
  try {
    togglingStatus.value[broadcast.id] = true
    await broadcastService.toggleBroadcastStatus(broadcast.id)
    showStatus('success', `Broadcast ${broadcast.active ? 'deactivated' : 'activated'}`)
    await loadBroadcasts()
    await loadStats()
  } catch (error) {
    showStatus('error', 'Failed to update broadcast status')
    console.error('Error toggling status:', error)
  } finally {
    delete togglingStatus.value[broadcast.id]
  }
}

const sendRealtime = async (broadcast: BroadcastRecord) => {
  try {
    sendingRealtime.value[broadcast.id] = true
    await broadcastService.sendRealtimeBroadcast(broadcast)
    showStatus('success', 'Broadcast sent to all users')
  } catch (error) {
    showStatus('error', 'Failed to send realtime broadcast')
    console.error('Error sending realtime:', error)
  } finally {
    delete sendingRealtime.value[broadcast.id]
  }
}

const expireOldBroadcasts = async () => {
  try {
    expiringBroadcasts.value = true
    const count = await broadcastService.scheduleExpiry()
    showStatus('success', `Expired ${count} old broadcasts`)
    await loadBroadcasts()
    await loadStats()
  } catch (error) {
    showStatus('error', 'Failed to expire broadcasts')
    console.error('Error expiring broadcasts:', error)
  } finally {
    expiringBroadcasts.value = false
  }
}

const clearFilters = () => {
  filters.value = {}
  loadBroadcasts()
}

const cancelForm = () => {
  showCreateForm.value = false
  editingBroadcast.value = null
  form.value = {
    title: '',
    message: '',
    priority: 'normal',
    expires_at: '',
    active: true
  }
}

const showStatus = (type: string, message: string) => {
  statusMessage.value = { type, message }
  setTimeout(() => {
    statusMessage.value = null
  }, 3000)
}

// Utility functions
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString()
}

const getBroadcastStatus = (broadcast: BroadcastRecord) => {
  const now = new Date()
  const isExpired = broadcast.expires_at && new Date(broadcast.expires_at) < now
  
  if (isExpired) return 'EXPIRED'
  if (!broadcast.active) return 'INACTIVE'
  return 'ACTIVE'
}

const getBroadcastCardClass = (broadcast: BroadcastRecord) => {
  const now = new Date()
  const isExpired = broadcast.expires_at && new Date(broadcast.expires_at) < now
  
  if (isExpired) return 'opacity-60 border-gray-300 dark:border-gray-600'
  if (!broadcast.active) return 'opacity-75 border-yellow-300 dark:border-yellow-600'
  if (broadcast.priority === 'urgent') return 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10'
  if (broadcast.priority === 'high') return 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/10'
  return ''
}

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'low':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
}

const getStatusClass = (broadcast: BroadcastRecord) => {
  const status = getBroadcastStatus(broadcast)
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'EXPIRED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    default:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }
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
  await loadBroadcasts()
  await loadStats()
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(async () => {
    await loadBroadcasts()
    await loadStats()
  }, 30000)
  
  onUnmounted(() => {
    clearInterval(interval)
    if (chartInstance) {
      chartInstance.destroy()
    }
  })
})

useHead({
  title: 'Broadcast Management - Admin'
})

definePageMeta({
  middleware: 'admin'
})
</script>