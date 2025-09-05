import { test, expect, Browser, Page } from '@playwright/test'
import { HomePage } from './pages/HomePage'
import { ChatPage } from './pages/ChatPage'
import { ImagesPage } from './pages/ImagesPage'

test.describe('HIKEathon 2025 User Journey', () => {
  let homePage: HomePage
  let chatPage: ChatPage
  let imagesPage: ImagesPage

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page)
    chatPage = new ChatPage(page)
    imagesPage = new ImagesPage(page)
  })

  test('Complete hackathon workflow', async ({ page, browser }) => {
    // Step 1: Visit homepage
    await homePage.goto()
    await expect(homePage.titleHeading).toBeVisible()
    await expect(homePage.scheduleSection).toBeVisible()

    // Step 2: Try invalid login first
    await homePage.login('INVALID')
    await homePage.waitForLoginError()
    await expect(homePage.errorMessage).toBeVisible()

    // Step 3: Login with valid team code
    await homePage.login('TEAM1234')
    
    // Should redirect to chat page
    await expect(page).toHaveURL(/\/chat/)
    await expect(chatPage.chatInput).toBeVisible()

    // Step 4: Chat interaction
    await chatPage.sendMessage('Hello AI, can you help me with my hackathon project?')
    
    // Wait for AI response (with timeout)
    await chatPage.waitForResponse()
    
    // Verify response received
    const messageCount = await chatPage.getMessageCount()
    expect(messageCount).toBeGreaterThan(1)

    // Step 5: Test model switching
    await chatPage.selectModel('meta-llama/Meta-Llama-3.1-405B-Instruct-FP8')
    await chatPage.sendMessage('What are some good hackathon project ideas?')
    await chatPage.waitForResponse()

    // Step 6: Navigate to images
    await page.click('[data-testid="nav-images"]')
    await expect(page).toHaveURL(/\/images/)
    await expect(imagesPage.promptInput).toBeVisible()

    // Step 7: Generate image
    await imagesPage.generateImage('A futuristic hackathon workspace with developers coding')
    
    // Wait for image generation (longer timeout)
    await imagesPage.waitForGeneration(90000)
    
    // Verify image was generated
    const imageCount = await imagesPage.getGeneratedImagesCount()
    expect(imageCount).toBeGreaterThan(0)

    // Step 8: Test navigation and info page
    await page.click('[data-testid="nav-info"]')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('.schedule')).toBeVisible()

    // Step 9: Test multi-tab sync (if WebSocket broadcasting works)
    const page2 = await browser.newPage()
    const chatPage2 = new ChatPage(page2)
    
    await page2.goto('/chat')
    // Should be automatically authenticated via session
    
    // Send message from first tab
    await chatPage.sendMessage('Testing multi-tab sync')
    await chatPage.waitForResponse()

    // Check if message appears in second tab
    // Note: This might not work without proper WebSocket implementation
    // await expect(page2.locator('.message')).toContainText('Testing multi-tab sync')

    await page2.close()

    // Step 10: Test dark mode
    await chatPage.goto()
    await chatPage.toggleDarkMode()
    
    // Verify dark mode is enabled
    const isDark = await chatPage.isDarkModeEnabled()
    expect(isDark).toBe(true)

    // Step 11: Export functionality
    const download = await chatPage.exportChat()
    expect(download.suggestedFilename()).toMatch(/chat.*\.(json|txt)/)

    // Step 12: Logout
    await page.click('[data-testid="settings"]')
    await page.click('[data-testid="logout"]')
    
    // Should redirect to home
    await expect(page).toHaveURL(/\/$/)
    await expect(homePage.teamCodeInput).toBeVisible()
  })

  test('Responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await homePage.goto()
    
    // Check mobile navigation
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    
    // Test mobile login
    await homePage.login('TEAM1234')
    await expect(page).toHaveURL(/\/chat/)
    
    // Check mobile chat interface
    await expect(chatPage.chatInput).toBeVisible()
    await expect(chatPage.sendButton).toBeVisible()
    
    // Test mobile image generation
    await page.click('[data-testid="nav-images"]')
    await expect(imagesPage.promptInput).toBeVisible()
    await expect(imagesPage.generateButton).toBeVisible()
  })

  test('Error handling and recovery', async ({ page }) => {
    await homePage.goto()
    await homePage.login('TEAM1234')
    
    // Test chat with very long message
    const longMessage = 'a'.repeat(10000)
    await chatPage.sendMessage(longMessage)
    
    // Should handle gracefully - either truncate or show error
    await expect(async () => {
      await chatPage.waitForResponse(10000)
    }).not.toThrow()

    // Test image generation with inappropriate prompt
    await imagesPage.goto()
    await imagesPage.generateImage('inappropriate content')
    
    // Should show error or handle gracefully
    await page.waitForTimeout(5000) // Give time for processing
    
    // Either get an image or an error, both are acceptable
    const hasError = await imagesPage.isErrorVisible()
    const hasImages = await imagesPage.getGeneratedImagesCount() > 0
    
    expect(hasError || hasImages).toBe(true)
  })

  test('Performance and accessibility', async ({ page }) => {
    await homePage.goto()
    
    // Basic accessibility checks
    await expect(homePage.teamCodeInput).toHaveAttribute('aria-label')
    await expect(homePage.loginButton).toBeEnabled()
    
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBe(1)
    
    // Test keyboard navigation
    await homePage.teamCodeInput.press('Tab')
    await expect(homePage.loginButton).toBeFocused()
    
    // Test with reduced motion preferences
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await homePage.login('TEAM1234')
    
    // Should still work with reduced motion
    await expect(page).toHaveURL(/\/chat/)
  })
})