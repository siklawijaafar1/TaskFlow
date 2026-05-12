import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // organizationSlug removed — backend now resolves user by email globally (Checkpoint 2)
  const [form, setForm]     = useState({ email: '', password: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [error, setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      await login(form);
      setStatus('success');
      navigate('/');
    } catch (err) {
      setStatus('error');
      // R26 — never expose technical details; use server message or generic fallback
      setError(err.message || 'Incorrect email or password.');
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Sign in to TaskFlow</h1>

        {/* Error state (R22) */}
        {status === 'error' && <p className={styles.error}>{error}</p>}

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={status === 'loading'}
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={status === 'loading'}
            autoComplete="current-password"
          />
        </label>

        {/* Loading state (R22) */}
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </button>
        <p>No account? <Link to="/register">Create organization</Link></p>
      </form>
    </div>
  );
}
