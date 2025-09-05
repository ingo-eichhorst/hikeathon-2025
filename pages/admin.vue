<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Admin Panel</h1>
    
    <div class="card">
      <p class="text-gray-600 dark:text-gray-400">
        Redirecting to admin dashboard...
      </p>
    </div>
    
    <!-- Legacy Broadcast Section (moved to /admin/broadcast) -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Send Broadcast</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Message</label>
          <textarea
            v-model="broadcastMessage"
            rows="3"
            placeholder="Enter broadcast message..."
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          ></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Type</label>
          <select
            v-model="broadcastType"
            class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
        
        <button
          @click="sendBroadcastMessage"
          :disabled="!broadcastMessage.trim() || sendingBroadcast"
          data-testid="send-broadcast"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {{ sendingBroadcast ? 'Sending...' : 'Send Broadcast' }}
        </button>
        
        <div v-if="broadcastStatus" class="p-3 rounded-lg" :class="getStatusClass(broadcastStatus.type)">
          {{ broadcastStatus.message }}
        </div>
      </div>
    </div>
    
    <!-- Active Teams Section -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Active Teams</h2>
      
      <div v-if="activeTeams.length === 0" class="text-gray-500">
        No teams currently online
      </div>
      
      <div v-else class="space-y-2">
        <div v-for="team in activeTeams" :key="team.teamId" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <span class="font-medium">{{ team.teamName }}</span>
            <span class="ml-2 text-sm text-gray-500">
              (ID: {{ team.teamId }})
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-1 rounded-full" :class="getStatusBadgeClass(team.status)">
              {{ team.status || 'active' }}
            </span>
            <span class="text-xs text-gray-500">
              {{ formatOnlineTime(team.onlineAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Connection Status -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Connection Status</h2>
      
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full" :class="getConnectionClass(connectionState)"></div>
        <span class="capitalize">{{ connectionState }}</span>
      </div>
    </div>
    
    <!-- Recent Broadcasts -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Recent Broadcasts</h2>
      
      <div v-if="recentBroadcasts.length === 0" class="text-gray-500">
        No broadcasts sent yet
      </div>
      
      <div v-else class="space-y-2">
        <div v-for="broadcast in recentBroadcasts" :key="broadcast.id" class="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p>{{ broadcast.message }}</p>
              <div class="mt-1 flex items-center gap-2 text-xs text-gray-500">
                <span v-if="broadcast.from">From: {{ broadcast.from }}</span>
                <span>{{ formatTime(broadcast.timestamp) }}</span>
                <span class="px-2 py-0.5 rounded-full text-xs" :class="getBadgeClass(broadcast.type)">
                  {{ broadcast.type }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const { sendBroadcast, broadcasts, presence, connectionState } = useRealtime()

const broadcastMessage = ref('')
const broadcastType = ref<'info' | 'success' | 'warning' | 'error'>('info')
const sendingBroadcast = ref(false)
const broadcastStatus = ref<{ type: string; message: string } | null>(null)

const activeTeams = computed(() => {
  return Array.from(presence.value.values())
})

const recentBroadcasts = computed(() => {
  return broadcasts.value.slice(0, 10)
})

const sendBroadcastMessage = async () => {
  if (!broadcastMessage.value.trim() || sendingBroadcast.value) return
  
  sendingBroadcast.value = true
  broadcastStatus.value = null
  
  try {
    await sendBroadcast(broadcastMessage.value, broadcastType.value)
    broadcastStatus.value = {
      type: 'success',
      message: 'Broadcast sent successfully!'
    }
    broadcastMessage.value = ''
    
    setTimeout(() => {
      broadcastStatus.value = null
    }, 3000)
  } catch (error) {
    console.error('Error sending broadcast:', error)
    broadcastStatus.value = {
      type: 'error',
      message: 'Failed to send broadcast'
    }
  } finally {
    sendingBroadcast.value = false
  }
}

const getStatusClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
}

const getBadgeClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  }
}

const getStatusBadgeClass = (status?: string) => {
  return status === 'idle'
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
}

const getConnectionClass = (state: string) => {
  switch (state) {
    case 'connected':
      return 'bg-green-500 animate-pulse'
    case 'connecting':
      return 'bg-yellow-500 animate-pulse'
    default:
      return 'bg-red-500'
  }
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

const formatOnlineTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) {
    return 'Just now'
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  } else {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  }
}

// Redirect to new admin dashboard
onMounted(() => {
  navigateTo('/admin/dashboard')
})

useHead({
  title: 'Admin - HIKEathon 2025'
})

definePageMeta({
  middleware: 'admin'
})
</script>