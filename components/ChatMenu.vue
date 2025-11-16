<template>
  <div class="flex flex-col gap-4 p-4 w-full">
    <!-- GPTs Section -->
    <div class="w-full">
      <h2 class="text-sm font-semibold mb-2">GPTs</h2>
      <div class="flex flex-col gap-1 w-full">
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
    <div class="h-px bg-gray-200 dark:bg-gray-700" />

    <!-- Chats Section -->
    <div class="flex flex-col gap-2 flex-1 min-h-0 w-full">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">Chats</h2>
        <button
          class="p-1 hover:opacity-70 transition-opacity"
          @click="startNewChat"
          title="Start a new chat"
          aria-label="Create new chat"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <!-- Chat Sessions List -->
      <div class="flex-1 overflow-y-auto space-y-1 min-h-0 w-full">
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
          class="text-xs text-gray-500 text-center py-4"
        >
          No chats yet
        </div>
      </div>

      <!-- New Chat Button -->
      <button
        class="btn btn-primary w-full"
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
