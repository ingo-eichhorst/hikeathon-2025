import { Page, Locator } from '@playwright/test'

export class ImagesPage {
  readonly page: Page
  readonly promptInput: Locator
  readonly generateButton: Locator
  readonly imagesGrid: Locator
  readonly loadingSpinner: Locator
  readonly errorMessage: Locator
  readonly clearButton: Locator
  readonly downloadButton: Locator

  constructor(page: Page) {
    this.page = page
    this.promptInput = page.locator('[data-testid="prompt"]')
    this.generateButton = page.locator('[data-testid="generate"]')
    this.imagesGrid = page.locator('[data-testid="images-grid"]')
    this.loadingSpinner = page.locator('[data-testid="generating"]')
    this.errorMessage = page.locator('[data-testid="error"]')
    this.clearButton = page.locator('[data-testid="clear-images"]')
    this.downloadButton = page.locator('[data-testid="download"]')
  }

  async goto() {
    await this.page.goto('/images')
  }

  async generateImage(prompt: string) {
    await this.promptInput.fill(prompt)
    await this.generateButton.click()
  }

  async waitForGeneration(timeout = 60000) {
    // Wait for loading to start
    await this.loadingSpinner.waitFor({ timeout: 5000 })
    // Wait for loading to finish
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout })
  }

  async getGeneratedImagesCount() {
    return await this.imagesGrid.locator('img').count()
  }

  async getLatestImageSrc() {
    const images = this.imagesGrid.locator('img')
    return await images.first().getAttribute('src')
  }

  async downloadImage(index = 0) {
    const downloadPromise = this.page.waitForEvent('download')
    await this.imagesGrid.locator('[data-testid="download"]').nth(index).click()
    return await downloadPromise
  }

  async clearImages() {
    await this.clearButton.click()
    // Wait for confirmation dialog and click confirm
    await this.page.locator('button:has-text("Clear")').click()
  }

  async isErrorVisible() {
    return await this.errorMessage.isVisible()
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent()
  }
}