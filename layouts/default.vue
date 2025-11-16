<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <BroadcastBanner />
    <main class="flex-1 flex flex-col container mx-auto px-4 py-4 overflow-hidden">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRealtime } from '~/composables/useRealtime'

const { initializeRealtime } = useRealtime()

onMounted(() => {
  initializeRealtime()
})
</script>