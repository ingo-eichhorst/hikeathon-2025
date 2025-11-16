<template>
  <div class="h-full flex flex-col">
    <!-- Header with model and size selector -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <select
            v-model="imagesStore.currentModel"
            @change="imagesStore.setModel(imagesStore.currentModel)"
            class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option v-for="model in IMAGE_MODELS" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>

          <select
            v-model="imagesStore.currentSize"
            @change="imagesStore.setSize(imagesStore.currentSize)"
            class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          >
            <option v-for="size in imagesStore.availableSizes" :key="size" :value="size">
              {{ size }}
            </option>
          </select>

          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ imagesStore.currentModelInfo?.provider }}
          </div>
        </div>

        <div class="flex gap-2">
          <button
            @click="imagesStore.setGalleryView('grid')"
            :class="[
              'px-3 py-2 text-sm rounded-lg',
              imagesStore.galleryView === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            ]"
          >
            Grid
          </button>
          <button
            @click="imagesStore.setGalleryView('list')"
            :class="[
              'px-3 py-2 text-sm rounded-lg',
              imagesStore.galleryView === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700'
            ]"
          >
            List
          </button>
          <button
            @click="imagesStore.clearHistory()"
            class="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
      <!-- Error Message -->
      <div
        v-if="imagesStore.error"
        class="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg"
      >
        {{ imagesStore.error }}
      </div>

      <!-- Gallery -->
      <div
        v-if="imagesStore.sortedHistory.length > 0"
        :class="[
          'mb-4',
          imagesStore.galleryView === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-4'
        ]"
      >
        <div
          v-for="image in imagesStore.sortedHistory"
          :key="image.id"
          class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg"
        >
          <img
            :src="image.url"
            :alt="image.prompt"
            class="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            @click="selectedImage = image"
          />
          <div class="p-4">
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
              {{ image.prompt }}
            </p>
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{{ image.model }} • {{ image.size }}</span>
              <span>{{ formatDate(image.timestamp) }}</span>
            </div>
            <div class="flex gap-2 mt-3">
              <button
                @click="imagesStore.downloadImage(image)"
                class="flex-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Download
              </button>
              <button
                @click="imagesStore.copyPrompt(image.prompt)"
                class="flex-1 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
              >
                Copy Prompt
              </button>
              <button
                @click="imagesStore.removeFromHistory(image.id)"
                class="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="text-center text-gray-500 dark:text-gray-400 mt-12"
      >
        <p class="text-lg mb-2">No images generated yet</p>
        <p class="text-sm">Enter a prompt below to generate your first image</p>
      </div>
    </div>

    <!-- Input -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="flex gap-2">
        <textarea
          v-model="promptInput"
          @keydown.enter.exact.prevent="generateImage"
          placeholder="Describe the image you want to generate..."
          :disabled="imagesStore.isGenerating"
          rows="2"
          class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none"
          :maxlength="imagesStore.currentModelInfo?.maxPromptLength || 1000"
        ></textarea>

        <button
          @click="generateImage"
          :disabled="!promptInput.trim() || imagesStore.isGenerating"
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ imagesStore.isGenerating ? 'Generating...' : 'Generate' }}
        </button>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {{ promptInput.length }} / {{ imagesStore.currentModelInfo?.maxPromptLength || 1000 }} characters
      </div>
    </div>

    <!-- Image Preview Modal -->
    <div
      v-if="selectedImage"
      @click="selectedImage = null"
      class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
    >
      <div
        @click.stop
        class="bg-white dark:bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
      >
        <img
          :src="selectedImage.url"
          :alt="selectedImage.prompt"
          class="w-full h-auto"
        />
        <div class="p-4">
          <p class="text-gray-700 dark:text-gray-300 mb-2">{{ selectedImage.prompt }}</p>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ selectedImage.model }} • {{ selectedImage.size }} • {{ formatDate(selectedImage.timestamp) }}
          </div>
          <button
            @click="selectedImage = null"
            class="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded w-full"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useImagesStore, IMAGE_MODELS, type GeneratedImage } from '~/stores/images'

const imagesStore = useImagesStore()
const promptInput = ref('')
const selectedImage = ref<GeneratedImage | null>(null)

const generateImage = async () => {
  if (!promptInput.value.trim() || imagesStore.isGenerating) return

  try {
    await imagesStore.generateImage(promptInput.value)
    promptInput.value = ''
  } catch (error) {
    console.error('Failed to generate image:', error)
  }
}

const formatDate = (date: Date) => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString()
}

useHead({
  title: 'Images - HIKEathon 2025'
})
</script>
