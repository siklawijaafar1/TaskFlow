const taskService = require('../services/task.service');

// Champs acceptés en entrée — protection contre le mass-assignment
const CREATE_FIELDS = ['project_id', 'parent_task_id', 'assigned_to', 'title',
  'description', 'status', 'priority', 'position', 'estimated_hours', 'due_date'];

const UPDATE_FIELDS = ['assigned_to', 'title', 'description', 'status',
  'priority', 'position', 'estimated_hours', 'actual_hours', 'due_date',
  'completed_at', 'project_id'];

function pick(obj, fields) {
  return fields.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {});
}

async function list(req, res, next) {
  try {
    const tasks = await taskService.list(req.user.organizationId, {
      projectId:  req.query.project_id,
      status:     req.query.status,
      priority:   req.query.priority,
      assignedTo: req.query.assigned_to,
    });
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = pick(req.body, CREATE_FIELDS);
    const task = await taskService.create(req.user.organizationId, req.user.id, data);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const task = await taskService.getById(req.user.organizationId, req.params.id);
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const data = pick(req.body, UPDATE_FIELDS);
    const task = await taskService.update(req.user.organizationId, req.params.id, data);
    res.json({ task });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await taskService.remove(req.user.organizationId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, getById, update, remove };
