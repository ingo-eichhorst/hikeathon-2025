import { defineStore } from 'pinia'

export interface Countdown {
  id: string
  title: string
  deadline: string
  active: boolean
  created_at: string
  updated_at: string
}

interface CountdownState {
  currentCountdown: Countdown | null
  isLoading: boolean
  error: string | null
}

interface CountdownGetters {
  isVisible: (state: CountdownState) => boolean
  timeRemaining: (state: CountdownState) => {
    days: number
    hours: number
    minutes: number
    seconds: number
    total: number
    isPast: boolean
  }
}

interface CountdownActions {
  fetchActiveCountdown(): Promise<void>
  setCountdown(countdown: Countdown | null): void
  clearCountdown(): void
}

export const useCountdownStore = defineStore('countdown', {
  state: (): CountdownState => ({
    currentCountdown: null,
    isLoading: false,
    error: null
  }),

  getters: {
    /**
     * Check if countdown should be visible
     * Show if active and deadline is in future or max 5 minutes in past
     */
    isVisible: (state): boolean => {
      if (!state.currentCountdown || !state.currentCountdown.active) {
        return false
      }

      const deadline = new Date(state.currentCountdown.deadline).getTime()
      const now = Date.now()
      const fiveMinutesInMs = 5 * 60 * 1000

      // Show if deadline is in future OR within 5 minutes past
      return now <= deadline + fiveMinutesInMs
    },

    /**
     * Get time remaining until deadline
     */
    timeRemaining: (state): {
      days: number
      hours: number
      minutes: number
      seconds: number
      total: number
      isPast: boolean
    } => {
      if (!state.currentCountdown) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isPast: false }
      }

      const deadline = new Date(state.currentCountdown.deadline).getTime()
      const now = Date.now()
      const total = deadline - now
      const isPast = total < 0

      const absTotal = Math.abs(total)

      return {
        days: Math.floor(absTotal / (1000 * 60 * 60 * 24)),
        hours: Math.floor((absTotal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((absTotal % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((absTotal % (1000 * 60)) / 1000),
        total,
        isPast
      }
    }
  },

  actions: {
    /**
     * Fetch active countdown from database
     */
    async fetchActiveCountdown() {
      this.isLoading = true
      this.error = null

      try {
        const { $supabase } = useNuxtApp()

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

        this.currentCountdown = data || null
      } catch (error: any) {
        console.error('Failed to fetch countdown:', error)
        this.error = error.message
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Update countdown manually (called from realtime updates)
     */
    setCountdown(countdown: Countdown | null) {
      this.currentCountdown = countdown
    },

    /**
     * Clear countdown
     */
    clearCountdown() {
      this.currentCountdown = null
      this.error = null
    }
  },

  persist: false
})
