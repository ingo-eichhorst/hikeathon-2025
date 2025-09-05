import { describe, it, expect } from 'vitest'

describe('Basic Test Setup', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to crypto', () => {
    expect(crypto.randomUUID()).toBeDefined()
    expect(typeof crypto.randomUUID()).toBe('string')
  })

  it('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})