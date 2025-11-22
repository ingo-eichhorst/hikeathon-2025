<template>
  <footer class="bg-dark-900 dark:bg-gray-800 border-t-2 border-primary-500 dark:border-gray-700">
    <div class="container mx-auto px-4 py-6">
      <div class="text-center text-sm text-white dark:text-gray-300 font-medium">
        <p>&copy; {{ currentYear }} HIKEathon. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear()
</script>