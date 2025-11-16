import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
const IONOS_API_URL = 'https://openai.inference.de-txl.ionos.com/v1/chat/completions';
const IONOS_TOKEN = Deno.env.get('IONOS_TOKEN');

if (!IONOS_TOKEN) {
  throw new Error('IONOS_TOKEN environment variable is not set');
}
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Parse request body
    const forwardBody = await req.json();
    // No need to get token from request - use hardcoded one
    // Forward request to IONOS API
    console.log('Forwarding to IONOS with model:', forwardBody.model);
    // Always use Authorization: Bearer for IONOS API (same as test.sh)
    const headers = {
      'Content-Type': 'application/json',
      'Accept': forwardBody.stream ? 'text/event-stream' : 'application/json',
      'Authorization': `Bearer ${IONOS_TOKEN}`
    };
    const response = await fetch(IONOS_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(forwardBody)
    });
    if (!response.ok) {
      const error = await response.text();
      console.error('IONOS API error:', response.status, error);
      // Parse error message for better user feedback
      let errorMessage = `IONOS API error: ${error}`;
      try {
        const errorObj = JSON.parse(error);
        if (errorObj.messages?.[0]?.message?.includes('Unauthorized, invalid or no token provided')) {
          errorMessage = 'The IONOS API token has expired or is invalid. Please contact support for a new token.';
        }
      } catch  {
      // Keep original error message if parsing fails
      }
      return new Response(JSON.stringify({
        error: errorMessage
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Handle streaming responses
    if (forwardBody.stream) {
      const reader = response.body?.getReader();
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start (controller) {
          if (!reader) {
            controller.close();
            return;
          }
          try {
            while(true){
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                break;
              }
              controller.enqueue(value);
            }
          } catch (error) {
            console.error('Stream error:', error);
            controller.error(error);
          }
        }
      });
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }
    // Handle non-streaming responses
    const data = await response.json();
    // Log telemetry
    console.log(`Chat API called: model=${forwardBody.model}, streaming=${forwardBody.stream}, timestamp=${new Date().toISOString()}`);
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Proxy chat error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
