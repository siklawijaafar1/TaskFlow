import { useState, useEffect } from 'react';
import { projectsApi } from '../api/projects';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    projectsApi.list()
      .then(({ projects }) => setProjects(projects))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1>Projects</h1>
      {error && <p style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <ul style={{ marginTop: '1rem', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {projects.map((p) => (
          <li key={p.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1rem' }}>
            <strong>{p.name}</strong>
            {p.description && <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>{p.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
