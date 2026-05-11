import { api } from './client';

/**
 * Client API pour le domaine Task.
 * Seul endroit autorisé à appeler fetch() pour les tâches (R05).
 */
export const tasksApi = {
  /**
   * Récupère la liste des tâches avec filtres optionnels.
   * Les valeurs vides/nulles/undefined sont ignorées.
   */
  list(filters = {}) {
    const cleaned = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '' && v != null),
    );
    const qs = new URLSearchParams(cleaned).toString();
    return api.get(`/tasks${qs ? `?${qs}` : ''}`);
  },

  /** Crée une nouvelle tâche. */
  create(data) {
    return api.post('/tasks', data);
  },

  /** Récupère une tâche par son UUID. */
  getById(id) {
    return api.get(`/tasks/${id}`);
  },

  /** Met à jour partiellement une tâche. */
  update(id, data) {
    return api.put(`/tasks/${id}`, data);
  },

  /** Supprime (soft-delete) une tâche. */
  remove(id) {
    return api.delete(`/tasks/${id}`);
  },
};
