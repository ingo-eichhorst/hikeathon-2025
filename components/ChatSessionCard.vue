<template>
  <div
    class="chat-session-card group flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-all w-full"
    :class="[
      isActive
        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
        : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
    ]"
    @click="$emit('select')"
    :title="sessionName"
  >
    <!-- GPT Icon -->
    <div class="flex-shrink-0 text-lg">{{ gptIcon }}</div>

    <!-- Session Info -->
    <div class="flex-1 min-w-0">
      <!-- Session Name -->
      <h4
        class="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate"
      >
        {{ truncatedName }}
      </h4>
    </div>

    <!-- Delete Button -->
    <button
      class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400"
      @click.stop="$emit('delete')"
      title="Delete this chat"
      aria-label="Delete chat session"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatSession } from '~/stores/chatHistory'
import { DEFAULT_GPTS } from '~/stores/settings'

interface Props {
  session: ChatSession
  isActive?: boolean
}

const props = defineProps<Props>()
defineEmits<{ select: [], delete: [] }>()

const gptIcon = computed(() => {
  const gpt = DEFAULT_GPTS[props.session.selectedGPT]
  return gpt?.icon || '💬'
})

const sessionName = computed(() => props.session.name)

const truncatedName = computed(() => {
  const name = props.session.name
  if (name.length > 20) {
    return name.slice(0, 20) + '...'
  }
  return name
})
</script>

<style scoped>
.chat-session-card {
  min-height: 60px;
}
</style>
