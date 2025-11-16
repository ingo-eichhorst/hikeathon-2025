import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = createPinia()

  // Install the persistence plugin
  pinia.use(piniaPluginPersistedstate)

  nuxtApp.vueApp.use(pinia)
})
