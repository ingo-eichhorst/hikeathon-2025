import { defineStore } from 'pinia'
import { useNotificationService, type NotificationWithReadStatus } from '~/services/broadcast'
import { useAuthStore } from './auth'

interface NotificationsState {
  notifications: NotificationWithReadStatus[]
  loading: boolean
  error: string | null
  hasMore: boolean
  currentPage: number
  pageSize: number
  unreadCount: number
}

export const useNotificationsStore = defineStore('notifications', {
  state: (): NotificationsState => ({
    notifications: [],
    loading: false,
    error: null,
    hasMore: true,
    currentPage: 0,
    pageSize: 25,
    unreadCount: 0
  }),

  getters: {
    sortedNotifications: (state): NotificationWithReadStatus[] => {
      return [...state.notifications].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    },

    unreadNotifications: (state): NotificationWithReadStatus[] => {
      return state.notifications.filter(n => !n.is_read)
    },

    readNotifications: (state): NotificationWithReadStatus[] => {
      return state.notifications.filter(n => n.is_read)
    },

    notificationsByType: (state) => (type: string): NotificationWithReadStatus[] => {
      return state.notifications.filter(n => n.type === type)
    }
  },

  actions: {
    /**
     * Fetch notifications for the current team with pagination
     */
    async fetchNotifications(page: number = 0) {
      const authStore = useAuthStore()
      const teamCode = authStore.teamCode

      if (!teamCode) {
        this.error = 'No team authenticated'
        return
      }

      this.loading = true
      this.error = null

      try {
        const notificationService = useNotificationService()
        const offset = page * this.pageSize

        const notifications = await notificationService.getNotificationsForTeam(
          teamCode,
          this.pageSize,
          offset
        )

        if (page === 0) {
          // Reset on first page
          this.notifications = notifications
        } else {
          // Append for pagination
          this.notifications.push(...notifications)
        }

        this.currentPage = page
        this.hasMore = notifications.length === this.pageSize

        // Update unread count
        await this.updateUnreadCount()

      } catch (error: any) {
        console.error('Failed to fetch notifications:', error)
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    /**
     * Load more notifications (next page)
     */
    async loadMore() {
      if (!this.hasMore || this.loading) return
      await this.fetchNotifications(this.currentPage + 1)
    },

    /**
     * Refresh notifications (reload first page)
     */
    async refresh() {
      await this.fetchNotifications(0)
    },

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string) {
      const authStore = useAuthStore()
      const teamCode = authStore.teamCode

      if (!teamCode) return

      try {
        const notificationService = useNotificationService()
        await notificationService.markAsRead(notificationId, teamCode)

        // Update local state
        const notification = this.notifications.find(n => n.id === notificationId)
        if (notification) {
          notification.is_read = true
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }

      } catch (error: any) {
        console.error('Failed to mark notification as read:', error)
      }
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
      const authStore = useAuthStore()
      const teamCode = authStore.teamCode

      if (!teamCode) return

      try {
        const notificationService = useNotificationService()
        await notificationService.markAllAsRead(teamCode)

        // Update local state
        this.notifications.forEach(n => n.is_read = true)
        this.unreadCount = 0

      } catch (error: any) {
        console.error('Failed to mark all as read:', error)
      }
    },

    /**
     * Update unread count for current team
     */
    async updateUnreadCount() {
      const authStore = useAuthStore()
      const teamCode = authStore.teamCode

      if (!teamCode) return

      try {
        const notificationService = useNotificationService()
        this.unreadCount = await notificationService.getUnreadCount(teamCode)
      } catch (error: any) {
        console.error('Failed to update unread count:', error)
      }
    },

    /**
     * Add a new notification (from realtime)
     */
    addNotification(notification: NotificationWithReadStatus) {
      // Check if already exists
      const exists = this.notifications.some(n => n.id === notification.id)
      if (!exists) {
        this.notifications.unshift(notification)
        if (!notification.is_read) {
          this.unreadCount++
        }
      }
    },

    /**
     * Clear all notifications from store
     */
    clearNotifications() {
      this.notifications = []
      this.currentPage = 0
      this.hasMore = true
      this.unreadCount = 0
    },

    /**
     * Initialize notifications on app load
     */
    async initialize() {
      await this.fetchNotifications(0)
    }
  },

  persist: false // Don't persist to avoid stale data
})
