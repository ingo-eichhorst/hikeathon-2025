<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Login
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          HIKEathon 2025 Administration
        </p>
      </div>

      <!-- Login Form -->
      <form v-if="!mfaPending" @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            v-model="email"
            type="email"
            required
            data-testid="admin-email"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="admin@hikeathon.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password
          </label>
          <input
            v-model="password"
            type="password"
            required
            data-testid="admin-password"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          data-testid="login-button"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ isLoading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>

      <!-- MFA Form -->
      <form v-else @submit.prevent="handleMFAVerification" class="space-y-6">
        <div class="text-center">
          <div class="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg mb-4">
            <svg class="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p class="text-blue-800 dark:text-blue-200 font-medium">
              Two-Factor Authentication Required
            </p>
            <p class="text-blue-600 dark:text-blue-400 text-sm mt-1">
              Enter your 6-digit verification code
            </p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Verification Code
          </label>
          <input
            v-model="mfaCode"
            type="text"
            maxlength="6"
            required
            data-testid="2fa-input"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
            placeholder="123456"
          />
        </div>

        <div class="flex space-x-3">
          <button
            type="button"
            @click="cancelMFA"
            class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isLoading || mfaCode.length !== 6"
            data-testid="verify-2fa"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ isLoading ? 'Verifying...' : 'Verify' }}
          </button>
        </div>
      </form>

      <!-- Error Message -->
      <div v-if="error" class="mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 rounded-md" data-testid="error-message">
        <p class="text-red-700 dark:text-red-300 text-sm">{{ error }}</p>
      </div>

      <!-- Demo Credentials -->
      <div class="mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-md text-xs">
        <p class="text-gray-600 dark:text-gray-400 font-medium mb-1">Demo Credentials:</p>
        <p class="text-gray-500 dark:text-gray-500">Email: admin@hikeathon.com</p>
        <p class="text-gray-500 dark:text-gray-500">Password: admin123</p>
        <p class="text-gray-500 dark:text-gray-500">MFA Code: 123456 or 000000</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const adminStore = useAdminStore()
const router = useRouter()

const email = ref('admin@hikeathon.com')
const password = ref('admin123')
const mfaCode = ref('')
const error = ref('')

const { isLoading, mfaPending } = storeToRefs(adminStore)

// Redirect if already authenticated
onMounted(async () => {
  if (await adminStore.restoreSession()) {
    router.push('/admin/dashboard')
  }
})

const handleLogin = async () => {
  try {
    error.value = ''
    const result = await adminStore.login(email.value, password.value)
    
    if (!result.requiresMFA) {
      router.push('/admin/dashboard')
    }
  } catch (err: any) {
    error.value = err.message
  }
}

const handleMFAVerification = async () => {
  try {
    error.value = ''
    await adminStore.verifyMFA(mfaCode.value)
    router.push('/admin/dashboard')
  } catch (err: any) {
    error.value = err.message
    mfaCode.value = ''
  }
}

const cancelMFA = () => {
  adminStore.logout()
  mfaCode.value = ''
  error.value = ''
}

// Watch for errors from store
watch(() => adminStore.error, (newError) => {
  if (newError) {
    error.value = newError
  }
})

useHead({
  title: 'Admin Login - HIKEathon 2025'
})

// Prevent access to admin areas without authentication
definePageMeta({
  layout: false
})
</script>