<template>
  <div
    @click="startChat"
    class="flex flex-col items-center p-6 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
  >
    <!-- Image Container -->
    <div class="w-full flex justify-center mb-4 rounded">
      <img
        :src="imageSrc"
        :alt="gpt.name"
        class="h-48 w-full object-cover rounded"
      />
    </div>

    <!-- Title -->
    <h3 class="text-base font-bold text-dark-900 dark:text-white mb-2 text-center uppercase">
      {{ gpt.name }}
    </h3>

    <!-- Description -->
    <p class="text-sm text-dark-900 dark:text-gray-300 text-center flex-grow">
      {{ gpt.description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GPT } from '~/stores/settings'
import { useSettingsStore } from '~/stores/settings'
import { useChatStore } from '~/stores/chat'
import { useChatHistoryStore } from '~/stores/chatHistory'

interface Props {
  gpt: GPT
  imageSrc: string
}

const props = defineProps<Props>()

const settingsStore = useSettingsStore()
const chatStore = useChatStore()
const historyStore = useChatHistoryStore()

const startChat = async () => {
  // Select the GPT/system prompt
  settingsStore.selectSystemPrompt(props.gpt.key)

  // Create a new chat session with this GPT
  const sessionId = historyStore.createSession(
    '', // empty initial prompt
    props.gpt.key,
    chatStore.currentModel,
    chatStore.temperature,
    chatStore.maxTokens,
    chatStore.topP
  )

  // Set current session and clear messages
  chatStore.setCurrentSessionId(sessionId)
  chatStore.clearMessages()

  // Navigate to chat page
  await navigateTo('/chat')
}
</script>
