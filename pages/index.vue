<template>
  <div class="space-y-8">
    <section class="text-center py-12">
      <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
        Welcome to HIKEathon 2025
      </h1>
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
        Track your team's progress in real-time
      </p>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink to="/map" class="btn btn-primary">
          View Live Map
        </NuxtLink>
        <NuxtLink to="/todos" class="btn btn-secondary">
          Check Tasks
        </NuxtLink>
      </div>
    </section>

    <section class="grid md:grid-cols-3 gap-6">
      <div class="card">
        <h2 class="text-xl font-semibold mb-2">Real-time Tracking</h2>
        <p class="text-gray-600 dark:text-gray-400">
          Monitor all teams' locations on an interactive map with live updates.
        </p>
      </div>
      
      <div class="card">
        <h2 class="text-xl font-semibold mb-2">Team Tasks</h2>
        <p class="text-gray-600 dark:text-gray-400">
          Complete challenges and track your progress through the event.
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
useHead({
  title: 'Home - HIKEathon 2025'
})
</script>