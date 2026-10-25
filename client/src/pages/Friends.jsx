import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserCard from '../components/UserCard';
import { Users, UserPlus, Send, RefreshCw } from 'lucide-react';

export default function Friends({ setTab, onOpenChatWithUser }) {
  const { showToast, refreshUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('friends'); // 'friends' | 'incoming' | 'outgoing'
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [friendsRes, requestsRes] = await Promise.all([
        api.getFriends(),
        api.getRequests()
      ]);
      setFriends(friendsRes.friends || []);
      setIncomingRequests(requestsRes.incoming || []);
      setOutgoingRequests(requestsRes.outgoing || []);
      await refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to load friends data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAccept = async (requestId) => {
    try {
      await api.acceptFriendRequest(requestId);
      showToast('Friend request accepted! You can now chat.', 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await api.rejectFriendRequest(requestId);
      showToast('Friend request rejected.', 'info');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to reject request', 'error');
    }
  };

  const handleCancel = async (requestId) => {
    try {
      await api.cancelFriendRequest(requestId);
      showToast('Friend request cancelled.', 'info');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to cancel request', 'error');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.removeFriend(friendId);
      showToast('Friend removed from your network.', 'info');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to remove friend', 'error');
    }
  };

  const handleChat = (friendId) => {
    if (onOpenChatWithUser) {
      onOpenChatWithUser(friendId);
    }
    setTab('messages');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Friend Management</h1>
          <p className="page-description">
            Manage your network connections, pending requests, and confirmed relationships.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadData}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeSubTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('friends')}
        >
          <Users size={18} />
          My Friends ({friends.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeSubTab === 'incoming' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('incoming')}
        >
          <UserPlus size={18} />
          Incoming Requests ({incomingRequests.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeSubTab === 'outgoing' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('outgoing')}
        >
          <Send size={18} />
          Sent Requests ({outgoingRequests.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading network relationships...
        </div>
      ) : (
        <>
          {/* TAB 1: CONFIRMED FRIENDS */}
          {activeSubTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="empty-state">
                  <Users size={44} className="empty-state-icon" />
                  <div className="empty-state-title">No Confirmed Friends Yet</div>
                  <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                    Grow your network! Check out recommendations or search for fellow classmates.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setTab('recommendations')}
                  >
                    View Recommendations
                  </button>
                </div>
              ) : (
                <div className="grid-3">
                  {friends.map(friend => (
                    <UserCard
                      key={friend.id}
                      user={friend}
                      relationshipStatus="friends"
                      onOpenChat={handleChat}
                      onRemoveFriend={handleRemoveFriend}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INCOMING REQUESTS */}
          {activeSubTab === 'incoming' && (
            <div>
              {incomingRequests.length === 0 ? (
                <div className="empty-state">
                  <UserPlus size={44} className="empty-state-icon" />
                  <div className="empty-state-title">No Incoming Requests</div>
                  <p style={{ fontSize: '0.875rem' }}>
                    When another student sends you a friend request, it will appear here for your approval.
                  </p>
                </div>
              ) : (
                <div className="grid-3">
                  {incomingRequests.map(req => (
                    <UserCard
                      key={req.id}
                      user={{
                        id: req.sender_id,
                        name: req.sender_name,
                        email: req.sender_email,
                        bio: req.sender_bio,
                        avatar: req.sender_avatar
                      }}
                      relationshipStatus="pending_received"
                      requestId={req.id}
                      onAcceptRequest={handleAccept}
                      onRejectRequest={handleReject}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OUTGOING REQUESTS */}
          {activeSubTab === 'outgoing' && (
            <div>
              {outgoingRequests.length === 0 ? (
                <div className="empty-state">
                  <Send size={44} className="empty-state-icon" />
                  <div className="empty-state-title">No Outgoing Requests</div>
                  <p style={{ fontSize: '0.875rem' }}>
                    You have no pending outgoing friend requests.
                  </p>
                </div>
              ) : (
                <div className="grid-3">
                  {outgoingRequests.map(req => (
                    <UserCard
                      key={req.id}
                      user={{
                        id: req.receiver_id,
                        name: req.receiver_name,
                        email: req.receiver_email,
                        bio: req.receiver_bio,
                        avatar: req.receiver_avatar
                      }}
                      relationshipStatus="pending_sent"
                      requestId={req.id}
                      onCancelRequest={handleCancel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
