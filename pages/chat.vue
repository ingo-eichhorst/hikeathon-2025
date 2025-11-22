<template>
  <div class="h-full flex flex-col lg:flex-row">
    <!-- Left Sidebar Menu (hidden on mobile, visible on lg+) -->
    <div class="hidden lg:flex lg:w-64 lg:border-r-2 lg:border-gray-300 dark:lg:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
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
      <div class="p-4 border-b-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 min-w-0">
            <!-- Mobile Menu Toggle Button -->
            <button
              class="lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-dark-900 dark:text-gray-300"
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
              class="px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-dark-900 dark:text-gray-100 font-medium"
            >
              <option v-for="model in chatStore.availableModels" :key="model.id" :value="model.id">
                {{ model.name }}
              </option>
            </select>

            <div class="text-xs text-dark-900 dark:text-gray-400 whitespace-nowrap font-medium">
              {{ chatStore.contextTokens }} / {{ chatStore.currentModelInfo?.contextLength || 0 }}
            </div>
          </div>
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
          class="flex items-center gap-2 text-dark-900 dark:text-gray-400 mb-2 font-medium"
        >
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <div class="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
            <div class="w-2 h-2 bg-primary-500 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
          </div>
          <span class="text-sm">
            {{ typingTeams.join(', ') }} {{ typingTeams.length === 1 ? 'is' : 'are' }} typing...
          </span>
        </div>

        <!-- Streaming indicator -->
        <div
          v-if="chatStore.isGenerating && !chatStore.currentStreamingMessage?.content"
          class="flex items-center gap-2 text-dark-900 dark:text-gray-400 font-medium"
        >
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
          <span class="text-sm">Generating...</span>
        </div>
      </div>

      <!-- Input -->
      <div class="p-4 border-t-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Image Preview -->
        <ImagePreview
          :images="uploadedImages"
          @remove="removeImage"
        />

        <!-- File Attachments Preview -->
        <div v-if="attachments.length > 0" class="mb-3 flex flex-wrap gap-2">
          <div
            v-for="file in attachments"
            :key="file.id"
            class="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-sm text-blue-900 dark:text-blue-100 font-medium"
          >
            <span v-if="file.type === 'pdf'">📄</span>
            <span v-else-if="file.type === 'docx'">📝</span>
            <span v-else>📋</span>
            <span>{{ file.name }}</span>
            <button @click="removeAttachment(file.id)" class="text-red-600 hover:text-red-800 dark:text-red-400 ml-1" title="Remove file">
              ×
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <textarea
            v-model="inputMessage"
            @keydown.enter.exact="sendMessage"
            @input="handleTyping"
            @paste="handleTextareaPaste"
            placeholder="Type your message... (paste images with Ctrl+V)"
            :disabled="chatStore.isGenerating"
            rows="2"
            class="flex-1 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-dark-900 dark:text-gray-100 resize-none font-medium"
          ></textarea>

          <div class="flex flex-col gap-2">
            <!-- File upload button (PDF, DOCX, TXT) -->
            <label class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
              title="Upload PDF, Word, or text file">
              <input
                ref="fileInput"
                type="file"
                @change="handleFileUpload"
                accept=".pdf,.txt,.docx,.doc"
                multiple
                class="hidden"
              />
              <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </label>

            <ImageUploadButton
              @imageAdded="handleImageAdded"
              @error="handleImageError"
            />

            <button
              v-if="!chatStore.isGenerating"
              @click="sendMessage"
              :disabled="!inputMessage.trim() && uploadedImages.length === 0"
              class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-lg disabled:opacity-50 font-semibold uppercase"
            >
              Send
            </button>

            <button
              v-else
              @click="chatStore.stopGeneration()"
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold uppercase"
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
        'lg:hidden fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r-2 border-gray-300 dark:border-gray-700 z-50 transition-transform duration-300',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="p-4 border-b-2 border-gray-300 dark:border-gray-700 flex items-center justify-between">
        <h2 class="font-bold text-dark-900 dark:text-white">Menu</h2>
        <button
          @click="mobileMenuOpen = false"
          class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-dark-900 dark:text-gray-300"
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
import { useRealtime } from '~/composables/useRealtime'
import { fetchMultipleURLs } from '~/composables/useURLFetching'
import { extractURLs } from '~/utils/urlExtractor'
import { usePDF } from '~/composables/usePDF'
import { useDOCX } from '~/composables/useDOCX'
import { IMAGE_CONFIG, type UploadedImage } from '~/types/image'
import type { Attachment } from '~/stores/chat'
import ChatMenu from '~/components/ChatMenu.vue'

