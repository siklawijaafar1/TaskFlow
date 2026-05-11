import { useState, useEffect, useCallback } from 'react';
import { tasksApi }    from '../api/tasks';
import { projectsApi } from '../api/projects';
import TaskList        from '../features/tasks/TaskList';
import TaskCreate      from '../features/tasks/TaskCreate';
import styles          from './TasksPage.module.css';

/**
 * TasksPage — page principale des tâches.
 *
 * Responsabilités :
 *  - Orchestrer le fetch des tâches ET des projets (pour le formulaire)
 *  - Gérer les trois états loading / success / error (R22)
 *  - Déléguer l'affichage à TaskList et TaskCreate (R25)
 *  - Ne fait aucune requête fetch() directe — tout passe par src/api/ (R05)
 */
export default function TasksPage() {
  const [tasks,    setTasks]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);

  /* ── Chargement des tâches ── */
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { tasks: data } = await tasksApi.list();
      setTasks(data);
    } catch {
      setError('Impossible de charger les tâches. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Chargement parallèle : tâches + projets (pour le select du formulaire)
    loadTasks();
    projectsApi
      .list()
      .then(({ projects: data }) => setProjects(data))
      .catch(() => { /* Projets non critiques pour l'affichage */ });
  }, [loadTasks]);

  /* ── Callback : nouvelle tâche créée ── */
  function handleCreated(newTask) {
    setTasks((prev) => [newTask, ...prev]);
    setShowForm(false);
  }

  /* ────────────────────────────────────── */
  return (
    <div className={styles.page}>

      {/* ── En-tête ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Tâches</h1>
          {!loading && !error && (
            <p className={styles.count} aria-live="polite">
              {tasks.length} tâche{tasks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <button
          type="button"
          className={`${styles.toggleBtn} ${showForm ? styles.toggleBtnActive : ''}`}
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          aria-controls="task-create-panel"
        >
          {showForm ? '✕ Annuler' : '+ Nouvelle tâche'}
        </button>
      </header>

      {/* ── Formulaire de création (panel) ── */}
      {showForm && (
        <section
          id="task-create-panel"
          className={styles.createPanel}
          aria-label="Formulaire de création de tâche"
        >
          <h2 className={styles.panelTitle}>Nouvelle tâche</h2>
          <TaskCreate
            projects={projects}
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        </section>
      )}

      {/* ── Liste des tâches ── */}
      <TaskList
        tasks={tasks}
        loading={loading}
        error={error}
      />
    </div>
  );
}
