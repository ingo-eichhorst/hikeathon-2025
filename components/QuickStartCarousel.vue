<template>
  <div class="w-full">
    <!-- Title -->
    <h2 class="text-2xl md:text-3xl font-bold mb-8 text-dark-900 dark:text-white uppercase text-center">
      Quick Actions
    </h2>

    <!-- Carousel Container -->
    <div class="relative">
      <!-- Left Arrow -->
      <button
        @click="scrollLeft"
        class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 md:-translate-x-16 z-10 p-2 rounded-full hover:bg-primary-500 transition-colors duration-200 group"
        aria-label="Previous"
      >
        <img
          src="/arrow-left.png"
          alt="Previous"
          class="h-8 w-8 md:h-10 md:w-10 object-contain group-hover:scale-110 transition-transform duration-200"
        />
      </button>

      <!-- Cards Container -->
      <div
        ref="carouselContainer"
        class="flex gap-6 overflow-x-auto scroll-smooth"
        :style="{ scrollBehavior: 'smooth' }"
      >
        <QuickStartCard
          v-for="gpt in quickStartGPTs"
          :key="gpt.key"
          :gpt="gpt"
          :image-src="`/quick-start/${gpt.key}.png`"
          class="flex-shrink-0 w-full md:w-1/4"
        />
      </div>

      <!-- Right Arrow -->
      <button
        @click="scrollRight"
        class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 md:translate-x-16 z-10 p-2 rounded-full hover:bg-primary-500 transition-colors duration-200 group"
        aria-label="Next"
      >
        <img
          src="/arrow-right.png"
          alt="Next"
          class="h-8 w-8 md:h-10 md:w-10 object-contain group-hover:scale-110 transition-transform duration-200"
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
    settingsStore.allGPTs['interview'],
    settingsStore.allGPTs['bmc'],
    settingsStore.allGPTs['reframer'],
    settingsStore.allGPTs['ideation']
  ]
})

const scrollLeft = () => {
  if (carouselContainer.value) {
    const cardWidth = carouselContainer.value.children[0]?.clientWidth || 0
    const gap = 24 // gap-6 = 1.5rem = 24px
    carouselContainer.value.scrollLeft -= cardWidth + gap
  }
}

const scrollRight = () => {
  if (carouselContainer.value) {
    const cardWidth = carouselContainer.value.children[0]?.clientWidth || 0
    const gap = 24 // gap-6 = 1.5rem = 24px
    carouselContainer.value.scrollLeft += cardWidth + gap
  }
}

const scrollToIndex = (index: number) => {
  if (carouselContainer.value) {
    const cardWidth = carouselContainer.value.children[0]?.clientWidth || 0
    const gap = 24
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
        const gap = 24
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
