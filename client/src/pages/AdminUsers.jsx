import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Power,
  Calendar,
  Heart,
  Share2,
  Mail,
  User as UserIcon,
  X
} from 'lucide-react';

export default function AdminUsers() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'user' | 'admin'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  
  // Modals state
  const [selectedUser, setSelectedUser] = useState(null); // for detail view modal
  const [confirmStatusModal, setConfirmStatusModal] = useState(null); // { user, targetStatus }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getAdminUsers();
      setUsers(res.users || []);
    } catch (err) {
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatusConfirm = async () => {
    if (!confirmStatusModal) return;
    const { user: targetUser, targetStatus } = confirmStatusModal;
    
    try {
      setActionLoading(true);
      const res = await api.updateUserStatus(targetUser.id, targetStatus);
      
      // Update local state
      setUsers(prev => prev.map(u => (u.id === targetUser.id ? { ...u, is_active: targetStatus } : u)));
      
      setActionMessage({
        type: 'success',
        text: res.message || `User status successfully updated to ${targetStatus === 1 ? 'Active' : 'Inactive'}.`
      });
      setConfirmStatusModal(null);
    } catch (err) {
      setActionMessage({
        type: 'danger',
        text: err.message || 'Failed to update user status.'
      });
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Filter users based on query and filters
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && u.is_active !== 0) ||
      (statusFilter === 'inactive' && u.is_active === 0);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem' }}>User Management Directory</h1>
            <span className="badge badge-purple" style={{ padding: '0.3rem 0.75rem' }}>
              <ShieldCheck size={14} style={{ marginRight: '0.3rem' }} /> Authorized Access
            </span>
          </div>
          <p className="page-description" style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
            Authorized administrative directory of student and system accounts with safety controls.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div 
          className={`alert-banner alert-${actionMessage.type}`} 
          style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => setActionMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-danger" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <AlertTriangle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.15rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="topbar-search-input"
              placeholder="Filter users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.4rem' }}
            />
          </div>

          {/* Filter Controls */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Filter size={15} /> Role:
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: '#fff', fontSize: '0.85rem' }}
            >
              <option value="all">All Roles</option>
              <option value="user">Students (user)</option>
              <option value="admin">Administrators (admin)</option>
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
              Status:
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', background: '#fff', fontSize: '0.85rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> accounts
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading user directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No accounts matching the selected criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Student / Account</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Role</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Friends</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Registration Date</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const isCurrentAdmin = currentAdmin?.id === u.id;
                  const isOtherAdmin = u.role === 'admin' && !isCurrentAdmin;
                  const isStatusLocked = isCurrentAdmin || isOtherAdmin;
                  const lockReason = isCurrentAdmin ? 'Cannot modify your own account' : isOtherAdmin ? 'Cannot modify administrator accounts' : '';

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background var(--transition-fast)' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <UserAvatar name={u.name} avatar={u.avatar} size={34} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>ID: #{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-primary'}`}>
                          {u.role === 'admin' ? 'Administrator' : 'Student'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${u.is_active === 0 ? 'badge-danger' : 'badge-success'}`}>
                          {u.is_active === 0 ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{u.friend_count ?? 0}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          {/* View details */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedUser(u)}
                            title="View student profile details"
                            style={{ padding: '0.35rem 0.65rem' }}
                          >
                            <Eye size={14} /> Details
                          </button>

                          {/* Toggle Active Status */}
                          <button
                            type="button"
                            className={`btn btn-sm ${u.is_active === 0 ? 'btn-success' : 'btn-danger'}`}
                            onClick={() => {
                              if (!isStatusLocked) {
                                setConfirmStatusModal({
                                  user: u,
                                  targetStatus: u.is_active === 0 ? 1 : 0
                                });
                              }
                            }}
                            disabled={isStatusLocked}
                            title={lockReason || (u.is_active === 0 ? 'Activate Account' : 'Deactivate Account')}
                            style={{ padding: '0.35rem 0.65rem' }}
                          >
                            <Power size={14} />
                            <span>{u.is_active === 0 ? 'Activate' : 'Deactivate'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '1.75rem', position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-icon"
              onClick={() => setSelectedUser(null)}
              style={{ position: 'absolute', right: '1.25rem', top: '1.25rem' }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <UserAvatar name={selectedUser.name} avatar={selectedUser.avatar} size={54} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{selectedUser.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                  <span className={`badge ${selectedUser.role === 'admin' ? 'badge-purple' : 'badge-primary'}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`badge ${selectedUser.is_active === 0 ? 'badge-danger' : 'badge-success'}`}>
                    {selectedUser.is_active === 0 ? 'Inactive' : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.775rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  Bio & Academic Background
                </strong>
                <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.45 }}>
                  {selectedUser.bio || 'No biography provided.'}
                </p>
              </div>

              <div>
                <strong style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.775rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Interests & Topics
                </strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedUser.interests ? (
                    selectedUser.interests.split(',').map((item, idx) => (
                      <span key={idx} className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        {item.trim()}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None listed</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', background: 'var(--bg-muted)', padding: '0.85rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedUser.friend_count ?? 0}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Friends</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedUser.sent_requests_count ?? 0}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sent Req</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{selectedUser.received_requests_count ?? 0}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recv Req</div>
                </div>
              </div>

              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Account ID: #{selectedUser.id}</span>
                <span>Registered: {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Destructive/Status Actions */}
      {confirmStatusModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: confirmStatusModal.targetStatus === 0 ? 'var(--danger-subtle)' : 'var(--success-subtle)',
                color: confirmStatusModal.targetStatus === 0 ? 'var(--danger)' : 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AlertTriangle size={22} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                {confirmStatusModal.targetStatus === 0 ? 'Deactivate User Account' : 'Reactivate User Account'}
              </h3>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              {confirmStatusModal.targetStatus === 0 ? (
                <>
                  Are you sure you want to deactivate <strong>{confirmStatusModal.user.name}</strong>?
                  The student will be blocked from logging in until an administrator reactivates their account.
                </>
              ) : (
                <>
                  Are you sure you want to reactivate <strong>{confirmStatusModal.user.name}</strong>?
                  The student will immediately regain access to their account.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmStatusModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm ${confirmStatusModal.targetStatus === 0 ? 'btn-danger' : 'btn-success'}`}
                onClick={handleToggleStatusConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : (confirmStatusModal.targetStatus === 0 ? 'Confirm Deactivation' : 'Confirm Activation')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
