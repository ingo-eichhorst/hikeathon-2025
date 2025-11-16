import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const IONOS_MODELS_URL = 'https://openai.inference.de-txl.ionos.com/v1/models'
const IONOS_TOKEN = Deno.env.get('IONOS_TOKEN')

if (!IONOS_TOKEN) {
  throw new Error('IONOS_TOKEN environment variable is not set');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // No need to parse body - we use hardcoded token

    // Fetch models from IONOS API
    console.log('Fetching models from IONOS')
    console.log('Using URL:', IONOS_MODELS_URL)
    console.log('Token starts with:', IONOS_TOKEN.substring(0, 50))
    console.log('Token ends with:', IONOS_TOKEN.substring(IONOS_TOKEN.length - 50))
    
    const headers = {
      'Authorization': `Bearer ${IONOS_TOKEN}`,
      'Accept': 'application/json'
    }
    
    console.log('Request headers:', JSON.stringify(headers, null, 2))
    
    const response = await fetch(IONOS_MODELS_URL, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('IONOS API error:', response.status, error)
      
      // Parse error message for better user feedback
      let errorMessage = `IONOS API error: ${error}`
      try {
        const errorObj = JSON.parse(error)
        if (errorObj.messages?.[0]?.message?.includes('Unauthorized, invalid or no token provided')) {
          errorMessage = 'The IONOS API token has expired or is invalid. Please contact support for a new token.'
        }
      } catch {
        // Keep original error message if parsing fails
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Return the models list
    const data = await response.json()

    // Enhance models with vision capability metadata
    if (data.data && Array.isArray(data.data)) {
      data.data = data.data.map((model: any) => ({
        ...model,
        // Mark Mistral Small 24B as vision-capable
        supports_vision: model.id === 'mistralai/Mistral-Small-24B-Instruct'
      }))
    }

    console.log(`Models API called: count=${data.data?.length || 0}, timestamp=${new Date().toISOString()}`)

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Get models error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})