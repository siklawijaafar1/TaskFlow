import { useState, useEffect } from 'react';
import { useAuth }      from '../context/AuthContext';
import { tasksApi }     from '../api/tasks';
import { projectsApi }  from '../api/projects';
import TaskCard         from '../features/tasks/TaskCard';

/* ── helpers ───────────────────────────────────────────────── */
const STATUS_LABELS = {
  todo:        'À faire',
  in_progress: 'En cours',
  review:      'En révision',
  done:        'Terminé',
};

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--color-surface, #fff)',
      border: `1px solid var(--color-border, #e5e7eb)`,
      borderTop: `3px solid ${color}`,
      borderRadius: '8px',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
    }}>
      <span style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted, #6b7280)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ── composant principal ────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();

  const [tasks,    setTasks]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    Promise.all([
      tasksApi.list(),
      projectsApi.list(),
    ])
      .then(([{ tasks: t }, { projects: p }]) => {
        setTasks(t);
        setProjects(p);
      })
      .catch(() => setError('Impossible de charger les données.'))
      .finally(() => setLoading(false));
  }, []);

  /* ── statistiques ── */
  const total       = tasks.length;
  const todo        = tasks.filter((t) => t.status === 'todo').length;
  const inProgress  = tasks.filter((t) => t.status === 'in_progress').length;
  const done        = tasks.filter((t) => t.status === 'done').length;
  const urgent      = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

  /* ── tâches récentes (5 dernières) ── */
  const recent = [...tasks]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  /* ── tâches urgentes non terminées ── */
  const urgentTasks = tasks
    .filter((t) => t.priority === 'urgent' && t.status !== 'done')
    .slice(0, 3);

  /* ────────────────────────────────── */
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* En-tête */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
          Bonjour, {user?.name} 👋
        </h1>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--color-muted, #6b7280)', fontSize: '0.9375rem' }}>
          Voici un résumé de votre activité.
        </p>
      </div>

      {/* Chargement */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[1,2,3,4].map((n) => (
            <div key={n} style={{ height: '90px', background: '#f3f4f6', borderRadius: '8px', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div role="alert" style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Statistiques ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Total tâches"   value={total}      color="#4f46e5" />
            <StatCard label="À faire"        value={todo}       color="#6b7280" />
            <StatCard label="En cours"       value={inProgress} color="#2563eb" />
            <StatCard label="Terminées"      value={done}       color="#16a34a" />
            {urgent > 0 && <StatCard label="Urgentes"    value={urgent}     color="#dc2626" />}
            <StatCard label="Projets"        value={projects.length} color="#d97706" />
          </div>

          {/* ── Tâches urgentes ── */}
          {urgentTasks.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🔴</span> Tâches urgentes
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {urgentTasks.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* ── Tâches récentes ── */}
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              🕐 Tâches récentes
            </h2>
            {recent.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-surface,#fff)', border: '1px solid var(--color-border,#e5e7eb)', borderRadius: '8px', color: 'var(--color-muted,#6b7280)' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Aucune tâche pour le moment.</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                  Allez dans <strong>Tâches</strong> pour créer votre première tâche.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '0.75rem' }}>
                {recent.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>

          {/* ── Répartition par statut ── */}
          {total > 0 && (
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                📊 Répartition par statut
              </h2>
              <div style={{ background: 'var(--color-surface,#fff)', border: '1px solid var(--color-border,#e5e7eb)', borderRadius: '8px', overflow: 'hidden' }}>
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const count = tasks.filter((t) => t.status === key).length;
                  const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colors = { todo: '#6b7280', in_progress: '#2563eb', review: '#d97706', done: '#16a34a' };
                  return (
                    <div key={key} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border,#e5e7eb)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: '100px', fontSize: '0.875rem', fontWeight: 500, color: colors[key] }}>{label}</span>
                      <div style={{ flex: 1, background: '#f3f4f6', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: colors[key], borderRadius: '999px', transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
