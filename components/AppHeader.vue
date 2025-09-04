<template>
  <header class="bg-white dark:bg-gray-800 shadow">
    <nav class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <NuxtLink to="/" class="text-2xl font-bold text-blue-600 dark:text-blue-400">
          HIKEathon 2025
        </NuxtLink>
        
        <div class="flex items-center space-x-6">
          <NuxtLink 
            v-for="item in navigation" 
            :key="item.path"
            :to="item.path"
            :data-testid="`nav-${item.name.toLowerCase()}`"
            class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {{ item.label }}
          </NuxtLink>
          
          <div class="flex items-center space-x-3 border-l border-gray-300 dark:border-gray-600 pl-3">
            <span v-if="authStore.isAuthenticated" class="text-sm text-gray-600 dark:text-gray-400">
              {{ authStore.teamName }}
            </span>
            
            <button
              @click="toggleDark()"
              data-testid="theme-toggle"
              class="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            >
              <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
            
            <button
              v-if="authStore.isAuthenticated"
              @click="authStore.logout()"
              data-testid="logout-button"
              class="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import { useAuthStore } from '~/stores/auth'

const isDark = useDark()
const toggleDark = useToggle(isDark)
const authStore = useAuthStore()

const navigation = [
  { name: 'home', path: '/', label: 'Home' },
  { name: 'map', path: '/map', label: 'Map' },
  { name: 'todos', path: '/todos', label: 'Todos' },
  { name: 'chat', path: '/chat', label: 'Chat' },
  { name: 'admin', path: '/admin', label: 'Admin' }
]
</script>