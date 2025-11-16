<template>
  <div class="space-y-8">
    <!-- Countdown Section -->
    <Countdown />

    <section class="text-center py-12">
      <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to HIKEathon 2025
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
        Track your team's progress in real-time
      </p>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink to="/chat" class="btn btn-primary">
          Start Chatting
        </NuxtLink>
        <NuxtLink to="/images" class="btn btn-secondary">
          Generate Images
        </NuxtLink>
      </div>
    </section>

    <!-- Notifications Section -->
    <section v-if="authStore.isAuthenticated" class="card">
      <NotificationList
        :show-header="true"
        :show-load-more="true"
        :scrollable="true"
      />
    </section>

    <section class="grid md:grid-cols-3 gap-6">
      <div class="card">
        <h2 class="text-xl font-semibold mb-2">AI Chat</h2>
        <p class="text-gray-600 dark:text-gray-400">
          Chat with advanced AI models powered by IONOS Model Hub with streaming support.
        </p>
      </div>

      <div class="card">
        <h2 class="text-xl font-semibold mb-2">Image Generation</h2>
        <p class="text-gray-600 dark:text-gray-400">
          Create stunning images with DALL-E 3, FLUX, and Stable Diffusion models.
        </p>
      </div>

      <div class="card">
        <h2 class="text-xl font-semibold mb-2">Live Updates</h2>
        <p class="text-gray-600 dark:text-gray-400">
          Receive instant broadcasts and announcements from event organizers.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useNotificationsStore } from '~/stores/notifications'
import { useCountdownStore } from '~/stores/countdown'

const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const countdownStore = useCountdownStore()

// Initialize countdown and notifications when component mounts
onMounted(async () => {
  await countdownStore.fetchActiveCountdown()

  if (authStore.isAuthenticated) {
    await notificationsStore.initialize()
  }
})

// Watch for authentication changes
watch(() => authStore.isAuthenticated, async (isAuthenticated) => {
  if (isAuthenticated) {
    await notificationsStore.initialize()
  } else {
    notificationsStore.clearNotifications()
  }
})

useHead({
  title: 'Home - HIKEathon 2025'
})
</script>