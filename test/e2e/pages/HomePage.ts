import { Page, Locator } from '@playwright/test'

export class HomePage {
  readonly page: Page
  readonly teamCodeInput: Locator
  readonly loginButton: Locator
  readonly titleHeading: Locator
  readonly scheduleSection: Locator
  readonly rulesSection: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.teamCodeInput = page.locator('[data-testid="team-code"]')
    this.loginButton = page.locator('[data-testid="login"]')
    this.titleHeading = page.locator('h1:has-text("HIKEathon 2025")')
    this.scheduleSection = page.locator('[data-testid="schedule"]')
    this.rulesSection = page.locator('[data-testid="rules"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  async goto() {
    await this.page.goto('/')
  }

  async login(teamCode: string) {
    await this.teamCodeInput.fill(teamCode)
    await this.loginButton.click()
  }

  async waitForLoginError() {
    await this.errorMessage.waitFor()
  }

  async isScheduleVisible() {
    return await this.scheduleSection.isVisible()
  }

  async isRulesVisible() {
    return await this.rulesSection.isVisible()
  }
}