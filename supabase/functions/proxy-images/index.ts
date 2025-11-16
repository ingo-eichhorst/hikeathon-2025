import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const IONOS_API_URL = 'https://openai.inference.de-txl.ionos.com/v1/images/generations'
// Hardcoded working token from test.sh
const IONOS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJraWQiOiJhMGY1ZmI3My04NWUyLTQyODQtOTg4Mi1iZWYyNjRlNGE5MDciLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJpb25vc2Nsb3VkIiwiaWF0IjoxNzU3MDE0NzU5LCJjbGllbnQiOiJVU0VSIiwiaWRlbnRpdHkiOnsicmVnRG9tYWluIjoiaW9ub3MuZGUiLCJyZXNlbGxlcklkIjoxLCJ1dWlkIjoiMGYzZDk3ZTktOTA0Yi00ZTY4LWJlNmYtMGNjMWNmMjQyMDM2IiwicHJpdmlsZWdlcyI6WyJEQVRBX0NFTlRFUl9DUkVBVEUiLCJTTkFQU0hPVF9DUkVBVEUiLCJJUF9CTE9DS19SRVNFUlZFIiwiTUFOQUdFX0RBVEFQTEFURk9STSIsIkFDQ0VTU19BQ1RJVklUWV9MT0ciLCJQQ0NfQ1JFQVRFIiwiQUNDRVNTX1MzX09CSkVDVF9TVE9SQUdFIiwiQkFDS1VQX1VOSVRfQ1JFQVRFIiwiQ1JFQVRFX0lOVEVSTkVUX0FDQ0VTUyIsIks4U19DTFVTVEVSX0NSRUFURSIsIkZMT1dfTE9HX0NSRUFURSIsIkFDQ0VTU19BTkRfTUFOQUdFX01PTklUT1JJTkciLCJBQ0NFU1NfQU5EX01BTkFHRV9DRVJUSUZJQ0FURVMiLCJBQ0NFU1NfQU5EX01BTkFHRV9MT0dHSU5HIiwiTUFOQUdFX0RCQUFTIiwiQUNDRVNTX0FORF9NQU5BR0VfRE5TIiwiTUFOQUdFX1JFR0lTVFJZIiwiQUNDRVNTX0FORF9NQU5BR0VfQ0ROIiwiQUNDRVNTX0FORF9NQU5BR0VfVlBOIiwiQUNDRVNTX0FORF9NQU5BR0VfQVBJX0dBVEVXQVkiLCJBQ0NFU1NfQU5EX01BTkFHRV9OR1MiLCJBQ0NFU1NfQU5EX01BTkFHRV9LQUFTIiwiQUNDRVNTX0FORF9NQU5BR0VfTkVUV09SS19GSUxFX1NUT1JBR0UiLCJBQ0NFU1NfQU5EX01BTkFHRV9BSV9NT0RFTF9IVUIiLCJDUkVBVEVfTkVUV09SS19TRUNVUklUWV9HUk9VUFMiLCJBQ0NFU1NfQU5EX01BTkFHRV9JQU1fUkVTT1VSQ0VTIl0sImlzUGFyZW50IjpmYWxzZSwiY29udHJhY3ROdW1iZXIiOjM2MTMzOTU2LCJyb2xlIjoib3duZXIifSwiZXhwIjoxNzYyMTk4NzU5fQ.bsBu2C1YXs6lDNMlZ3QbbgtH36UbZMZtI_BdSjeuaT_gBngmxmB8Ci17cRfMC54XMkseDYIZzAid1T2m4NrYXBdr_elCpBn2V-cw_CNYaVOqn3ncKoEi5BLKr91izW7tj152Og9ZFUkSgjL8g14oCrSCyjYUyTUvfN5dB2r27ZSO6Jv92c6Ucgo7r7f3M4BzoiPp88eORWBL4EjGt447OSh6Qtqk40sd2hN219UKTskyXUun-MH1scG-tksdRQ0w_31c4bQ3ZEJfJNk6FFXUulF3KSBeUJdnyiHdcjxmlTthSDe2pqRLRlNBSsojAVrpeW67oVDfwUDL1Yl2pBlpQw'

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
