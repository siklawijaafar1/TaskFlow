/**
 * Migration 001 — organizations
 *
 * Règles CLAUDE.md appliquées :
 *   R06  — UUID v4 comme PK (knex.fn.uuid())
 *   R12  — soft-delete via deleted_at
 *   R15  — created_at / updated_at automatiques
 *   R16  — index sur les colonnes filtrées fréquemment
 */

/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable();

    table.enum('plan', ['free', 'pro', 'enterprise']).notNullable().defaultTo('free');
    table.integer('max_members').notNullable().defaultTo(5);

    // Soft-delete (R12)
    table.timestamp('deleted_at', { useTz: true }).nullable().defaultTo(null);

    // Timestamps (R15)
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Unicité slug par organisation active (slug peut être réutilisé après soft-delete)
    table.unique(['slug']);
  });

  // Index (R16)
  await knex.schema.table('organizations', (table) => {
    table.index(['deleted_at'], 'idx_organizations_deleted_at');
    table.index(['slug'], 'idx_organizations_slug');
    table.index(['plan'], 'idx_organizations_plan');
  });

  // Trigger updated_at automatique
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations');
  await knex.schema.dropTableIfExists('organizations');
};
