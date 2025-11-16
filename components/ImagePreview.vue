<template>
  <div v-if="images.length > 0" class="space-y-2 mb-3">
    <div class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
      </svg>
      <span>{{ images.length }} image{{ images.length !== 1 ? 's' : '' }} attached</span>
      <span class="text-xs text-blue-600 dark:text-blue-400">(using Mistral Small 24B)</span>
    </div>

    <div class="grid grid-cols-4 gap-2 sm:grid-cols-6">
      <div
        v-for="image in images"
        :key="image.id"
        class="relative group rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
      >
        <!-- Thumbnail -->
        <img
          :src="`data:${image.type};base64,${image.base64}`"
          :alt="image.name"
          class="w-full h-20 object-cover"
        />

        <!-- Dimensions -->
        <div
          class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        >
          <div class="text-white text-xs text-center">
            <div>{{ image.width }}x{{ image.height }}</div>
            <div class="text-xs">{{ formatFileSize(image.size) }}</div>
          </div>
        </div>

        <!-- Remove Button -->
        <button
          @click="emit('remove', image.id)"
          class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove image"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadedImage } from '~/types/image'

defineProps<{
  images: UploadedImage[]
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>
