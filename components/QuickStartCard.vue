<template>
  <div
    @click="startChat"
    class="flex flex-col items-center p-6 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer group"
  >
    <!-- Image Container -->
    <div class="w-full flex justify-center mb-4 overflow-hidden rounded-lg">
      <img
        :src="imageSrc"
        :alt="gpt.name"
        class="h-40 object-cover group-hover:scale-110 transition-transform duration-200"
      />
    </div>

    <!-- Title -->
    <h3 class="text-lg md:text-xl font-bold text-dark-900 dark:text-white mb-2 text-center uppercase">
      {{ gpt.name }}
    </h3>

    <!-- Description -->
    <p class="text-sm md:text-base text-dark-900 dark:text-gray-300 text-center mb-4">
      {{ gpt.description }}
    </p>

    <!-- Icon Badge -->
    <div class="text-3xl mb-2">
      {{ gpt.icon }}
    </div>

    <!-- Hover CTA -->
    <div class="text-primary-500 font-semibold text-sm uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      Start Chat
    </div>
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
