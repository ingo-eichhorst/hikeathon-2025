<template>
  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-3 space-y-2">
    <!-- Header with domain and fetch time -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-xl">🌐</span>
        <div class="min-w-0">
          <div class="font-semibold text-blue-900 dark:text-blue-100 truncate">{{ attachment.name }}</div>
          <div class="text-xs text-blue-700 dark:text-blue-300 truncate">{{ attachment.url }}</div>
        </div>
      </div>

      <!-- Expand/collapse button -->
      <button
        @click="isExpanded = !isExpanded"
        class="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex-shrink-0"
        :title="isExpanded ? 'Collapse' : 'Expand'"
      >
        <svg
          class="w-5 h-5 transition-transform"
          :class="{ 'rotate-180': isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
    </div>

    <!-- Error message if fetch failed -->
    <div v-if="attachment.error" class="text-sm text-red-700 dark:text-red-300 font-medium">
      ⚠️ {{ attachment.error }}
    </div>

    <!-- Summary -->
    <div v-if="!isExpanded && attachment.summary" class="text-sm text-blue-800 dark:text-blue-200 line-clamp-2">
      {{ attachment.summary }}
    </div>

    <!-- Full content when expanded -->
    <div v-if="isExpanded" class="text-sm text-blue-900 dark:text-blue-100 bg-white dark:bg-gray-800 rounded p-3 max-h-48 overflow-y-auto border border-blue-200 dark:border-blue-700">
      {{ attachment.content }}
    </div>

    <!-- Metadata footer -->
    <div class="flex justify-between items-center text-xs text-blue-700 dark:text-blue-400">
      <span>{{ contentType }} • {{ formatSize(attachment.content.length) }}</span>
      <span>{{ formatTime(attachment.fetchedAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { URLAttachment } from '~/stores/chat'

interface Props {
  attachment: URLAttachment
}

const props = defineProps<Props>()

const isExpanded = ref(false)

const contentType = computed(() => {
  return props.attachment.contentType || 'text/html'
})

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const formatTime = (date: Date): string => {
  const d = new Date(date)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
</script>
