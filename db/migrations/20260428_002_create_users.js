/**
 * Migration 002 — users
 *
 * Règles CLAUDE.md appliquées :
 *   R06  — UUID v4 comme PK
 *   R12  — soft-delete via deleted_at
 *   R13  — organization_id présent sur toutes les entités utilisateur
 *   R15  — created_at / updated_at automatiques
 *   R16  — index sur organization_id, email, deleted_at
 *   R17  — password_hash (bcrypt ≥ 12, appliqué dans le service)
 */

/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Isolation multi-tenant (R13)
    table
      .uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    table.string('email', 255).notNullable();
    table.string('password_hash', 255).notNullable();  // bcrypt ≥ 12 (R17)
    table.string('full_name', 255).notNullable();
    table.string('avatar_url', 500).nullable();

    table
      .enum('role', ['owner', 'admin', 'member'])
      .notNullable()
      .defaultTo('member');

    table.timestamp('last_login_at', { useTz: true }).nullable();

    // Soft-delete (R12)
    table.timestamp('deleted_at', { useTz: true }).nullable().defaultTo(null);

    // Timestamps (R15)
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    // Email unique par organisation (pas globalement — multi-tenant)
    table.unique(['organization_id', 'email']);
  });

  // Index (R16)
  await knex.schema.table('users', (table) => {
    table.index(['organization_id'], 'idx_users_organization_id');
    table.index(['email'], 'idx_users_email');
    table.index(['organization_id', 'deleted_at'], 'idx_users_org_deleted');
    table.index(['role'], 'idx_users_role');
  });

  await knex.raw(`
    CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS trg_users_updated_at ON users');
  await knex.schema.dropTableIfExists('users');
};
