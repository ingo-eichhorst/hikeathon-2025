<template>
  <div class="relative">
    <!-- Upload Button -->
    <button
      @click="handleButtonClick"
      :disabled="isLoading"
      title="Upload image for AI analysis"
      class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Icon
        v-if="!isLoading"
        icon="mdi:image-plus"
        class="w-5 h-5 text-gray-600 dark:text-gray-300"
      />
      <Icon
        v-else
        icon="mdi:loading"
        class="w-5 h-5 text-gray-600 dark:text-gray-300 animate-spin"
      />
    </button>

    <!-- Hidden File Input -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
      @paste="handlePaste"
    />

    <!-- Mobile Action Sheet -->
    <div
      v-if="showMobileActions"
      class="fixed inset-0 z-50 flex items-end"
      @click="showMobileActions = false"
    >
      <div class="w-full bg-white dark:bg-gray-800 rounded-t-lg shadow-lg">
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">Upload Image</h3>
          <div class="space-y-2">
            <button
              @click="openCamera"
              class="w-full px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
            >
              <Icon icon="mdi:camera" class="w-5 h-5" />
              <span>Take Photo</span>
            </button>
            <button
              @click="openPhotoLibrary"
              class="w-full px-4 py-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
            >
              <Icon icon="mdi:image" class="w-5 h-5" />
              <span>Photo Library</span>
            </button>
            <button
              @click="showMobileActions = false"
              class="w-full px-4 py-3 text-center text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop File Input -->
    <input
      v-if="!isMobile()"
      ref="desktopFileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useImageUpload } from '~/composables/useImageUpload'

const emit = defineEmits<{
  imageAdded: [image: any]
  error: [error: string]
}>()

const { addImage, handleFileInput, isMobile, isLoading } = useImageUpload()
const fileInput = ref<HTMLInputElement>()
const desktopFileInput = ref<HTMLInputElement>()
const showMobileActions = ref(false)

const handleButtonClick = () => {
  if (isMobile()) {
    showMobileActions.value = true
  } else {
    desktopFileInput.value?.click()
  }
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files) return

  for (let i = 0; i < files.length; i++) {
    const success = await addImage(files[i])
    if (success) {
      emit('imageAdded', files[i])
    }
  }

  // Reset input
  input.value = ''
}

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items

  if (!items) return

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        const success = await addImage(file)
        if (success) {
          emit('imageAdded', file)
        }
      }
    }
  }
}

const openCamera = () => {
  showMobileActions.value = false
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files) {
      const success = await addImage(files[0])
      if (success) {
        emit('imageAdded', files[0])
      }
    }
  }
  input.click()
}

const openPhotoLibrary = () => {
  showMobileActions.value = false
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files
    if (files) {
      const success = await addImage(files[0])
      if (success) {
        emit('imageAdded', files[0])
      }
    }
  }
  input.click()
}
</script>
