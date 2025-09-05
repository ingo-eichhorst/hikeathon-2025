export default defineNuxtRouteMiddleware(async (to) => {
  const adminStore = useAdminStore()
  
  // Skip middleware for login page
  if (to.path === '/admin/login') {
    return
  }
  
  // Try to restore session
  const restored = await adminStore.restoreSession()
  
  // Check if admin is authenticated
  if (!adminStore.isAuthenticated && !restored) {
    return navigateTo('/admin/login')
  }
  
  // Check if session is still valid
  if (!adminStore.isSessionValid) {
    await adminStore.logout()
    return navigateTo('/admin/login')
  }
  
  // Check specific route permissions
  const routePermissions: Record<string, string> = {
    '/admin/dashboard': 'admin.dashboard.view',
    '/admin/telemetry': 'admin.telemetry.view',
    '/admin/broadcast': 'admin.broadcast.manage',
    '/admin/todos': 'admin.todos.manage',
    '/admin/system': 'admin.system.monitor'
  }
  
  const requiredPermission = routePermissions[to.path]
  if (requiredPermission && !adminStore.hasPermission(requiredPermission)) {
    // Log unauthorized access attempt
    await adminStore.logAction('unauthorized_access', 'admin_route', {
      path: to.path,
      requiredPermission
    })
    
    throw createError({
      statusCode: 403,
      statusMessage: 'Access Denied: Insufficient permissions'
    })
  }
})