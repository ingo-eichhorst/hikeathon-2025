<template>
  <div class="space-y-8">
    <!-- Hero Selection Section -->
    <section class="py-12 px-4">
      <div class="grid md:grid-cols-2 gap-8">
        <!-- Chat Card -->
        <div class="flex flex-col items-center p-8 border-2 border-dark-900 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
          <div class="w-full flex justify-center mb-6">
            <img
              src="/text_gen.png"
              alt="Start Chat"
              class="h-80 object-contain rounded-lg"
            />
          </div>
          <NuxtLink to="/chat" class="btn btn-primary w-full">
            Start Chat
          </NuxtLink>
        </div>

        <!-- Images Card -->
        <div class="flex flex-col items-center p-8 border-2 border-dark-900 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow">
          <div class="w-full flex justify-center mb-6">
            <img
              src="/image_gen.png"
              alt="Generate Images"
              class="h-80 object-contain rounded-lg"
            />
          </div>
          <NuxtLink to="/images" class="btn btn-primary w-full">
            Generate Images
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Quick Start Section -->
    <section class="py-12">
      <QuickStartCarousel />
    </section>

    <!-- Notifications Section -->
    <section v-if="authStore.isAuthenticated" class="card">
      <NotificationList
        :show-header="true"
        :show-load-more="true"
        :scrollable="true"
      />
    </section>

  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
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

<style>
/* Invert image colors in dark mode for better visibility */
.dark img {
  filter: invert(1);
}
</style>