/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { AIGoal, BuildingType, CityStats, Grid, NewsItem, Mission } from "../types";
import { BUILDINGS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = 'gemini-2.0-flash'; // Using stable flash

// --- Goal Generation ---

const goalSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "A short, creative description of the goal from the perspective of city council or citizens.",
    },
    targetType: {
      type: Type.STRING,
      enum: ['population', 'money', 'building_count'],
      description: "The metric to track.",
    },
    targetValue: {
      type: Type.INTEGER,
      description: "The target numeric value to reach.",
    },
    buildingType: {
      type: Type.STRING,
      enum: [BuildingType.Residential, BuildingType.Commercial, BuildingType.Industrial, BuildingType.Park, BuildingType.Road],
      description: "Required if targetType is building_count.",
    },
    reward: {
      type: Type.INTEGER,
      description: "Monetary reward for completion.",
    },
  },
  required: ['description', 'targetType', 'targetValue', 'reward'],
};

export const generateCityGoal = async (stats: CityStats, grid: Grid): Promise<AIGoal | null> => {
  const counts: Record<string, number> = {};
  grid.flat().forEach(tile => {
    counts[tile.buildingType] = (counts[tile.buildingType] || 0) + 1;
  });

  const context = `
    Current City Stats:
    Day: ${stats.day}
    Money: $${stats.money}
    Population: ${stats.population}
    Buildings: ${JSON.stringify(counts)}
  `;

  const prompt = `You are the AI City Advisor. Based on stats, generate a short-term goal. Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: goalSchema,
        temperature: 0.7,
      },
    });

    if (response.text) {
      const goalData = JSON.parse(response.text) as Omit<AIGoal, 'completed'>;
      return { ...goalData, completed: false };
    }
  } catch (error) {
    console.error("Error generating goal:", error);
  }

  // Fallback Goal
  return {
      description: "Expand the city to accommodate more citizens.",
      targetType: 'population',
      targetValue: stats.population + 10,
      reward: 100,
      completed: false
  };
};

// --- News Feed Generation ---

const newsSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "A one-sentence news headline." },
    type: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['text', 'type'],
};

export const generateNewsEvent = async (stats: CityStats, recentAction: string | null): Promise<NewsItem | null> => {
  const context = `Pop: ${stats.population}, Money: ${stats.money}, Day: ${stats.day}`;
  const prompt = "Generate a short news headline for the city.";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: newsSchema,
        temperature: 1.1,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        id: Date.now().toString() + Math.random(),
        text: data.text,
        type: data.type,
      };
    }
  } catch (error) {
    console.error("Error generating news:", error);
  }
  
  // Fallback News
  return {
      id: Date.now().toString(),
      text: stats.population > 0 ? "Citizens are enjoying the new city layout." : "Metropolis initialization in progress.",
      type: 'neutral'
  };
};

// --- Drone Mission Generation ---

const missionSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    fromTile: {
      type: Type.OBJECT,
      properties: { x: { type: Type.INTEGER }, y: { type: Type.INTEGER } },
      required: ['x', 'y']
    },
    toTile: {
      type: Type.OBJECT,
      properties: { x: { type: Type.INTEGER }, y: { type: Type.INTEGER } },
      required: ['x', 'y']
    },
    reward: { type: Type.INTEGER },
    type: { type: Type.STRING, enum: ['delivery', 'inspection', 'rescue'] }
  },
  required: ['title', 'description', 'fromTile', 'toTile', 'reward', 'type']
};

export const generateDroneMission = async (stats: CityStats, grid: Grid): Promise<Mission | null> => {
  const buildingsWithLocations = grid.flat().filter(t => t.buildingType !== BuildingType.None && t.buildingType !== BuildingType.Road);
  
  if (buildingsWithLocations.length < 2) return null;

  const buildingsInfo = buildingsWithLocations.map(b => ({
    name: b.name || BUILDINGS[b.buildingType].name,
    type: b.buildingType,
    x: b.x,
    y: b.y
  }));

  const buildingsStr = JSON.stringify(buildingsInfo);

  const prompt = `Based on these buildings in a 3D city: ${buildingsStr}, generate ONE fun drone delivery mission.
    The mission should be themed around Singapore's food culture (e.g. delivering GrabFood from a Hawker Centre, a bubble tea run, or a noodle stall delivery).
    Use local slang like 'Uncle', 'Aunty', 'Shiok', or 'Chope' if appropriate.
    Return JSON: { "title": "Mission Name", "description": "Story text", "fromTile": {"x": number, "y": number}, "toTile": {"x": number, "y": number}, "reward": number, "type": "delivery" }`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: missionSchema,
        temperature: 0.8,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        ...data,
        id: `mission-${Date.now()}`,
        status: 'available'
      };
    }
  } catch (error) {
    console.error("Error generating mission:", error);
  }

  // Fallback Mission
  if (buildingsWithLocations.length >= 2) {
      const b1 = buildingsWithLocations[0];
      const b2 = buildingsWithLocations[1];
      return {
          id: `mission-fallback-${Date.now()}`,
          title: "Urgent GrabFood Delivery",
          description: `Deliver a hot meal from ${b1.name || 'Store'} to ${b2.name || 'Home'}.`,
          fromTile: { x: b1.x, y: b1.y },
          toTile: { x: b2.x, y: b2.y },
          reward: 50,
          type: 'delivery',
          status: 'available'
      };
  }
  return null;
};
