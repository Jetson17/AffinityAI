import React from 'react';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Sparkles,
  MessageSquare,
  FlaskConical,
  ShieldCheck,
  User,
  LogOut,
  Share2,
  BarChart3,
  Cpu
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab, isOpen, setIsOpen }) {
  const { user, stats, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Admin dedicated navigation items:
  // 1. Admin Overview
  // 2. User Management
  // 3. Platform Analytics
  // 4. AI/ML Monitoring
  // 5. Algorithm Lab
  // 6. Admin Profile
  // 7. Logout
  const adminNavItems = [
    { id: 'admin', label: 'Admin Overview', icon: ShieldCheck },
    { id: 'admin-users', label: 'User Management', icon: Users },
    { id: 'admin-analytics', label: 'Platform Analytics', icon: BarChart3 },
    { id: 'admin-ml', label: 'AI/ML Monitoring', icon: Cpu },
    { id: 'dsalab', label: 'Algorithm Lab', icon: FlaskConical },
    { id: 'profile', label: 'Admin Profile', icon: User },
    { id: 'logout', label: 'Logout', icon: LogOut, isAction: true }
  ];

  // Student social networking items:
  const studentNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'friends', label: 'My Friends', icon: Users, badge: stats?.friendsCount || 0 },
    { id: 'requests', label: 'Friend Requests', icon: UserPlus, badge: stats?.pendingRequestsCount || 0, badgeColor: 'accent' },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'My Profile', icon: User }
  ];

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  const handleNavClick = (item) => {
    if (item.isAction && item.id === 'logout') {
      logout();
      return;
    }
    setTab(item.id);
    if (setIsOpen) setIsOpen(false); // Close mobile drawer on navigation
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Share2 size={22} />
        </div>
        <div>
          <div className="brand-title">AffinityAI</div>
          <div className="brand-subtitle">
            {isAdmin ? 'ADMINISTRATION PORTAL' : 'AI-POWERED FRIEND DISCOVERY'}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-link-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
              {Boolean(item.badge) && item.badge > 0 && (
                <span className={`nav-badge ${item.badgeColor === 'accent' ? 'accent' : ''}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-quick-profile">
          <UserAvatar name={user?.name} avatar={isAdmin ? undefined : user?.avatar} size={38} />
          <div className="user-quick-details">
            <div className="user-quick-name">{user?.name}</div>
            <div className="user-quick-role">
              {isAdmin ? (
                <span className="badge badge-purple" style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}>
                  Administrator
                </span>
              ) : (
                'Student'
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon"
            onClick={logout}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
