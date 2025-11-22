<template>
  <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 space-y-2">
    <!-- Header with filename and size -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-xl">📄</span>
        <div class="min-w-0">
          <div class="font-semibold text-amber-900 dark:text-amber-100 truncate">{{ attachment.name }}</div>
        </div>
      </div>

      <!-- Expand/collapse button -->
      <button
        @click="isExpanded = !isExpanded"
        class="ml-2 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 flex-shrink-0"
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

    <!-- Summary -->
    <div v-if="!isExpanded && summary" class="text-sm text-amber-800 dark:text-amber-200 line-clamp-2">
      {{ summary }}
    </div>

    <!-- Full content when expanded -->
    <div v-if="isExpanded" class="text-sm text-amber-900 dark:text-amber-100 bg-white dark:bg-gray-800 rounded p-3 max-h-48 overflow-y-auto border border-amber-200 dark:border-amber-700 whitespace-pre-wrap break-words">
      {{ attachment.content }}
    </div>

    <!-- Metadata footer -->
    <div class="flex justify-between items-center text-xs text-amber-700 dark:text-amber-400">
      <span>text/plain • {{ formatSize(attachment.content?.length || 0) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Attachment } from '~/stores/chat'

interface Props {
  attachment: Attachment
}

const props = defineProps<Props>()

const isExpanded = ref(false)

const summary = computed(() => {
  const content = props.attachment.content || ''
  if (content.length <= 150) return content
  return content.substring(0, 150) + '...'
})

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
</script>
