import React, { useState } from 'react';
import UserAvatar from './UserAvatar';
import {
  UserPlus,
  UserCheck,
  Check,
  X,
  MessageSquare,
  UserMinus,
  Clock,
  Eye,
  Sparkles,
  BrainCircuit,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function UserCard({
  user,
  relationshipStatus = 'none', // 'none' | 'friends' | 'pending_sent' | 'pending_received' | 'self'
  requestId = null,
  mutualCount = 0,
  mutualFriends = [],
  reason = '',
  matchPercentage = '',
  predictedScore = null,
  predictedProbability = null,
  recommendationMethod = null, // 'ml' | 'heuristic' | null
  features = null,
  sharedTopics = [],
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest,
  onRemoveFriend,
  onOpenChat,
  onViewProfile,
  compact = false
}) {
  const [showFeatures, setShowFeatures] = useState(false);

  if (!user) return null;

  // Determine score badge text and class
  const isMl = recommendationMethod === 'ml';
  const displayScore = predictedScore !== null && predictedScore !== undefined
    ? predictedScore
    : (parseInt(matchPercentage, 10) || null);

  return (
    <div className={`user-card ${compact ? 'user-card-compact' : ''}`}>
      <div>
        <div className="user-card-header">
          <div
            onClick={() => onViewProfile && onViewProfile(user.id)}
            style={{ cursor: onViewProfile ? 'pointer' : 'default' }}
          >
            <UserAvatar name={user.name} avatar={user.avatar} size={compact ? 44 : 52} />
          </div>
          <div className="user-card-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h4
                className="user-card-name"
                title={user.name}
                onClick={() => onViewProfile && onViewProfile(user.id)}
                style={{ cursor: onViewProfile ? 'pointer' : 'default' }}
              >
                {user.name}
              </h4>

              {displayScore !== null && (
                <span
                  className={`badge ${isMl ? 'badge-success' : 'badge-purple'}`}
                  style={{ fontSize: '0.72rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  title={isMl ? 'Predicted Connection Likelihood computed by Supervised ML Model' : 'Graph Proximity & Interest Affinity Index'}
                >
                  {isMl ? <BrainCircuit size={11} /> : <Sparkles size={11} />}
                  {displayScore}% {isMl ? 'Predicted Score' : 'Affinity'}
                </span>
              )}
            </div>
            <p className="user-card-email" title={user.email}>{user.email}</p>
            {user.role === 'admin' && (
              <span className="badge badge-purple" style={{ marginTop: '0.25rem' }}>Admin</span>
            )}
          </div>
        </div>

        {user.bio && (
          <p className="user-card-bio" title={user.bio}>{user.bio}</p>
        )}

        {mutualCount > 0 ? (
          <div className="user-card-mutual">
            <UserCheck size={16} />
            <span>
              {mutualCount} mutual friend{mutualCount > 1 ? 's' : ''}
              {mutualFriends && mutualFriends.length > 0 && (
                <small style={{ display: 'block', opacity: 0.85 }}>
                  {mutualFriends.map(m => m.name).slice(0, 2).join(', ')}
                  {mutualCount > 2 ? ` +${mutualCount - 2} more` : ''}
                </small>
              )}
            </span>
          </div>
        ) : (
          recommendationMethod && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
              Cold-start discovery candidate
            </div>
          )
        )}

        {sharedTopics && sharedTopics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
            {sharedTopics.map(topic => (
              <span key={topic} className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                {topic}
              </span>
            ))}
          </div>
        )}

        {reason && (
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginTop: '0.5rem',
            lineHeight: 1.4,
            padding: '0.35rem 0.55rem',
            background: 'var(--bg-muted)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <span style={{ fontWeight: 600 }}>Why recommended:</span> {reason}
          </div>
        )}

        {/* Explainable Feature Inspection Toggle */}
        {features && (
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowFeatures(!showFeatures)}
              style={{
                width: '100%',
                fontSize: '0.72rem',
                padding: '0.25rem 0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <BrainCircuit size={12} /> {isMl ? 'Inspect ML Model Features' : 'Inspect Heuristic Features'}
              </span>
              {showFeatures ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showFeatures && (
              <div style={{
                marginTop: '0.35rem',
                padding: '0.5rem',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                  <div><strong>Mutual Friends:</strong> {features.mutual_friends}</div>
                  <div><strong>Friend Jaccard:</strong> {features.friend_jaccard}</div>
                  <div><strong>Shared Interests:</strong> {features.shared_interests}</div>
                  <div><strong>Interest Jaccard:</strong> {features.interest_jaccard}</div>
                  <div><strong>Candidate Degree:</strong> {features.candidate_degree}</div>
                  <div><strong>Adamic-Adar:</strong> {features.adamic_adar_approx}</div>
                </div>
                <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.68rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.3rem' }}>
                  Method: {isMl ? 'Supervised Logistic Regression' : 'Graph Heuristic (Fallback)'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="user-card-actions">
        {relationshipStatus === 'self' && (
          <span className="badge badge-primary" style={{ padding: '0.4rem 0.8rem' }}>You</span>
        )}

        {relationshipStatus === 'none' && (
          <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
            {onSendRequest && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onSendRequest(user.id)}
                style={{ flex: 1 }}
              >
                <UserPlus size={15} /> Add Friend
              </button>
            )}
            {onViewProfile && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onViewProfile(user.id)}
                title="View Student Profile"
              >
                <Eye size={15} /> Profile
              </button>
            )}
          </div>
        )}

        {relationshipStatus === 'pending_sent' && (
          <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
            {onCancelRequest && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onCancelRequest(requestId)}
                title="Click to cancel friend request"
                style={{ flex: 1, color: 'var(--warning-text)' }}
              >
                <Clock size={15} /> Pending (Cancel)
              </button>
            )}
            {onViewProfile && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onViewProfile(user.id)}
                title="View Student Profile"
              >
                <Eye size={15} />
              </button>
            )}
          </div>
        )}

        {relationshipStatus === 'pending_received' && (
          <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
            {onAcceptRequest && (
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => onAcceptRequest(requestId)}
                style={{ flex: 1 }}
              >
                <Check size={15} /> Accept
              </button>
            )}
            {onRejectRequest && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onRejectRequest(requestId)}
                style={{ flex: 1 }}
              >
                <X size={15} /> Reject
              </button>
            )}
          </div>
        )}

        {relationshipStatus === 'friends' && (
          <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
            {onOpenChat && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onOpenChat(user.id)}
                style={{ flex: 1 }}
              >
                <MessageSquare size={15} /> Chat
              </button>
            )}
            {onViewProfile && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onViewProfile(user.id)}
                title="View Student Profile"
              >
                <Eye size={15} />
              </button>
            )}
            {onRemoveFriend && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove ${user.name} from your friends?`)) {
                    onRemoveFriend(user.id);
                  }
                }}
                title="Remove Friend"
              >
                <UserMinus size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
