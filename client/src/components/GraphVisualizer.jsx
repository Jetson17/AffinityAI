import React, { useMemo } from 'react';

/**
 * Interactive SVG Graph Visualizer for Educational Demonstrations
 * Supports:
 * 1. Undirected Friendship Graph (highlights root, 1-hop direct friends, 2-hop mutual candidates)
 * 2. Weighted Undirected Graph with Kruskal's MST Edge Highlighting
 * 3. Directed Acyclic Graph (DAG) with Arrowheads and Kahn's In-Degree Badges
 */
export default function GraphVisualizer({
  mode = 'friendship', // 'friendship' | 'mst' | 'topological'
  nodes = [],
  edges = [],
  rootId = null,
  directFriendIds = [],
  recommendedIds = [],
  mstEdges = [],
  topologicalOrder = [],
  onNodeClick = null,
  width = 720,
  height = 420
}) {
  // Compute deterministic coordinates for nodes
  const nodePositions = useMemo(() => {
    const pos = new Map();
    const count = nodes.length;
    if (count === 0) return pos;

    const cx = width / 2;
    const cy = height / 2;

    if (mode === 'topological') {
      // Linear / multi-tier DAG progression layout
      const cols = Math.min(4, Math.ceil(Math.sqrt(count)));
      const rows = Math.ceil(count / cols);
      const colSpacing = (width - 160) / Math.max(1, cols - 1);
      const rowSpacing = (height - 120) / Math.max(1, rows - 1);

      nodes.forEach((node, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        pos.set(node.id, {
          x: 80 + c * colSpacing,
          y: 60 + r * rowSpacing
        });
      });
    } else {
      // Circular layout for symmetric graphs
      const radius = Math.min(width, height) / 2 - 60;
      nodes.forEach((node, idx) => {
        const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
        pos.set(node.id, {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle)
        });
      });
    }

    return pos;
  }, [nodes, width, height, mode]);

  // Set of MST edge keys for rapid lookup
  const mstEdgeKeySet = useMemo(() => {
    const set = new Set();
    if (mstEdges) {
      mstEdges.forEach(e => {
        const key1 = `${e.u}_${e.v}`;
        const key2 = `${e.v}_${e.u}`;
        set.add(key1);
        set.add(key2);
      });
    }
    return set;
  }, [mstEdges]);

  return (
    <div className="graph-canvas-container" style={{ width: '100%', height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          {/* Arrowhead marker for directed edges in DAG */}
          <marker
            id="dag-arrow"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
          </marker>

          {/* Active arrow marker */}
          <marker
            id="dag-arrow-active"
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
          </marker>
        </defs>

        {/* 1. EDGES */}
        <g className="graph-edges">
          {edges.map((edge, idx) => {
            const uId = edge.source !== undefined ? edge.source : (edge.from !== undefined ? edge.from : edge.u);
            const vId = edge.target !== undefined ? edge.target : (edge.to !== undefined ? edge.to : edge.v);

            const p1 = nodePositions.get(uId);
            const p2 = nodePositions.get(vId);

            if (!p1 || !p2) return null;

            let strokeColor = '#cbd5e1';
            let strokeWidth = 2;
            let strokeDasharray = 'none';

            if (mode === 'mst') {
              const isMst = mstEdgeKeySet.has(`${uId}_${vId}`);
              if (isMst) {
                strokeColor = '#7c3aed'; // Vibrant Purple for MST
                strokeWidth = 4;
              } else {
                strokeColor = '#cbd5e1';
                strokeDasharray = '4 4'; // Dashed for non-MST edges (cycle prevention)
                strokeWidth = 1.5;
              }
            } else if (mode === 'friendship') {
              const isConnectedToRoot = (uId === rootId || vId === rootId);
              if (isConnectedToRoot) {
                strokeColor = '#10b981'; // Green for 1-hop direct friendship
                strokeWidth = 3;
              }
            }

            // Midpoint for edge labels (weights or actions)
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            return (
              <g key={`edge_${uId}_${vId}_${idx}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  markerEnd={mode === 'topological' ? 'url(#dag-arrow)' : undefined}
                />
                {(edge.weight !== undefined || edge.label) && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-14"
                      y="-10"
                      width="28"
                      height="20"
                      rx="4"
                      fill="#ffffff"
                      stroke={strokeColor}
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize="11"
                      fontWeight="700"
                      fill="#1e293b"
                    >
                      {edge.weight !== undefined ? edge.weight : edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* 2. NODES */}
        <g className="graph-nodes">
          {nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const isRoot = node.id === rootId;
            const isDirectFriend = directFriendIds.includes(node.id);
            const isRecommended = recommendedIds.includes(node.id);

            let nodeFill = '#ffffff';
            let strokeColor = '#3b82f6';
            let strokeWidth = 2.5;
            let radius = 22;

            if (mode === 'friendship') {
              if (isRoot) {
                nodeFill = '#2563eb';
                strokeColor = '#1d4ed8';
                strokeWidth = 4;
                radius = 26;
              } else if (isDirectFriend) {
                nodeFill = '#10b981';
                strokeColor = '#059669';
                strokeWidth = 3;
              } else if (isRecommended) {
                nodeFill = '#7c3aed';
                strokeColor = '#6d28d9';
                strokeWidth = 3;
              } else {
                nodeFill = '#94a3b8';
                strokeColor = '#64748b';
              }
            } else if (mode === 'mst') {
              nodeFill = '#4f46e5';
              strokeColor = '#3730a3';
            } else if (mode === 'topological') {
              const topoIndex = topologicalOrder.indexOf(node.id);
              if (topoIndex !== -1) {
                nodeFill = '#2563eb';
                strokeColor = '#1e40af';
              } else {
                nodeFill = '#64748b';
                strokeColor = '#475569';
              }
            }

            const initials = (node.label || `${node.id}`)
              .split(/[ _]/)
              .map(p => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <g
                key={`node_${node.id}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onNodeClick && onNodeClick(node.id)}
                style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
              >
                {/* Outer halo if Root or Recommended */}
                {(isRoot || isRecommended) && (
                  <circle
                    r={radius + 6}
                    fill="none"
                    stroke={isRoot ? 'rgba(37, 99, 235, 0.3)' : 'rgba(124, 58, 237, 0.3)'}
                    strokeWidth="3"
                  />
                )}

                {/* Node Circle */}
                <circle
                  r={radius}
                  fill={nodeFill}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />

                {/* Initials / Label */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fontSize={radius > 22 ? "12" : "10"}
                  fontWeight="700"
                  fill="#ffffff"
                  style={{ pointerEvents: 'none' }}
                >
                  {initials}
                </text>

                {/* Text Label Below Node */}
                <text
                  textAnchor="middle"
                  y={radius + 15}
                  fontSize="11"
                  fontWeight="600"
                  fill="#1e293b"
                  style={{ pointerEvents: 'none' }}
                >
                  {node.label || node.id}
                </text>

                {/* Status Badges */}
                {isRoot && (
                  <g transform={`translate(0, -${radius + 8})`}>
                    <rect x="-18" y="-9" width="36" height="15" rx="3" fill="#1e40af" />
                    <text textAnchor="middle" dy="2" fontSize="9" fontWeight="700" fill="#fff">ROOT</text>
                  </g>
                )}

                {isDirectFriend && !isRoot && (
                  <g transform={`translate(0, -${radius + 8})`}>
                    <rect x="-18" y="-9" width="36" height="15" rx="3" fill="#065f46" />
                    <text textAnchor="middle" dy="2" fontSize="8" fontWeight="700" fill="#fff">FRIEND</text>
                  </g>
                )}

                {isRecommended && !isRoot && !isDirectFriend && (
                  <g transform={`translate(0, -${radius + 8})`}>
                    <rect x="-24" y="-9" width="48" height="15" rx="3" fill="#5b21b6" />
                    <text textAnchor="middle" dy="2" fontSize="8" fontWeight="700" fill="#fff">RECOMMEND</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
