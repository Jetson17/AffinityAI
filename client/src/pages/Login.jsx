import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Share2, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 50%, #e0e7ff 100%)',
      padding: '1.5rem'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid rgba(255, 255, 255, 0.8)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 16px rgba(79, 70, 229, 0.3)'
          }}>
            <Share2 size={28} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Welcome to AffinityAI</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Intelligent Friend Recommendation System
          </p>
        </div>

        {error && (
          <div className="alert-banner alert-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>Sign In <ArrowRight size={17} /></>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials for Fast Testing */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Sparkles size={14} style={{ color: 'var(--accent)' }} /> Quick Demo Accounts (password: password123)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDemoAccount('alice@demo.com')}
            >
              Alice (CS Sophomore)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDemoAccount('bob@demo.com')}
            >
              Bob (AI Buff)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDemoAccount('charlie@demo.com')}
            >
              Charlie (Designer)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDemoAccount('admin@demo.com')}
            >
              Admin (System Admin)
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}
