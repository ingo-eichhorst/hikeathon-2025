<template>
  <button
    class="flex items-center gap-3 w-full text-left text-sm p-2 rounded transition-opacity"
    :class="[
      isActive
        ? 'opacity-100 font-semibold'
        : 'opacity-70 hover:opacity-100'
    ]"
    @click="$emit('select')"
    :aria-label="`Select ${gpt.name} GPT`"
  >
    <!-- Icon -->
    <span class="text-lg flex-shrink-0">{{ gpt.icon }}</span>

    <!-- Name -->
    <span class="flex-1">{{ gpt.name }}</span>
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