const chatStore = useChatStore()
const historyStore = useChatHistoryStore()
const settingsStore = useSettingsStore()
const currentModel = ref(chatStore.currentModel)
const inputMessage = ref('')
const mobileMenuOpen = ref(false)
const fileInput = ref<HTMLInputElement>()
const { images: uploadedImages, addImage, removeImage, handlePaste } = useImageUpload()
const { processPDF } = usePDF()
const { processDOCX } = useDOCX()
const attachments = ref<Attachment[]>([])

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

// Initialize on mount
onMounted(async () => {
  currentModel.value = chatStore.currentModel

  // Small delay to ensure Pinia persistence hydration is complete
  // (in SSR=false mode, localStorage is loaded synchronously but we need to let the event loop cycle)
  await new Promise(resolve => setTimeout(resolve, 50))

  // Initialize system prompt from persisted GPT key
  chatStore.initializeSystemPrompt()

  // Initialize chat session on mount
  if (historyStore.allSessions.length === 0) {
    // No sessions exist, create a new one
    historyStore.createSession(
      '',
      settingsStore.currentSystemPromptKey,
      chatStore.currentModel,
      chatStore.temperature,
      chatStore.maxTokens,
      chatStore.topP
    )
  } else if (chatStore.currentSessionId && historyStore.allSessions.some(s => s.id === chatStore.currentSessionId)) {
    // Restore from persisted sessionId if it still exists
    await chatStore.loadSession(chatStore.currentSessionId)
  } else if (historyStore.currentSessionId) {
    // Fall back to history store's current session
    await chatStore.loadSession(historyStore.currentSessionId)
  } else if (historyStore.allSessions.length > 0) {
    // Load the first available session
    await chatStore.loadSession(historyStore.allSessions[0].id)
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
  if (currentSession && (!currentSession.initialPrompt || currentSession.initialPrompt === '')) {
    // Update the session with the initial prompt (from the first user message)
    const updatedSession = {
      ...currentSession,
      initialPrompt: message
    }
    Object.assign(currentSession, updatedSession)

    // Update session name to first 20 characters of the message
    if (historyStore.currentSessionId) {
      const sessionName = message.slice(0, 20)
      historyStore.updateSessionName(historyStore.currentSessionId, sessionName)
    }
  }

  // Auto-switch to Mistral Small 24B if images are attached
  if (images.length > 0 && chatStore.currentModel !== IMAGE_CONFIG.VISION_MODEL) {
    chatStore.setModel(IMAGE_CONFIG.VISION_MODEL)
  }

  // Extract and fetch URLs from the message
  const detectedURLs = extractURLs(message)
  let urlAttachments = []

  if (detectedURLs.length > 0) {
    try {
      urlAttachments = await fetchMultipleURLs(detectedURLs.map(u => u.url))

      // Filter out any failed fetches (those with errors)
      const failedUrls = urlAttachments.filter(u => u.error)
      if (failedUrls.length > 0) {
        console.warn('Failed to fetch some URLs:', failedUrls)
        // Remove failed URLs from the list
        urlAttachments = urlAttachments.filter(u => !u.error)
      }
    } catch (error) {
      console.error('Error fetching URLs:', error)
      // Continue sending message without URL content
      urlAttachments = []
    }
  }

  // Send message with images, file attachments and URL attachments
  if (images.length > 0 || attachments.value.length > 0) {
    await chatStore.sendMessage(
      message,
      images.length > 0 ? images : undefined,
      urlAttachments.length > 0 ? urlAttachments : undefined,
      attachments.value.length > 0 ? attachments.value : undefined
    )
    uploadedImages.value = []
    attachments.value = []
  } else {
    await chatStore.sendMessage(
      message,
      undefined,
      urlAttachments.length > 0 ? urlAttachments : undefined,
      undefined
    )
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

const handleImageAdded = async (file: File) => {
  // Handle image from ImageUploadButton component
  console.log('[chat] Image file received:', file.name)
  const success = await addImage(file)
  if (success) {
    console.log('[chat] Image successfully added to upload list:', file.name)
  } else {
    console.error('[chat] Failed to add image:', file.name)
  }
}

const handleImageError = (error: string) => {
  console.error('Image upload error:', error)
  // You could show a notification here
}

const removeAttachment = (id: string) => {
  attachments.value = attachments.value.filter(a => a.id !== id)
  console.log('[chat] Attachment removed:', id)
}

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  console.log('[chat] File upload started:', input.files.length, 'files')

  for (const file of Array.from(input.files)) {
    try {
      let content: string | undefined
      let processedData: any = undefined
      let attachmentType: 'pdf' | 'docx' | 'text' = 'text'

      console.log('[chat] Processing file:', file.name, 'Type:', file.type, 'Size:', file.size)

      // Process based on file type
      if (file.type === 'application/pdf') {
        try {
          const result = await processPDF(file)
          if (!result.text) {
            console.warn('[chat] PDF extraction returned empty text:', file.name)
            continue
          }
          content = result.text
          processedData = {
            pageCount: result.pageCount,
            metadata: result.metadata
          }
          attachmentType = 'pdf'
          console.log('[chat] PDF processed successfully:', file.name, 'Pages:', result.pageCount)
        } catch (err) {
          console.error('[chat] PDF processing failed:', file.name, err)
          alert(`Failed to process PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
          continue
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword' || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        try {
          const result = await processDOCX(file)
          if (!result.text) {
            console.warn('[chat] DOCX extraction returned empty text:', file.name)
            continue
          }
          content = result.text
          processedData = {
            metadata: result.metadata
          }
          attachmentType = 'docx'
          console.log('[chat] DOCX processed successfully:', file.name)
        } catch (err) {
          console.error('[chat] DOCX processing failed:', file.name, err)
          alert(`Failed to process DOCX: ${err instanceof Error ? err.message : 'Unknown error'}`)
          continue
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        try {
          const text = await file.text()
          if (!text) {
            console.warn('[chat] Text file is empty:', file.name)
            continue
          }
          content = text
          processedData = {
            size: text.length
          }
          attachmentType = 'text'
          console.log('[chat] Text file processed successfully:', file.name)
        } catch (err) {
          console.error('[chat] Text file reading failed:', file.name, err)
          alert(`Failed to read text file: ${err instanceof Error ? err.message : 'Unknown error'}`)
          continue
        }
      } else {
        console.warn('[chat] Unsupported file type:', file.name, 'Type:', file.type)
        alert(`Unsupported file type: ${file.type || file.name.split('.').pop()}`)
        continue
      }

      // Only add attachment if content was successfully extracted
      if (content && content.trim()) {
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          name: file.name,
          type: attachmentType,
          size: file.size,
          content,
          processedData
        }
        attachments.value.push(attachment)
        console.log('[chat] File attachment added:', attachment.name, 'Type:', attachment.type, 'Content length:', content.length)
      } else {
        console.warn('[chat] Attachment not added - no content extracted:', file.name)
        alert(`No content could be extracted from: ${file.name}`)
      }
    } catch (error) {
      console.error('[chat] Unexpected error processing file:', error)
      alert(`Unexpected error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Reset input
  if (fileInput.value) {
    fileInput.value.value = ''
    console.log('[chat] File input reset')
  }
}

useHead({
  title: 'Chat - HIKEathon 2025'
})
</script>