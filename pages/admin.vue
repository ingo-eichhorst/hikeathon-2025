<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Admin Panel</h1>

    <!-- Countdown Management Section -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Countdown Management</h2>

      <!-- Current Countdown Display -->
      <div v-if="currentCountdown" class="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 class="font-semibold mb-2">Current Active Countdown</h3>
        <div class="space-y-1 text-sm">
          <p><strong>Title:</strong> {{ currentCountdown.title }}</p>
          <p><strong>Deadline:</strong> {{ formatDeadline(currentCountdown.deadline) }}</p>
          <p><strong>Status:</strong>
            <span class="px-2 py-1 rounded text-xs" :class="currentCountdown.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'">
              {{ currentCountdown.active ? 'Active' : 'Inactive' }}
            </span>
          </p>
        </div>
      </div>

      <form @submit.prevent="saveCountdown" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">
            Title / Deadline Text
          </label>
          <input
            v-model="countdownForm.title"
            type="text"
            placeholder="e.g., Submission Deadline, Event Starts In..."
            required
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">
            Deadline Date & Time
          </label>
          <input
            v-model="countdownForm.deadline"
            type="datetime-local"
            required
            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          />
          <p class="text-xs text-gray-500 mt-1">
            Countdown will be visible until 5 minutes after this deadline
          </p>
        </div>

        <div class="flex items-center gap-2">
          <input
            v-model="countdownForm.active"
            type="checkbox"
            id="countdown-active-checkbox"
            class="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
          />
          <label for="countdown-active-checkbox" class="text-sm font-medium">
            Active (visible to users)
          </label>
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="savingCountdown"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 text-sm"
          >
            {{ savingCountdown ? 'Saving...' : (currentCountdown ? 'Update' : 'Create') }}
          </button>

          <button
            v-if="currentCountdown"
            type="button"
            @click="deactivateCountdown"
            :disabled="savingCountdown"
            class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg disabled:opacity-50 text-sm"
          >
            Deactivate
          </button>

          <button
            v-if="currentCountdown"
            type="button"
            @click="deleteCountdown"
            :disabled="savingCountdown"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 text-sm"
          >
            Delete
          </button>
        </div>

        <div v-if="countdownMessage" class="p-3 rounded-lg text-sm" :class="getStatusClass(countdownMessage.type)">
          {{ countdownMessage.text }}
        </div>
      </form>
    </div>

    <!-- Broadcast Section -->
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
    
    <!-- Connection Status & Broadcast Tester -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Connection Status & Broadcast Tester</h2>

      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full" :class="getConnectionClass(connectionState)"></div>
          <span class="capitalize">{{ connectionState }}</span>
          <span v-if="!isSupabaseAvailable" class="text-sm text-yellow-600 dark:text-yellow-400">
            (Realtime unavailable)
          </span>
        </div>

        <!-- Broadcast Test -->
        <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 class="font-medium mb-2">Test Broadcast Channel</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Send a test message to verify broadcast functionality
          </p>

          <div class="flex gap-2">
            <input
              v-model="testMessage"
              type="text"
              placeholder="Test message..."
              class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
            <button
              @click="sendTestBroadcast"
              :disabled="!testMessage.trim() || !isSupabaseAvailable"
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
            >
              Test
            </button>
          </div>

          <div v-if="testResult" class="mt-3 p-2 rounded text-sm" :class="testResult.success ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'">
            {{ testResult.message }}
          </div>
        </div>

        <!-- Received Broadcasts -->
        <div class="mt-4">
          <h3 class="font-medium mb-2">Received Test Messages</h3>
          <div v-if="receivedTests.length === 0" class="text-sm text-gray-500">
            No test messages received yet
          </div>
          <div v-else class="space-y-1">
            <div v-for="(msg, idx) in receivedTests" :key="idx" class="text-sm p-2 bg-blue-50 dark:bg-blue-900 rounded">
              {{ msg }}
            </div>
          </div>
        </div>
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
import { ref, computed, watch, onMounted } from 'vue'

const { $supabase } = useNuxtApp()
const { sendBroadcast, broadcasts, presence, connectionState, isSupabaseAvailable } = useRealtime()

const broadcastMessage = ref('')
const broadcastType = ref<'info' | 'success' | 'warning' | 'error'>('info')
const sendingBroadcast = ref(false)
const broadcastStatus = ref<{ type: string; message: string } | null>(null)

// Countdown management
const currentCountdown = ref<any>(null)
const savingCountdown = ref(false)
const countdownMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const countdownForm = ref({
  title: '',
  deadline: '',
  active: true
})

// Broadcast tester
const testMessage = ref('')
const testResult = ref<{ success: boolean; message: string } | null>(null)
const receivedTests = ref<string[]>([])

