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
      <div
        v-if="!isEditing"
        class="space-y-3"
      >
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
      
      <!-- Edit mode -->
      <div v-else class="space-y-2">
        <textarea
          v-model="editContent"
          class="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          rows="3"
        ></textarea>
        <div class="flex gap-2">
          <button @click="saveEdit" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold">
            Save
          </button>
          <button @click="cancelEdit" class="px-2 py-1 bg-dark-900 hover:bg-gray-900 text-white rounded text-sm font-semibold">
            Cancel
          </button>
        </div>
      </div>
      
      <!-- Streaming indicator -->
      <div v-if="message.isStreaming" class="mt-2">
        <span class="inline-block w-2 h-2 bg-current rounded-full animate-pulse"></span>
      </div>
      
      <!-- Actions -->
      <div v-if="!isEditing" class="mt-2 flex gap-2 text-xs opacity-60">
        <button @click="isEditing = true" class="hover:opacity-100">Edit</button>
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
  edit: [id: string, content: string]
  delete: []
  regenerate: []
}>()

const isEditing = ref(false)
const editContent = ref('')
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

const saveEdit = () => {
  emit('edit', props.message.id, editContent.value)
  isEditing.value = false
}

const cancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
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
  @apply bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto;
}

.prose code {
  @apply bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded;
}
</style>