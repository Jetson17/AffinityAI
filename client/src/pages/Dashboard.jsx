import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import UserCard from '../components/UserCard';
import UserAvatar from '../components/UserAvatar';
import {
  Users,
  UserPlus,
  Sparkles,
  FlaskConical,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  X,
  UserCheck,
  MessageSquare
} from 'lucide-react';

export default function Dashboard({ setTab }) {
  const { user, stats, refreshUser, showToast } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [recsRes, friendsRes] = await Promise.all([
        api.getRecommendations(),
        api.getFriends()
      ]);
      const rawRecs = recsRes.recommendations || [];
      const eligibleRecs = rawRecs.filter(r => {
        const role = (r.user?.role || '').toLowerCase();
        return role !== 'admin' && role !== 'administrator' && role !== 'staff';
      });
      setRecommendations(eligibleRecs);
      setFriends(friendsRes.friends || []);
      await refreshUser();
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleSendRequest = async (targetId) => {
    try {
      await api.sendFriendRequest(targetId);
      showToast('Friend request sent!', 'success');
      loadDashboardData();
      if (selectedProfileUser?.id === targetId) {
        setSelectedProfileUser(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to send friend request', 'error');
    }
  };

  return (
    <div className="page-container">
      {/* Welcome Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}! 👋</h1>
          <p className="page-description">
            {user?.role === 'admin'
              ? 'Your intelligent connection network is active. Discover recommendations and inspect graph algorithms below.'
              : 'Your intelligent connection network is active. Discover recommendations and connect with peers below.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadDashboardData}
            title="Refresh recommendations and network data"
          >
            <RefreshCw size={15} /> Refresh
          </button>
          {user?.role === 'admin' && (
            <button
              type="button"
              className="btn btn-accent btn-sm"
              onClick={() => setTab('dsalab')}
            >
              <FlaskConical size={15} /> Algorithm Lab
            </button>
          )}
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setTab('friends')}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--primary-subtle)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats?.friendsCount || friends.length}</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>Confirmed Friends</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setTab('requests')}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--accent-subtle)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserPlus size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stats?.pendingRequestsCount || 0}</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Requests</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setTab('recommendations')}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--success-subtle)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{recommendations.length}</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>AI Recommendations</div>
          </div>
        </div>

        {user?.role === 'admin' ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setTab('dsalab')}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Algorithm Lab</div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>Graph Traversal, MST & DAG</div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setTab('messages')}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--accent-subtle)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Direct Chat</div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>Instant Messages & Study Groups</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: AI-Powered Recommendations & My Friends */}
      <div className="grid-main-side">
        {/* Left: Top Recommendations */}
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title" style={{ fontSize: '1.25rem' }}>
                  <Sparkles size={22} style={{ color: 'var(--accent)' }} />
                  AI-Powered Friend Recommendations
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                  Discover meaningful connections through intelligent analysis of friendship networks, shared academic interests, and personalized recommendations.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTab('recommendations')}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Analyzing network graph and interest affinity...
              </div>
            ) : recommendations.length === 0 ? (
              <div className="empty-state">
                <Sparkles size={40} className="empty-state-icon" />
                <div className="empty-state-title">No New Recommendations</div>
                <p style={{ fontSize: '0.85rem' }}>
                  Connect with more classmates to unlock deeper 2-hop mutual recommendations!
                </p>
              </div>
            ) : (
              <div className="grid-2">
                {recommendations.slice(0, 4).map(rec => (
                  <UserCard
                    key={rec.user.id}
                    user={rec.user}
                    relationshipStatus="none"
                    mutualCount={rec.mutualCount}
                    mutualFriends={rec.mutualFriends}
                    matchPercentage={rec.matchPercentage}
                    predictedScore={rec.predictedScore}
                    predictedProbability={rec.predictedProbability}
                    recommendationMethod={rec.recommendationMethod}
                    features={rec.features}
                    sharedTopics={rec.sharedTopics}
                    reason={rec.reason}
                    onSendRequest={handleSendRequest}
                    onViewProfile={() => setSelectedProfileUser(rec)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Friends & Algorithm Lab Spotlight */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Friends List */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Users size={18} style={{ color: 'var(--primary)' }} />
                My Friends ({friends.length})
              </h3>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTab('friends')}
              >
                All
              </button>
            </div>

            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                You have no confirmed friends yet. Send a request from recommendations!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {friends.slice(0, 5).map(f => (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <UserAvatar name={f.name} avatar={f.avatar} size={36} />
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setTab('messages')}
                    >
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Algorithm Laboratory Spotlight Card (Admin) or Expand Network Card (Regular Student) */}
          {user?.role === 'admin' ? (
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <FlaskConical size={22} style={{ color: '#93c5fd' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Algorithm Laboratory</h3>
              </div>
              <p style={{ fontSize: '0.825rem', opacity: 0.9, lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Inspect graph traversals, Kruskal's Minimum Spanning Tree with DSU, and Kahn's Topological Sorting powering academic demonstrations.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => setTab('dsalab')}
                style={{ background: '#ffffff', color: '#1e3a8a', width: '100%', fontWeight: 700 }}
              >
                Explore Algorithm Lab <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg, #1e3a8a, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <Sparkles size={22} style={{ color: '#93c5fd' }} />
                <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Expand Your Network</h3>
              </div>
              <p style={{ fontSize: '0.825rem', opacity: 0.9, lineHeight: 1.5, marginBottom: '1.25rem' }}>
                Connect with fellow students sharing your academic research interests and course topics through AI-powered recommendations.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => setTab('recommendations')}
                style={{ background: '#ffffff', color: '#1e3a8a', width: '100%', fontWeight: 700 }}
              >
                View Recommendations <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student Profile Preview Modal */}
      {selectedProfileUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              style={{ position: 'absolute', top: '1rem', right: '1rem' }}
              onClick={() => setSelectedProfileUser(null)}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <UserAvatar name={selectedProfileUser.user.name} avatar={selectedProfileUser.user.avatar} size={64} />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedProfileUser.user.name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedProfileUser.user.email}</p>
                <span className={`badge ${selectedProfileUser.recommendationMethod === 'ml' ? 'badge-success' : 'badge-purple'}`} style={{ marginTop: '0.35rem' }}>
                  <Sparkles size={12} /> {selectedProfileUser.predictedScore !== undefined ? selectedProfileUser.predictedScore : selectedProfileUser.matchScore}% {selectedProfileUser.recommendationMethod === 'ml' ? 'Predicted Score' : 'Compatibility Match'}
                </span>
              </div>
            </div>

            {selectedProfileUser.user.bio && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>About</div>
                <p style={{ fontSize: '0.875rem' }}>{selectedProfileUser.user.bio}</p>
              </div>
            )}

            {selectedProfileUser.sharedTopics && selectedProfileUser.sharedTopics.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Shared Academic Interests</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {selectedProfileUser.sharedTopics.map(topic => (
                    <span key={topic} className="badge badge-primary">{topic}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedProfileUser.mutualCount > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Mutual Friends ({selectedProfileUser.mutualCount})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedProfileUser.mutualFriends.map(mf => (
                    <span key={mf.id} className="badge badge-purple" style={{ padding: '0.25rem 0.65rem' }}>
                      <UserCheck size={13} /> {mf.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedProfileUser(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSendRequest(selectedProfileUser.user.id)}
              >
                <UserPlus size={16} /> Send Friend Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
