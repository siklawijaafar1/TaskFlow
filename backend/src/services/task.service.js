/**
 * task.service.js — Business logic for tasks (R03)
 * Redis cache on list (60s TTL) with invalidation on create/update/delete (R55).
 */
const taskRepository    = require('../repositories/task.repository');
const projectRepository = require('../repositories/project.repository');
const cache             = require('../cache/redis');
const { createError }   = require('../middleware/errorHandler');

const VALID_STATUSES   = ['todo', 'in_progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CACHE_TTL        = 60; // seconds

// ── Cache key helpers ───────────────────────────────────────────────────────

function listCacheKey(organizationId, filters = {}) {
  const { projectId = 'all', status = 'all', priority = 'all', assignedTo = 'all' } = filters;
  return `tasks:org:${organizationId}:project:${projectId}:status:${status}:priority:${priority}:assigned:${assignedTo}`;
}

function orgCachePattern(organizationId) {
  return `tasks:org:${organizationId}:*`;
}

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
  const key    = listCacheKey(organizationId, filters);
  const cached = await cache.get(key);
  if (cached) return cached;

  const tasks = await taskRepository.findAllByOrg(organizationId, filters);
  await cache.set(key, tasks, CACHE_TTL);
  return tasks;
}

async function create(organizationId, userId, data) {
  validateCreate(data);

  // R13 — verify project belongs to this org (403, not 404)
  const project = await projectRepository.findById(organizationId, data.project_id);
  if (!project) throw createError(403, 'Project not found');

  const { title, ...rest } = data;
  const task = await taskRepository.create({
    ...rest,
    title:           title.trim(),
    organization_id: organizationId,
    created_by:      userId,
  });

  // Invalidate all cached lists for this org
  await cache.delByPattern(orgCachePattern(organizationId));

  return task;
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

  // If project_id changes, verify new project belongs to this org
  if (data.project_id && data.project_id !== task.project_id) {
    const project = await projectRepository.findById(organizationId, data.project_id);
    if (!project) throw createError(403, 'Project not found');
  }

  const updated = await taskRepository.update(organizationId, id, data);
  await cache.delByPattern(orgCachePattern(organizationId));
  return updated;
}

async function remove(organizationId, id) {
  const task = await taskRepository.findById(organizationId, id);
  if (!task) throw createError(403, 'Task not found');
  await taskRepository.softDelete(organizationId, id); // R12
  await cache.delByPattern(orgCachePattern(organizationId));
}

module.exports = { list, create, getById, update, remove };
