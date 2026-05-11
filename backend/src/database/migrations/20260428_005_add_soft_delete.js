/**
 * Migration 005 — ajout de soft-delete (deleted_at) sur toutes les tables métier
 *
 * Règle CLAUDE.md R12 : jamais de DELETE physique sur une entité utilisateur.
 * Toutes les requêtes de lecture filtrent WHERE deleted_at IS NULL.
 */

const TABLES = ['organizations', 'users', 'projects', 'tasks'];

/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  for (const table of TABLES) {
    const hasColumn = await knex.schema.hasColumn(table, 'deleted_at');
    if (!hasColumn) {
      await knex.schema.table(table, (t) => {
        t.timestamp('deleted_at', { useTz: true }).nullable().defaultTo(null);
      });
    }
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  for (const table of [...TABLES].reverse()) {
    const hasColumn = await knex.schema.hasColumn(table, 'deleted_at');
    if (hasColumn) {
      await knex.schema.table(table, (t) => t.dropColumn('deleted_at'));
    }
  }
};
