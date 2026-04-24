
const GRAB_MAPS_ENDPOINT = 'https://maps.grab.com/api/v1/mcp';
const TOKEN = 'mcp_1776994784_Eizf3auWVeZlmUh2ZSfOzKEF';

async function testSearchRaw() {
  try {
    const response = await fetch(GRAB_MAPS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'callTool',
        params: {
          name: 'search_places',
          arguments: {
            query: '569933',
            region: 'SG',
            limit: 1
          }
        },
        id: Date.now()
      })
    });

    const data = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', data);
  } catch (error) {
    console.error('Error searching:', error);
  }
}

testSearchRaw();
