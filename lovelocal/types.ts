/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export enum BuildingType {
  None = 'None',
  Road = 'Road',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Park = 'Park',
  Hawker = 'Hawker',
}

export interface BuildingConfig {
  type: BuildingType;
  cost: number;
  name: string;
  description: string;
  color: string; // Main color for 3D material
  popGen: number; // Population generation per tick
  incomeGen: number; // Money generation per tick
}

export interface TileData {
  x: number;
  y: number;
  buildingType: BuildingType;
  name?: string; // Real-world name from Grab Maps
  buildingId?: string; // Unique ID for building entity
  // Suggested by AI for visual variety later
  variant?: number;
}

export type Grid = TileData[][];

export interface Mission {
  id: string;
  title: string;
  description: string;
  fromTile: { x: number, y: number };
  toTile: { x: number, y: number };
  reward: number;
  status: 'available' | 'active' | 'completed';
  type: 'delivery' | 'inspection' | 'rescue';
}

export interface CityStats {
  money: number;
  population: number;
  day: number;
  missionCount: number;
}

export interface AIGoal {
  description: string;
  targetType: 'population' | 'money' | 'building_count';
  targetValue: number;
  buildingType?: BuildingType; // If target is building_count
  reward: number;
  completed: boolean;
}

export interface NewsItem {
  id: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}