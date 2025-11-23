<template>
  <div 
    :class="[
      'flex gap-3',
      message.role === 'user' ? 'justify-end' : 'justify-start'
    ]"
    :data-testid="`${message.role}-message`"
  >
    <div
      :class="[
        'max-w-[80%] rounded-lg p-4',
        message.role === 'user'
          ? 'bg-primary-500 text-dark-900'
          : 'bg-gray-100 dark:bg-gray-800 text-dark-900 dark:text-gray-100'
      ]"
    >
      <!-- Message content -->
      <div class="space-y-3">
        <!-- Text content -->
        <div
          class="prose prose-sm dark:prose-invert max-w-none"
          v-html="renderMarkdown(message.content || '')"
        ></div>

        <!-- Image attachments -->
        <div v-if="message.attachments && message.attachments.length > 0">
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div
              v-for="attachment in message.attachments.filter(a => a.type === 'image')"
              :key="attachment.id"
              class="rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"
            >
              <img
                :src="attachment.content"
                :alt="attachment.name"
                class="w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                @click="() => openImageModal(attachment)"
              />
            </div>
          </div>
        </div>

        <!-- URL attachments -->
        <div v-if="message.attachments && message.attachments.length > 0" class="space-y-2">
          <URLAttachmentCard
            v-for="attachment in message.attachments.filter(a => a.type === 'url')"
            :key="attachment.id"
            :attachment="convertURLAttachment(attachment)"
          />
        </div>

        <!-- Text file attachments -->
        <div v-if="message.attachments && message.attachments.length > 0" class="space-y-2">
          <FileAttachmentCard
            v-for="attachment in message.attachments.filter(a => a.type === 'text')"
            :key="attachment.id"
            :attachment="attachment"
          />
        </div>

        <!-- PDF attachments -->
        <div v-if="message.attachments && message.attachments.length > 0" class="space-y-2">
          <FileAttachmentCard
            v-for="attachment in message.attachments.filter(a => a.type === 'pdf')"
            :key="attachment.id"
            :attachment="attachment"
          />
        </div>

        <!-- DOCX attachments -->
        <div v-if="message.attachments && message.attachments.length > 0" class="space-y-2">
          <FileAttachmentCard
            v-for="attachment in message.attachments.filter(a => a.type === 'docx')"
            :key="attachment.id"
            :attachment="attachment"
          />
        </div>
      </div>

      <!-- Streaming indicator -->
      <div v-if="message.isStreaming" class="mt-2">
        <span class="inline-block w-2 h-2 bg-current rounded-full animate-pulse"></span>
      </div>
      
      <!-- Actions -->
      <div class="mt-2 flex gap-2 text-xs opacity-60">
        <button @click="$emit('delete')" class="hover:opacity-100">Delete</button>
        <button v-if="message.role === 'assistant'" @click="$emit('regenerate')" class="hover:opacity-100">
          Regenerate
        </button>
      </div>
    </div>

    <!-- Image Modal -->
    <div
      v-if="showImageModal && selectedImage"
      class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      @click="showImageModal = false"
    >
      <div class="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-auto">
        <div class="flex justify-between items-center p-4 border-b-2 border-gray-300 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-dark-900 dark:text-white">{{ selectedImage.name }}</h3>
          <button
            @click="showImageModal = false"
            class="text-dark-900 dark:text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-4">
          <img
            :src="selectedImage.content"
            :alt="selectedImage.name"
            class="w-full h-auto"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import type { Message, Attachment } from '~/stores/chat'
import URLAttachmentCard from './URLAttachmentCard.vue'
import FileAttachmentCard from './FileAttachmentCard.vue'

const props = defineProps<{
  message: Message
}>()

const emit = defineEmits<{
  delete: []
  regenerate: []
}>()

const showImageModal = ref(false)
const selectedImage = ref<Attachment | null>(null)

const openImageModal = (attachment: Attachment) => {
  selectedImage.value = attachment
  showImageModal.value = true
}

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true
})

// Set up syntax highlighting
marked.use({
  renderer: {
    codespan(token) {
      return `<code>${token.text}</code>`
    }
  }
})

const renderMarkdown = (content: string): string => {
  try {
    if (!content) {
      console.log('Empty content for message:', props.message.id, props.message.role)
      return ''
    }
    const result = marked(content)
    return typeof result === 'string' ? result : content
  } catch (error) {
    console.error('Markdown render error:', error)
    return content
  }
}

const convertURLAttachment = (attachment: Attachment) => {
  return {
    id: attachment.id,
    url: attachment.url || '',
    fetchedAt: attachment.processedData?.fetchedAt || new Date(),
    contentType: attachment.processedData?.contentType || 'text/html',
    content: attachment.content || '',
    summary: attachment.processedData?.summary || '',
    error: attachment.processedData?.error || undefined,
    isLoading: false
  }
}
</script>

<style>
@import 'highlight.js/styles/github-dark.css';

.prose pre {
  @apply text-gray-100 p-3 rounded-lg overflow-x-auto bg-gray-900 dark:bg-gray-950;
}

.prose code {
  @apply px-1 py-0.5;
}

.prose :is(h1, h2, h3, h4, h5, h6) {
  @apply dark:text-gray-100;
}

/* Dark mode code block overrides for better contrast */
.dark .prose pre {
  @apply bg-gray-950;
}

.dark .prose pre code {
  @apply text-gray-100;
}
</style>