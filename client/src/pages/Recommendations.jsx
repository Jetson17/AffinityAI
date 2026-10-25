import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserCard from '../components/UserCard';
import UserAvatar from '../components/UserAvatar';
import {
  Sparkles,
  RefreshCw,
  Info,
  BrainCircuit,
  X,
  UserPlus,
  UserCheck,
  Share2,
  ShieldCheck,
  AlertTriangle,
  Layers
} from 'lucide-react';

export default function Recommendations({ setTab }) {
  const { showToast } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getRecommendations();
      const raw = res.recommendations || [];
      const eligible = raw.filter(r => {
        const role = (r.user?.role || '').toLowerCase();
        return role !== 'admin' && role !== 'administrator' && role !== 'staff';
      });
      setRecommendations(eligible);
      setMeta(res.meta || null);
    } catch (err) {
      setError(err.message || 'Failed to load recommendations.');
      showToast(err.message || 'Failed to load recommendations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const handleSendRequest = async (targetId) => {
    try {
      await api.sendFriendRequest(targetId);
      showToast('Friend request sent!', 'success');
      if (selectedProfileUser && selectedProfileUser.user.id === targetId) {
        setSelectedProfileUser(null);
      }
      loadRecommendations();
    } catch (err) {
      showToast(err.message || 'Failed to send friend request', 'error');
    }
  };

  const isMlMode = meta?.recommendationMode === 'ml';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI & Graph Friend Recommendations</h1>
          <p className="page-description">
            Discover peer connections using structural 2-hop graph traversal, homophily in academic interests, and supervised machine learning.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {meta && (
            <span
              className={`badge ${isMlMode ? 'badge-success' : 'badge-purple'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {isMlMode ? <BrainCircuit size={14} /> : <Share2 size={14} />}
              Method: {isMlMode ? 'Machine Learning' : 'Graph Heuristic'}
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={loadRecommendations}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Model & Algorithm Intelligence Banner */}
      <div className={`alert-banner ${isMlMode ? 'alert-info' : 'alert-purple'}`} style={{ marginBottom: '1.5rem' }}>
        {isMlMode ? (
          <BrainCircuit size={22} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--primary)' }} />
        ) : (
          <Info size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
        )}
        <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
          <strong>Active Recommendation Pipeline:</strong> {meta?.algorithm || 'Candidate discovery & ranking'}
          <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
            {isMlMode ? (
              <span>
                Candidates are retrieved via <strong>2-hop graph traversal</strong>, scored with <strong>7 explainable features</strong>, and ranked by a <strong>supervised Logistic Regression model</strong>. Cold-start candidates without mutual friends are surfaced through academic topic homophily.
              </span>
            ) : (
              <span>
                Operating in <strong>transparent graph heuristic fallback mode</strong>. Candidates are ranked using mutual-friend graph closeness and academic topic overlap.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--primary)' }} />
          Computing network intersections, extracting academic features, and evaluating ML ranking model...
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', borderColor: 'var(--danger-border)' }}>
          <AlertTriangle size={36} style={{ color: 'var(--danger)', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Unable to load recommendations</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{error}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={loadRecommendations}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && recommendations.length === 0 && (
        <div className="empty-state">
          <Sparkles size={48} className="empty-state-icon" />
          <div className="empty-state-title">No New Recommendations Found</div>
          <p style={{ fontSize: '0.9rem', maxWidth: '450px', margin: '0.5rem auto 1.5rem', color: 'var(--text-muted)' }}>
            Either you are already connected with all active classmates, or you have pending requests with all available candidates.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setTab('friends')}
          >
            Manage Existing Friends
          </button>
        </div>
      )}

      {/* Recommendations Grid */}
      {!loading && !error && recommendations.length > 0 && (
        <div className="grid-3">
          {recommendations.map(rec => (
            <UserCard
              key={rec.user.id}
              user={rec.user}
              relationshipStatus="none"
              mutualCount={rec.mutualCount}
              mutualFriends={rec.mutualFriends}
              matchPercentage={rec.matchPercentage}
              predictedScore={rec.predictedScore}
              predictedProbability={rec.predictedProbability}
              recommendationMethod={rec.recommendationMethod || meta?.recommendationMode}
              features={rec.features}
              sharedTopics={rec.sharedTopics}
              reason={rec.reason}
              onSendRequest={handleSendRequest}
              onViewProfile={() => setSelectedProfileUser(rec)}
            />
          ))}
        </div>
      )}

      {/* Comprehensive Profile & Model Explainability Modal */}
      {selectedProfileUser && (
        <div className="modal-overlay" onClick={() => setSelectedProfileUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <UserAvatar name={selectedProfileUser.user.name} avatar={selectedProfileUser.user.avatar} size={54} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{selectedProfileUser.user.name}</h3>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>{selectedProfileUser.user.email}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setSelectedProfileUser(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Recommendation Scoring Badge */}
            <div style={{
              marginBottom: '1rem',
              padding: '0.85rem',
              background: isMlMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${isMlMode ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.2)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isMlMode ? 'var(--success)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {isMlMode ? <BrainCircuit size={16} /> : <Sparkles size={16} />}
                  {isMlMode ? 'ML Link Prediction' : 'Heuristic Affinity'}
                </span>

                <span className={`badge ${isMlMode ? 'badge-success' : 'badge-purple'}`} style={{ fontWeight: 800 }}>
                  {selectedProfileUser.predictedScore !== undefined ? selectedProfileUser.predictedScore : selectedProfileUser.matchScore}% {isMlMode ? 'Predicted Score' : 'Affinity'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.45 }}>
                {selectedProfileUser.reason}
              </p>
            </div>

            {/* Feature Breakdown Table (Transparent Explainability) */}
            {selectedProfileUser.features && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <Layers size={13} /> Model Input Features
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem', fontSize: '0.8rem' }}>
                  <div><strong>Mutual Friends:</strong> {selectedProfileUser.features.mutual_friends}</div>
                  <div><strong>Friend Jaccard:</strong> {selectedProfileUser.features.friend_jaccard}</div>
                  <div><strong>Shared Interests:</strong> {selectedProfileUser.features.shared_interests}</div>
                  <div><strong>Interest Jaccard:</strong> {selectedProfileUser.features.interest_jaccard}</div>
                  <div><strong>Adamic-Adar Index:</strong> {selectedProfileUser.features.adamic_adar_approx}</div>
                  <div><strong>Candidate Degree:</strong> {selectedProfileUser.features.candidate_degree} friends</div>
                </div>
              </div>
            )}

            {selectedProfileUser.user.bio && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>About</div>
                <p style={{ fontSize: '0.875rem', margin: 0 }}>{selectedProfileUser.user.bio}</p>
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
