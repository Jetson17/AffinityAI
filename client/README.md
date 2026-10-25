# AffinityAI — Frontend Client

This is the single-page web client for **AffinityAI — Intelligent Friend Recommendation System**, built with React 19 and Vite.

## Features
- **Modern Responsive UI**: Built with pure CSS design tokens, custom components, and Lucide icons.
- **Role-Based Views**: Dynamic rendering based on authenticated role:
  - **Student Portal**: Student Dashboard, Intelligent Friend Recommendations, Connections Management, Direct Messaging, Search, and Academic Profile Management.
  - **Administrator Portal**: Platform Overview, User Directory Management (activate/deactivate students), Platform Analytics (degree distribution, topic affinity, request conversion rate), and AI/ML Monitoring (live status, feature coefficients, evaluation metrics).
- **Algorithm Lab**: Interactive visual demonstrations of Kruskal's Minimum Spanning Tree with Disjoint Set Union and Kahn's DAG Topological Sorting with cycle detection.
- **JWT Session Management**: Centralized `AuthContext` with automatic authorization headers in all API requests.

## Local Development

```powershell
# Install frontend dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev

# Run Oxlint code analysis
npm run lint

# Build production bundle
npm run build
```
