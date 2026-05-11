const db = require('../database/db');

const TABLE = 'organizations';

function findById(id) {
  return db(TABLE).where({ id }).first();
}

function findBySlug(slug) {
  return db(TABLE).where({ slug }).first();
}

async function create(data) {
  const [row] = await db(TABLE).insert(data).returning('*');
  return row;
}

async function update(id, data) {
  const [row] = await db(TABLE)
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

module.exports = { findById, findBySlug, create, update };
