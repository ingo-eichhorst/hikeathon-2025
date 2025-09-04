<template>
  <div class="space-y-2">
    <!-- File attachments -->
    <div v-if="attachments.length > 0" class="flex flex-wrap gap-2">
      <div 
        v-for="file in attachments" 
        :key="file.id"
        class="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm"
      >
        <span>{{ file.name }}</span>
        <button @click="removeAttachment(file.id)" class="text-red-500 hover:text-red-700">
          ×
        </button>
      </div>
    </div>
    
    <!-- Input area -->
    <div class="flex gap-2">
      <div class="flex-1 relative">
        <textarea
          v-model="message"
          @keydown.enter.exact="handleSend"
          @keydown.enter.shift="() => {}"
          :placeholder="t('typeMessage')"
          :disabled="isGenerating"
          rows="3"
          class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="chat-input"
        ></textarea>
        
        <!-- File upload button -->
        <label class="absolute bottom-2 left-2 cursor-pointer">
          <input
            type="file"
            @change="handleFileUpload"
            accept=".txt,.pdf,.png,.jpg,.jpeg"
            class="hidden"
            data-testid="file-input"
          />
          <svg class="w-5 h-5 text-gray-500 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </label>
      </div>
      
      <!-- Send/Stop button -->
      <button
        v-if="!isGenerating"
        @click="handleSend"
        :disabled="!message.trim() || isGenerating"
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="send-button"
      >
        {{ t('send') }}
      </button>
      
      <button
        v-else
        @click="$emit('stop')"
        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        data-testid="stop-button"
      >
        {{ t('stopGenerating') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import type { Attachment } from '~/stores/chat'

const props = defineProps<{
  isGenerating: boolean
}>()

const emit = defineEmits<{
  send: [content: string, attachments: Attachment[]]
  stop: []
}>()

const settingsStore = useSettingsStore()
const t = computed(() => settingsStore.t)

const message = ref('')
const attachments = ref<Attachment[]>([])

const handleSend = () => {
  if (!message.value.trim() || props.isGenerating) return
  
  emit('send', message.value, attachments.value)
  message.value = ''
  attachments.value = []
}

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  
  const file = input.files[0]
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (file.size > maxSize) {
    alert('File size must be less than 5MB')
    return
  }
  
  // Read file content for text files
  let content: string | undefined
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    content = await file.text()
  }
  
  const attachment: Attachment = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'text',
    size: file.size,
    content
  }
  
  attachments.value.push(attachment)
  input.value = '' // Reset input
}

const removeAttachment = (id: string) => {
  attachments.value = attachments.value.filter(a => a.id !== id)
}
</script>