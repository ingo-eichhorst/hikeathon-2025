<template>
  <div class="h-full flex flex-col">
    <div class="p-4 border-b">
      <h1>Chat Test Page</h1>
    </div>
    
    <div class="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
      <div v-for="msg in messages" :key="msg.id" class="mb-4">
        <div class="p-3 rounded bg-white dark:bg-gray-800">
          {{ msg.content }}
        </div>
      </div>
    </div>
    
    <div class="p-4 border-t bg-white dark:bg-gray-800">
      <div class="flex gap-2">
        <input 
          v-model="newMessage"
          @keydown.enter="sendMessage"
          type="text"
          placeholder="Type a message..."
          class="flex-1 px-3 py-2 border rounded dark:bg-gray-700"
        />
        <button 
          @click="sendMessage"
          class="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const messages = ref([])
const newMessage = ref('')

const sendMessage = () => {
  if (newMessage.value.trim()) {
    messages.value.push({
      id: Date.now(),
      content: newMessage.value
    })
    newMessage.value = ''
  }
}
</script>