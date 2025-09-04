import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const IONOS_API_URL = 'https://ai-proxy.ionos.com/v1/chat/completions'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const body = await req.json()

    // Forward request to IONOS API
    const response = await fetch(IONOS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': body.stream ? 'text/event-stream' : 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(
        JSON.stringify({ error: `IONOS API error: ${error}` }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle streaming responses
    if (body.stream) {
      const reader = response.body?.getReader()
      const encoder = new TextEncoder()
      
      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close()
            return
          }

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                controller.close()
                break
              }
              controller.enqueue(value)
            }
          } catch (error) {
            console.error('Stream error:', error)
            controller.error(error)
          }
        }
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    }

    // Handle non-streaming responses
    const data = await response.json()
    
    // Log telemetry
    console.log(`Chat API called: model=${body.model}, streaming=${body.stream}, timestamp=${new Date().toISOString()}`)

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Proxy chat error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})