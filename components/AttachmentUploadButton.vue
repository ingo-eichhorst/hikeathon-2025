<template>
  <div class="relative">
    <!-- Upload Button -->
    <button
      @click="handleClick"
      :disabled="isLoading"
      title="Upload attachments"
      class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <svg
        v-if="!isLoading"
        class="w-5 h-5 text-gray-600 dark:text-gray-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <svg
        v-else
        class="w-5 h-5 text-gray-600 dark:text-gray-300 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </button>

    <!-- Hidden File Inputs -->
    <input
      ref="imageInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleImageSelect"
    />

    <input
      ref="fileInput"
      type="file"
      multiple
      accept=".txt"
      class="hidden"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  imageAdded: [file: File]
  fileAdded: [file: File]
  error: [error: string]
}>()

const isLoading = ref(false)
const imageInput = ref<HTMLInputElement>()
const fileInput = ref<HTMLInputElement>()

const handleClick = () => {
  imageInput.value?.click()
}

const handleImageSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files) return

  for (let i = 0; i < files.length; i++) {
    emit('imageAdded', files[i])
  }

  // Reset input
  input.value = ''
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files) return

  for (let i = 0; i < files.length; i++) {
    emit('fileAdded', files[i])
  }

  // Reset input
  input.value = ''
}
</script>
