import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestWrapper, testFixtures } from '~/test/utils'
import AppHeader from '~/components/AppHeader.vue'

// Mock the auth store
vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({
    currentTeam: testFixtures.team,
    logout: vi.fn(),
    isAuthenticated: true
  })
}))

// Mock the settings store
vi.mock('~/stores/settings', () => ({
  useSettingsStore: () => ({
    isDarkMode: false,
    toggleDarkMode: vi.fn()
  })
}))

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    const wrapper = createTestWrapper(AppHeader)
    
    expect(wrapper.find('h1').text()).toBe('HIKEathon 2025')
    expect(wrapper.exists()).toBe(true)
  })

  it('displays team name when authenticated', () => {
    const wrapper = createTestWrapper(AppHeader)
    
    expect(wrapper.text()).toContain('Test Team')
  })

  it('shows navigation links', () => {
    const wrapper = createTestWrapper(AppHeader)
    
    const navLinks = wrapper.findAll('[data-testid="nav-link"]')
    expect(navLinks.length).toBeGreaterThan(0)
  })

  it('has dark mode toggle', () => {
    const wrapper = createTestWrapper(AppHeader)
    
    const darkModeToggle = wrapper.find('[data-testid="dark-mode-toggle"]')
    expect(darkModeToggle.exists()).toBe(true)
  })

  it('handles logout action', async () => {
    const { useAuthStore } = await import('~/stores/auth')
    const authStore = useAuthStore()
    
    const wrapper = createTestWrapper(AppHeader)
    
    const logoutButton = wrapper.find('[data-testid="logout-btn"]')
    if (logoutButton.exists()) {
      await logoutButton.trigger('click')
      expect(authStore.logout).toHaveBeenCalled()
    }
  })
})