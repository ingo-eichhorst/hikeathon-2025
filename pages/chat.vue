<template>
  <div class="flex flex-col h-full">
    <!-- Header with model selector and settings -->
    <div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <select 
            v-model="currentModel"
            @change="chatStore.setModel(currentModel)"
            class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            data-testid="model-select"
          >
            <option v-for="model in CHAT_MODELS" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
          
          <div class="text-sm text-gray-600 dark:text-gray-400">
            <span data-testid="context-window">
              {{ chatStore.contextTokens }} / {{ chatStore.currentModelInfo?.contextLength }} {{ t('tokens') }}
            </span>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
              <div 
                class="bg-blue-600 h-1.5 rounded-full transition-all"
                :style="`width: ${chatStore.contextUsagePercent}%`"
              ></div>
            </div>
          </div>
        </div>
        
        <button
          @click="chatStore.clearMessages()"
          class="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          data-testid="clear-chat"
        >
          {{ t('clear') }}
        </button>
      </div>
    </div>
    
    <!-- Messages container -->
    <div 
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
      data-testid="message-list"
    >
      <ChatMessage 
        v-for="message in chatStore.messages"
        :key="message.id"
        :message="message"
        @edit="handleEditMessage"
        @delete="chatStore.deleteMessage(message.id)"
        @regenerate="handleRegenerate"
      />
      
      <!-- Streaming indicator -->
      <div 
        v-if="chatStore.isGenerating && !chatStore.currentStreamingMessage?.content"
        class="flex items-center gap-2 text-gray-600 dark:text-gray-400"
        data-testid="streaming-indicator"
      >
        <div class="flex gap-1">
          <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
          <div class="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
        <span class="text-sm">{{ t('generating') }}</span>
      </div>
    </div>
    
    <!-- Input area -->
    <div class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <ChatInput 
        @send="handleSendMessage"
        @stop="chatStore.stopGeneration()"
        :is-generating="chatStore.isGenerating"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useChatStore, CHAT_MODELS } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'

const chatStore = useChatStore()
const settingsStore = useSettingsStore()

const messagesContainer = ref<HTMLElement>()
const currentModel = ref(chatStore.currentModel)

const t = computed(() => settingsStore.t)

const handleSendMessage = async (content: string, attachments?: any[]) => {
  await chatStore.sendMessage(content, attachments)
  scrollToBottom()
}

const handleEditMessage = async (id: string, newContent: string) => {
  chatStore.editMessage(id, newContent)
  // Find index of edited message
  const index = chatStore.messages.findIndex(m => m.id === id)
  if (index !== -1 && index < chatStore.messages.length - 1) {
    // Remove all messages after the edited one
    chatStore.messages = chatStore.messages.slice(0, index + 1)
    // Resend the edited message
    await chatStore.sendMessage(newContent)
  }
}

const handleRegenerate = async () => {
  const lastUserMessage = [...chatStore.messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage) {
    // Remove last assistant message
    const lastAssistantIndex = chatStore.messages.findLastIndex(m => m.role === 'assistant')
    if (lastAssistantIndex !== -1) {
      chatStore.messages.splice(lastAssistantIndex, 1)
    }
    // Resend
    await chatStore.sendMessage(lastUserMessage.content, lastUserMessage.attachments)
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Auto-scroll when new messages arrive
watch(() => chatStore.messages.length, () => {
  scrollToBottom()
})

// Auto-scroll during streaming
watch(() => chatStore.currentStreamingMessage?.content, () => {
  scrollToBottom()
})

useHead({
  title: computed(() => `${t.value('chat')} - HIKEathon 2025`)
})
</script>