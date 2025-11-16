<template>
  <div
    v-if="countdownStore.isVisible"
    class="card bg-gradient-to-r from-primary-500 to-primary-600 text-dark-900"
  >
    <div class="text-center">
      <h2 class="text-2xl md:text-3xl font-bold mb-4">
        {{ countdownStore.currentCountdown?.title }}
      </h2>

      <div
        v-if="!timeRemaining.isPast"
        class="flex justify-center gap-4 md:gap-8"
      >
        <div class="flex flex-col items-center">
          <div class="text-4xl md:text-5xl font-bold">
            {{ String(timeRemaining.days).padStart(2, '0') }}
          </div>
          <div class="text-sm md:text-base opacity-90 mt-1">
            {{ settingsStore.t('days') }}
          </div>
        </div>

        <div class="flex flex-col items-center">
          <div class="text-4xl md:text-5xl font-bold">
            {{ String(timeRemaining.hours).padStart(2, '0') }}
          </div>
          <div class="text-sm md:text-base opacity-90 mt-1">
            {{ settingsStore.t('hours') }}
          </div>
        </div>

        <div class="flex flex-col items-center">
          <div class="text-4xl md:text-5xl font-bold">
            {{ String(timeRemaining.minutes).padStart(2, '0') }}
          </div>
          <div class="text-sm md:text-base opacity-90 mt-1">
            {{ settingsStore.t('minutes') }}
          </div>
        </div>

        <div class="flex flex-col items-center">
          <div class="text-4xl md:text-5xl font-bold">
            {{ String(timeRemaining.seconds).padStart(2, '0') }}
          </div>
          <div class="text-sm md:text-base opacity-90 mt-1">
            {{ settingsStore.t('seconds') }}
          </div>
        </div>
      </div>

      <div v-else class="text-2xl md:text-3xl font-bold animate-pulse">
        🎉 Deadline Reached! 🎉
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCountdownStore } from '~/stores/countdown'
import { useSettingsStore } from '~/stores/settings'

const countdownStore = useCountdownStore()
const settingsStore = useSettingsStore()

const currentTime = ref(Date.now())
let intervalId: NodeJS.Timeout | null = null

const timeRemaining = computed(() => {
  // Access currentTime to trigger reactivity every second
  const now = currentTime.value

  if (!countdownStore.currentCountdown) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, isPast: false }
  }

  const deadline = new Date(countdownStore.currentCountdown.deadline).getTime()
  const total = deadline - now
  const isPast = total < 0
  const absTotal = Math.abs(total)

  return {
    days: Math.floor(absTotal / (1000 * 60 * 60 * 24)),
    hours: Math.floor((absTotal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((absTotal % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((absTotal % (1000 * 60)) / 1000),
    total,
    isPast
  }
})

onMounted(() => {
  // Update time every second
  intervalId = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>
