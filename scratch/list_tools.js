
const GRAB_MAPS_ENDPOINT = 'https://maps.grab.com/api/v1/mcp';
const TOKEN = 'mcp_1776994784_Eizf3auWVeZlmUh2ZSfOzKEF';

async function listTools() {
  try {
    const response = await fetch(GRAB_MAPS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'listTools',
        params: {},
        id: Date.now()
      })
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error listing tools:', error);
  }
}

listTools();
