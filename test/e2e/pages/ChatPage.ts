import { Page, Locator } from '@playwright/test'

export class ChatPage {
  readonly page: Page
  readonly chatInput: Locator
  readonly sendButton: Locator
  readonly messagesContainer: Locator
  readonly modelSelect: Locator
  readonly clearButton: Locator
  readonly exportButton: Locator
  readonly settingsButton: Locator
  readonly darkModeToggle: Locator
  readonly streamingIndicator: Locator

  constructor(page: Page) {
    this.page = page
    this.chatInput = page.locator('[data-testid="chat-input"]')
    this.sendButton = page.locator('[data-testid="send"]')
    this.messagesContainer = page.locator('[data-testid="messages"]')
    this.modelSelect = page.locator('[data-testid="model-select"]')
    this.clearButton = page.locator('[data-testid="clear-chat"]')
    this.exportButton = page.locator('[data-testid="export-chat"]')
    this.settingsButton = page.locator('[data-testid="settings"]')
    this.darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]')
    this.streamingIndicator = page.locator('[data-testid="streaming"]')
  }

  async goto() {
    await this.page.goto('/chat')
  }

  async sendMessage(message: string) {
    await this.chatInput.fill(message)
    await this.sendButton.click()
  }

  async waitForResponse(timeout = 30000) {
    // Wait for streaming to start
    await this.streamingIndicator.waitFor({ timeout: 5000 })
    // Wait for streaming to finish
    await this.streamingIndicator.waitFor({ state: 'hidden', timeout })
  }

  async getLastMessage() {
    const messages = this.messagesContainer.locator('.message')
    return await messages.last().textContent()
  }

  async getMessageCount() {
    return await this.messagesContainer.locator('.message').count()
  }

  async selectModel(modelName: string) {
    await this.modelSelect.selectOption(modelName)
  }

  async clearChat() {
    await this.clearButton.click()
    // Wait for confirmation dialog and click confirm
    await this.page.locator('button:has-text("Clear")').click()
  }

  async exportChat() {
    const downloadPromise = this.page.waitForEvent('download')
    await this.exportButton.click()
    return await downloadPromise
  }

  async toggleDarkMode() {
    await this.darkModeToggle.click()
  }

  async isDarkModeEnabled() {
    return await this.page.locator('html').getAttribute('class') === 'dark'
  }
}