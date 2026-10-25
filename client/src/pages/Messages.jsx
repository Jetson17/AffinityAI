import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { Send, MessageSquare, RefreshCw, Lock, Search } from 'lucide-react';

export default function Messages({ initialFriendId = null, setTab }) {
  const { user, showToast } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeFriendId, setActiveFriendId] = useState(initialFriendId);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const messagesContainerRef = useRef(null);
  const prevFriendIdRef = useRef(activeFriendId);
  const prevMessageCountRef = useRef(0);

  const scrollToBottom = (behavior = 'smooth') => {
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior
        });
      }
    });
  };

  // Load conversations list
  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoadingConv(true);
      const res = await api.getConversations();
      setConversations(res.conversations || []);

      // If activeFriendId is not set, select first conversation by default
      if (!activeFriendId && res.conversations && res.conversations.length > 0) {
        setActiveFriendId(res.conversations[0].friend.id);
      }
    } catch (err) {
      if (!silent) showToast(err.message || 'Failed to load conversations', 'error');
    } finally {
      if (!silent) setLoadingConv(false);
    }
  };

  // Load message history with active friend
  const loadMessages = async (friendId, silent = false) => {
    if (!friendId) return;
    try {
      if (!silent) setLoadingChat(true);
      const res = await api.getMessages(friendId);
      setActiveFriend(res.friend);

      // Ensure chronological ordering: oldest at top, newest at bottom
      const fetched = (res.messages || []).slice().sort((a, b) => {
        const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (timeDiff !== 0) return timeDiff;
        return (a.id || 0) - (b.id || 0);
      });

      setMessages(prev => {
        // Keep any pending optimistic messages that haven't yet settled on server
        const pendingOptimistic = prev.filter(m =>
          typeof m.id === 'string' &&
          m.id.startsWith('temp_') &&
          !fetched.some(fm => fm.sender_id === m.sender_id && fm.content === m.content)
        );
        return [...fetched, ...pendingOptimistic];
      });
    } catch (err) {
      if (!silent) showToast(err.message || 'Failed to load chat messages', 'error');
    } finally {
      if (!silent) setLoadingChat(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadConversations();
  }, []);

  // When activeFriendId changes
  useEffect(() => {
    if (activeFriendId) {
      loadMessages(activeFriendId);
    }
  }, [activeFriendId]);

  // Auto-scroll to latest message limited strictly to the messages container
  useEffect(() => {
    const friendChanged = prevFriendIdRef.current !== activeFriendId;
    const countIncreased = messages.length > prevMessageCountRef.current;

    if (friendChanged) {
      // Switched conversations: scroll instantly to bottom once messages load
      if (messages.length > 0) {
        scrollToBottom('auto');
        prevFriendIdRef.current = activeFriendId;
      }
    } else if (countIncreased) {
      // New message sent or received: smooth scroll container to bottom
      scrollToBottom('smooth');
    }

    prevMessageCountRef.current = messages.length;
  }, [messages, activeFriendId]);

  // Polling interval (every 3.5 seconds) for real-time conversation updates
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeFriendId) {
        loadMessages(activeFriendId, true);
      }
      loadConversations(true);
    }, 3500);

    return () => clearInterval(timer);
  }, [activeFriendId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeFriendId || sending) return;

    const content = inputText.trim();
    setInputText('');

    // Optimistic message update for responsive feel
    const optimisticMsg = {
      id: `temp_${Date.now()}`,
      sender_id: user.id,
      receiver_id: activeFriendId,
      content,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom('smooth');

    try {
      setSending(true);
      await api.sendMessage(activeFriendId, content);
      // Reload actual messages to sync IDs and timestamps
      await loadMessages(activeFriendId, true);
      loadConversations(true);
      scrollToBottom('smooth');
    } catch (err) {
      showToast(err.message || 'Failed to send message', 'error');
      // Remove optimistic message if error
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.friend.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.friend.email.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="page-title">Direct Messages</h1>
          <p className="page-description">
            Private 1-on-1 conversations restricted strictly to confirmed friends.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={13} /> End-to-End Authorized
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              loadConversations();
              if (activeFriendId) loadMessages(activeFriendId);
            }}
            title="Refresh chat"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="chat-container">
        {/* Left: Conversations List */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <div style={{ marginBottom: '0.65rem' }}>Friends ({conversations.length})</div>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input
                type="text"
                placeholder="Filter friends..."
                className="form-input"
                style={{ paddingLeft: '2rem', paddingRight: '0.65rem', paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.825rem' }}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="conversation-list">
            {loadingConv && conversations.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading friends...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {conversations.length === 0 ? (
                  <>
                    No confirmed friends yet.
                    <br />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => setTab('recommendations')}
                    >
                      Find Friends
                    </button>
                  </>
                ) : (
                  'No matching friends found.'
                )}
              </div>
            ) : (
              filteredConversations.map(c => {
                const isActive = activeFriendId === c.friend.id;
                const lastSnippet = c.lastMessage ? c.lastMessage.content : 'No messages yet';

                return (
                  <div
                    key={c.friend.id}
                    className={`conversation-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveFriendId(c.friend.id)}
                  >
                    <UserAvatar name={c.friend.name} avatar={c.friend.avatar} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.friend.name}
                        </div>
                        {c.lastMessage && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                            {new Date(c.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: isActive ? 'var(--primary-text)' : 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '0.15rem'
                      }}>
                        {lastSnippet}
                      </div>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Pane */}
        <div className="chat-main">
          {activeFriendId && activeFriend ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <UserAvatar name={activeFriend.name} avatar={activeFriend.avatar} size={42} />
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{activeFriend.name}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeFriend.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                    Active Friend
                  </span>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="messages-scroll" ref={messagesContainerRef}>
                {loadingChat ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <MessageSquare size={36} style={{ color: 'var(--text-subtle)', marginBottom: '0.5rem' }} />
                    <p style={{ fontWeight: 600 }}>No messages exchanged yet.</p>
                    <p style={{ fontSize: '0.825rem', marginTop: '0.25rem' }}>
                      Say hello to {activeFriend.name} to kick off the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isSender = msg.sender_id === user.id;
                    const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`message-bubble ${isSender ? 'sent' : 'received'}`}
                      >
                        <div>{msg.content}</div>
                        <div className="message-meta">
                          {timeFormatted}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Bar */}
              <form className="chat-input-bar" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Write a message to ${activeFriend.name}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={sending}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!inputText.trim() || sending}
                >
                  <Send size={16} /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state" style={{ margin: 'auto' }}>
              <MessageSquare size={48} className="empty-state-icon" />
              <div className="empty-state-title">Select a Friend to Start Messaging</div>
              <p style={{ fontSize: '0.875rem' }}>
                Pick any confirmed friend from the list on the left to view message history and chat.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
