<template>
  <button
    class="gpt-card flex items-center gap-3 w-full rounded-lg p-2 px-3 transition-colors"
    :class="[
      isActive
        ? 'bg-blue-500 text-white'
        : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
    ]"
    @click="$emit('select')"
    :aria-label="`Select ${gpt.name} GPT`"
  >
    <!-- Icon -->
    <div class="text-xl flex-shrink-0">{{ gpt.icon }}</div>

    <!-- Name -->
    <span class="font-medium text-sm flex-1 text-left">{{ gpt.name }}</span>
  </button>
</template>

<script setup lang="ts">
import type { GPT } from '~/stores/settings'

interface Props {
  gpt: GPT
  isActive?: boolean
}

defineProps<Props>()
defineEmits<{ select: [] }>()
</script>

<style scoped>
/* No additional styles needed */
</style>
