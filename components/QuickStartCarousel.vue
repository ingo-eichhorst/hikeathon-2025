<template>
  <div class="w-full px-4">
    <!-- Title -->
    <h2 class="text-2xl md:text-3xl font-bold mb-8 text-dark-900 dark:text-white uppercase text-center">
      Quick Actions
    </h2>

    <!-- Carousel Container -->
    <div class="relative flex items-center justify-center gap-4">
      <!-- Left Arrow Button -->
      <button
        @click="scrollLeft"
        class="hidden md:flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-dark-100 dark:bg-gray-700 hover:bg-primary-500 transition-colors duration-200"
        aria-label="Previous"
      >
        <img
          src="/arrow-left.png"
          alt="Previous"
          class="h-6 w-6 object-contain"
        />
      </button>

      <!-- Cards Container -->
      <div
        ref="carouselContainer"
        class="flex gap-4 overflow-x-auto scroll-smooth flex-1"
        :style="{ scrollBehavior: 'smooth' }"
      >
        <QuickStartCard
          v-for="gpt in quickStartGPTs"
          :key="gpt.key"
          :gpt="gpt"
          :image-src="`/quick-start/${gpt.key}.png`"
          class="flex-shrink-0 w-full md:w-1/3"
        />
      </div>

      <!-- Right Arrow Button -->
      <button
        @click="scrollRight"
        class="hidden md:flex flex-shrink-0 items-center justify-center h-12 w-12 rounded-full bg-dark-100 dark:bg-gray-700 hover:bg-primary-500 transition-colors duration-200"
        aria-label="Next"
      >
        <img
          src="/arrow-right.png"
          alt="Next"
          class="h-6 w-6 object-contain"
        />
      </button>
    </div>

    <!-- Scroll Indicators (for mobile) -->
    <div class="flex justify-center gap-2 mt-6 md:hidden">
      <button
        v-for="(_, index) in quickStartGPTs"
        :key="index"
        @click="scrollToIndex(index)"
        :class="[
          'h-2 rounded-full transition-all duration-200',
          currentIndex === index
            ? 'bg-primary-500 w-6'
            : 'bg-gray-300 dark:bg-gray-600 w-2'
        ]"
        :aria-label="`Go to slide ${index + 1}`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '~/stores/settings'
import type { GPT } from '~/stores/settings'

const settingsStore = useSettingsStore()
const carouselContainer = ref<HTMLElement | null>(null)
const currentIndex = ref(0)

const quickStartGPTs = computed((): GPT[] => {
  return [
    settingsStore.allGPTs['hikeathon-coach'],
    settingsStore.allGPTs['phase1-understanding-coach'],
    settingsStore.allGPTs['phase2-observation-coach'],
    settingsStore.allGPTs['phase3-synthesis-architect'],
    settingsStore.allGPTs['phase4-ideation-coach'],
    settingsStore.allGPTs['phase5-prototyping-maker'],
    settingsStore.allGPTs['phase6-testing-navigator'],
    settingsStore.allGPTs['prompt-companion']
  ]
})

const scrollLeft = () => {
  if (carouselContainer.value) {
    const cardWidth = carouselContainer.value.children[0]?.clientWidth || 0
    const gap = 16 // gap-4 = 1rem = 16px
    carouselContainer.value.scrollLeft -= cardWidth + gap
  }
}

const scrollRight = () => {
  if (carouselContainer.value) {
    const cardWidth = carouselContainer.value.children[0]?.clientWidth || 0
    const gap = 16 // gap-4 = 1rem = 16px
    carouselContainer.value.scrollLeft += cardWidth + gap
  }
}

const scrollToIndex = (index: number) => {
  if (carouselContainer.value) {
    const cardWidth = carouselContainer.value.children[0]?.clientWidth || 0
    const gap = 16
    carouselContainer.value.scrollLeft = index * (cardWidth + gap)
    currentIndex.value = index
  }
}

// Track scroll position for indicators
onMounted(() => {
  if (carouselContainer.value) {
    carouselContainer.value.addEventListener('scroll', () => {
      if (carouselContainer.value) {
        const cardWidth = carouselContainer.value.children[0]?.clientWidth || 0
        const gap = 16
        const scrollPosition = carouselContainer.value.scrollLeft
        currentIndex.value = Math.round(scrollPosition / (cardWidth + gap))
      }
    })
  }
})
</script>

<style scoped>
.scroll-smooth {
  scroll-behavior: smooth;
}

/* Hide scrollbar for cleaner look */
.overflow-x-auto::-webkit-scrollbar {
  display: none;
}

.overflow-x-auto {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
