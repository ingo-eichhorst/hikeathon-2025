<template>
  <button
    class="gpt-card group flex flex-col items-center gap-2 rounded-lg p-4 text-center transition-all"
    :class="[
      isActive
        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 shadow-md'
        : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
    ]"
    @click="$emit('select')"
    :aria-label="`Select ${gpt.name} GPT`"
    :title="gpt.description"
  >
    <!-- Icon -->
    <div class="text-3xl">{{ gpt.icon }}</div>

    <!-- Name -->
    <h3 class="font-semibold text-sm">{{ gpt.name }}</h3>

    <!-- Description (visible on hover or when active) -->
    <p
      class="text-xs text-gray-600 dark:text-gray-400 transition-opacity opacity-0 group-hover:opacity-100"
      :class="{ 'opacity-100': isActive }"
    >
      {{ gpt.description }}
    </p>

    <!-- Active indicator -->
    <div
      v-if="isActive"
      class="mt-1 h-1 w-6 rounded-full bg-blue-500"
    />
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
.gpt-card {
  min-width: 100px;
}
</style>
