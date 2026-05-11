const projectRepository = require('../repositories/project.repository');
const { createError } = require('../middleware/errorHandler');

async function list(organizationId) {
  return projectRepository.findAllByOrg(organizationId);
}

async function create(organizationId, userId, data) {
  return projectRepository.create({ ...data, organization_id: organizationId, created_by: userId });
}

async function getById(organizationId, id) {
  const project = await projectRepository.findById(organizationId, id);
  if (!project) throw createError(403, 'Project not found');
  return project;
}

async function update(organizationId, id, data) {
  const project = await projectRepository.findById(organizationId, id);
  if (!project) throw createError(403, 'Project not found');
  return projectRepository.update(organizationId, id, data);
}

async function remove(organizationId, id) {
  const project = await projectRepository.findById(organizationId, id);
  if (!project) throw createError(403, 'Project not found');
  return projectRepository.remove(organizationId, id);
}

module.exports = { list, create, getById, update, remove };