// Watch for incoming test broadcasts
watch(broadcasts, (newBroadcasts) => {
  const latestBroadcast = newBroadcasts[0]
  if (latestBroadcast && latestBroadcast.from === 'test') {
    receivedTests.value.unshift(`${latestBroadcast.message} (${new Date(latestBroadcast.timestamp).toLocaleTimeString()})`)
    if (receivedTests.value.length > 5) {
      receivedTests.value = receivedTests.value.slice(0, 5)
    }
  }
})

const activeTeams = computed(() => {
  return Array.from(presence.value.values())
})

const recentBroadcasts = computed(() => {
  return broadcasts.value.slice(0, 10)
})

const sendTestBroadcast = async () => {
  if (!testMessage.value.trim()) return

  testResult.value = null

  try {
    console.log('Sending test broadcast:', testMessage.value)
    console.log('Connection state:', connectionState.value)
    console.log('Supabase available:', isSupabaseAvailable.value)

    await sendBroadcast(testMessage.value, 'info', 'test')

    console.log('Broadcast sent, current broadcasts:', broadcasts.value)

    testResult.value = {
      success: true,
      message: `✓ Test broadcast sent successfully! Connection: ${connectionState.value}`
    }
    testMessage.value = ''

    setTimeout(() => {
      testResult.value = null
    }, 3000)
  } catch (error) {
    console.error('Test broadcast error:', error)
    testResult.value = {
      success: false,
      message: `✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

const sendBroadcastMessage = async () => {
  if (!broadcastMessage.value.trim() || sendingBroadcast.value) return

  sendingBroadcast.value = true
  broadcastStatus.value = null

  try {
    await sendBroadcast(broadcastMessage.value, broadcastType.value, 'Admin')
    broadcastStatus.value = {
      type: 'success',
      message: 'Broadcast sent and saved to database successfully!'
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

// Countdown functions
const formatDeadline = (deadline: string) => {
  return new Date(deadline).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  })
}

const loadCurrentCountdown = async () => {
  try {
    const { data, error } = await $supabase
      .from('countdowns')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (data) {
      currentCountdown.value = data
      countdownForm.value = {
        title: data.title,
        deadline: new Date(data.deadline).toISOString().slice(0, 16),
        active: data.active
      }
    }
  } catch (error) {
    console.error('Failed to load countdown:', error)
  }
}

const saveCountdown = async () => {
  savingCountdown.value = true
  countdownMessage.value = null

  try {
    const countdownData = {
      title: countdownForm.value.title,
      deadline: new Date(countdownForm.value.deadline).toISOString(),
      active: countdownForm.value.active
    }

    if (currentCountdown.value) {
      const { error } = await $supabase
        .from('countdowns')
        .update(countdownData)
        .eq('id', currentCountdown.value.id)

      if (error) throw error

      countdownMessage.value = {
        type: 'success',
        text: 'Countdown updated successfully!'
      }
    } else {
      await $supabase
        .from('countdowns')
        .update({ active: false })
        .eq('active', true)

      const { error } = await $supabase
        .from('countdowns')
        .insert([countdownData])

      if (error) throw error

      countdownMessage.value = {
        type: 'success',
        text: 'Countdown created successfully!'
      }
    }

    await loadCurrentCountdown()

    setTimeout(() => {
      countdownMessage.value = null
    }, 3000)
  } catch (error: any) {
    console.error('Failed to save countdown:', error)
    countdownMessage.value = {
      type: 'error',
      text: error.message || 'Failed to save countdown'
    }
  } finally {
    savingCountdown.value = false
  }
}

const deactivateCountdown = async () => {
  if (!currentCountdown.value) return

  savingCountdown.value = true
  countdownMessage.value = null

  try {
    const { error } = await $supabase
      .from('countdowns')
      .update({ active: false })
      .eq('id', currentCountdown.value.id)

    if (error) throw error

    countdownMessage.value = {
      type: 'success',
      text: 'Countdown deactivated successfully!'
    }

    await loadCurrentCountdown()
  } catch (error: any) {
    console.error('Failed to deactivate countdown:', error)
    countdownMessage.value = {
      type: 'error',
      text: error.message || 'Failed to deactivate countdown'
    }
  } finally {
    savingCountdown.value = false
  }
}

const deleteCountdown = async () => {
  if (!currentCountdown.value) return
  if (!confirm('Are you sure you want to delete this countdown?')) return

  savingCountdown.value = true
  countdownMessage.value = null

  try {
    const { error } = await $supabase
      .from('countdowns')
      .delete()
      .eq('id', currentCountdown.value.id)

    if (error) throw error

    countdownMessage.value = {
      type: 'success',
      text: 'Countdown deleted successfully!'
    }

    currentCountdown.value = null
    countdownForm.value = {
      title: '',
      deadline: '',
      active: true
    }
  } catch (error: any) {
    console.error('Failed to delete countdown:', error)
    countdownMessage.value = {
      type: 'error',
      text: error.message || 'Failed to delete countdown'
    }
  } finally {
    savingCountdown.value = false
  }
}

onMounted(() => {
  loadCurrentCountdown()
})

useHead({
  title: 'Admin - HIKEathon 2025'
})
</script>