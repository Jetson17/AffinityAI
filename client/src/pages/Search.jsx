import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserCard from '../components/UserCard';
import { Search as SearchIcon, Users } from 'lucide-react';

export default function Search({ initialQuery = '', setTab, onOpenChatWithUser }) {
  const { showToast, refreshUser } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (searchTerm) => {
    try {
      setLoading(true);
      const res = await api.searchUsers(searchTerm);
      setResults(res.users || []);
    } catch (err) {
      showToast(err.message || 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(initialQuery);
  }, [initialQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleSendRequest = async (targetId) => {
    try {
      await api.sendFriendRequest(targetId);
      showToast('Friend request sent!', 'success');
      performSearch(query);
      refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to send friend request', 'error');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.acceptFriendRequest(requestId);
      showToast('Friend request accepted!', 'success');
      performSearch(query);
      refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.rejectFriendRequest(requestId);
      showToast('Friend request rejected.', 'info');
      performSearch(query);
      refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to reject request', 'error');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await api.cancelFriendRequest(requestId);
      showToast('Friend request cancelled.', 'info');
      performSearch(query);
      refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to cancel request', 'error');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.removeFriend(friendId);
      showToast('Friend removed.', 'info');
      performSearch(query);
      refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to remove friend', 'error');
    }
  };

  const handleOpenChat = (friendId) => {
    if (onOpenChatWithUser) {
      onOpenChatWithUser(friendId);
    }
    setTab('messages');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Find Students & Network</h1>
          <p className="page-description">
            Search registered students by name or email address across the campus network.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or email (e.g. Alice, bob@demo.com, David)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <SearchIcon size={16} /> Search
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Searching directory...
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <Users size={44} className="empty-state-icon" />
          <div className="empty-state-title">No Students Found</div>
          <p style={{ fontSize: '0.875rem' }}>
            No matching users found for "{query}". Try checking the spelling or searching with partial names.
          </p>
        </div>
      ) : (
        <div className="grid-3">
          {results.map(user => (
            <UserCard
              key={user.id}
              user={user}
              relationshipStatus={user.relationshipStatus}
              requestId={user.requestId}
              onSendRequest={handleSendRequest}
              onAcceptRequest={handleAcceptRequest}
              onRejectRequest={handleRejectRequest}
              onCancelRequest={handleCancelRequest}
              onRemoveFriend={handleRemoveFriend}
              onOpenChat={handleOpenChat}
            />
          ))}
        </div>
      )}
    </div>
  );
}
