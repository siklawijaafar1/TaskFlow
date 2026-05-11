import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p style={{ color: 'var(--color-muted)', marginTop: '0.5rem' }}>
        Manage your projects and tasks from the sidebar.
      </p>
    </div>
  );
}
