import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import Recommendations from './pages/Recommendations';
import Messages from './pages/Messages';
import DsaLab from './pages/DsaLab';
import Profile from './pages/Profile';
import AdminOverview from './pages/AdminOverview';
import AdminUsers from './pages/AdminUsers';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminML from './pages/AdminML';
import Search from './pages/Search';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast from './components/Toast';

const ADMIN_TABS = ['admin', 'admin-users', 'admin-analytics', 'admin-ml', 'dsalab', 'profile'];
const STUDENT_TABS = ['dashboard', 'friends', 'requests', 'recommendations', 'messages', 'profile', 'search'];

function getTabFromLocation(role) {
  if (typeof window === 'undefined') return role === 'admin' ? 'admin' : 'dashboard';
  const path = window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase();
  const hash = window.location.hash.replace(/^#[/]?/, '').split('/')[0].toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const queryTab = searchParams.get('tab')?.toLowerCase();

  const candidate = queryTab || hash || path;
  if (!candidate || candidate === '') {
    return role === 'admin' ? 'admin' : 'dashboard';
  }

  if (candidate === 'dsalab' || candidate === 'algorithm-lab' || candidate === 'dsa-lab' || candidate === 'dsa') {
    return 'dsalab';
  }

  // Handle admin route aliases
  if (candidate === 'admin-users' || candidate === 'users-management' || candidate === 'adminusers') {
    return 'admin-users';
  }
  if (candidate === 'admin-analytics' || candidate === 'analytics' || candidate === 'platform-analytics') {
    return 'admin-analytics';
  }
  if (candidate === 'admin-ml' || candidate === 'ml' || candidate === 'ai-monitoring' || candidate === 'ml-monitoring') {
    return 'admin-ml';
  }
  if (candidate === 'admin' || candidate === 'admin-overview' || candidate === 'overview') {
    return 'admin';
  }

  const validTabs = ['dashboard', 'friends', 'requests', 'recommendations', 'messages', 'profile', 'search'];
  if (validTabs.includes(candidate)) {
    return candidate;
  }
  return role === 'admin' ? 'admin' : 'dashboard';
}

export default function App() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [currentTab, setCurrentTab] = useState(() => getTabFromLocation(user?.role));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatFriendId, setSelectedChatFriendId] = useState(null);

  const isAdmin = user?.role === 'admin';

  // Role-based route enforcement and redirection
  useEffect(() => {
    if (!user) return;

    if (isAdmin) {
      // If admin enters a student-only route or root, redirect to 'admin'
      if (!ADMIN_TABS.includes(currentTab)) {
        handleSetTab('admin');
      }
    } else {
      // If student enters an admin-only route, redirect to 'dashboard'
      if (!STUDENT_TABS.includes(currentTab)) {
        handleSetTab('dashboard');
      }
    }
  }, [user, isAdmin]);

  // Sync tab with URL navigation and history popstate/hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const tab = getTabFromLocation(user?.role);
      if (isAdmin && !ADMIN_TABS.includes(tab)) {
        handleSetTab('admin');
      } else if (!isAdmin && !STUDENT_TABS.includes(tab)) {
        handleSetTab('dashboard');
      } else {
        setCurrentTab(tab);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [user, isAdmin]);

  const handleSetTab = (tab) => {
    // Prevent cross-role navigation
    if (isAdmin && !ADMIN_TABS.includes(tab)) {
      tab = 'admin';
    } else if (!isAdmin && user && !STUDENT_TABS.includes(tab)) {
      tab = 'dashboard';
    }

    setCurrentTab(tab);
    const newPath = tab === 'dashboard' ? '/' : `/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        fontFamily: 'var(--font-heading)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '44px',
            height: '44px',
            border: '4px solid var(--border-light)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Initializing AffinityAI...</h3>
        </div>
      </div>
    );
  }

  // Unauthenticated view
  if (!user) {
    return (
      <>
        {authMode === 'login' ? (
          <Login onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <Register onSwitchToLogin={() => setAuthMode('login')} />
        )}
        <Toast />
      </>
    );
  }

  const handleOpenChatWithUser = (friendId) => {
    if (isAdmin) return; // Admins do not participate in student chat
    setSelectedChatFriendId(friendId);
    handleSetTab('messages');
  };

  const handleSearchTrigger = (query) => {
    setSearchQuery(query);
    if (isAdmin) {
      handleSetTab('admin-users');
    } else {
      handleSetTab('search');
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setTab={handleSetTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <main className="app-main">
        <Topbar
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
          onSearch={handleSearchTrigger}
          currentTab={currentTab}
          setTab={handleSetTab}
        />

        {/* Admin Pages */}
        {isAdmin && (
          <>
            {currentTab === 'admin' && <AdminOverview setTab={handleSetTab} />}
            {currentTab === 'admin-users' && <AdminUsers />}
            {currentTab === 'admin-analytics' && <AdminAnalytics />}
            {currentTab === 'admin-ml' && <AdminML />}
            {currentTab === 'dsalab' && <DsaLab setTab={handleSetTab} />}
            {currentTab === 'profile' && <Profile />}
          </>
        )}

        {/* Student Pages */}
        {!isAdmin && (
          <>
            {currentTab === 'dashboard' && <Dashboard setTab={handleSetTab} />}
            {currentTab === 'friends' && <Friends setTab={handleSetTab} onOpenChatWithUser={handleOpenChatWithUser} />}
            {currentTab === 'requests' && <Friends setTab={handleSetTab} onOpenChatWithUser={handleOpenChatWithUser} />}
            {currentTab === 'recommendations' && <Recommendations setTab={handleSetTab} />}
            {currentTab === 'messages' && (
              <Messages
                key={selectedChatFriendId || 'default_messages'}
                initialFriendId={selectedChatFriendId}
                setTab={handleSetTab}
              />
            )}
            {currentTab === 'profile' && <Profile />}
            {currentTab === 'search' && (
              <Search
                key={searchQuery}
                initialQuery={searchQuery}
                setTab={handleSetTab}
                onOpenChatWithUser={handleOpenChatWithUser}
              />
            )}
          </>
        )}
      </main>

      <Toast />
    </div>
  );
}
