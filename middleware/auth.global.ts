import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to, from) => {
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/']
  
  // Skip auth check for public routes
  if (publicRoutes.includes(to.path)) {
    return
  }

  const authStore = useAuthStore()
  
  // Try to restore session on first load
  if (!authStore.isAuthenticated && typeof window !== 'undefined') {
    authStore.restoreSession()
  }
  
  // Check authentication
  if (!authStore.isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
  
  // Check session validity
  if (!authStore.isSessionValid) {
    authStore.logout()
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath, expired: 'true' }
    })
  }
  
  // Set up auto-refresh if needed
  authStore.setupAutoRefresh()
})