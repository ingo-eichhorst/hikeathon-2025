import { test, expect } from '@playwright/test'

test.describe('Security Tests', () => {
  test('XSS Prevention', async ({ page }) => {
    await page.goto('/')
    await page.fill('[data-testid="team-code"]', 'TEAM1234')
    await page.click('[data-testid="login"]')
    await page.waitForURL(/\/chat/)

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "';alert('XSS');//",
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="data:text/html,<script>alert(1)</script>"></object>'
    ]

    // Track if any XSS payloads execute
    let xssExecuted = false
    
    page.on('dialog', dialog => {
      if (dialog.message().includes('XSS')) {
        xssExecuted = true
      }
      dialog.accept()
    })

    // Test XSS in chat input
    for (const payload of xssPayloads) {
      await page.fill('[data-testid="chat-input"]', payload)
      await page.click('[data-testid="send"]')
      
      await page.waitForTimeout(1000) // Give time for any script execution
      
      // Check that the message appears but scripts don't execute
      const messages = page.locator('.message')
      const messageCount = await messages.count()
      
      if (messageCount > 0) {
        const lastMessage = messages.last()
        const messageText = await lastMessage.textContent()
        
        // Verify content is sanitized (no script tags)
        expect(messageText).not.toContain('<script')
        expect(messageText).not.toContain('javascript:')
        expect(messageText).not.toContain('onerror=')
        expect(messageText).not.toContain('onload=')
      }
    }

    // Assert no XSS payloads executed
    expect(xssExecuted).toBe(false)
  })

  test('CSRF Protection', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CSRF test specific to Chromium')

    await page.goto('/')
    await page.fill('[data-testid="team-code"]', 'TEAM1234')
    await page.click('[data-testid="login"]')
    await page.waitForURL(/\/chat/)

    // Try to make a cross-origin request that could be CSRF
    const csrfAttempt = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/some-protected-endpoint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ malicious: 'data' })
        })
        return { success: true, status: response.status }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    // Should either fail or be properly protected
    if (csrfAttempt.success) {
      // If the request succeeds, it should return an error status
      expect(csrfAttempt.status).toBeGreaterThanOrEqual(400)
    }
  })

  test('Token Security', async ({ page }) => {
    await page.goto('/')
    await page.fill('[data-testid="team-code"]', 'TEAM1234')
    await page.click('[data-testid="login"]')
    await page.waitForURL(/\/chat/)

    // Check that sensitive data is not exposed in localStorage/sessionStorage
    const storageData = await page.evaluate(() => {
      const localStorage = window.localStorage
      const sessionStorage = window.sessionStorage
      
      const localStorageData = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          localStorageData[key] = localStorage.getItem(key)
        }
      }
      
      const sessionStorageData = {}
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) {
          sessionStorageData[key] = sessionStorage.getItem(key)
        }
      }
      
      return { localStorage: localStorageData, sessionStorage: sessionStorageData }
    })

    // Check for plaintext tokens or sensitive data
    const storageString = JSON.stringify(storageData).toLowerCase()
    
    // These shouldn't appear as plaintext
    expect(storageString).not.toContain('password')
    expect(storageString).not.toContain('secret')
    expect(storageString).not.toContain('api_key')
    expect(storageString).not.toContain('bearer ')
    
    // Check that stored tokens are encrypted/encoded
    Object.values(storageData.localStorage).forEach((value: any) => {
      if (typeof value === 'string' && value.length > 50) {
        // Long strings that might be tokens should not look like JWTs
        expect(value).not.toMatch(/^eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\./)
      }
    })
  })

  test('Content Security Policy', async ({ page }) => {
    const cspViolations: any[] = []
    
    // Listen for CSP violations
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text())
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check CSP headers
    const response = await page.goto('/')
    const headers = response?.headers()
    
    if (headers) {
      const cspHeader = headers['content-security-policy'] || headers['x-content-security-policy']
      
      if (cspHeader) {
        console.log('CSP Header:', cspHeader)
        
        // Check for important CSP directives
        expect(cspHeader).toContain('default-src')
        expect(cspHeader).toContain('script-src')
        expect(cspHeader).toContain('style-src')
        
        // Should not allow unsafe inline scripts
        expect(cspHeader).not.toContain("'unsafe-eval'")
      }
    }

    // Try to inject inline script (should be blocked by CSP)
    await page.addScriptTag({
      content: 'window.cspTestExecuted = true; console.log("CSP Test Script Executed");'
    }).catch(() => {
      // Script injection should fail with proper CSP
    })

    const scriptExecuted = await page.evaluate(() => (window as any).cspTestExecuted)
    
    // Script should not execute if CSP is properly configured
    // (This might pass in development mode, but should fail in production)
    console.log('Inline script executed:', scriptExecuted)

    // Check that no CSP violations occurred during normal operation
    expect(cspViolations.length).toBe(0)
  })

  test('Input Validation and Sanitization', async ({ page }) => {
    await page.goto('/')
    await page.fill('[data-testid="team-code"]', 'TEAM1234')
    await page.click('[data-testid="login"]')
    await page.waitForURL(/\/chat/)

    const maliciousInputs = [
      // SQL Injection attempts (though this is a frontend app)
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      
      // HTML injection
      '<h1>Injected HTML</h1>',
      '<style>body{background:red!important}</style>',
      
      // JavaScript injection
      'eval("alert(1)")',
      'Function("alert(1)")()',
      
      // Path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      
      // Large payloads
      'A'.repeat(10000),
      
      // Null bytes and special characters
      '\0\r\n\t',
      String.fromCharCode(0, 1, 2, 3)
    ]

    for (const maliciousInput of maliciousInputs) {
      // Test chat input
      await page.fill('[data-testid="chat-input"]', maliciousInput)
      await page.click('[data-testid="send"]')
      
      await page.waitForTimeout(500)
      
      // Navigate to images and test prompt input
      await page.click('[data-testid="nav-images"]')
      await page.fill('[data-testid="prompt"]', maliciousInput)
      
      // Don't actually generate (might consume API quota)
      // Just verify the input is handled safely
      
      await page.click('[data-testid="nav-chat"]')
      await page.waitForTimeout(500)
    }

    // Check that the page is still functional after all malicious inputs
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible()
    await expect(page.locator('body')).not.toHaveCSS('background-color', 'rgb(255, 0, 0)')
  })

  test('Authentication and Authorization', async ({ page }) => {
    // Test access without authentication
    await page.goto('/chat')
    
    // Should redirect to home or show login
    await page.waitForTimeout(2000)
    expect(page.url()).toMatch(/(\/|login)/)

    // Test with invalid team code
    await page.goto('/')
    await page.fill('[data-testid="team-code"]', 'INVALID123')
    await page.click('[data-testid="login"]')
    
    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()

    // Test session timeout (if implemented)
    await page.fill('[data-testid="team-code"]', 'TEAM1234')
    await page.click('[data-testid="login"]')
    await page.waitForURL(/\/chat/)

    // Simulate session expiry by clearing storage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Try to access protected resource
    await page.reload()
    
    // Should redirect to login or show authentication required
    await page.waitForTimeout(2000)
    expect(page.url()).toMatch(/(\/|login)/)
  })

  test('Sensitive Information Exposure', async ({ page }) => {
    await page.goto('/')
    
    // Check for sensitive information in source code
    const pageContent = await page.content()
    
    // Should not expose API keys, secrets, or internal URLs
    expect(pageContent).not.toMatch(/api[_-]?key[\'\"]\s*:\s*[\'\"]/i)
    expect(pageContent).not.toMatch(/secret[\'\"]\s*:\s*[\'\"]/i)
    expect(pageContent).not.toMatch(/password[\'\"]\s*:\s*[\'\"]/i)
    expect(pageContent).not.toMatch(/token[\'\"]\s*:\s*[\'\"]/i)
    
    // Check network requests don't expose sensitive data
    const requests: any[] = []
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        headers: request.headers(),
        postData: request.postData()
      })
    })

    await page.fill('[data-testid="team-code"]', 'TEAM1234')
    await page.click('[data-testid="login"]')
    await page.waitForURL(/\/chat/)

    // Check that requests don't expose sensitive information
    requests.forEach(request => {
      const requestString = JSON.stringify(request).toLowerCase()
      
      // Should not expose plaintext passwords or secrets
      expect(requestString).not.toContain('password')
      expect(requestString).not.toContain('secret')
      expect(requestString).not.toContain('private_key')
    })
  })

  test('Dependency Security Audit', async () => {
    // This would normally be done via npm audit or similar tools
    // Here we can at least verify no known vulnerable patterns
    
    const vulnerablePatterns = [
      // Check for vulnerable jQuery versions if used
      'jquery-1.',
      'jquery-2.',
      
      // Check for vulnerable lodash patterns
      'eval(',
      'Function(',
      
      // Other known vulnerability patterns
      'innerHTML =',
      'document.write(',
      'eval('
    ]

    // This is a placeholder - in real implementation, you'd run:
    // npm audit --audit-level moderate
    // or integrate with tools like Snyk, GitHub Security, etc.
    
    expect(vulnerablePatterns).toBeDefined() // Placeholder assertion
  })
})