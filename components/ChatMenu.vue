<template>
  <div class="chat-menu flex flex-col gap-6">
    <!-- GPTs Section -->
    <div class="gpts-section">
      <h2 class="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 px-2 uppercase tracking-wide">
        GPTs
      </h2>
      <div class="flex flex-col gap-1 px-1">
        <GPTCard
          v-for="(gpt, key) in allGPTs"
          :key="key"
          :gpt="gpt"
          :isActive="currentGPT.key === gpt.key"
          @select="selectGPT(gpt.key)"
        />
      </div>
    </div>

    <!-- Divider -->
    <div class="h-px bg-gray-200 dark:bg-gray-600" />

    <!-- Chats Section -->
    <div class="chats-section flex flex-col gap-3">
      <div class="flex items-center justify-between px-2">
        <h2 class="text-sm font-bold text-gray-700 dark:text-gray-300">
          Chats
        </h2>
        <button
          class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          @click="startNewChat"
          title="Start a new chat"
          aria-label="Create new chat"
        >
          <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <!-- Chat Sessions List -->
      <div class="flex-1 overflow-y-auto px-2 space-y-2 max-h-96">
        <ChatSessionCard
          v-for="session in allSessions"
          :key="session.id"
          :session="session"
          :isActive="currentSessionId === session.id"
          @select="switchChat(session.id)"
          @delete="deleteChat(session.id)"
        />
        <div
          v-if="allSessions.length === 0"
          class="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
        >
          No chats yet. Start one to begin!
        </div>
      </div>

      <!-- New Chat Button (mobile-friendly) -->
      <button
        class="w-full mx-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 transition-colors"
        @click="startNewChat"
      >
        + New Chat
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import { useChatHistoryStore } from '~/stores/chatHistory'
import { useChatStore } from '~/stores/chat'
import GPTCard from './GPTCard.vue'
import ChatSessionCard from './ChatSessionCard.vue'

const settingsStore = useSettingsStore()
const historyStore = useChatHistoryStore()
const chatStore = useChatStore()

const allGPTs = computed(() => settingsStore.allGPTs)
const currentGPT = computed(() => settingsStore.currentGPT)
const allSessions = computed(() => historyStore.allSessions)
const currentSessionId = computed(() => historyStore.currentSessionId)

const selectGPT = (gptKey: string) => {
  settingsStore.selectSystemPrompt(gptKey)
  // Update current session's GPT if there's an active session
  if (currentSessionId.value) {
    historyStore.updateSessionGPT(gptKey)
  }
}

const startNewChat = () => {
  // Save current session if one exists
  if (currentSessionId.value) {
    chatStore.saveCurrentSession()
  }

  // Create new session with current GPT and settings
  const sessionId = historyStore.createSession(
    '', // empty initial prompt until user sends a message
    settingsStore.currentSystemPromptKey,
    chatStore.currentModel,
    chatStore.temperature,
    chatStore.maxTokens,
    chatStore.topP
  )

  // Clear messages for new chat
  chatStore.setCurrentSessionId(sessionId)
  chatStore.clearMessages()
}

const switchChat = (sessionId: string) => {
  // Save current session first
  if (currentSessionId.value && currentSessionId.value !== sessionId) {
    chatStore.saveCurrentSession()
  }

  // Load the selected session
  chatStore.loadSession(sessionId)
}

const deleteChat = (sessionId: string) => {
  // If deleting current chat, switch to another or start new
  if (currentSessionId.value === sessionId) {
    const remaining = allSessions.value.filter(s => s.id !== sessionId)
    if (remaining.length > 0) {
      switchChat(remaining[0].id)
    } else {
      // No other chats, start a new one
      startNewChat()
    }
  }

  historyStore.deleteSession(sessionId)
}
</script>

<style scoped>
/* No additional styles needed - all styling handled via Tailwind */
</style>
