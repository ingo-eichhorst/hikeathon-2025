<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
    <div class="max-w-md w-full">
      <div class="card">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            HIKEathon 2025
          </h1>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            Enter your team code to access the platform
          </p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label for="teamCode" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team Code
            </label>
            <input
              id="teamCode"
              v-model="teamCode"
              type="text"
              maxlength="8"
              data-testid="team-code-input"
              placeholder="Enter 8-character code"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white uppercase"
              :disabled="isLoading"
              @input="teamCode = teamCode.toUpperCase()"
            />
            <p v-if="teamCode.length > 0 && teamCode.length < 8" class="mt-1 text-sm text-amber-600 dark:text-amber-400">
              Code must be exactly 8 characters ({{ 8 - teamCode.length }} more needed)
            </p>
          </div>

          <div v-if="error" data-testid="error-message" class="p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg text-sm">
            {{ error }}
          </div>

          <button
            type="submit"
            data-testid="login-button"
            :disabled="teamCode.length !== 8 || isLoading"
            class="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <span v-if="!isLoading">Login to Platform</span>
            <span v-else class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Authenticating...
            </span>
          </button>
        </form>
      </div>

      <div class="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Your session will remain active for 48 hours</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useRouter } from 'vue-router'

// Disable layout for login page
definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const router = useRouter()

const teamCode = ref('')
const isLoading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (teamCode.value.length !== 8) {
    error.value = 'Team code must be exactly 8 characters'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const success = await authStore.login(teamCode.value)
    
    if (success) {
      // Redirect to home or intended page
      const redirectTo = router.currentRoute.value.query.redirect as string || '/'
      await router.push(redirectTo)
    } else {
      error.value = authStore.error || 'Invalid team code'
    }
  } catch (err: any) {
    error.value = err.message || 'An error occurred during login'
  } finally {
    isLoading.value = false
  }
}

// Auto-focus on mount
onMounted(() => {
  const input = document.getElementById('teamCode')
  if (input) {
    input.focus()
  }
})

useHead({
  title: 'Login - HIKEathon 2025'
})
</script>