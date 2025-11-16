<template>
  <div class="h-full flex flex-col">
    <!-- Offline Notice -->
    <div
      v-if="!realtimeConnection?.isSupabaseAvailable"
      class="p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm text-center"
    >
      ⚠️ Real-time features unavailable. Working in offline mode.
    </div>

    <!-- Header with model selector -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <select 
            v-model="currentModel"
            @change="chatStore.setModel(currentModel)"
            class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            :disabled="chatStore.modelsLoading"
          >
            <option v-if="chatStore.modelsLoading" disabled>Loading models...</option>
            <option v-else-if="chatStore.availableModels.length === 0" disabled>No models available</option>
            <option v-for="model in chatStore.availableModels" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
          
          <div class="text-sm text-gray-600 dark:text-gray-400">
            {{ chatStore.contextTokens }} / {{ chatStore.currentModelInfo?.contextLength || 0 }} tokens
          </div>
        </div>
        
        <button
          @click="chatStore.clearMessages()"
          class="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          Clear
        </button>
      </div>
    </div>
    
    <!-- Messages -->
    <div class="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
      <div v-for="message in chatStore.messages" :key="message.id" class="mb-4">
        <ChatMessage 
          :message="message"
          @edit="handleEditMessage"
          @delete="chatStore.deleteMessage(message.id)"
          @regenerate="handleRegenerate"
        />
      </div>
      
      <!-- Typing indicators -->
      <div 
        v-if="typingTeams.length > 0"
        class="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2"
      >
        <div class="flex gap-1">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
        </div>
        <span class="text-sm">
          {{ typingTeams.join(', ') }} {{ typingTeams.length === 1 ? 'is' : 'are' }} typing...
        </span>
      </div>
      
      <!-- Streaming indicator -->
      <div 
        v-if="chatStore.isGenerating && !chatStore.currentStreamingMessage?.content"
        class="flex items-center gap-2 text-gray-600 dark:text-gray-400"
      >
        <div class="flex gap-1">
          <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
          <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
        <span class="text-sm">Generating...</span>
      </div>
    </div>
    
    <!-- Input -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <!-- Image Preview -->
      <ImagePreview
        :images="uploadedImages"
        @remove="removeImage"
      />

      <div class="flex gap-2">
        <textarea
          v-model="inputMessage"
          @keydown.enter.exact="sendMessage"
          @input="handleTyping"
          @paste="handlePaste"
          placeholder="Type your message... (paste images with Ctrl+V)"
          :disabled="chatStore.isGenerating"
          rows="2"
          class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none"
        ></textarea>

        <div class="flex flex-col gap-2">
          <ImageUploadButton
            @imageAdded="handleImageAdded"
            @error="handleImageError"
          />

          <button
            v-if="!chatStore.isGenerating"
            @click="sendMessage"
            :disabled="!inputMessage.trim() && uploadedImages.length === 0"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>

          <button
            v-else
            @click="chatStore.stopGeneration()"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '~/stores/chat'
import { useImageUpload } from '~/composables/useImageUpload'
import { IMAGE_CONFIG, type UploadedImage } from '~/types/image'

const chatStore = useChatStore()
const currentModel = ref(chatStore.currentModel)
const inputMessage = ref('')
const { images: uploadedImages, addImage, removeImage, handlePaste } = useImageUpload()

// Realtime features
const realtimeConnection = useRealtime()
const { typingUsers, sendTypingIndicator, isSupabaseAvailable } = realtimeConnection
const typingTimeout = ref<NodeJS.Timeout | null>(null)

// Compute typing teams
const typingTeams = computed(() => {
  return Array.from(typingUsers.value.values())
    .filter(user => user.isTyping)
    .map(user => user.teamName)
})

// Fetch available models on mount
onMounted(async () => {
  await chatStore.fetchAvailableModels()
  currentModel.value = chatStore.currentModel
})

// Watch for model changes in the store
watch(() => chatStore.currentModel, (newModel) => {
  currentModel.value = newModel
})

// Handle typing indicator
const handleTyping = () => {
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }
  
  sendTypingIndicator(true)
  
  typingTimeout.value = setTimeout(() => {
    sendTypingIndicator(false)
  }, 1500)
}

const sendMessage = async () => {
  if ((!inputMessage.value.trim() && uploadedImages.value.length === 0) || chatStore.isGenerating) return

  // Clear typing indicator
  if (typingTimeout.value) {
    clearTimeout(typingTimeout.value)
  }
  sendTypingIndicator(false)

  const message = inputMessage.value
  const images = uploadedImages.value.length > 0 ? [...uploadedImages.value] : []

  inputMessage.value = ''

  // Auto-switch to Mistral Small 24B if images are attached
  if (images.length > 0 && chatStore.currentModel !== IMAGE_CONFIG.VISION_MODEL) {
    chatStore.setModel(IMAGE_CONFIG.VISION_MODEL)
  }

  // Send message with images
  if (images.length > 0) {
    await chatStore.sendMessage(message, images)
    uploadedImages.value = []
  } else {
    await chatStore.sendMessage(message)
  }
}

const handleEditMessage = async (id: string, newContent: string) => {
  chatStore.editMessage(id, newContent)
  const index = chatStore.messages.findIndex(m => m.id === id)
  if (index !== -1 && index < chatStore.messages.length - 1) {
    chatStore.messages = chatStore.messages.slice(0, index + 1)
    await chatStore.sendMessage(newContent)
  }
}

const handleRegenerate = async () => {
  const lastUserMessage = [...chatStore.messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage) {
    const lastAssistantIndex = chatStore.messages.findLastIndex(m => m.role === 'assistant')
    if (lastAssistantIndex !== -1) {
      chatStore.messages.splice(lastAssistantIndex, 1)
    }
    await chatStore.sendMessage(lastUserMessage.content, lastUserMessage.attachments)
  }
}

const handleImageAdded = (file: File) => {
  // Image has been added via composable, it will be shown in the preview
  console.log('Image added:', file.name)
}

const handleImageError = (error: string) => {
  console.error('Image upload error:', error)
  // You could show a notification here
}

useHead({
  title: 'Chat - HIKEathon 2025'
})
</script>