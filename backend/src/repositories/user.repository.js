/**
 * user.repository.js — All SQL queries for the users table (R04)
 * R12: soft-delete filtering (whereNull deleted_at)
 * R13: every query filters by organization_id
 */
const db = require('../database/db');

const TABLE = 'users';

function findAllByOrg(organizationId) {
  return db(TABLE)
    .where({ organization_id: organizationId })
    .whereNull('deleted_at')   // R12
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

/**
 * findByEmailGlobal — used during login when no organizationSlug is provided.
 * Returns the first non-deleted user matching the email across all orgs.
 */
function findByEmailGlobal(email) {
  return db(TABLE)
    .where({ email })
    .whereNull('deleted_at')
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

module.exports = { findAllByOrg, findById, findByEmail, findByEmailGlobal, create, softDelete };
