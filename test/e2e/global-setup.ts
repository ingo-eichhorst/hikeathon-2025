import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Create a browser instance for setup tasks
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Wait for the application to be ready
    console.log('🚀 Waiting for application to be ready...')
    
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3002/hikeathon-2025'
    
    // Wait for the application to respond
    await page.goto(baseURL, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    })
    
    // Verify the application is working
    await page.waitForSelector('main, body', { timeout: 10000 })
    
    console.log('✅ Application is ready for testing')
    
    // Optional: Set up test data if needed
    // await setupTestData(page)
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

// Optional function to set up test data
async function setupTestData(page: any) {
  // This could include:
  // - Creating test teams
  // - Setting up test broadcasts
  // - Initializing test todos
  console.log('📝 Setting up test data...')
  
  // Example: Navigate to admin and create test data
  // await page.goto('/admin/login')
  // ... authenticate and create test data
}

export default globalSetup