import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import {
  ShieldCheck,
  Users,
  MessageSquare,
  Share2,
  Activity,
  AlertTriangle,
  Cpu,
  BarChart3,
  Clock,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  FlaskConical,
  Sparkles
} from 'lucide-react';

export default function AdminOverview({ setTab }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      setError('Access Restricted. You must be an administrator to view this portal.');
      setLoading(false);
      return;
    }

    const loadAdminData = async () => {
      try {
        setLoading(true);
        const [statsRes, usersRes, mlRes] = await Promise.all([
          api.getAdminStats(),
          api.getAdminUsers(),
          api.getAdminMLMonitoring().catch(() => null)
        ]);
        setStats(statsRes.stats);
        setUsersList(usersRes.users || []);
        if (mlRes) setMlData(mlRes);
      } catch (err) {
        setError(err.message || 'Failed to load administrative overview metrics.');
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [user]);

  if (error) {
    return (
      <div className="page-container">
        <div className="alert-banner alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <AlertTriangle size={22} />
          <div>
            <div style={{ fontWeight: 600 }}>Access Error</div>
            <div style={{ fontSize: '0.9rem' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const recentUsers = usersList.slice(0, 5);

  return (
    <div className="page-container">
      {/* Required Heading & Subtitle */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.85rem' }}>
              AffinityAI Administration Dashboard
            </h1>
            <span className="badge badge-purple" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} /> System Administrator
            </span>
          </div>
          <p className="page-description" style={{ marginTop: '0.4rem', fontSize: '0.975rem', color: 'var(--text-muted)' }}>
            Monitor platform activity, manage student accounts, and inspect recommendation intelligence.
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
          <div style={{ fontWeight: 500 }}>Loading administrative statistics...</div>
        </div>
      ) : (
        <>
          {/* Recommendation Engine Status Bar */}
          <div className="card" style={{ marginBottom: '1.75rem', padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #ffffff 0%, var(--primary-subtle) 100%)', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: stats?.activeModel?.isModelReady ? 'var(--success-subtle)' : 'var(--warning-subtle)',
                  color: stats?.activeModel?.isModelReady ? 'var(--success)' : 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Cpu size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Recommendation Intelligence Engine
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span>{mlData?.modelName || stats?.activeModel?.mode?.toUpperCase() + ' Engine'}</span>
                    <span className={`badge ${stats?.activeModel?.isModelReady ? 'badge-success' : 'badge-warning'}`}>
                      {stats?.activeModel?.isModelReady ? '● ML Active' : '● Heuristic Fallback'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTab && setTab('admin-ml')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <Sparkles size={15} style={{ color: 'var(--accent)' }} />
                  <span>Inspect ML Pipeline</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setTab && setTab('dsalab')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <FlaskConical size={15} />
                  <span>Open Algorithm Lab</span>
                </button>
              </div>
            </div>
          </div>

          {/* Core Platform Statistics Cards */}
          <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
            {/* Total Registered Accounts */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.1 }}>{stats?.totalUsers || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
                    Registered Accounts
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                <span>Students: <strong>{stats?.totalStudents || 0}</strong></span>
                <span>Admins: <strong>{stats?.totalAdmins || 0}</strong></span>
              </div>
            </div>

            {/* Confirmed Friendships */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.1 }}>{stats?.totalFriendships || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
                    Confirmed Friendships
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                <span>Avg Degree: <strong>{stats?.avgDegree || '0.0'}</strong></span>
                <span>Density: <strong>{((stats?.graphDensity || 0) * 100).toFixed(1)}%</strong></span>
              </div>
            </div>

            {/* Pending Friend Requests */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--warning-subtle)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.1 }}>{stats?.pendingRequests || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
                    Pending Friend Requests
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                <span>Accepted: <strong>{stats?.acceptedRequests || 0}</strong></span>
                <span>Rejected: <strong>{stats?.rejectedRequests || 0}</strong></span>
              </div>
            </div>

            {/* Total Registered Messages (Counts only, zero message contents) */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--success-subtle)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.1 }}>{stats?.totalMessages || 0}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
                    Registered Messages
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                <span>Privacy: <strong>Protected</strong></span>
                <span>Content: <strong>Not Exposed</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Navigation Cards */}
          <div className="grid-3" style={{ marginBottom: '1.75rem' }}>
            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              onClick={() => setTab && setTab('admin-users')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>User Management</h3>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--text-subtle)' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Audit registered student profiles, verify account status, inspect social degrees, and manage safe account activations.
              </p>
            </div>

            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              onClick={() => setTab && setTab('admin-analytics')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Platform Analytics</h3>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--text-subtle)' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Analyze real student degree distributions, academic topic affinity clusters, request conversion rates, and messaging volume.
              </p>
            </div>

            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              onClick={() => setTab && setTab('admin-ml')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--success-subtle)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={18} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>AI/ML Monitoring</h3>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--text-subtle)' }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Inspect verified model availability, actual stored evaluation metrics (AUC, F1, Top-K precision), and the 7-feature pipeline.
              </p>
            </div>
          </div>

          {/* User Directory Preview */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <UserCheck size={20} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Recent User Registrations</h2>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTab && setTab('admin-users')}
              >
                View Full Directory ({usersList.length})
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Student / Account</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Role</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Friends</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <UserAvatar name={u.name} avatar={u.avatar} size={32} />
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-primary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${u.is_active === 0 ? 'badge-danger' : 'badge-success'}`}>
                          {u.is_active === 0 ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{u.friend_count ?? 0}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
