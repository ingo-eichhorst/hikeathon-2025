<template>
  <div class="space-y-8">
    <h1 class="text-3xl font-bold">Security & Encryption Test</h1>
    
    <!-- Encryption Test -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Token Encryption Test</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">Test Token:</label>
          <input 
            v-model="testToken" 
            type="text" 
            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            placeholder="Enter a test token"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">Team Code (8 chars):</label>
          <input 
            v-model="testTeamCode" 
            type="text" 
            maxlength="8"
            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            placeholder="TEAM1234"
          />
        </div>
        
        <div class="flex gap-4">
          <button @click="testEncryption" class="btn btn-primary">
            Test Encrypt/Decrypt
          </button>
          <button @click="testWrongCode" class="btn btn-secondary">
            Test Wrong Code
          </button>
        </div>
        
        <div v-if="encryptionResult" class="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <pre class="text-sm overflow-x-auto">{{ encryptionResult }}</pre>
        </div>
      </div>
    </div>

    <!-- Authentication Test -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Authentication Status</h2>
      
      <div class="space-y-2">
        <p><strong>Authenticated:</strong> {{ authStore.isAuthenticated ? 'Yes' : 'No' }}</p>
        <p><strong>Team Name:</strong> {{ authStore.teamName || 'N/A' }}</p>
        <p><strong>Team Code:</strong> {{ authStore.teamCode || 'N/A' }}</p>
        <p><strong>Session Valid:</strong> {{ authStore.isSessionValid ? 'Yes' : 'No' }}</p>
        <p><strong>Time Until Expiry:</strong> {{ formatTime(authStore.timeUntilExpiry) }}</p>
      </div>
      
      <div v-if="authStore.encryptedToken" class="mt-4">
        <h3 class="font-semibold mb-2">Encrypted Token:</h3>
        <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono break-all">
          <p><strong>Ciphertext:</strong> {{ authStore.encryptedToken.ciphertext.substring(0, 50) }}...</p>
          <p><strong>Salt:</strong> {{ authStore.encryptedToken.salt }}</p>
          <p><strong>IV:</strong> {{ authStore.encryptedToken.iv }}</p>
          <p><strong>Timestamp:</strong> {{ new Date(authStore.encryptedToken.timestamp).toISOString() }}</p>
        </div>
      </div>
    </div>

    <!-- Security Features Test -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">Security Features</h2>
      
      <div class="space-y-4">
        <div>
          <h3 class="font-semibold mb-2">XSS Protection Test</h3>
          <input 
            v-model="xssInput" 
            type="text" 
            class="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            placeholder="Try: <script>alert('XSS')</script>"
          />
          <button @click="testXSS" class="btn btn-primary mt-2">Test XSS Sanitization</button>
          <div v-if="xssResult" class="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
            <p class="text-sm"><strong>Sanitized:</strong> {{ xssResult }}</p>
          </div>
        </div>
        
        <div>
          <h3 class="font-semibold mb-2">CSRF Token</h3>
          <p class="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all">
            {{ csrfToken }}
          </p>
        </div>
        
        <div>
          <h3 class="font-semibold mb-2">Web Crypto API</h3>
          <p class="text-sm">
            <span class="font-semibold">Available:</span> 
            <span :class="cryptoAvailable ? 'text-green-600' : 'text-red-600'">
              {{ cryptoAvailable ? 'Yes' : 'No' }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- API Client Test -->
    <div class="card">
      <h2 class="text-xl font-semibold mb-4">API Client Test</h2>
      
      <div class="space-y-4">
        <button @click="testAPIClient" class="btn btn-primary">
          Test Authenticated Request
        </button>
        
        <div v-if="apiResult" class="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <pre class="text-sm overflow-x-auto">{{ apiResult }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { tokenSecurity } from '~/utils/crypto'
import { sanitizeInput, CSRFProtection } from '~/utils/sanitize'
import { apiClient } from '~/utils/api-client'

const authStore = useAuthStore()

const testToken = ref('test-token-123456789')
const testTeamCode = ref('TESTCODE')
const encryptionResult = ref('')

const xssInput = ref('')
const xssResult = ref('')

const csrfToken = ref('')
const cryptoAvailable = ref(false)

const apiResult = ref('')

const formatTime = (ms: number) => {
  if (!ms) return 'N/A'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

const testEncryption = async () => {
  try {
    console.log('Starting encryption test...')
    const start = performance.now()
    
    // Test encryption
    const encrypted = await tokenSecurity.encryptToken(testToken.value, testTeamCode.value)
    const encryptTime = performance.now() - start
    
    // Test decryption
    const decryptStart = performance.now()
    const decrypted = await tokenSecurity.decryptToken(encrypted, testTeamCode.value)
    const decryptTime = performance.now() - decryptStart
    
    encryptionResult.value = JSON.stringify({
      success: true,
      original: testToken.value,
      encrypted: {
        ciphertext: encrypted.ciphertext.substring(0, 50) + '...',
        saltLength: encrypted.salt.length,
        ivLength: encrypted.iv.length
      },
      decrypted: decrypted,
      match: decrypted === testToken.value,
      performance: {
        encryptTime: `${encryptTime.toFixed(2)}ms`,
        decryptTime: `${decryptTime.toFixed(2)}ms`,
        totalTime: `${(encryptTime + decryptTime).toFixed(2)}ms`
      }
    }, null, 2)
    
    console.log('Encryption test successful')
  } catch (error: any) {
    console.error('Encryption test failed:', error)
    encryptionResult.value = JSON.stringify({
      success: false,
      error: error.message
    }, null, 2)
  }
}

const testWrongCode = async () => {
  try {
    console.log('Testing wrong code decryption...')
    
    // Encrypt with correct code
    const encrypted = await tokenSecurity.encryptToken(testToken.value, testTeamCode.value)
    
    // Try to decrypt with wrong code
    const wrongCode = 'WRONGCOD'
    await tokenSecurity.decryptToken(encrypted, wrongCode)
    
    encryptionResult.value = JSON.stringify({
      success: false,
      error: 'Should have thrown error for wrong code!'
    }, null, 2)
  } catch (error: any) {
    console.log('Wrong code correctly rejected')
    encryptionResult.value = JSON.stringify({
      success: true,
      message: 'Wrong code correctly rejected',
      error: error.message
    }, null, 2)
  }
}

const testXSS = () => {
  xssResult.value = sanitizeInput(xssInput.value)
}

const testAPIClient = async () => {
  try {
    if (!authStore.isAuthenticated) {
      apiResult.value = JSON.stringify({
        error: 'Not authenticated. Please login first.'
      }, null, 2)
      return
    }
    
    // Test getting the token
    const token = await authStore.getToken()
    
    apiResult.value = JSON.stringify({
      authenticated: true,
      teamName: authStore.teamName,
      tokenAvailable: !!token,
      tokenPreview: token ? token.substring(0, 20) + '...' : null,
      headers: {
        'Authorization': token ? `Bearer ${token.substring(0, 20)}...` : null
      }
    }, null, 2)
  } catch (error: any) {
    apiResult.value = JSON.stringify({
      error: error.message
    }, null, 2)
  }
}

onMounted(() => {
  // Check crypto availability
  cryptoAvailable.value = typeof window !== 'undefined' && !!window.crypto?.subtle
  
  // Generate CSRF token
  if (typeof window !== 'undefined') {
    csrfToken.value = CSRFProtection.getToken()
  }
})

useHead({
  title: 'Security Test - HIKEathon 2025'
})
</script>