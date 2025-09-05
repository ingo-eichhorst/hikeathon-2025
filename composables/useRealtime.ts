import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'

export interface BroadcastMessage {
  id: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: string
  from?: string
}

export interface PresenceUser {
  teamId: string
  teamName: string
  onlineAt: string
  status?: 'active' | 'idle'
}

export interface TypingIndicator {
  teamId: string
  teamName: string
  isTyping: boolean
}

export const useRealtime = () => {
  const { $supabase } = useNuxtApp()
  const supabase = $supabase
  const authStore = useAuthStore()
  
  const channels = ref<Map<string, RealtimeChannel>>(new Map())
  const broadcasts = ref<BroadcastMessage[]>([])
  const presence = ref<Map<string, PresenceUser>>(new Map())
  const typingUsers = ref<Map<string, TypingIndicator>>(new Map())
  const connectionState = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 1000
  
  let heartbeatInterval: NodeJS.Timeout | null = null
  let reconnectTimeout: NodeJS.Timeout | null = null
  
  const subscribeToBroadcasts = async () => {
    const channel = supabase
      .channel('broadcasts')
      .on('broadcast', { event: 'message' }, (payload: any) => {
        const message: BroadcastMessage = {
          id: payload.payload.id || crypto.randomUUID(),
          message: payload.payload.message,
          type: payload.payload.type || 'info',
          timestamp: payload.payload.timestamp || new Date().toISOString(),
          from: payload.payload.from
        }
        broadcasts.value.unshift(message)
        
        if (broadcasts.value.length > 50) {
          broadcasts.value = broadcasts.value.slice(0, 50)
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to broadcasts channel')
          connectionState.value = 'connected'
          reconnectAttempts.value = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to broadcasts')
          handleReconnect()
        }
      })
    
    channels.value.set('broadcasts', channel)
  }
  
  const subscribeToPresence = async () => {
    if (!authStore.currentTeam) return
    
    const channel = supabase
      .channel('presence')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as RealtimePresenceState<PresenceUser>
        presence.value.clear()
        
        Object.entries(state).forEach(([key, presences]) => {
          if (presences && presences.length > 0) {
            const user = presences[0] as PresenceUser
            presence.value.set(key, user)
          }
        })
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string, newPresences: any[] }) => {
        if (newPresences && newPresences.length > 0) {
          const user = newPresences[0] as PresenceUser
          presence.value.set(key || '', user)
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        presence.value.delete(key || '')
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            teamId: authStore.currentTeam.id,
            teamName: authStore.currentTeam.name,
            onlineAt: new Date().toISOString(),
            status: 'active'
          } as PresenceUser)
        }
      })
    
    channels.value.set('presence', channel)
  }
  
  const subscribeToTypingIndicators = async () => {
    const channel = supabase
      .channel('typing')
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const indicator: TypingIndicator = payload.payload
        
        if (indicator.teamId === authStore.currentTeam?.id) return
        
        if (indicator.isTyping) {
          typingUsers.value.set(indicator.teamId, indicator)
          
          setTimeout(() => {
            typingUsers.value.delete(indicator.teamId)
          }, 3000)
        } else {
          typingUsers.value.delete(indicator.teamId)
        }
      })
      .subscribe()
    
    channels.value.set('typing', channel)
  }
  
  const subscribeToTodoUpdates = async () => {
    const channel = supabase
      .channel('todos')
      .on('postgres_changes', {
        event: '*' as any,
        schema: 'public',
        table: 'todos'
      }, (payload: any) => {
        console.log('Todo update:', payload)
      })
      .on('postgres_changes', {
        event: '*' as any,
        schema: 'public',
        table: 'team_todos'
      }, (payload: any) => {
        console.log('Team todo update:', payload)
      })
      .subscribe()
    
    channels.value.set('todos', channel)
  }
  
  const sendBroadcast = async (message: string, type: BroadcastMessage['type'] = 'info') => {
    const channel = channels.value.get('broadcasts')
    if (!channel) {
      console.error('Broadcasts channel not initialized')
      return
    }
    
    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        id: crypto.randomUUID(),
        message,
        type,
        timestamp: new Date().toISOString(),
        from: authStore.currentTeam?.name
      }
    })
  }
  
  const sendTypingIndicator = async (isTyping: boolean) => {
    if (!authStore.currentTeam) return
    
    const channel = channels.value.get('typing')
    if (!channel) return
    
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        teamId: authStore.currentTeam.id,
        teamName: authStore.currentTeam.name,
        isTyping
      }
    })
  }
  
  const startHeartbeat = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    
    heartbeatInterval = setInterval(async () => {
      if (connectionState.value === 'connected' && authStore.currentTeam) {
        const channel = channels.value.get('presence')
        if (channel) {
          await channel.track({
            teamId: authStore.currentTeam.id,
            teamName: authStore.currentTeam.name,
            onlineAt: new Date().toISOString(),
            status: 'active'
          } as PresenceUser)
        }
      }
    }, 30000)
  }
  
  const handleReconnect = () => {
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      connectionState.value = 'disconnected'
      return
    }
    
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    
    reconnectTimeout = setTimeout(async () => {
      reconnectAttempts.value++
      console.log(`Reconnection attempt ${reconnectAttempts.value}/${maxReconnectAttempts}`)
      connectionState.value = 'connecting'
      
      await cleanupChannels()
      await initializeRealtime()
    }, reconnectDelay * Math.pow(2, reconnectAttempts.value))
  }
  
  const cleanupChannels = async () => {
    for (const [name, channel] of channels.value) {
      await channel.unsubscribe()
      console.log(`Unsubscribed from ${name} channel`)
    }
    channels.value.clear()
  }
  
  const initializeRealtime = async () => {
    try {
      connectionState.value = 'connecting'
      
      await subscribeToBroadcasts()
      
      if (authStore.isAuthenticated) {
        await subscribeToPresence()
        await subscribeToTypingIndicators()
        await subscribeToTodoUpdates()
      }
      
      startHeartbeat()
      
      window.addEventListener('beforeunload', cleanupChannels)
      
      window.addEventListener('online', () => {
        console.log('Network connection restored')
        handleReconnect()
      })
      
      window.addEventListener('offline', () => {
        console.log('Network connection lost')
        connectionState.value = 'disconnected'
      })
    } catch (error) {
      console.error('Error initializing realtime:', error)
      handleReconnect()
    }
  }
  
  onMounted(() => {
    initializeRealtime()
  })
  
  onUnmounted(() => {
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    if (reconnectTimeout) clearTimeout(reconnectTimeout)
    cleanupChannels()
    window.removeEventListener('beforeunload', cleanupChannels)
  })
  
  return {
    broadcasts: readonly(broadcasts),
    presence: readonly(presence),
    typingUsers: readonly(typingUsers),
    connectionState: readonly(connectionState),
    sendBroadcast,
    sendTypingIndicator,
    initializeRealtime,
    cleanupChannels
  }
}