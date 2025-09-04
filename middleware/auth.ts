import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to, from) => {
  // Skip auth check for login page
  if (to.path === '/login') {
    return
  }

  const authStore = useAuthStore()
  
  // Check if user is authenticated
  if (!authStore.isAuthenticated) {
    // Try to restore session from storage
    const restored = authStore.restoreSession()
    
    if (!restored) {
      // Redirect to login with return URL
      return navigateTo({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    }
  }
  
  // Check if session is still valid
  if (!authStore.isSessionValid) {
    authStore.logout()
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
})