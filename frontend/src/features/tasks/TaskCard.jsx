import styles from './TaskCard.module.css';

/* ------------------------------------------------------------------ */
/* Labels lisibles pour les valeurs métier                             */
/* ------------------------------------------------------------------ */
const STATUS_LABELS = {
  todo:        'À faire',
  in_progress: 'En cours',
  review:      'En révision',
  done:        'Terminé',
};

const PRIORITY_LABELS = {
  low:    'Basse',
  medium: 'Moyenne',
  high:   'Haute',
  urgent: 'Urgente',
};

/**
 * TaskCard — carte affichant le résumé d'une tâche.
 *
 * Props:
 *  - task {object}  Objet tâche complet (id, title, status, priority, …)
 *  - onClick {fn?}  Callback optionnel sur clic de la carte
 */
export default function TaskCard({ task, onClick }) {
  const statusLabel   = STATUS_LABELS[task.status]   ?? task.status;
  const priorityLabel = PRIORITY_LABELS[task.priority] ?? task.priority;

  const isOverdue =
    task.due_date &&
    task.status !== 'done' &&
    new Date(task.due_date) < new Date();

  return (
    <article
      className={`${styles.card} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      /* Rôle button si cliquable pour accessibilité clavier */
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`Tâche : ${task.title}`}
    >
      {/* ── En-tête ── */}
      <div className={styles.header}>
        <h3 className={styles.title}>{task.title}</h3>

        <div className={styles.badges} aria-label="Étiquettes">
          {/* Badge statut */}
          <span
            className={`${styles.badge} ${styles[`status_${task.status}`]}`}
            role="status"
            aria-label={`Statut : ${statusLabel}`}
          >
            {statusLabel}
          </span>

          {/* Badge priorité */}
          {task.priority && (
            <span
              className={`${styles.badge} ${styles[`priority_${task.priority}`]}`}
              aria-label={`Priorité : ${priorityLabel}`}
            >
              {priorityLabel}
            </span>
          )}
        </div>
      </div>

      {/* ── Description (tronquée) ── */}
      {task.description && (
        <p className={styles.description}>{task.description}</p>
      )}

      {/* ── Méta-données ── */}
      <div className={styles.meta}>
        {task.due_date && (
          <time
            dateTime={task.due_date}
            className={`${styles.due} ${isOverdue ? styles.overdue : ''}`}
            aria-label={`Échéance : ${new Date(task.due_date).toLocaleDateString('fr-FR')}`}
          >
            {isOverdue ? '⚠ ' : ''}
            {new Date(task.due_date).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
          </time>
        )}

        {task.estimated_hours != null && (
          <span className={styles.hours} aria-label={`${task.estimated_hours} heures estimées`}>
            {task.estimated_hours}h
          </span>
        )}
      </div>
    </article>
  );
}
