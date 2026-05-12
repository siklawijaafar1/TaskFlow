import { useState } from 'react';
import { tasksApi } from '../../api/tasks';
import styles from './TaskCreate.module.css';

/* ------------------------------------------------------------------ */
/* Constantes métier (issues de src/constants/ en prod)               */
/* ------------------------------------------------------------------ */
const STATUSES = [
  { value: 'todo',        label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'review',      label: 'En révision' },
  { value: 'done',        label: 'Terminé' },
];

const PRIORITIES = [
  { value: 'low',    label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high',   label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

/* Mapping message serveur → nom du champ (422 single-field errors) */
const SERVER_FIELD_MAP = {
  'title is required':      'title',
  'project_id is required': 'project_id',
};

/* ------------------------------------------------------------------ */
/* Valeur initiale du formulaire                                       */
/* ------------------------------------------------------------------ */
const EMPTY_FORM = {
  title:           '',
  project_id:      '',
  description:     '',
  status:          'todo',
  priority:        'medium',
  estimated_hours: '',
  due_date:        '',
};

/* ------------------------------------------------------------------ */
/* Composant                                                           */
/* ------------------------------------------------------------------ */

/**
 * TaskCreate — formulaire de création de tâche.
 *
 * Props:
 *  - projects  {Project[]}  Liste des projets disponibles (pour le select)
 *  - onCreated {fn?}        Callback (task) => void appelé après succès
 *  - onCancel  {fn?}        Callback optionnel pour annuler/fermer
 */
export default function TaskCreate({ projects = [], onCreated, onCancel }) {
  const [form, setForm]           = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});   // erreurs par champ
  const [globalError, setGlobalError] = useState('');   // erreur générale
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  /* ── Validation côté client (R24) ── */
  function validate() {
    const errors = {};
    if (!form.title.trim())  errors.title      = 'Le titre est requis.';
    if (!form.project_id)    errors.project_id = 'Veuillez sélectionner un projet.';
    if (form.estimated_hours !== '' && Number(form.estimated_hours) < 0) {
      errors.estimated_hours = 'Les heures estimées doivent être positives.';
    }
    return errors;
  }

  /* ── Changement de champ ── */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Effacer l'erreur du champ dès que l'utilisateur corrige
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  }

  /* ── Soumission ── */
  async function handleSubmit(e) {
    e.preventDefault();
    setGlobalError('');

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      // Focus sur le premier champ en erreur pour l'accessibilité
      const firstKey = Object.keys(clientErrors)[0];
      document.getElementById(`tc-${firstKey}`)?.focus();
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title:       form.title.trim(),
        project_id:  form.project_id,
        status:      form.status,
        priority:    form.priority,
        ...(form.description     && { description:     form.description }),
        ...(form.estimated_hours && { estimated_hours: Number(form.estimated_hours) }),
        ...(form.due_date        && { due_date:         form.due_date }),
      };

      const { task } = await tasksApi.create(payload);
      setSuccess(true);
      setForm(EMPTY_FORM);
      setFieldErrors({});
      onCreated?.(task);
    } catch (err) {
      if (err.status === 422) {
        // Erreurs structurées par champ (express-validator)
        if (err.fields?.length) {
          const mapped = {};
          err.fields.forEach(({ field, message }) => { mapped[field] = message; });
          setFieldErrors(mapped);
        } else {
          // Erreur 422 mono-message — on essaie de la mapper à un champ
          const fieldKey = SERVER_FIELD_MAP[err.message];
          if (fieldKey) {
            setFieldErrors({ [fieldKey]: err.message });
          } else {
            setGlobalError(err.message);
          }
        }
      } else if (err.status === 403) {
        setGlobalError("Vous n'avez pas accès à ce projet.");
      } else {
        // Message générique — ne pas exposer les détails techniques (R26)
        setGlobalError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Réinitialisation après succès ── */
  function handleCreateAnother() {
    setSuccess(false);
    setForm(EMPTY_FORM);
  }

  /* ---------------------------------------------------------------- */
  /* Rendu                                                             */
  /* ---------------------------------------------------------------- */

  if (success) {
    return (
      <div className={styles.successBanner} role="status" aria-live="polite">
        <span className={styles.successIcon} aria-hidden="true">✓</span>
        <p>Tâche créée avec succès&nbsp;!</p>
        <div className={styles.successActions}>
          <button type="button" onClick={handleCreateAnother} className={styles.btnSecondary}>
            Créer une autre tâche
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className={styles.btnPrimary}>
              Fermer
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={styles.form}
      noValidate
      aria-label="Créer une tâche"
    >
      {/* ── Erreur globale ── */}
      {globalError && (
        <div className={styles.globalError} role="alert" aria-live="assertive">
          <span aria-hidden="true">⚠ </span>{globalError}
        </div>
      )}

      {/* ── Titre ── */}
      <div className={styles.field}>
        <label htmlFor="tc-title" className={styles.label}>
          Titre <span className={styles.required} aria-hidden="true">*</span>
        </label>
        <input
          id="tc-title"
          name="title"
          type="text"
          value={form.title}
          onChange={handleChange}
          className={`${styles.input} ${fieldErrors.title ? styles.inputError : ''}`}
          placeholder="Ex. : Corriger le bug de pagination"
          aria-required="true"
          aria-invalid={fieldErrors.title ? 'true' : 'false'}
          aria-describedby={fieldErrors.title ? 'tc-title-err' : undefined}
          disabled={loading}
          autoFocus
        />
        {fieldErrors.title && (
          <span id="tc-title-err" className={styles.fieldError} role="alert">
            {fieldErrors.title}
          </span>
        )}
      </div>

      {/* ── Projet ── */}
      <div className={styles.field}>
        <label htmlFor="tc-project_id" className={styles.label}>
          Projet <span className={styles.required} aria-hidden="true">*</span>
        </label>
        <select
          id="tc-project_id"
          name="project_id"
          value={form.project_id}
          onChange={handleChange}
          className={`${styles.input} ${fieldErrors.project_id ? styles.inputError : ''}`}
          aria-required="true"
          aria-invalid={fieldErrors.project_id ? 'true' : 'false'}
          aria-describedby={fieldErrors.project_id ? 'tc-project-err' : undefined}
          disabled={loading}
        >
          <option value="">— Sélectionner un projet —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {fieldErrors.project_id && (
          <span id="tc-project-err" className={styles.fieldError} role="alert">
            {fieldErrors.project_id}
          </span>
        )}
      </div>

      {/* ── Description ── */}
      <div className={styles.field}>
        <label htmlFor="tc-description" className={styles.label}>Description</label>
        <textarea
          id="tc-description"
          name="description"
          value={form.description}
          onChange={handleChange}
          className={styles.textarea}
          rows={3}
          placeholder="Contexte, critères d'acceptation…"
          disabled={loading}
        />
      </div>

      {/* ── Statut + Priorité ── */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="tc-status" className={styles.label}>Statut</label>
          <select
            id="tc-status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          >
            {STATUSES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="tc-priority" className={styles.label}>Priorité</label>
          <select
            id="tc-priority"
            name="priority"
            value={form.priority}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          >
            {PRIORITIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Heures estimées + Date d'échéance ── */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="tc-estimated_hours" className={styles.label}>Heures estimées</label>
          <input
            id="tc-estimated_hours"
            name="estimated_hours"
            type="number"
            min="0"
            step="0.5"
            value={form.estimated_hours}
            onChange={handleChange}
            className={`${styles.input} ${fieldErrors.estimated_hours ? styles.inputError : ''}`}
            placeholder="0"
            aria-invalid={fieldErrors.estimated_hours ? 'true' : 'false'}
            aria-describedby={fieldErrors.estimated_hours ? 'tc-hours-err' : undefined}
            disabled={loading}
          />
          {fieldErrors.estimated_hours && (
            <span id="tc-hours-err" className={styles.fieldError} role="alert">
              {fieldErrors.estimated_hours}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="tc-due_date" className={styles.label}>Date d'échéance</label>
          <input
            id="tc-due_date"
            name="due_date"
            type="date"
            value={form.due_date}
            onChange={handleChange}
            className={styles.input}
            disabled={loading}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className={styles.actions}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={styles.btnSecondary}
            disabled={loading}
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Création…' : 'Créer la tâche'}
        </button>
      </div>
    </form>
  );
}
