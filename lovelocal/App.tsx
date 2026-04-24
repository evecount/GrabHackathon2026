/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, TileData, BuildingType, CityStats, AIGoal, NewsItem, Mission } from './types';
import { GRID_SIZE, BUILDINGS, TICK_RATE_MS, INITIAL_MONEY } from './constants';
import IsoMap from './components/IsoMap';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import { generateCityGoal, generateNewsEvent, generateDroneMission } from './services/geminiService';
import { getRealPlaceNames, searchByPostalCode } from './services/grabMapsService';

// Initialize empty grid with island shape generation for 3D visual interest
const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  const center = GRID_SIZE / 2;
  // const radius = GRID_SIZE / 2 - 1;

  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      // Simple circle crop for island look
      const dist = Math.sqrt((x-center)*(x-center) + (y-center)*(y-center));
      
      row.push({ x, y, buildingType: BuildingType.None });
    }
    grid.push(row);
  }
  return grid;
};

function App() {
  // --- Game State ---
  const [gameStarted, setGameStarted] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [stats, setStats] = useState<CityStats>({ money: INITIAL_MONEY, population: 0, day: 1, missionCount: 0 });
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Road);
  
  // --- AI State ---
  const [currentGoal, setCurrentGoal] = useState<AIGoal | null>(null);
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  
  // --- Drone Control State ---
  const [controllableMission, setControllableMission] = useState<Mission | null>(null);
  const [hasPackage, setHasPackage] = useState(false);
  const [dronePos, setDronePos] = useState<[number, number]>([0, 0]);
  const [challengeActive, setChallengeActive] = useState(false);
  
  // Refs for accessing state inside intervals without dependencies
  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const goalRef = useRef(currentGoal);
  const aiEnabledRef = useRef(aiEnabled);

  // Sync refs
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { goalRef.current = currentGoal; }, [currentGoal]);
  useEffect(() => { aiEnabledRef.current = aiEnabled; }, [aiEnabled]);

  // --- AI Logic Wrappers ---

  const addNewsItem = useCallback((item: NewsItem) => {
    setNewsFeed(prev => [...prev.slice(-12), item]); // Keep last few
  }, []);

  const fetchNewGoal = useCallback(async () => {
    if (isGeneratingGoal || !aiEnabledRef.current) return;
    setIsGeneratingGoal(true);
    // Short delay for visual effect
    await new Promise(r => setTimeout(r, 500));
    
    const newGoal = await generateCityGoal(statsRef.current, gridRef.current);
    if (newGoal) {
      setCurrentGoal(newGoal);
    } else {
      // Retry soon if failed, but only if AI still enabled
      if(aiEnabledRef.current) setTimeout(fetchNewGoal, 5000);
    }
    setIsGeneratingGoal(false);
  }, [isGeneratingGoal]); 

  const fetchNews = useCallback(async () => {
    // chance to fetch news per tick
    if (!aiEnabledRef.current || Math.random() > 0.15) return; 
    const news = await generateNewsEvent(statsRef.current, null);
    if (news) addNewsItem(news);
  }, [addNewsItem]);

  const triggerMissionGen = useCallback(async () => {
    if (!aiEnabledRef.current || Math.random() > 0.05) return;
    if (availableMissions.length >= 3) return;

    const mission = await generateDroneMission(statsRef.current, gridRef.current);
    if (mission) {
      setAvailableMissions(prev => [...prev, mission]);
      addNewsItem({ id: Date.now().toString(), text: `New Drone Delivery available: ${mission.title}`, type: 'neutral' });
    }
  }, [addNewsItem, availableMissions.length]);


  // --- Initial Setup ---
  useEffect(() => {
    if (!gameStarted) return;

    addNewsItem({ id: Date.now().toString(), text: "Welcome to SkyMetropolis. Terrain generation complete.", type: 'positive' });
    
    if (aiEnabled) {
      // @google/genai-api-key-fix: The API key's availability is a hard requirement and should not be checked in the UI.
      fetchNewGoal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted]);


  // --- Game Loop ---
  useEffect(() => {
    if (!gameStarted) return;

    const intervalId = setInterval(() => {
      // 1. Calculate income/pop gen
      let dailyIncome = 0;
      let dailyPopGrowth = 0;
      let buildingCounts: Record<string, number> = {};

      gridRef.current.flat().forEach(tile => {
        if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          dailyIncome += config.incomeGen;
          dailyPopGrowth += config.popGen;
          buildingCounts[tile.buildingType] = (buildingCounts[tile.buildingType] || 0) + 1;
        }
      });

      // Cap population growth by residential count just for some logic
      const resCount = buildingCounts[BuildingType.Residential] || 0;
      const maxPop = resCount * 50; // 50 people per house max

      // 2. Update Stats
      setStats(prev => {
        let newPop = prev.population + dailyPopGrowth;
        if (newPop > maxPop) newPop = maxPop; // limit
        if (resCount === 0 && prev.population > 0) newPop = Math.max(0, prev.population - 5); // people leave if no homes

        const newStats = {
          money: prev.money + dailyIncome,
          population: newPop,
          day: prev.day + 1,
        };
        
        // 3. Check Goal Completion
        const goal = goalRef.current;
        if (aiEnabledRef.current && goal && !goal.completed) {
          let isMet = false;
          if (goal.targetType === 'money' && newStats.money >= goal.targetValue) isMet = true;
          if (goal.targetType === 'population' && newStats.population >= goal.targetValue) isMet = true;
          if (goal.targetType === 'building_count' && goal.buildingType) {
            if ((buildingCounts[goal.buildingType] || 0) >= goal.targetValue) isMet = true;
          }

          if (isMet) {
            setCurrentGoal({ ...goal, completed: true });
          }
        }

        return newStats;
      });

      // 4. Trigger news & missions
      fetchNews();
      triggerMissionGen();

    }, TICK_RATE_MS);

    return () => clearInterval(intervalId);
  }, [fetchNews, gameStarted]);


  // --- Interaction Logic ---

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!gameStarted) return; // Prevent clicking through start screen

    const currentGrid = gridRef.current;
    const currentStats = statsRef.current;
    const tool = selectedTool; // Capture current tool
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    const currentTile = currentGrid[y][x];
    const buildingConfig = BUILDINGS[tool];

    // Bulldoze logic
    if (tool === BuildingType.None) {
      if (currentTile.buildingType !== BuildingType.None) {
        const demolishCost = 5;
        if (currentStats.money >= demolishCost) {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, buildingType: BuildingType.None };
            setGrid(newGrid);
            setStats(prev => ({ ...prev, money: prev.money - demolishCost }));
            // Sound effect here
        } else {
            addNewsItem({id: Date.now().toString(), text: "Cannot afford demolition costs.", type: 'negative'});
        }
      }
      return;
    }

    // Placement Logic
    if (currentTile.buildingType === BuildingType.None) {
      if (currentStats.money >= buildingConfig.cost) {
        // Deduct cost
        setStats(prev => ({ ...prev, money: prev.money - buildingConfig.cost, missionCount: prev.missionCount }));
        
        // Place building & Fetch real name from Grab Maps
        const newGrid = currentGrid.map(row => [...row]);
        const buildingId = `b-${Date.now()}-${x}-${y}`;
        newGrid[y][x] = { ...currentTile, buildingType: tool, buildingId };
        setGrid(newGrid);

        // Async fetch name so it doesn't block UI
        if (tool !== BuildingType.Road) {
           getRealPlaceNames(tool, 1).then(names => {
             if (names && names.length > 0) {
               setGrid(prev => {
                 const g = prev.map(r => [...r]);
                 if(g[y][x].buildingId === buildingId) {
                   g[y][x].name = names[0];
                 }
                 return g;
               });
             }
           });
        }
        // Sound effect here
      } else {
        // Not enough money feedback
        addNewsItem({id: Date.now().toString() + Math.random(), text: `Treasury insufficient for ${buildingConfig.name}.`, type: 'negative'});
      }
    }
  }, [selectedTool, addNewsItem, gameStarted]);

  const handleDroneMove = useCallback((pos: [number, number]) => {
    // Convert world position back to grid coordinates for mission logic
    // WORLD_OFFSET = GRID_SIZE / 2 - 0.5
    // pos[0] = x - WORLD_OFFSET => x = pos[0] + WORLD_OFFSET
    const offset = GRID_SIZE / 2 - 0.5;
    const gx = Math.round(pos[0] + offset);
    const gy = Math.round(pos[1] + offset);

    if (controllableMission) {
      if (!hasPackage) {
        // Check for pickup at fromTile
        if (gx === controllableMission.fromTile.x && gy === controllableMission.fromTile.y) {
          setHasPackage(true);
          addNewsItem({ id: Date.now().toString(), text: "Package collected! Deliver to destination.", type: 'positive' });
        }
      } else {
        // Check for delivery at toTile
        if (gx === controllableMission.toTile.x && gy === controllableMission.toTile.y) {
          setStats(s => ({ ...s, money: s.money + controllableMission.reward, missionCount: s.missionCount + 1 }));
          addNewsItem({ id: Date.now().toString(), text: `MISSION COMPLETE! +$${controllableMission.reward}`, type: 'positive' });
          setControllableMission(null);
          setHasPackage(false);
          
          // Trigger a celebratory message or sound logic here if needed
        }
      }
    }
  }, [controllableMission, hasPackage, addNewsItem]);

  const handleSearchPostalCode = useCallback(async (postalCode: string) => {
      addNewsItem({ id: Date.now().toString(), text: `Searching for hyperlocal data: ${postalCode}...`, type: 'neutral' });
      const result = await searchByPostalCode(postalCode);
      
      if (result) {
          addNewsItem({ id: Date.now().toString(), text: `Map updated for ${result.center.name || postalCode}.`, type: 'positive' });
          
          // Generate a new grid based on POIs with a more natural distribution
          const newGrid = createInitialGrid();
          
          // Fill based on POIs
          result.pois.forEach((poi: any, index: number) => {
              const x = (index * 7 + 3) % (GRID_SIZE - 2) + 1;
              const y = (index * 11 + 5) % (GRID_SIZE - 2) + 1;
              
              let type = BuildingType.Commercial;
              const nameLower = poi.name.toLowerCase();
              if (poi.categories?.some((c: any) => c.name.toLowerCase().includes('park') || c.name.toLowerCase().includes('garden'))) type = BuildingType.Park;
              if (poi.categories?.some((c: any) => c.name.toLowerCase().includes('residential') || c.name.toLowerCase().includes('hdb'))) type = BuildingType.Residential;
              if (nameLower.includes('hawker') || nameLower.includes('food centre') || nameLower.includes('market')) type = BuildingType.Hawker;
              
              newGrid[y][x] = { 
                  x, y, 
                  buildingType: type, 
                  name: poi.name,
                  buildingId: `poi-${Date.now()}-${index}`
              };

              // Surround POIs with some matching buildings to create clusters
              const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
              neighbors.forEach(([dx, dy]) => {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !newGrid[ny][nx]) {
                      if (Math.random() > 0.5) {
                          newGrid[ny][nx] = {
                              x: nx, y: ny,
                              buildingType: type === BuildingType.Park ? BuildingType.Park : BuildingType.Residential,
                              buildingId: `filler-${Date.now()}-${nx}-${ny}`
                          };
                      }
                  }
              });
          });
          
          setGrid(newGrid);
          setStats(s => ({ ...s, population: result.pois.length * 100 }));
      } else {
          addNewsItem({ id: Date.now().toString(), text: `Could not find data for ${postalCode}. Check your token!`, type: 'negative' });
      }
  }, [addNewsItem]);

  const handleMissionComplete = useCallback((id: string) => {
    setActiveMissions(prev => {
      const mission = prev.find(m => m.id === id);
      if (mission) {
        setStats(s => ({ ...s, money: s.money + mission.reward, missionCount: s.missionCount + 1 }));
        addNewsItem({ id: Date.now().toString(), text: `Mission Complete: ${mission.title}. Collected ${mission.reward}.`, type: 'positive' });
      }
      return prev.filter(m => m.id !== id);
    });
  }, [addNewsItem]);

  const handleAcceptMission = (mission: Mission) => {
    setAvailableMissions(prev => prev.filter(m => m.id !== mission.id));
    setControllableMission({ ...mission, status: 'active' });
    setHasPackage(false);
    addNewsItem({ id: Date.now().toString(), text: `Drone control active for: ${mission.title}. Go to ${mission.fromTile.x},${mission.fromTile.y}`, type: 'neutral' });
  };

  const handleClaimReward = () => {
    if (currentGoal && currentGoal.completed) {
      setStats(prev => ({ ...prev, money: prev.money + currentGoal.reward, missionCount: prev.missionCount }));
      addNewsItem({id: Date.now().toString(), text: `Goal achieved! ${currentGoal.reward} deposited to treasury.`, type: 'positive'});
      setCurrentGoal(null);
      fetchNewGoal();
    }
  };

  const handleIssueChallenge = () => {
    setChallengeActive(true);
    addNewsItem({
      id: Date.now().toString(),
      text: "🚨 CHALLENGE ISSUED: 40 Grab Drivers are racing to deliver!",
      type: 'positive'
    });
    setTimeout(() => setChallengeActive(false), 10000); // 10 second boost
  };

  const handleStart = (enabled: boolean) => {
    setAiEnabled(enabled);
    setGameStarted(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent selection:text-transparent bg-sky-900">
      {/* 3D Rendering Layer - Always visible now, providing background for start screen */}
      <IsoMap 
        grid={grid} 
        onTileClick={handleTileClick} 
        hoveredTool={selectedTool}
        population={stats.population}
        activeMissions={activeMissions}
        onMissionComplete={handleMissionComplete}
        controllableMission={controllableMission}
        onDroneMove={handleDroneMove}
        dronePos={dronePos}
        hasPackage={hasPackage}
        challengeActive={challengeActive}
      />
      
      {/* Start Screen Overlay */}
      {!gameStarted && (
        <StartScreen onStart={handleStart} />
      )}

      {/* UI Layer */}
      {gameStarted && (
        <UIOverlay
          stats={stats}
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          currentGoal={currentGoal}
          newsFeed={newsFeed}
          onClaimReward={handleClaimReward}
          isGeneratingGoal={isGeneratingGoal}
          aiEnabled={aiEnabled}
          availableMissions={availableMissions}
          onAcceptMission={handleAcceptMission}
          onSearchPostalCode={handleSearchPostalCode}
          onIssueChallenge={handleIssueChallenge}
          challengeActive={challengeActive}
        />
      )}

      {/* CSS for animations and utility */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .mask-image-b { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%); }
        
        /* Vertical text for toolbar label */
        .writing-mode-vertical { writing-mode: vertical-rl; text-orientation: mixed; }
        
        /* Custom scrollbar for news */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}

export default App;