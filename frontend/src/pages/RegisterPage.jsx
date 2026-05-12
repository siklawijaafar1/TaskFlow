import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AuthPage.module.css';

// Password must be ≥12 chars, 1 uppercase, 1 digit, 1 special char (mirrors Joi schema R30)
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ orgName: '', name: '', email: '', password: '' });
  const [status, setStatus]   = useState('idle'); // idle | loading | success | error
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    // Client-side pre-validation (R24 — server is the source of truth)
    if (!PASSWORD_PATTERN.test(form.password)) {
      setStatus('error');
      setError('Password must be at least 12 characters and include an uppercase letter, a number, and a special character.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await register(form);
      setStatus('success');
      navigate('/');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Registration failed. Please try again.');
    }
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Create your organization</h1>

        {/* Error state (R22) */}
        {status === 'error' && <p className={styles.error}>{error}</p>}

        <label>
          Organization name
          <input
            value={form.orgName}
            onChange={(e) => setForm({ ...form, orgName: e.target.value })}
            required
            disabled={status === 'loading'}
          />
        </label>
        <label>
          Your name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={status === 'loading'}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={status === 'loading'}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={12}
            disabled={status === 'loading'}
          />
          <small style={{ color: '#6b7280' }}>
            Min. 12 characters · 1 uppercase · 1 number · 1 special character
          </small>
        </label>

        {/* Loading state (R22) */}
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating account…' : 'Create account'}
        </button>
        <p>Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
