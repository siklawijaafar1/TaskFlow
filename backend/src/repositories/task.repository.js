const db = require('../database/db');

const TABLE = 'tasks';

// Colonnes renvoyées au client (jamais de champs internes bruts)
const PUBLIC_COLUMNS = [
  'id', 'organization_id', 'project_id', 'created_by', 'assigned_to',
  'parent_task_id', 'title', 'description', 'status', 'priority',
  'position', 'estimated_hours', 'actual_hours', 'due_date',
  'completed_at', 'created_at', 'updated_at',
];

function baseQuery(organizationId) {
  return db(TABLE)
    .where({ organization_id: organizationId })
    .whereNull('deleted_at')   // R12 — soft-delete : exclure les enregistrements supprimés
    .select(PUBLIC_COLUMNS);
}

function findAllByOrg(organizationId, filters = {}) {
  const query = baseQuery(organizationId);
  if (filters.projectId)  query.where({ project_id: filters.projectId });
  if (filters.status)     query.where({ status: filters.status });
  if (filters.priority)   query.where({ priority: filters.priority });
  if (filters.assignedTo) query.where({ assigned_to: filters.assignedTo });
  return query.orderBy('position', 'asc').orderBy('created_at', 'desc');
}

function findById(organizationId, id) {
  return db(TABLE)
    .where({ id, organization_id: organizationId })
    .whereNull('deleted_at')   // R12 & R13 — filtre org + soft-delete
    .select(PUBLIC_COLUMNS)
    .first();
}

async function create(data) {
  const [row] = await db(TABLE)
    .insert(data)
    .returning(PUBLIC_COLUMNS);
  return row;
}

async function update(organizationId, id, data) {
  const [row] = await db(TABLE)
    .where({ id, organization_id: organizationId })
    .whereNull('deleted_at')
    .update({ ...data, updated_at: db.fn.now() })
    .returning(PUBLIC_COLUMNS);
  return row;
}

// R12 — soft-delete : on ne supprime jamais physiquement
function softDelete(organizationId, id) {
  return db(TABLE)
    .where({ id, organization_id: organizationId })
    .whereNull('deleted_at')
    .update({ deleted_at: db.fn.now() });
}

module.exports = { findAllByOrg, findById, create, update, softDelete };
