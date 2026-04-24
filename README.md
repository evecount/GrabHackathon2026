# LoveLocal: Hyperlocal Drone Metropolis
A gamified 3D city-building experience powered by **Grab Maps API** and **Gemini AI**.

## 🚀 Concept
LoveLocal turns Singapore neighborhoods into interactive 3D maps where you can control a drone to fly packages (like those delicious noodle stalls!) from point A to point B. 

## ✨ Key Features
- **Singapore Flight Experience**: Take direct control of a Grab drone with **Arrow Keys/WASD** and fly over a 3D metropolis that mirrors real Singapore neighborhoods.
- **Hyperlocal World Builder**: Enter any Singapore Postal Code and watch the city manifest in 3D using real-world POI data (Hawker Centres, HDB Blocks, Parks).
- **Immersive Camera**: The camera dynamically follows your drone as you navigate the city, giving a true "pilot's eye" view of the island.
- **AI Mission Advisor**: Powered by Gemini, generating "Shiok" missions with local flavor.

## 🛠️ Tech Stack
- **Frontend**: React, Three.js, React-Three-Fiber, Vite.
- **APIs**: Grab Maps MCP (Search, POIs, Directions), Google Gemini API.
- **Styling**: TailwindCSS, Vanilla CSS.

## 📦 How to Run
1. Navigate to `/lovelocal`.
2. Install dependencies: `npm install`.
3. Set up `.env.local` with your `VITE_GRAB_MAPS_TOKEN`.
4. Run: `npm run dev`.

## 📄 Grab Maps API Feedback
See `grab_maps_api_feedback.md` for our detailed developer feedback on the Grab Maps MCP integration.

---
*Created for the Grab Maps API Hackathon 2026*
