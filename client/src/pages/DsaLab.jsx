import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GraphVisualizer from '../components/GraphVisualizer';
import {
  Share2,
  GitBranch,
  Network,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export default function DsaLab({ setTab }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('recommendation'); // 'recommendation' | 'mst' | 'topological'

  // Tab 1 state: Friendship Graph
  const [graphData, setGraphData] = useState(null);
  const [selectedRootId, setSelectedRootId] = useState(1);
  const [loadingGraph, setLoadingGraph] = useState(true);

  // Tab 2 state: Kruskal MST
  const [mstData, setMstData] = useState(null);
  const [loadingMst, setLoadingMst] = useState(true);

  // Tab 3 state: Kahn Topological Sort
  const [topoData, setTopoData] = useState(null);
  const [topoType, setTopoType] = useState('workflow'); // 'workflow' | 'courses'
  const [loadingTopo, setLoadingTopo] = useState(true);

  // Load Tab 1 data
  const loadFriendshipGraph = async (rootId = selectedRootId) => {
    try {
      setLoadingGraph(true);
      const res = await api.getFriendshipGraph(rootId);
      setGraphData(res);
      setSelectedRootId(res.rootId);
    } catch (err) {
      console.error('Failed to load friendship graph:', err);
    } finally {
      setLoadingGraph(false);
    }
  };

  // Load Tab 2 data
  const loadMstData = async () => {
    try {
      setLoadingMst(true);
      const res = await api.getKruskalMST();
      setMstData(res);
    } catch (err) {
      console.error('Failed to load MST data:', err);
    } finally {
      setLoadingMst(false);
    }
  };

  // Load Tab 3 data
  const loadTopoData = async (type = topoType) => {
    try {
      setLoadingTopo(true);
      const res = await api.getTopologicalSort(type);
      setTopoData(res);
    } catch (err) {
      console.error('Failed to load topological sort data:', err);
    } finally {
      setLoadingTopo(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') return;
    loadFriendshipGraph(1);
    loadMstData();
    loadTopoData('workflow');
  }, [user]);

  const handleRootChange = (newRootId) => {
    const id = parseInt(newRootId, 10);
    setSelectedRootId(id);
    loadFriendshipGraph(id);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '580px', margin: '3rem auto', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--danger-subtle)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Access Denied: Administrator Only
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            The Algorithm Laboratory is an academic graph algorithm demonstration reserved for platform administrators and academic evaluators. Regular student accounts do not have permission to view graph theory demonstrations.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setTab ? setTab('dashboard') : (window.location.pathname = '/')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 className="page-title">Algorithm Laboratory</h1>
            <span className="badge badge-purple" style={{ padding: '0.35rem 0.75rem' }}>
              <ShieldCheck size={14} /> Admin / Academic Evaluation
            </span>
          </div>
          <p className="page-description">
            Academic graph algorithm demonstrations for syllabus evaluation: Graph Traversal (Triadic Closure BFS), Kruskal's Minimum Spanning Tree with DSU, and Kahn's Topological Sorting (DAG).
          </p>
        </div>
      </div>

      {/* Main Algorithm Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'recommendation' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendation')}
        >
          <Share2 size={18} />
          1. Friend Recommendation Graph
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'mst' ? 'active' : ''}`}
          onClick={() => setActiveTab('mst')}
        >
          <Network size={18} />
          2. Minimum Spanning Tree (Kruskal + DSU)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'topological' ? 'active' : ''}`}
          onClick={() => setActiveTab('topological')}
        >
          <GitBranch size={18} />
          3. Topological Sorting (Kahn's Algorithm)
        </button>
      </div>

      {/* =========================================================================
          TAB 1: FRIEND RECOMMENDATION GRAPH
          ========================================================================= */}
      {activeTab === 'recommendation' && (
        <div>
          <div className="alert-banner alert-info">
            <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>DSA & AI Engineering Distinction:</strong> Users are modelled as vertices <code>V</code> and confirmed friendships
              as undirected edges <code>E</code>. 
              <ul style={{ margin: '0.4rem 0 0 1.25rem', padding: 0, fontSize: '0.85rem' }}>
                <li><strong>Graph Traversal (Triadic Closure):</strong> Generates candidate connections via 2-hop BFS traversal.</li>
                <li><strong>Supervised Machine Learning:</strong> Scores and ranks candidates using calibrated link probabilities based on mutual density and academic topic homophily.</li>
                <li><strong>Kruskal's MST & Kahn's Topological Sort:</strong> Independent academic algorithm demonstrations for network backbone optimization and DAG scheduling (not part of the trained ML model).</li>
              </ul>
            </div>
          </div>

          {/* Root Selector & Graph Stats */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Select Root User Vertex:</label>
                <select
                  className="form-select"
                  style={{ width: '220px', padding: '0.45rem 0.75rem' }}
                  value={selectedRootId}
                  onChange={(e) => handleRootChange(e.target.value)}
                >
                  {graphData?.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className="badge badge-primary">Vertices: {graphData?.stats?.totalVertices || 0}</span>
                <span className="badge badge-primary">Edges: {graphData?.stats?.totalEdges || 0}</span>
                <span className="badge badge-success">Direct Friends: {graphData?.directFriends?.length || 0}</span>
                <span className="badge badge-purple">Recommended: {graphData?.recommendations?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Graph Visualizer */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Live Social Graph Topology</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
                  Root User
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                  1-Hop Direct Friends
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }}></span>
                  2-Hop Recommendations
                </span>
              </div>
            </div>

            {loadingGraph ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>Rendering graph...</div>
            ) : (
              <GraphVisualizer
                mode="friendship"
                nodes={graphData?.nodes || []}
                edges={graphData?.edges || []}
                rootId={selectedRootId}
                directFriendIds={graphData?.directFriends || []}
                recommendedIds={(graphData?.recommendations || []).map(r => r.user.id)}
                onNodeClick={handleRootChange}
                height={420}
              />
            )}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              💡 Tip: Click any vertex node in the graph above to set them as the root user dynamically!
            </p>
          </div>

          {/* Recommendations Table */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Computed Mutual Friends & Ranked Recommendations</h3>
              <span className="badge badge-purple">Time Complexity: O(V + E + K log K)</span>
            </div>

            {graphData?.recommendations?.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No 2-hop recommendations for this vertex. All connected components or friends already explored.
              </div>
            ) : (
              <table className="algorithm-trace-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate User</th>
                    <th>Mutual Friends Count</th>
                    <th>Mutual Connections List</th>
                    <th>System Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {graphData?.recommendations.map((rec, idx) => (
                    <tr key={rec.user.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{rec.user.name}</td>
                      <td>
                        <span className="badge badge-purple" style={{ fontSize: '0.85rem' }}>
                          {rec.mutualCount} mutual
                        </span>
                      </td>
                      <td>{rec.mutualFriends.map(m => m.name).join(', ')}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{rec.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MINIMUM SPANNING TREE (KRUSKAL + DSU)
          ========================================================================= */}
      {activeTab === 'mst' && (
        <div>
          {/* Important Educational Banner */}
          <div className="alert-banner alert-purple">
            <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Educational Demonstration Note:</strong> Minimum Spanning Tree (MST) identifies the minimal total edge weight
              to connect all vertices without cycles (e.g., campus server communication backbone or network cabling).
              <em>MST is an educational graph demonstration and is distinct from the mutual-friend recommendation algorithm.</em>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
            <div className="card">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Graph Vertices (V)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                {mstData?.result?.vertexCount || 0}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Edges in MST (Target: V - 1)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)' }}>
                {mstData?.result?.mstEdges?.length || 0} / {Math.max(0, (mstData?.result?.vertexCount || 0) - 1)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {mstData?.result?.edgeCount || 0} total candidate edges evaluated
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Minimum Total Weight</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
                {mstData?.result?.totalWeight || 0} units
              </div>
            </div>
          </div>

          {/* MST Graph Visualizer */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Campus Communication Backbone Graph</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '16px', height: '4px', background: '#7c3aed', display: 'inline-block' }}></span>
                  MST Edges (Accepted)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '16px', height: '2px', borderTop: '2px dashed #cbd5e1', display: 'inline-block' }}></span>
                  Rejected Edges (Cycle Detected)
                </span>
              </div>
            </div>

            {loadingMst ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>Calculating MST...</div>
            ) : (
              <GraphVisualizer
                mode="mst"
                nodes={(mstData?.result?.canonicalVertices || mstData?.graph?.vertices || []).map(v => ({ id: v, label: v }))}
                edges={mstData?.graph?.edges || []}
                mstEdges={mstData?.result?.mstEdges || []}
                height={420}
              />
            )}
          </div>

          {/* Kruskal + DSU Step-by-Step Decision Table */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Kruskal's Algorithm + DSU Step-by-Step Execution</h3>
              <span className="badge badge-purple">Complexity: O(E log E)</span>
            </div>

            <table className="algorithm-trace-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Edge Examined</th>
                  <th>Weight</th>
                  <th>Decision</th>
                  <th>DSU Set / Cycle Analysis</th>
                  <th>Running MST Weight</th>
                </tr>
              </thead>
              <tbody>
                {mstData?.result?.steps?.map((step) => {
                  const isAccepted = step.action === 'ACCEPTED';
                  const isRejected = step.action === 'REJECTED';

                  return (
                    <tr key={step.step}>
                      <td style={{ fontWeight: 700 }}>#{step.step}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{step.edge}</td>
                      <td>
                        <span className="badge badge-primary">{step.weight}</span>
                      </td>
                      <td>
                        {isAccepted && (
                          <span className="badge badge-success" style={{ gap: '0.25rem' }}>
                            <CheckCircle2 size={13} /> ACCEPTED
                          </span>
                        )}
                        {isRejected && (
                          <span className="badge badge-danger" style={{ gap: '0.25rem' }}>
                            <XCircle size={13} /> CYCLE REJECTED
                          </span>
                        )}
                        {!isAccepted && !isRejected && (
                          <span className="badge badge-warning">{step.action}</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.825rem', color: isRejected ? 'var(--danger-text)' : 'var(--text-main)' }}>
                        {step.reason}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--success-text)' }}>
                        {step.currentMstWeight}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: TOPOLOGICAL SORTING (KAHN'S ALGORITHM)
          ========================================================================= */}
      {activeTab === 'topological' && (
        <div>
          {/* Important Educational Banner */}
          <div className="alert-banner alert-info">
            <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Educational Demonstration Note:</strong> Topological sorting produces a valid linear ordering for
              Directed Acyclic Graphs (DAGs) respecting all prerequisites.
              <em>It is NOT used for standard mutual friendships because friendships are symmetric (undirected and cyclical).</em>
            </div>
          </div>

          {/* DAG Type Switcher */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Sample Directed Graph (DAG):</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${topoType === 'workflow' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setTopoType('workflow');
                      loadTopoData('workflow');
                    }}
                  >
                    Social Connection Progression DAG
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${topoType === 'courses' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      setTopoType('courses');
                      loadTopoData('courses');
                    }}
                  >
                    CS Prerequisite Curriculum DAG
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-primary">Vertices: {topoData?.result?.vertexCount || 0}</span>
                <span className="badge badge-primary">Directed Edges: {topoData?.result?.edgeCount || 0}</span>
                <span className={`badge ${topoData?.result?.hasCycle ? 'badge-danger' : 'badge-success'}`}>
                  {topoData?.result?.hasCycle ? 'Cycle Detected' : 'Valid DAG (No Cycles)'}
                </span>
              </div>
            </div>
          </div>

          {/* Final Topological Order Pill Sequence */}
          <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #f8fafc, #eff6ff)' }}>
            <div className="card-header">
              <h3 className="card-title">Resulting Linear Topological Order</h3>
              <span className="badge badge-purple">Time Complexity: O(V + E)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0' }}>
              {topoData?.result?.order?.map((v, idx) => (
                <React.Fragment key={v}>
                  <div style={{
                    padding: '0.55rem 0.95rem',
                    background: '#ffffff',
                    border: '1.5px solid var(--primary)',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: 'var(--primary-text)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    {v}
                  </div>
                  {idx < (topoData?.result?.order?.length - 1) && (
                    <ArrowRight size={18} style={{ color: 'var(--primary)' }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Graph Visualizer for DAG */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Directed Dependency Graph</h3>
            </div>
            {loadingTopo ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>Calculating topological ordering...</div>
            ) : (
              <GraphVisualizer
                mode="topological"
                nodes={(topoData?.graph?.vertices || []).map(v => ({ id: v, label: v }))}
                edges={topoData?.graph?.edges || []}
                topologicalOrder={topoData?.result?.order || []}
                height={400}
              />
            )}
          </div>

          {/* Kahn BFS Execution Trace Table */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Kahn's BFS Queue Execution Trace</h3>
            </div>

            <table className="algorithm-trace-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Action</th>
                  <th>Dequeued Vertex</th>
                  <th>Queue State [In-Degree 0 Nodes]</th>
                  <th>Execution Details</th>
                </tr>
              </thead>
              <tbody>
                {topoData?.result?.steps?.map((step) => (
                  <tr key={step.step}>
                    <td style={{ fontWeight: 700 }}>#{step.step}</td>
                    <td>
                      <span className="badge badge-primary">{step.action}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {step.dequeued || '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      [{step.queue ? step.queue.join(', ') : ''}]
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      {step.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
