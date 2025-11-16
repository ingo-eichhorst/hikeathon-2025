<template>
  <TransitionGroup name="broadcast" tag="div" class="fixed top-16 right-4 z-50 space-y-2 max-w-md">
    <div
      v-for="broadcast in visibleBroadcasts"
      :key="broadcast.id"
      :data-testid="`broadcast-banner-${broadcast.id}`"
      class="p-4 rounded-lg shadow-lg backdrop-blur-sm animate-slide-in"
      :class="getBroadcastClass(broadcast.type)"
    >
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <p class="text-sm font-medium" v-html="sanitizeHTML(broadcast.message)"></p>
          <div class="mt-1 flex items-center gap-2 text-xs opacity-75">
            <span v-if="broadcast.from">From: {{ broadcast.from }}</span>
            <span>{{ formatTime(broadcast.timestamp) }}</span>
          </div>
        </div>
        <button
          @click="dismissBroadcast(broadcast.id)"
          class="ml-4 text-current opacity-50 hover:opacity-100 transition-opacity"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { sanitizeHTML } from '~/utils/sanitize'
import { useBroadcastStore } from '~/stores/broadcasts'
import { useRealtime } from '~/composables/useRealtime'

const broadcastStore = useBroadcastStore()
const { broadcasts } = useRealtime()

const visibleBroadcasts = ref<typeof broadcasts.value>([])
const dismissedIds = ref(new Set<string>())

watch(broadcasts, (newBroadcasts) => {
  const newVisible = newBroadcasts.filter(b => !dismissedIds.value.has(b.id))
  visibleBroadcasts.value = newVisible.slice(0, 3)
  
  newVisible.forEach(broadcast => {
    broadcastStore.addBroadcast(broadcast)
    
    if (broadcast.type !== 'error') {
      setTimeout(() => {
        dismissBroadcast(broadcast.id)
      }, 8000)
    }
  })
})

const getBroadcastClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-500/90 text-white'
    case 'warning':
      return 'bg-yellow-500/90 text-white'
    case 'error':
      return 'bg-red-500/90 text-white'
    default:
      return 'bg-blue-500/90 text-white'
  }
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) {
    return 'Just now'
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleTimeString()
  }
}

const dismissBroadcast = (id: string) => {
  dismissedIds.value.add(id)
  visibleBroadcasts.value = visibleBroadcasts.value.filter(b => b.id !== id)
  broadcastStore.markAsRead(id)
}
</script>

<style scoped>
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

.broadcast-enter-active,
.broadcast-leave-active {
  transition: all 0.3s ease;
}

.broadcast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.broadcast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.broadcast-move {
  transition: transform 0.3s ease;
}
</style>