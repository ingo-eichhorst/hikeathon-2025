import { test, expect } from '@playwright/test'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'

test.describe('Performance Tests', () => {
  test('Lighthouse performance audit', async ({ page, browserName }) => {
    // Only run Lighthouse on Chromium
    test.skip(browserName !== 'chromium', 'Lighthouse only works with Chromium')

    const baseURL = 'http://localhost:3002/hikeathon-2025'
    
    // Launch Chrome for Lighthouse
    const chrome = await launch({ chromeFlags: ['--headless'] })
    
    try {
      // Run Lighthouse audit
      const runnerResult = await lighthouse(baseURL, {
        port: chrome.port,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        settings: {
          formFactor: 'desktop',
          throttling: {
            rttMs: 40,
            throughputKbps: 10 * 1024,
            cpuSlowdownMultiplier: 1,
          },
        },
      })

      if (!runnerResult || !runnerResult.lhr) {
        throw new Error('Lighthouse failed to run')
      }

      const { lhr } = runnerResult

      // Performance thresholds
      const performanceScore = lhr.categories.performance.score! * 100
      const accessibilityScore = lhr.categories.accessibility.score! * 100
      const bestPracticesScore = lhr.categories['best-practices'].score! * 100
      const seoScore = lhr.categories.seo.score! * 100

      console.log('Lighthouse Scores:')
      console.log(`Performance: ${performanceScore}`)
      console.log(`Accessibility: ${accessibilityScore}`)
      console.log(`Best Practices: ${bestPracticesScore}`)
      console.log(`SEO: ${seoScore}`)

      // Assert performance thresholds
      expect(performanceScore).toBeGreaterThanOrEqual(80)
      expect(accessibilityScore).toBeGreaterThanOrEqual(90)
      expect(bestPracticesScore).toBeGreaterThanOrEqual(80)
      expect(seoScore).toBeGreaterThanOrEqual(70)

      // Check Core Web Vitals
      const lcp = lhr.audits['largest-contentful-paint'].numericValue
      const fid = lhr.audits['max-potential-fid']?.numericValue || 0
      const cls = lhr.audits['cumulative-layout-shift'].numericValue

      console.log('Core Web Vitals:')
      console.log(`LCP: ${lcp}ms`)
      console.log(`FID: ${fid}ms`)
      console.log(`CLS: ${cls}`)

      // Assert Core Web Vitals thresholds
      expect(lcp).toBeLessThan(2500) // LCP < 2.5s
      expect(fid).toBeLessThan(100)  // FID < 100ms
      expect(cls).toBeLessThan(0.1)  // CLS < 0.1

    } finally {
      await chrome.kill()
    }
  })

  test('Core Web Vitals with Web APIs', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
    
    // Measure Core Web Vitals using Web APIs
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {}
        
        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          if (entries.length > 0) {
            vitals.lcp = entries[entries.length - 1].renderTime || entries[entries.length - 1].loadTime
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        // First Input Delay would require actual user interaction
        // For testing, we'll simulate it
        vitals.fid = 0
        
        // Cumulative Layout Shift
        let clsValue = 0
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          vitals.cls = clsValue
        }).observe({ entryTypes: ['layout-shift'] })
        
        // Resolve after a short delay to collect metrics
        setTimeout(() => resolve(vitals), 2000)
      })
    })

    console.log('Web Vitals:', webVitals)
    
    // Assert thresholds (more lenient for development)
    if (webVitals.lcp) {
      expect(webVitals.lcp).toBeLessThan(4000) // 4s for development
    }
    
    expect(webVitals.cls).toBeLessThan(0.25) // More lenient CLS
  })

  test('Bundle size and resource loading', async ({ page }) => {
    await page.goto('/')
    
    // Wait for all resources to load
    await page.waitForLoadState('networkidle')
    
    // Measure resource loading
    const resourceMetrics = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      const jsResources = resources.filter(r => r.name.endsWith('.js'))
      const cssResources = resources.filter(r => r.name.endsWith('.css'))
      const imageResources = resources.filter(r => 
        r.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)
      )
      
      return {
        domContentLoaded: entries.domContentLoadedEventEnd - entries.domContentLoadedEventStart,
        loadComplete: entries.loadEventEnd - entries.loadEventStart,
        firstByte: entries.responseStart - entries.requestStart,
        jsCount: jsResources.length,
        cssCount: cssResources.length,
        imageCount: imageResources.length,
        totalResources: resources.length
      }
    })

    console.log('Resource Metrics:', resourceMetrics)
    
    // Assert reasonable resource counts
    expect(resourceMetrics.jsCount).toBeLessThan(20) // Not too many JS files
    expect(resourceMetrics.cssCount).toBeLessThan(10) // Not too many CSS files
    expect(resourceMetrics.domContentLoaded).toBeLessThan(2000) // DOMContentLoaded < 2s
  })

  test('Memory usage and performance timeline', async ({ page }) => {
    await page.goto('/')
    
    // Navigate through the app to test memory usage
    await page.fill('[data-testid="team-code"]', 'TEAM1234')
    await page.click('[data-testid="login"]')
    
    await page.waitForURL(/\/chat/)
    
    // Send a few messages to test memory under load
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="chat-input"]', `Test message ${i + 1}`)
      await page.click('[data-testid="send"]')
      await page.waitForTimeout(1000) // Wait between messages
    }
    
    // Navigate to images page
    await page.click('[data-testid="nav-images"]')
    await page.waitForURL(/\/images/)
    
    // Check memory usage
    const memoryUsage = await page.evaluate(() => {
      // @ts-ignore - performance.memory is Chrome-specific
      const memory = (performance as any).memory
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit
        }
      }
      return null
    })

    if (memoryUsage) {
      console.log('Memory Usage:', memoryUsage)
      
      // Assert memory usage is reasonable
      const usageRatio = memoryUsage.used / memoryUsage.total
      expect(usageRatio).toBeLessThan(0.8) // Less than 80% of allocated memory
    }
  })

  test('Network performance and caching', async ({ page }) => {
    // First visit - measure initial load
    const response1 = await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const initialLoadTime = await page.evaluate(() => {
      const [navigationEntry] = performance.getEntriesByType('navigation')
      return (navigationEntry as PerformanceNavigationTiming).loadEventEnd - 
             (navigationEntry as PerformanceNavigationTiming).navigationStart
    })

    // Second visit - measure cached load
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    const cachedLoadTime = await page.evaluate(() => {
      const [navigationEntry] = performance.getEntriesByType('navigation')
      return (navigationEntry as PerformanceNavigationTiming).loadEventEnd - 
             (navigationEntry as PerformanceNavigationTiming).navigationStart
    })

    console.log(`Initial load time: ${initialLoadTime}ms`)
    console.log(`Cached load time: ${cachedLoadTime}ms`)
    
    // Assert caching improves performance
    expect(cachedLoadTime).toBeLessThan(initialLoadTime)
    expect(cachedLoadTime).toBeLessThan(3000) // Cached load should be fast
  })

  test('Mobile performance', async ({ page }) => {
    // Set mobile viewport and network conditions
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Simulate slower mobile network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)) // Add 100ms delay
      route.continue()
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Test mobile-specific performance
    const mobileMetrics = await page.evaluate(() => {
      const [navigationEntry] = performance.getEntriesByType('navigation')
      return {
        loadTime: (navigationEntry as PerformanceNavigationTiming).loadEventEnd - 
                  (navigationEntry as PerformanceNavigationTiming).navigationStart,
        domReady: (navigationEntry as PerformanceNavigationTiming).domContentLoadedEventEnd - 
                  (navigationEntry as PerformanceNavigationTiming).navigationStart
      }
    })

    console.log('Mobile Metrics:', mobileMetrics)
    
    // Mobile performance should still be reasonable
    expect(mobileMetrics.domReady).toBeLessThan(5000) // DOM ready < 5s on mobile
    expect(mobileMetrics.loadTime).toBeLessThan(10000) // Full load < 10s on mobile
  })
})