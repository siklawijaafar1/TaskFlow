const db = require('../database/db');

const TABLE = 'users';

function findAllByOrg(organizationId) {
  return db(TABLE)
    .where({ organization_id: organizationId })
    .whereNull('deleted_at')   // R12 — soft-delete
    .select('id', 'organization_id', 'email', 'name', 'role', 'created_at');
}

function findById(organizationId, id) {
  return db(TABLE)
    .where({ id, organization_id: organizationId })
    .whereNull('deleted_at')   // R12 & R13
    .first();
}

function findByEmail(organizationId, email) {
  return db(TABLE)
    .where({ organization_id: organizationId, email })
    .whereNull('deleted_at')   // R12
    .first();
}

async function create(data) {
  const [row] = await db(TABLE).insert(data).returning('*');
  return row;
}

// R12 — soft-delete : jamais de DELETE physique sur une entité utilisateur (F2)
function softDelete(organizationId, id) {
  return db(TABLE)
    .where({ id, organization_id: organizationId })
    .whereNull('deleted_at')
    .update({ deleted_at: db.fn.now() });
}

module.exports = { findAllByOrg, findById, findByEmail, create, softDelete };
