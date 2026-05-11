const taskRepository    = require('../repositories/task.repository');
const projectRepository = require('../repositories/project.repository');
const { createError }   = require('../middleware/errorHandler');

const VALID_STATUSES   = ['todo', 'in_progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// ── Validation 422 ─────────────────────────────────────────────────────────

function validateCreate(data) {
  if (!data.title || !data.title.trim()) {
    throw createError(422, 'title is required');
  }
  if (!data.project_id) {
    throw createError(422, 'project_id is required');
  }
  if (data.status && !VALID_STATUSES.includes(data.status)) {
    throw createError(422, `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
    throw createError(422, `priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }
}

function validateUpdate(data) {
  if ('title' in data && (!data.title || !data.title.trim())) {
    throw createError(422, 'title cannot be empty');
  }
  if (data.status && !VALID_STATUSES.includes(data.status)) {
    throw createError(422, `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  if (data.priority && !VALID_PRIORITIES.includes(data.priority)) {
    throw createError(422, `priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }
}

// ── Service ────────────────────────────────────────────────────────────────

async function list(organizationId, filters = {}) {
  return taskRepository.findAllByOrg(organizationId, filters);
}

async function create(organizationId, userId, data) {
  validateCreate(data);

  // R13 — vérifier que le projet appartient à la même organisation (403, pas 404)
  const project = await projectRepository.findById(organizationId, data.project_id);
  if (!project) throw createError(403, 'Project not found');

  const { title, ...rest } = data;
  return taskRepository.create({
    ...rest,
    title:           title.trim(),
    organization_id: organizationId,
    created_by:      userId,
  });
}

async function getById(organizationId, id) {
  const task = await taskRepository.findById(organizationId, id);
  if (!task) throw createError(403, 'Task not found');
  return task;
}

async function update(organizationId, id, data) {
  validateUpdate(data);
  const task = await taskRepository.findById(organizationId, id);
  if (!task) throw createError(403, 'Task not found');

  // Si project_id change, vérifier la nouvelle appartenance org
  if (data.project_id && data.project_id !== task.project_id) {
    const project = await projectRepository.findById(organizationId, data.project_id);
    if (!project) throw createError(403, 'Project not found');
  }

  return taskRepository.update(organizationId, id, data);
}

async function remove(organizationId, id) {
  const task = await taskRepository.findById(organizationId, id);
  if (!task) throw createError(403, 'Task not found');
  return taskRepository.softDelete(organizationId, id); // R12 — soft-delete
}

module.exports = { list, create, getById, update, remove };
