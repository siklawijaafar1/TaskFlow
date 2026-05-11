const projectService = require('../services/project.service');

async function list(req, res, next) {
  try {
    const projects = await projectService.list(req.user.organizationId);
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const project = await projectService.create(req.user.organizationId, req.user.id, req.body);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const project = await projectService.getById(req.user.organizationId, req.params.id);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const project = await projectService.update(req.user.organizationId, req.params.id, req.body);
    res.json({ project });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await projectService.remove(req.user.organizationId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById, update, remove };
