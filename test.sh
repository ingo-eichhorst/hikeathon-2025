#!/bin/bash

echo "Text Generation"
echo -e "===============\n"

echo "Prerequisite: Access API Token from environment variable"
echo "--------------------------------------------------------"
IONOS_API_TOKEN=eyJ0eXAiOiJKV1QiLCJraWQiOiJhMGY1ZmI3My04NWUyLTQyODQtOTg4Mi1iZWYyNjRlNGE5MDciLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJpb25vc2Nsb3VkIiwiaWF0IjoxNzU3MDE0NzU5LCJjbGllbnQiOiJVU0VSIiwiaWRlbnRpdHkiOnsicmVnRG9tYWluIjoiaW9ub3MuZGUiLCJyZXNlbGxlcklkIjoxLCJ1dWlkIjoiMGYzZDk3ZTktOTA0Yi00ZTY4LWJlNmYtMGNjMWNmMjQyMDM2IiwicHJpdmlsZWdlcyI6WyJEQVRBX0NFTlRFUl9DUkVBVEUiLCJTTkFQU0hPVF9DUkVBVEUiLCJJUF9CTE9DS19SRVNFUlZFIiwiTUFOQUdFX0RBVEFQTEFURk9STSIsIkFDQ0VTU19BQ1RJVklUWV9MT0ciLCJQQ0NfQ1JFQVRFIiwiQUNDRVNTX1MzX09CSkVDVF9TVE9SQUdFIiwiQkFDS1VQX1VOSVRfQ1JFQVRFIiwiQ1JFQVRFX0lOVEVSTkVUX0FDQ0VTUyIsIks4U19DTFVTVEVSX0NSRUFURSIsIkZMT1dfTE9HX0NSRUFURSIsIkFDQ0VTU19BTkRfTUFOQUdFX01PTklUT1JJTkciLCJBQ0NFU1NfQU5EX01BTkFHRV9DRVJUSUZJQ0FURVMiLCJBQ0NFU1NfQU5EX01BTkFHRV9MT0dHSU5HIiwiTUFOQUdFX0RCQUFTIiwiQUNDRVNTX0FORF9NQU5BR0VfRE5TIiwiTUFOQUdFX1JFR0lTVFJZIiwiQUNDRVNTX0FORF9NQU5BR0VfQ0ROIiwiQUNDRVNTX0FORF9NQU5BR0VfVlBOIiwiQUNDRVNTX0FORF9NQU5BR0VfQVBJX0dBVEVXQVkiLCJBQ0NFU1NfQU5EX01BTkFHRV9OR1MiLCJBQ0NFU1NfQU5EX01BTkFHRV9LQUFTIiwiQUNDRVNTX0FORF9NQU5BR0VfTkVUV09SS19GSUxFX1NUT1JBR0UiLCJBQ0NFU1NfQU5EX01BTkFHRV9BSV9NT0RFTF9IVUIiLCJDUkVBVEVfTkVUV09SS19TRUNVUklUWV9HUk9VUFMiLCJBQ0NFU1NfQU5EX01BTkFHRV9JQU1fUkVTT1VSQ0VTIl0sImlzUGFyZW50IjpmYWxzZSwiY29udHJhY3ROdW1iZXIiOjM2MTMzOTU2LCJyb2xlIjoib3duZXIifSwiZXhwIjoxNzYyMTk4NzU5fQ.bsBu2C1YXs6lDNMlZ3QbbgtH36UbZMZtI_BdSjeuaT_gBngmxmB8Ci17cRfMC54XMkseDYIZzAid1T2m4NrYXBdr_elCpBn2V-cw_CNYaVOqn3ncKoEi5BLKr91izW7tj152Og9ZFUkSgjL8g14oCrSCyjYUyTUvfN5dB2r27ZSO6Jv92c6Ucgo7r7f3M4BzoiPp88eORWBL4EjGt447OSh6Qtqk40sd2hN219UKTskyXUun-MH1scG-tksdRQ0w_31c4bQ3ZEJfJNk6FFXUulF3KSBeUJdnyiHdcjxmlTthSDe2pqRLRlNBSsojAVrpeW67oVDfwUDL1Yl2pBlpQw

# You typically do not want to display the IONOS_API_TOKEN in logs
# or your bash history. Hence, we only show the first 10 characters.
echo "IONOS_API_TOKEN: ${IONOS_API_TOKEN:0:10}"

echo -e "\nStep 1: Retrieve Available Models"
echo "---------------------------------"

curl -H "Authorization: Bearer ${IONOS_API_TOKEN}" \
     --get https://openai.inference.de-txl.ionos.com/v1/models

echo -e "\nStep 2: Generate Text with Your Prompt"
echo "--------------------------------------"

MODEL_NAME=meta-llama/Meta-Llama-3.1-8B-Instruct 
PROMPT='[
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
]'

BODY="{ 
    \"model\": \"$MODEL_NAME\",
    \"messages\": $PROMPT
}"
echo $BODY

RESPONSE=$(curl -H "Authorization: Bearer ${IONOS_API_TOKEN}" \
     -H "Content-Type: application/json" \
     -d "$BODY" \
     https://openai.inference.de-txl.ionos.com/v1/chat/completions)

echo $RESPONSE

echo -e "\nStep 3: Extract and Interpret the Result"
echo "----------------------------------------"

echo $RESPONSE | jq -r '.choices.[0].message.content'
