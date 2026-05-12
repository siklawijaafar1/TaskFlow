import { useState, useEffect } from 'react';
import { projectsApi } from '../api/projects';

export default function ProjectsPage() {
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // ── Formulaire ──────────────────────────────────────────────
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [creating, setCreating]   = useState(false);

  // ── Chargement initial ──────────────────────────────────────
  useEffect(() => {
    projectsApi.list()
      .then(({ projects }) => setProjects(projects))
      .catch(() => setError('Impossible de charger les projets.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Création ────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Le nom du projet est requis.');
      return;
    }
    setCreating(true);
    try {
      const { project } = await projectsApi.create({
        name:        form.name.trim(),
        description: form.description.trim() || undefined,
      });
      setProjects((prev) => [project, ...prev]);
      setForm({ name: '', description: '' });
      setShowForm(false);
    } catch {
      setFormError('Erreur lors de la création. Veuillez réessayer.');
    } finally {
      setCreating(false);
    }
  }

  // ── Rendu ───────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Projets</h1>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(''); }}
          style={{
            padding: '0.5rem 1.25rem',
            minHeight: '44px',
            background: 'var(--color-primary, #4f46e5)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {showForm ? 'Annuler' : '+ Nouveau projet'}
        </button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, #e5e7eb)',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Créer un projet</h2>

          {formError && (
            <div role="alert" style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.875rem' }}>
              {formError}
            </div>
          )}

          {/* Nom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="proj-name" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Nom <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="proj-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex. : Refonte du site"
              disabled={creating}
              autoFocus
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="proj-desc" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              Description <span style={{ color: 'var(--color-muted, #6b7280)', fontWeight: 400 }}>(optionnel)</span>
            </label>
            <textarea
              id="proj-desc"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Décrivez l'objectif du projet…"
              rows={3}
              disabled={creating}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(''); }}
              disabled={creating}
              style={{ padding: '0.5rem 1.25rem', minHeight: '44px', borderRadius: '6px', border: '1px solid var(--color-border, #e5e7eb)', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              style={{
                padding: '0.5rem 1.25rem',
                minHeight: '44px',
                background: 'var(--color-primary, #4f46e5)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.65 : 1,
                fontSize: '0.875rem',
              }}
            >
              {creating ? 'Création…' : 'Créer le projet'}
            </button>
          </div>
        </form>
      )}

      {/* État chargement */}
      {loading && (
        <p style={{ color: 'var(--color-muted, #6b7280)' }}>Chargement…</p>
      )}

      {/* État erreur */}
      {error && (
        <div role="alert" style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Liste vide */}
      {!loading && !error && projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-muted, #6b7280)' }}>
          <p style={{ fontSize: '1rem', fontWeight: 500 }}>Aucun projet pour le moment.</p>
          <p style={{ fontSize: '0.875rem' }}>Créez votre premier projet avec le bouton ci-dessus.</p>
        </div>
      )}

      {/* Liste des projets */}
      {!loading && projects.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {projects.map((p) => (
            <li
              key={p.id}
              style={{
                background: 'var(--color-surface, #fff)',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '0.9375rem' }}>{p.name}</strong>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  background: p.status === 'active' ? '#f0fdf4' : '#f3f4f6',
                  color:      p.status === 'active' ? '#16a34a' : '#6b7280',
                  border:     `1px solid ${p.status === 'active' ? '#bbf7d0' : '#d1d5db'}`,
                  fontWeight: 600,
                }}>
                  {p.status === 'active' ? 'Actif' : 'Archivé'}
                </span>
              </div>
              {p.description && (
                <p style={{ margin: 0, color: 'var(--color-muted, #6b7280)', fontSize: '0.875rem' }}>{p.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
