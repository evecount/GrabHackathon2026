# Grab Maps API - Developer Feedback Report
**Project:** LoveLocal - Hyperlocal 3D Drone Metropolis
**Team:** kashe ( Casual Hackers )
**Date:** April 24, 2026

## 1. Overview
During the Grab Maps API hackathon, we integrated the Grab Maps MCP (Model Context Protocol) into a React-Three-Fiber 3D city-building game. Our goal was to use real-world POI data to procedurally generate Singapore neighborhoods.

## 2. Technical Hurdles & Friction Points

### A. MCP Authentication Sequence
*   **Issue:** Direct JSON-RPC calls to the `/api/v1/mcp` endpoint often returned `400 Bad Request` with the message: `"method 'tools/call' is invalid during session initialization"`.
*   **Feedback:** The requirement for an `initialize` handshake before calling tools makes simple, stateless client-side integrations difficult. A simplified "Direct Call" mode for API tokens would be highly beneficial for rapid prototyping.
*   **Impact:** Spent ~30 minutes debugging session states instead of building features.

### B. CORS Constraints
*   **Issue:** Calling the MCP gateway directly from a browser (Vite/React) triggers CORS blocks unless a proxy is used.
*   **Feedback:** For hackathons and developer sandboxes, enabling CORS for `localhost` or specific domains would allow for faster front-end integration.

### C. Method Naming Inconsistency
*   **Issue:** Conflicting documentation/examples for method names: `callTool`, `tools/call`, and `call_tool`.
*   **Feedback:** Standardizing on one naming convention or providing a thin JS SDK client that abstracts the JSON-RPC structure would prevent implementation errors.

### D. Documentation for JS SDK vs. MCP
*   **Issue:** It wasn't immediately clear if `grabmaps.es.js` was meant to replace or complement the MCP endpoint.
*   **Feedback:** A "Choose Your Path" guide (e.g., "Use SDK for Maps UI", "Use MCP for AI/Data") would help teams pick the right tool faster.

## 3. Feature Requests (The "Wishlist")

### A. 3D Spatial Metadata
*   **Request:** Include building height (stories) or footprint area in the `search_places` result.
*   **Use Case:** This would allow developers to generate accurate 3D city models procedurally without needing a full 3D Tiles API.

### B. "Road Network" Tool
*   **Request:** A tool that returns a simplified polyline grid of roads for a given area.
*   **Use Case:** Critical for city-builders or navigation games to align virtual roads with real ones.

### C. Drone-Specific Routing
*   **Request:** A routing mode for `get_directions` that ignores one-way streets and traffic, optimized for "as-the-crow-flies" or "obstacle-aware" drone flight.

## 4. Highlights (What We Loved)
*   **POI Accuracy:** The postal code search is incredibly fast and returned accurate, localized results (e.g., specific HDB blocks and GrabKitchens).
*   **MCP Concept:** Using MCP to expose maps as "tools" for AI agents is a brilliant architectural move. It made it very easy to explain to our "AI City Advisor" what it could do.

---
*Prepared by the LoveLocal Dev Team*
