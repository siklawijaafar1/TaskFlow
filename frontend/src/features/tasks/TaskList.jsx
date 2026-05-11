import TaskCard from './TaskCard';
import styles from './TaskList.module.css';

/**
 * TaskList — gère les trois états obligatoires (R22).
 *
 * Props:
 *  - tasks   {Task[]}   Tableau de tâches (état succès)
 *  - loading {boolean}  true pendant le fetch
 *  - error   {string}   Message d'erreur (état erreur)
 *  - onCardClick {fn?}  Callback optionnel (task) => void
 */
export default function TaskList({ tasks = [], loading, error, onCardClick }) {
  /* ── État : chargement ── */
  if (loading) {
    return (
      <section
        className={styles.list}
        aria-label="Chargement des tâches"
        aria-busy="true"
      >
        {[1, 2, 3].map((n) => (
          <div key={n} className={styles.skeleton} aria-hidden="true">
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonMeta} />
          </div>
        ))}
      </section>
    );
  }

  /* ── État : erreur ── */
  if (error) {
    return (
      <div className={styles.error} role="alert" aria-live="polite">
        <span className={styles.errorIcon} aria-hidden="true">⚠</span>
        <p>{error}</p>
      </div>
    );
  }

  /* ── État : liste vide ── */
  if (tasks.length === 0) {
    return (
      <div className={styles.empty} role="status" aria-live="polite">
        <p className={styles.emptyText}>Aucune tâche pour le moment.</p>
        <p className={styles.emptyHint}>Créez votre première tâche avec le bouton ci-dessus.</p>
      </div>
    );
  }

  /* ── État : succès ── */
  return (
    <ul
      className={styles.list}
      aria-label={`${tasks.length} tâche${tasks.length > 1 ? 's' : ''}`}
    >
      {tasks.map((task) => (
        <li key={task.id} className={styles.item}>
          <TaskCard
            task={task}
            onClick={onCardClick ? () => onCardClick(task) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
