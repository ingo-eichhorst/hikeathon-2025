import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const IONOS_API_URL = 'https://openai.inference.de-txl.ionos.com/v1/images/generations'
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
    const body = await req.json()

    console.log('Image generation request: model=' + body.model + ', size=' + body.size + ', prompt=' + body.prompt?.substring(0, 50) + '...')

    // Prepare request body for IONOS API - always request b64_json
    const ionosBody = {
      model: body.model,
      prompt: body.prompt,
      size: body.size,
      n: body.n || 1,
      response_format: 'b64_json'
    }

    // Forward request to IONOS API using hardcoded token
    const response = await fetch(IONOS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + IONOS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ionosBody)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('IONOS API error (' + response.status + '):', error)
      return new Response(
        JSON.stringify({ error: 'IONOS API error: ' + error }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    const imageCount = data.data ? data.data.length : 0
    console.log('Image generated successfully: ' + imageCount + ' images')

    // Log telemetry
    console.log('Image API called: model=' + body.model + ', prompt=' + body.prompt?.substring(0, 50) + '..., timestamp=' + new Date().toISOString())

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Proxy images error:', error)
    const errorMessage = error && error.message ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
