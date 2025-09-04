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
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
      ]"
    >
      <!-- Message content -->
      <div 
        v-if="!isEditing"
        class="prose prose-sm dark:prose-invert max-w-none"
        v-html="renderMarkdown(message.content)"
      ></div>
      
      <!-- Edit mode -->
      <div v-else class="space-y-2">
        <textarea
          v-model="editContent"
          class="w-full p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          rows="3"
        ></textarea>
        <div class="flex gap-2">
          <button @click="saveEdit" class="px-2 py-1 bg-green-600 text-white rounded text-sm">
            Save
          </button>
          <button @click="cancelEdit" class="px-2 py-1 bg-gray-600 text-white rounded text-sm">
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import type { Message } from '~/stores/chat'

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

// Configure marked
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

const renderMarkdown = (content: string): string => {
  try {
    return marked(content)
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