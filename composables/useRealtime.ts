import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js'
import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useCountdownStore } from '~/stores/countdown'

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
  const config = useRuntimeConfig()

  // Check if Supabase is available
  const isSupabaseAvailable = ref(true)

  const channels = ref<Map<string, RealtimeChannel>>(new Map())
  const broadcasts = ref<BroadcastMessage[]>([])
  const presence = ref<Map<string, PresenceUser>>(new Map())
  const typingUsers = ref<Map<string, TypingIndicator>>(new Map())
  const connectionState = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 3 // Reduced from 5 to 3
  const reconnectDelay = 2000 // Increased from 1000 to 2000
  const isReconnecting = ref(false) // Flag to prevent reconnection loops

  let heartbeatInterval: NodeJS.Timeout | null = null
  let reconnectTimeout: NodeJS.Timeout | null = null
  
  const subscribeToBroadcasts = async () => {
    if (!isSupabaseAvailable.value) {
      console.warn('Supabase not available, skipping broadcasts subscription')
      return
    }

    try {
      console.log('🔧 Creating broadcast channel...')
      const channel = supabase
        .channel('broadcasts', {
          config: {
            broadcast: { self: true } // Enable receiving own broadcasts
          }
        })
        .on('broadcast', { event: 'message' }, (payload: any) => {
          console.log('📡 Broadcast received:', payload)
          const message: BroadcastMessage = {
            id: payload.payload.id || crypto.randomUUID(),
            message: payload.payload.message,
            type: payload.payload.type || 'info',
            timestamp: payload.payload.timestamp || new Date().toISOString(),
            from: payload.payload.from
          }
          broadcasts.value.unshift(message)
          console.log('📡 Broadcast added to list. Total broadcasts:', broadcasts.value.length)

          if (broadcasts.value.length > 50) {
            broadcasts.value = broadcasts.value.slice(0, 50)
          }
        })
        .subscribe((status: string) => {
          console.log('📡 Broadcast channel status:', status)
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subscribed to broadcasts channel')
            connectionState.value = 'connected'
            reconnectAttempts.value = 0
            isReconnecting.value = false
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ Error subscribing to broadcasts:', status)
            if (!isReconnecting.value) {
              if (reconnectAttempts.value >= maxReconnectAttempts) {
                isSupabaseAvailable.value = false
                console.warn('Max reconnect attempts reached, disabling realtime features')
              } else {
                handleReconnect()
              }
            }
          } else if (status === 'CLOSED') {
            // Only reconnect if not already reconnecting and not during cleanup
            if (!isReconnecting.value && isSupabaseAvailable.value) {
              console.warn('Channel closed unexpectedly')
              if (reconnectAttempts.value < maxReconnectAttempts) {
                handleReconnect()
              }
            }
          }
        })

      channels.value.set('broadcasts', channel)
      console.log('🔧 Broadcast channel configured')
    } catch (error) {
      console.error('Failed to subscribe to broadcasts:', error)
      isSupabaseAvailable.value = false
    }
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

  const subscribeToCountdownUpdates = async () => {
    const countdownStore = useCountdownStore()

    const channel = supabase
      .channel('countdowns')
      .on('postgres_changes', {
        event: '*' as any,
        schema: 'public',
        table: 'countdowns'
      }, async (payload: any) => {
        console.log('Countdown update:', payload)
        // Refresh active countdown when any countdown changes
        await countdownStore.fetchActiveCountdown()
      })
      .subscribe()

    channels.value.set('countdowns', channel)
  }
  
  const sendBroadcast = async (message: string, type: BroadcastMessage['type'] = 'info', from?: string) => {
    const channel = channels.value.get('broadcasts')
    if (!channel) {
      console.error('❌ Broadcasts channel not initialized')
      throw new Error('Broadcasts channel not initialized')
    }

    const sender = from || authStore.currentTeam?.name || 'anonymous'

    // First, persist to database
    try {
      const { useNotificationService } = await import('~/services/broadcast')
      const notificationService = useNotificationService()

      await notificationService.createNotification({
        message,
        type,
        sender,
        metadata: {}
      })
      console.log('✅ Notification persisted to database')
    } catch (error) {
      console.error('Failed to persist notification:', error)
      // Continue with realtime broadcast even if DB save fails
    }

    const payload = {
      id: crypto.randomUUID(),
      message,
      type,
      timestamp: new Date().toISOString(),
      from: sender
    }

    console.log('📤 Sending broadcast:', payload)
    console.log('📤 Channel state:', channel.state)

    const result = await channel.send({
      type: 'broadcast',
      event: 'message',
      payload
    })

    console.log('📤 Broadcast send result:', result)
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
    if (!isSupabaseAvailable.value || isReconnecting.value) {
      return
    }

    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached, disabling realtime')
      connectionState.value = 'disconnected'
      isSupabaseAvailable.value = false
      isReconnecting.value = false
      return
    }

    if (reconnectTimeout) clearTimeout(reconnectTimeout)

    isReconnecting.value = true
    reconnectTimeout = setTimeout(async () => {
      reconnectAttempts.value++
      console.log(`Reconnection attempt ${reconnectAttempts.value}/${maxReconnectAttempts}`)
      connectionState.value = 'connecting'

      await cleanupChannels(true) // Silent cleanup during reconnect
      await initializeRealtime()
    }, reconnectDelay * Math.pow(2, reconnectAttempts.value))
  }
  
  const cleanupChannels = async (silent = false) => {
    // Temporarily mark as unavailable to prevent reconnection during cleanup
    const wasAvailable = isSupabaseAvailable.value
    if (!silent) {
      isSupabaseAvailable.value = false
    }

    for (const [name, channel] of channels.value) {
      try {
        await channel.unsubscribe()
        if (!silent) {
          console.log(`Unsubscribed from ${name} channel`)
        }
      } catch (error) {
        // Ignore unsubscribe errors during cleanup
      }
    }
    channels.value.clear()

    if (!silent) {
      isSupabaseAvailable.value = wasAvailable
    }
  }
  
  const initializeRealtime = async () => {
    try {
      connectionState.value = 'connecting'

      await subscribeToBroadcasts()
      await subscribeToCountdownUpdates()

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
    isSupabaseAvailable: readonly(isSupabaseAvailable),
    sendBroadcast,
    sendTypingIndicator,
    initializeRealtime,
    cleanupChannels
  }
}