<template>
  <div class="notification-list">
    <!-- Header -->
    <div v-if="showHeader" class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">
        Notifications
        <span v-if="notificationsStore.unreadCount > 0" class="ml-2 text-sm font-normal text-gray-500">
          ({{ notificationsStore.unreadCount }} unread)
        </span>
      </h3>
      <button
        v-if="notificationsStore.unreadCount > 0"
        @click="markAllAsRead"
        class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Mark all as read
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="notificationsStore.loading && notificationsStore.notifications.length === 0" class="space-y-3">
      <div v-for="i in 3" :key="i" class="animate-pulse">
        <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="notificationsStore.error" class="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
      {{ notificationsStore.error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="notificationsStore.notifications.length === 0" class="text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <p class="text-gray-500 dark:text-gray-400">No notifications yet</p>
    </div>

    <!-- Notifications List -->
    <div v-else class="space-y-2" :class="{ 'max-h-96 overflow-y-auto': scrollable }">
      <div
        v-for="notification in displayedNotifications"
        :key="notification.id"
        @click="handleNotificationClick(notification)"
        class="notification-item p-4 rounded-lg border transition-all cursor-pointer"
        :class="getNotificationClasses(notification)"
      >
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div class="flex-shrink-0 mt-1">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center"
              :class="getIconBgClass(notification.type)"
            >
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path v-if="notification.type === 'success'" fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                <path v-else-if="notification.type === 'warning'" fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                <path v-else-if="notification.type === 'error'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                <path v-else fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900 dark:text-gray-100" :class="{ 'font-semibold': !notification.is_read }">
              {{ notification.message }}
            </p>
            <div class="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span v-if="notification.sender" class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
                {{ notification.sender }}
              </span>
              <span>{{ formatTime(notification.created_at) }}</span>
              <span v-if="!notification.is_read" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                New
              </span>
            </div>
          </div>

          <!-- Type Badge -->
          <div class="flex-shrink-0">
            <span
              class="inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize"
              :class="getTypeBadgeClass(notification.type)"
            >
              {{ notification.type }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Load More Button -->
    <div v-if="showLoadMore && notificationsStore.hasMore" class="mt-4 text-center">
      <button
        @click="loadMore"
        :disabled="notificationsStore.loading"
        class="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50"
      >
        {{ notificationsStore.loading ? 'Loading...' : 'Load More' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotificationsStore } from '~/stores/notifications'
import type { NotificationWithReadStatus } from '~/services/broadcast'

interface Props {
  limit?: number
  showHeader?: boolean
  showLoadMore?: boolean
  scrollable?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  limit: 0,
  showHeader: true,
  showLoadMore: true,
  scrollable: true,
  compact: false
})

const notificationsStore = useNotificationsStore()

const displayedNotifications = computed(() => {
  if (props.limit > 0) {
    return notificationsStore.sortedNotifications.slice(0, props.limit)
  }
  return notificationsStore.sortedNotifications
})

const getNotificationClasses = (notification: NotificationWithReadStatus) => {
  const classes = []

  if (!notification.is_read) {
    classes.push('bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800')
  } else {
    classes.push('bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700')
  }

  classes.push('hover:shadow-md')

  return classes.join(' ')
}

const getIconBgClass = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-500'
    case 'warning':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-blue-500'
  }
}

const getTypeBadgeClass = (type: string) => {
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

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString()
}

const handleNotificationClick = async (notification: NotificationWithReadStatus) => {
  if (!notification.is_read) {
    await notificationsStore.markAsRead(notification.id)
  }
}

const markAllAsRead = async () => {
  await notificationsStore.markAllAsRead()
}

const loadMore = async () => {
  await notificationsStore.loadMore()
}
</script>

<style scoped>
.notification-list {
  @apply w-full;
}

.notification-item {
  transition: all 0.2s ease;
}

.notification-item:hover {
  transform: translateX(2px);
}
</style>
