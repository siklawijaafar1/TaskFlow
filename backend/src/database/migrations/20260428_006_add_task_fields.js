/**
 * Migration 006 — champs supplémentaires sur la table tasks
 *
 * Aligne le schéma backend sur les colonnes référencées par le repository :
 * parent_task_id, position, estimated_hours, actual_hours, completed_at.
 */

/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.table('tasks', (table) => {
    table.uuid('parent_task_id').nullable().references('id').inTable('tasks').onDelete('CASCADE');
    table.integer('position').notNullable().defaultTo(0);
    table.decimal('estimated_hours', 5, 2).nullable();
    table.decimal('actual_hours', 5, 2).nullable();
    table.timestamp('completed_at', { useTz: true }).nullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.schema.table('tasks', (table) => {
    table.dropColumn('completed_at');
    table.dropColumn('actual_hours');
    table.dropColumn('estimated_hours');
    table.dropColumn('position');
    table.dropColumn('parent_task_id');
  });
};
