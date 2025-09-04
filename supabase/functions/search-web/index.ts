import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SERPER_API_URL = 'https://google.serper.dev/search'
const SERPER_API_KEY = Deno.env.get('SERPER_DEV_KEY') || '3ba0de3e8dda989050dab8a9ad4819417a18542c'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization token for verification
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

    const { query, num = 10 } = await req.json()
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call Serper API
    const response = await fetch(SERPER_API_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return new Response(
        JSON.stringify({ error: `Serper API error: ${error}` }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    
    // Format results
    const formattedResults = {
      query: data.searchParameters?.q,
      results: data.organic?.map((result: any) => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        position: result.position
      })) || [],
      knowledgeGraph: data.knowledgeGraph,
      answerBox: data.answerBox,
      searchTime: data.searchInformation?.searchTime
    }
    
    // Log telemetry
    console.log(`Web search: query="${query}", results=${formattedResults.results.length}, timestamp=${new Date().toISOString()}`)

    return new Response(
      JSON.stringify(formattedResults),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Search web error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})