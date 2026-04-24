/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingType } from "../types";

const GRAB_MAPS_ENDPOINT = 'https://maps.grab.com/api/v1/mcp';
const TOKEN = import.meta.env.VITE_GRAB_MAPS_TOKEN;

interface MCPResponse {
  jsonrpc: string;
  result?: any;
  error?: any;
  id: number | string;
}

/**
 * Generic caller for Grab Maps MCP tools
 */
async function callGrabTool(toolName: string, args: Record<string, any>) {
  if (!TOKEN) {
    console.warn("Grab Maps Token not found in environment variables.");
    return null;
  }

  try {
    // For the hackathon, we'll try to call the tool directly.
    // If it fails with initialization error, we might need a more complex flow.
    const response = await fetch(GRAB_MAPS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'callTool', // Note: some versions might use 'call_tool' or 'tools/call'
        params: {
          name: toolName,
          arguments: args
        },
        id: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`Grab Maps API error: ${response.statusText}`);
    }

    const data: MCPResponse = await response.json();
    if (data.error) {
        console.error("MCP Error:", data.error);
        return null;
    }
    return data.result;
  } catch (error) {
    console.error(`Error calling Grab Tool ${toolName}:`, error);
    return null;
  }
}

/**
 * Search for coordinates and POIs around a postal code
 */
export async function searchByPostalCode(postalCode: string) {
    try {
        // 1. Search for the postal code itself to get coords
        const searchResult = await callGrabTool('search_places', {
            query: postalCode,
            region: 'SG',
            limit: 1
        });

        if (!searchResult || !searchResult.places || searchResult.places.length === 0) {
            throw new Error("Postal code not found");
        }

        const place = searchResult.places[0];
        const coords = place.location; // Assuming {lat, lon} or [lat, lon]

        // 2. Search for POIs around these coords
        // We now search for Hawkers and Noodle stalls specifically!
        const poiResult = await callGrabTool('search_places', {
            query: 'hawker food noodle',
            region: 'SG',
            lat: coords.lat,
            lon: coords.lon,
            radius: 800,
            limit: 15
        });

        return {
            center: place,
            pois: poiResult?.places || []
        };
    } catch (error) {
        console.error("Error in searchByPostalCode:", error);
        
        // Mock Data Fallback for Singapore Postal Codes
        const mockPois = [
            { name: "GrabKitchen Aljunied", location: { lat: 1.316, lon: 103.882 }, categories: [{ name: "Commercial" }] },
            { name: "Bishan-Ang Mo Kio Park", location: { lat: 1.362, lon: 103.846 }, categories: [{ name: "Park" }] },
            { name: "Serangoon Garden Market", location: { lat: 1.363, lon: 103.866 }, categories: [{ name: "Commercial" }] },
            { name: "HDB Hub Toa Payoh", location: { lat: 1.332, lon: 103.847 }, categories: [{ name: "Residential" }] },
            { name: "Grab HQ (One-North)", location: { lat: 1.300, lon: 103.789 }, categories: [{ name: "Commercial" }] },
        ];
        
        return {
            center: { name: `Neighborhood ${postalCode}`, location: { lat: 1.35, lon: 103.8 } },
            pois: mockPois
        };
    }
}

/**
 * Interface for building naming help
 */
export async function getRealPlaceNames(type: BuildingType, count: number = 5): Promise<string[]> {
  // Query mappings based on building type
  const queries: Record<string, string> = {
    [BuildingType.Commercial]: "store",
    [BuildingType.Residential]: "apartment",
    [BuildingType.Industrial]: "warehouse",
    [BuildingType.Park]: "garden",
    [BuildingType.Road]: "street"
  };

  const query = queries[type] || "place";
  
  // Try searching for places in Singapore as a default region for Grab
  const result = await callGrabTool('search_places', { 
    query, 
    region: 'SG',
    limit: count 
  });

  if (result && Array.isArray(result.places)) {
    return result.places.map((p: any) => p.name);
  }

  // Fallback names if API fails or isn't accessible
  const fallbacks: Record<string, string[]> = {
    [BuildingType.Commercial]: ["GrabKitchen", "GrabFood Hub", "Mart City", "Corner Bistro", "G-Store"],
    [BuildingType.Residential]: ["Grab Residences", "Sky Heights", "Emerald Garden", "Lakeside Condos", "The Zenith"],
    [BuildingType.Industrial]: ["Grab Logistics", "Mega Warehouse", "Tech Park Factory", "City Distribution Hub"],
    [BuildingType.Park]: ["Grab Greenery", "Civic Park", "Metropolis Square", "Botanical Escape"],
  };

  return fallbacks[type] || ["Unknown Place"];
}

/**
 * Fetch directions between two points (simulated for grid coordinates)
 * Returns a list of path segments
 */
export async function getDroneDirections(from: string, to: string) {
    const result = await callGrabTool('get_directions', {
        origin: from,
        destination: to,
        mode: 'DRIVING' // Drone will fly straight but we can get route context
    });
    return result;
}
