<template>
  <div class="h-full flex flex-col lg:flex-row">
    <!-- Left Sidebar Menu (hidden on mobile, visible on lg+) -->
    <div class="hidden lg:flex lg:w-64 lg:border-r lg:border-gray-200 dark:lg:border-gray-700 bg-gray-50 dark:bg-gray-850 overflow-y-auto">
      <ChatMenu />
    </div>

    <!-- Main Chat Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Offline Notice -->
      <div
        v-if="!realtimeConnection?.isSupabaseAvailable"
        class="p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-sm text-center"
      >
        ⚠️ Real-time features unavailable. Working in offline mode.
      </div>

      <!-- Header with model selector -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 min-w-0">
            <!-- Mobile Menu Toggle Button -->
            <button
              class="lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              @click="mobileMenuOpen = !mobileMenuOpen"
              aria-label="Toggle menu"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <select
              v-model="currentModel"
              @change="chatStore.setModel(currentModel)"
              class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
              :disabled="chatStore.modelsLoading"
            >
              <option v-if="chatStore.modelsLoading" disabled>Loading models...</option>
              <option v-else-if="chatStore.availableModels.length === 0" disabled>No models available</option>
              <option v-for="model in chatStore.availableModels" :key="model.id" :value="model.id">
                {{ model.name }}
              </option>
            </select>

            <div class="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
              {{ chatStore.contextTokens }} / {{ chatStore.currentModelInfo?.contextLength || 0 }}
            </div>
          </div>

          <button
            @click="chatStore.clearMessages()"
            class="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg whitespace-nowrap"
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
            @paste="handleTextareaPaste"
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

    <!-- Mobile Menu Drawer (visible when mobileMenuOpen on mobile) -->
    <div
      v-if="mobileMenuOpen"
      class="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
      @click="mobileMenuOpen = false"
    />
    <div
      :class="[
        'lg:hidden fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-850 border-r border-gray-200 dark:border-gray-700 z-50 transition-transform duration-300',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 class="font-bold">Menu</h2>
        <button
          @click="mobileMenuOpen = false"
          class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          aria-label="Close menu"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="p-4 overflow-y-auto max-h-[calc(100%-60px)]">
        <ChatMenu />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useChatStore } from '~/stores/chat'
import { useChatHistoryStore } from '~/stores/chatHistory'
import { useSettingsStore } from '~/stores/settings'
import { useImageUpload } from '~/composables/useImageUpload'
import { IMAGE_CONFIG, type UploadedImage } from '~/types/image'
import ChatMenu from '~/components/ChatMenu.vue'

const chatStore = useChatStore()
const historyStore = useChatHistoryStore()
const settingsStore = useSettingsStore()
const currentModel = ref(chatStore.currentModel)
const inputMessage = ref('')
const mobileMenuOpen = ref(false)
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

  // Initialize first chat session if none exists
  if (historyStore.allSessions.length === 0 && !historyStore.currentSessionId) {
    historyStore.createSession(
      '',
      settingsStore.currentSystemPromptKey,
      chatStore.currentModel,
      chatStore.temperature,
      chatStore.maxTokens,
      chatStore.topP
    )
  } else if (historyStore.currentSessionId) {
    // Load the current session
    chatStore.loadSession(historyStore.currentSessionId)
  }
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

// Custom paste handler that properly handles async image processing
const handleTextareaPaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items

  if (!items) return

  // Check if there are any image items
  let hasImages = false
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      hasImages = true
      break
    }
  }

  // If images are being pasted, prevent default and process them
  if (hasImages) {
    event.preventDefault()

    // Process images asynchronously
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          await addImage(file)
        }
      }
    }
  } else {
    // Let the default paste behavior handle text
    await handlePaste(event)
  }
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

  // Update initial prompt and session name if first message
  const currentSession = historyStore.currentSession
  if (currentSession && !currentSession.initialPrompt) {
    // Update the session with the initial prompt (from the first user message)
    const updatedSession = {
      ...currentSession,
      initialPrompt: message
    }
    Object.assign(currentSession, updatedSession)

    // Update session name to first 20 characters of the message
    if (chatStore.currentSessionId) {
      const sessionName = message.slice(0, 20)
      historyStore.updateSessionName(chatStore.currentSessionId, sessionName)
    }
  }

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

  // Save the session after sending
  chatStore.saveCurrentSession()

  // Close mobile menu if open
  mobileMenuOpen.value = false
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