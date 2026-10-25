import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { Mail, Calendar, Shield, Save, Tag } from 'lucide-react';

export default function Profile() {
  const { user, stats, updateProfile } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [interests, setInterests] = useState(user?.interests || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setInterests(user.interests || '');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      // For administrators, do not send or update student-specific interest fields
      const payload = isAdmin
        ? { name: name.trim(), bio: bio.trim() }
        : { name: name.trim(), bio: bio.trim(), interests: interests.trim() };
      await updateProfile(payload);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'October 2026';

  const interestList = (user?.interests || '')
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);

  return (
    <div className="page-container" style={{ maxWidth: '860px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? 'Admin Profile' : 'User Profile'}</h1>
          <p className="page-description">
            {isAdmin
              ? 'Manage your AffinityAI platform administration account.'
              : 'Manage your personal profile details and academic discovery preferences.'}
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        {isAdmin ? (
          /* Administrator Profile Summary Card */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <UserAvatar name={user?.name} size={76} />
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{user?.name}</h2>
                  <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Shield size={12} /> Administrator
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={14} /> {user?.email}
                </p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {user?.bio || 'Manage your AffinityAI platform administration account.'}
                </p>
              </div>
            </div>

            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <Calendar size={16} style={{ color: 'var(--primary)' }} />
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Member Since</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{memberSince}</div>
              </div>
            </div>
          </div>
        ) : (
          /* Student Profile Summary Card (Unchanged) */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <UserAvatar name={user?.name} avatar={user?.avatar} size={76} />
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{user?.name}</h2>
                  <span className="badge badge-primary">Student</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>{user?.email}</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>{user?.bio || 'No bio provided yet.'}</p>
                {interestList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem' }}>
                    {interestList.map(tag => (
                      <span key={tag} className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        <Tag size={11} style={{ marginRight: '3px' }} /> {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Confirmed Friends</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>{stats?.friendsCount || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Requests</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent)' }}>{stats?.pendingRequestsCount || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Member Since</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>{memberSince}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Form */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {isAdmin ? 'Edit Administrator Profile' : 'Edit Profile Information'}
          </h3>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Full Display Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Read-Only)</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
            />
            <small style={{ color: 'var(--text-subtle)', marginTop: '0.3rem', display: 'block' }}>
              Email address serves as your unique login identifier.
            </small>
          </div>

          {/* Student-only academic interests */}
          {!isAdmin && (
            <div className="form-group">
              <label className="form-label">Academic Interests & Focus Areas (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Graph Theory, Machine Learning, Web Development, Algorithms"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
              />
              <small style={{ color: 'var(--text-subtle)', marginTop: '0.3rem', display: 'block' }}>
                Used by the hybrid ML recommender to discover classmates with matching research interests.
              </small>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              {isAdmin ? 'Administrator Description / Bio' : 'Bio'}
            </label>
            <textarea
              className="form-textarea"
              placeholder={
                isAdmin
                  ? 'Manage your AffinityAI platform administration account.'
                  : 'Tell other students about your background, university branch, or current projects...'
              }
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={isAdmin ? 3 : 4}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

