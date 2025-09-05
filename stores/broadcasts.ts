import { defineStore } from 'pinia'

export interface Broadcast {
  id: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: string
  from?: string
  read?: boolean
}

export const useBroadcastStore = defineStore('broadcasts', () => {
  const broadcasts = ref<Broadcast[]>([])
  const unreadCount = computed(() => broadcasts.value.filter(b => !b.read).length)
  const latestBroadcast = computed(() => broadcasts.value[0])
  
  const addBroadcast = (broadcast: Broadcast) => {
    broadcasts.value.unshift({
      ...broadcast,
      read: false
    })
    
    if (broadcasts.value.length > 100) {
      broadcasts.value = broadcasts.value.slice(0, 100)
    }
  }
  
  const markAsRead = (id: string) => {
    const broadcast = broadcasts.value.find(b => b.id === id)
    if (broadcast) {
      broadcast.read = true
    }
  }
  
  const markAllAsRead = () => {
    broadcasts.value.forEach(b => b.read = true)
  }
  
  const clearBroadcasts = () => {
    broadcasts.value = []
  }
  
  const removeBroadcast = (id: string) => {
    const index = broadcasts.value.findIndex(b => b.id === id)
    if (index !== -1) {
      broadcasts.value.splice(index, 1)
    }
  }
  
  return {
    broadcasts: readonly(broadcasts),
    unreadCount,
    latestBroadcast,
    addBroadcast,
    markAsRead,
    markAllAsRead,
    clearBroadcasts,
    removeBroadcast
  }
})