import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Team configurations with tokens
const TEAM_TOKENS = {
  'HIKEMIKE': {
    tokenId: 'a0f5fb73-85e2-4284-9882-bef264e4a907',
    tokenValue: Deno.env.get('TOKEN_VALUE_0') || 'eyJ0eXAiOiJKV1QiLCJraWQiOiJhMGY1ZmI3My04NWUyLTQyODQtOTg4Mi1iZWYyNjRlNGE5MDciLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJpb25vc2Nsb3VkIiwiaWF0IjoxNzU3MDE0NzU5LCJjbGllbnQiOiJVU0VSIiwiaWRlbnRpdHkiOnsicmVnRG9tYWluIjoiaW9ub3MuZGUiLCJyZXNlbGxlcklkIjoxLCJ1dWlkIjoiMGYzZDk3ZTktOTA0Yi00ZTY4LWJlNmYtMGNjMWNmMjQyMDM2IiwicHJpdmlsZWdlcyI6WyJEQVRBX0NFTlRFUl9DUkVBVEUiLCJTTkFQU0hPVF9DUkVBVEUiLCJJUF9CTE9DS19SRVNFUlZFIiwiTUFOQUdFX0RBVEFQTEFURk9STSIsIkFDQ0VTU19BQ1RJVklUWV9MT0ciLCJQQ0NfQ1JFQVRFIiwiQUNDRVNTX1MzX09CSkVDVF9TVE9SQUdFIiwiQkFDS1VQX1VOSVRfQ1JFQVRFIiwiQ1JFQVRFX0lOVEVSTkVUX0FDQ0VTUyIsIks4U19DTFVTVEVSX0NSRUFURSIsIkZMT1dfTE9HX0NSRUFURSIsIkFDQ0VTU19BTkRfTUFOQUdFX01PTklUT1JJTkciLCJBQ0NFU1NfQU5EX01BTkFHRV9DRVJUSUZJQ0FURVMiLCJBQ0NFU1NfQU5EX01BTkFHRV9MT0dHSU5HIiwiTUFOQUdFX0RCQUFTIiwiQUNDRVNTX0FORF9NQU5BR0VfRE5TIiwiTUFOQUdFX1JFR0lTVFJZIiwiQUNDRVNTX0FORF9NQU5BR0VfQ0ROIiwiQUNDRVNTX0FORF9NQU5BR0VfVlBOIiwiQUNDRVNTX0FORF9NQU5BR0VfQVBJX0dBVEVXQVkiLCJBQ0NFU1NfQU5EX01BTkFHRV9OR1MiLCJBQ0NFU1NfQU5EX01BTkFHRV9LQUFTIiwiQUNDRVNTX0FORF9NQU5BR0VfTkVUV09SS19GSUxFX1NUT1JBR0UiLCJBQ0NFU1NfQU5EX01BTkFHRV9BSV9NT0RFTF9IVUIiLCJDUkVBVEVfTkVUV09SS19TRUNVUklUWV9HUk9VUFMiLCJBQ0NFU1NfQU5EX01BTkFHRV9JQU1fUkVTT1VSQ0VTIl0sImlzUGFyZW50IjpmYWxzZSwiY29udHJhY3ROdW1iZXIiOjM2MTMzOTU2LCJyb2xlIjoib3duZXIifSwiZXhwIjoxNzYyMTk4NzU5fQ.bsBu2C1YXs2lDNMlZ3QbbgtH36UbZMZtI_BdSjeuaT_gBngmxmB8Ci17cRfMC54XMkseDYIZzAid1T2m4NrYXBdr_elCpBn2V-cw_CNYaVOqn3ncKoEi5BLKr91izW7tj152Og9ZFUkSgjL8g14oCrSCyjYUyTUvfN5dB2r27ZSO6Jv92c6Ucgo7r7f3M4BzoiPp88eORWBL4EjGt447OSh6Qtqk40sd2hN219UKTskyXUun-MH1scG-tksdRQ0w_31c4bQ3ZEJfJNk6FFXUulF3KSBeUJdnyiHdcjxmlTthSDe2pqRLRlNBSsojAVrpeW67oVDfwUDL1Yl2pBlpQw',
    teamName: 'HIKEMIKE'
  },
  'LIKEHIKE': {
    tokenId: 'fa879af0-7821-42e6-81cc-a1e4aa1a15e8',
    tokenValue: Deno.env.get('TOKEN_VALUE_1') || 'eyJ0eXAiOiJKV1QiLCJraWQiOiJmYTg3OWFmMC03ODIxLTQyZTYtODFjYy1hMWU0YWExYTE1ZTgiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJpb25vc2Nsb3VkIiwiaWF0IjoxNzU3MDE0ODI4LCJjbGllbnQiOiJVU0VSIiwiaWRlbnRpdHkiOnsiaXNQYXJlbnQiOmZhbHNlLCJjb250cmFjdE51bWJlciI6MzYxMzM5NTYsInJvbGUiOiJvd25lciIsInJlZ0RvbWFpbiI6Imlvbm9zLmRlIiwicmVzZWxsZXJJZCI6MSwidXVpZCI6IjBmM2Q5N2U5LTkwNGItNGU2OC1iZTZmLTBjYzFjZjI0MjAzNiIsInByaXZpbGVnZXMiOlsiREFUQV9DRU5URVJfQ1JFQVRFIiwiU05BUFNIT1RfQ1JFQVRFIiwiSVBfQkxPQ0tfUkVTRVJWRSIsIk1BTkFHRV9EQVRBUExBVEZPUk0iLCJBQ0NFU1NfQUNUSVZJVFlfTE9HIiwiUENDX0NSRUFURSIsIkFDQ0VTU19TM19PQkpFQ1RfU1RPUkFHRSIsIkJBQ0tVUF9VTklUX0NSRUFURSIsIkNSRUFURV9JTlRFUk5FVF9BQ0NFU1MiLCJLOFNfQ0xVU1RFUl9DUkVBVEUiLCJGTE9XX0xPR19DUkVBVEUiLCJBQ0NFU1NfQU5EX01BTkFHRV9NT05JVE9SSU5HIiwiQUNDRVNTX0FORF9NQU5BR0VfQ0VSVElGSUNBVEVTIiwiQUNDRVNTX0FORF9NQU5BR0VfTE9HR0lORyIsIk1BTkFHRV9EQkFBUyIsIkFDQ0VTU19BTkRfTUFOQUdFX0ROUyIsIk1BTkFHRV9SRUdJU1RSWSIsIkFDQ0VTU19BTkRfTUFOQUdFX0NETiIsIkFDQ0VTU19BTkRfTUFOQUdFX1ZQTiIsIkFDQ0VTU19BTkRfTUFOQUdFX0FQSV9HQVRFV0FZIiwiQUNDRVNTX0FORF9NQU5BR0VfTkdTIiwiQUNDRVNTX0FORF9NQU5BR0VfS0FBUyIsIkFDQ0VTU19BTkRfTUFOQUdFX05FVFdPUktfRklMRV9TVE9SQUdFIiwiQUNDRVNTX0FORF9NQU5BR0VfQUlfTU9ERUxfSFVCIiwiQ1JFQVRFX05FVFdPUktfU0VDVVJJVFlfR1JPVVBTIiwiQUNDRVNTX0FORF9NQU5BR0VfSUFNX1JFU09VUkNFUyJdfSwiZXhwIjoxNzU3MDE4NDI4fQ.WlPTGeI7carD-aBQmGA_JFpqW0zl-cTryy5UaH4b9U2Dcn3vIOIPlo2n194qkoHgZX5atciYH3sj2qPDDf6nhhqmJxGBuD4wUYqproPgBV2abFTF1NDSQ3d-QYwI5XetYoUaNWJnIO2Q2iOwNMq730E0etWtHphiO0kwBQJVAGtLExvJePi0vniCJYRGKKUfhqYZpfSwd7MbH7gx_Yr6HFXJvoNka3MM_GS0T84H2-kkR9xNCStxTRVck09f8NXI7llNTuXSDQ2u9W9-PXSrWrUMZtwU9lFvwqq7jg2RGhBb6W0YUUYEAi6hC-yAsG3ULQQIlbcxSkYIrXmU28zdmQ',
    teamName: 'LIKEHIKE'
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { teamCode } = await req.json()
    
    if (!teamCode || teamCode.length !== 8) {
      return new Response(
        JSON.stringify({ error: 'Invalid team code format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const team = TEAM_TOKENS[teamCode.toUpperCase()]
    
    if (!team) {
      return new Response(
        JSON.stringify({ error: 'Team code not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log authentication attempt
    console.log(`Team ${team.teamName} authenticated at ${new Date().toISOString()}`)

    return new Response(
      JSON.stringify({
        token: team.tokenValue,
        tokenId: team.tokenId,
        teamName: team.teamName,
        isAdmin: team.teamName === 'LIKEHIKE'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Auth validation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})