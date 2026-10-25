import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import { Search, Menu, Sparkles, MessageSquare, ShieldCheck } from 'lucide-react';

export default function Topbar({ onToggleSidebar, onSearch, currentTab, setTab }) {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const isAdmin = user?.role === 'admin';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchInput.trim());
    }
    if (setTab) {
      if (isAdmin) {
        if (currentTab !== 'admin-users') setTab('admin-users');
      } else {
        if (currentTab !== 'search') setTab('search');
      }
    }
  };

  return (
    <header className="app-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={onToggleSidebar}
          style={{ display: 'inline-flex' }}
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <form className="topbar-search-form" onSubmit={handleSearchSubmit}>
          <Search size={17} className="search-icon-inside" />
          <input
            type="text"
            className="topbar-search-input"
            placeholder={isAdmin ? "Search user directory by name or email..." : "Search students by name or email..."}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
          />
        </form>
      </div>

      <div className="topbar-actions">
        {/* Administrator specific badge and quick links */}
        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-purple" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} /> Administrator
            </span>
          </div>
        ) : (
          /* Student specific social quick actions */
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTab('recommendations')}
              title="View Friend Recommendations"
            >
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ display: 'inline' }}>Suggestions</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTab('messages')}
              title="Open Messages"
            >
              <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ display: 'inline' }}>Chat</span>
            </button>
          </>
        )}

        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}
          onClick={() => setTab('profile')}
          title="Go to Profile"
        >
          <UserAvatar name={user?.name} avatar={isAdmin ? undefined : user?.avatar} size={38} />
        </div>
      </div>
    </header>
  );
}
