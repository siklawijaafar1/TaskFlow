const db = require('../database/db');

const TABLE = 'projects';

function findAllByOrg(organizationId) {
  return db(TABLE)
    .where({ organization_id: organizationId })
    .whereNull('deleted_at')   // R12 — soft-delete : exclure les enregistrements supprimés
    .orderBy('created_at', 'desc');
}

function findById(organizationId, id) {
  return db(TABLE)
    .where({ id, organization_id: organizationId })
    .whereNull('deleted_at')   // R12 & R13 — filtre org + soft-delete
    .first();
}

async function create(data) {
  const [row] = await db(TABLE).insert(data).returning('*');
  return row;
}

async function update(organizationId, id, data) {
  const [row] = await db(TABLE)
    .where({ id, organization_id: organizationId })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

function remove(organizationId, id) {
  return db(TABLE).where({ id, organization_id: organizationId }).delete();
}

module.exports = { findAllByOrg, findById, create, update, remove };
