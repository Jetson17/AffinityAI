import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  TrendingUp,
  Share2,
  Users,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Hash,
  AlertTriangle,
  BookOpen
} from 'lucide-react';

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.getAdminAnalytics();
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load platform analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (error) {
    return (
      <div className="page-container">
        <div className="alert-banner alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <AlertTriangle size={20} />
          <div>{error}</div>
        </div>
      </div>
    );
  }

  const degreeBuckets = data?.degreeBuckets || {};
  const totalStudents = data?.totalStudents || 1;
  const topTopics = (data?.topTopics || []).slice(0, 10);
  const maxTopicCount = topTopics.length > 0 ? Math.max(...topTopics.map(t => t.count), 1) : 1;

  const requestBreakdown = data?.requestBreakdown || { pending: 0, accepted: 0, rejected: 0 };
  const totalRequests = requestBreakdown.pending + requestBreakdown.accepted + requestBreakdown.rejected;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem' }}>Platform Analytics & Network Insights</h1>
            <span className="badge badge-purple" style={{ padding: '0.3rem 0.75rem' }}>
              <ShieldCheck size={14} style={{ marginRight: '0.3rem' }} /> Verified Ground Truth
            </span>
          </div>
          <p className="page-description" style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
            Real-time graph metrics, student degree distribution, academic topic frequencies, and interaction funnels.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--border-light)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <div>Computing graph and interaction analytics...</div>
        </div>
      ) : (
        <>
          {/* Top Level Metric Summary Cards */}
          <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Friend Request Conversion
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                {data?.conversionRate ?? 0}%
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                {requestBreakdown.accepted} of {totalRequests} requests accepted
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Communication Pairs
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.25rem' }}>
                {data?.activeChatPairs ?? 0}
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Distinct friend-to-friend message threads
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Messages Sent
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
                {data?.totalMessages ?? 0}
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Privacy enforced: contents never retrieved
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Network Density
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {totalStudents > 1
                  ? (((2 * (data?.totalFriendships || 0)) / (totalStudents * (totalStudents - 1))) * 100).toFixed(1)
                  : '0.0'}%
              </div>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                {data?.totalFriendships || 0} edges / {totalStudents} nodes
              </div>
            </div>
          </div>

          {/* Charts & Distributions */}
          <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
            {/* Student Degree Distribution */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div className="card-header" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Share2 size={18} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Student Degree Distribution</h3>
                </div>
                <span className="badge badge-primary">{totalStudents} Students</span>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Distribution of confirmed friendships per student node in the social graph.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(degreeBuckets).map(([bucket, count]) => {
                  const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
                  return (
                    <div key={bucket}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600 }}>{bucket}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{count} students ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '10px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.5s ease'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Friend Request Funnel Breakdown */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div className="card-header" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Friend Request Lifecycle Status</h3>
                </div>
                <span className="badge badge-purple">{totalRequests} Total Requests</span>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Lifecycle outcomes for student-initiated connection invitations across the platform.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {/* Accepted */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success-text)', fontWeight: 600 }}>
                      <CheckCircle2 size={16} /> Accepted Friendships
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {requestBreakdown.accepted} ({totalRequests > 0 ? Math.round((requestBreakdown.accepted / totalRequests) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${totalRequests > 0 ? (requestBreakdown.accepted / totalRequests) * 100 : 0}%`,
                      height: '100%',
                      background: 'var(--success)',
                      borderRadius: 'var(--radius-full)'
                    }} />
                  </div>
                </div>

                {/* Pending */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning-text)', fontWeight: 600 }}>
                      <Clock size={16} /> Pending Evaluation
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {requestBreakdown.pending} ({totalRequests > 0 ? Math.round((requestBreakdown.pending / totalRequests) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${totalRequests > 0 ? (requestBreakdown.pending / totalRequests) * 100 : 0}%`,
                      height: '100%',
                      background: 'var(--warning)',
                      borderRadius: 'var(--radius-full)'
                    }} />
                  </div>
                </div>

                {/* Rejected */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger-text)', fontWeight: 600 }}>
                      <XCircle size={16} /> Rejected Invitations
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {requestBreakdown.rejected} ({totalRequests > 0 ? Math.round((requestBreakdown.rejected / totalRequests) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${totalRequests > 0 ? (requestBreakdown.rejected / totalRequests) * 100 : 0}%`,
                      height: '100%',
                      background: 'var(--danger)',
                      borderRadius: 'var(--radius-full)'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Topic Frequency Breakdown */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="card-header" style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <BookOpen size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Academic Topic Affinity Frequencies</h3>
              </div>
              <span className="badge badge-primary">{topTopics.length} Common Disciplines</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Normalized canonical academic topics extracted directly from active student bios and declared interest portfolios.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {topTopics.map((item) => {
                const pct = Math.round((item.count / maxTopicCount) * 100);
                return (
                  <div key={item.topic} style={{ background: 'var(--bg-muted)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                        {item.topic}
                      </span>
                      <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                        {item.count} students
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--primary)',
                          borderRadius: 'var(--radius-full)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
