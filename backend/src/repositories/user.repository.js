const db = require('../database/db');

const TABLE = 'users';

function findAllByOrg(organizationId) {
  return db(TABLE)
    .where({ organization_id: organizationId })
    .select('id', 'organization_id', 'email', 'name', 'role', 'created_at');
}

function findById(organizationId, id) {
  return db(TABLE).where({ id, organization_id: organizationId }).first();
}

function findByEmail(organizationId, email) {
  return db(TABLE).where({ organization_id: organizationId, email }).first();
}

async function create(data) {
  const [row] = await db(TABLE).insert(data).returning('*');
  return row;
}

function remove(organizationId, id) {
  return db(TABLE).where({ id, organization_id: organizationId }).delete();
}

module.exports = { findAllByOrg, findById, findByEmail, create, remove };
