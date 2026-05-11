/**
 * Migration 003 — projects + tasks
 *
 * Règles CLAUDE.md appliquées :
 *   R06  — UUID v4 comme PK
 *   R12  — soft-delete via deleted_at sur les deux tables
 *   R13  — organization_id dans chaque WHERE (FK + index)
 *   R15  — created_at / updated_at automatiques
 *   R16  — index complets sur toutes les colonnes de filtrage
 */

/** @param {import('knex').Knex} knex */
exports.up = async function (knex) {

  // ── Projects ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Isolation multi-tenant (R13)
    table
      .uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    table
      .uuid('created_by')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');

    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.string('color', 7).nullable().defaultTo('#6366f1');  // hex couleur UI

    table
      .enum('status', ['active', 'paused', 'completed', 'archived'])
      .notNullable()
      .defaultTo('active');

    table.date('start_date').nullable();
    table.date('end_date').nullable();

    // Soft-delete (R12)
    table.timestamp('deleted_at', { useTz: true }).nullable().defaultTo(null);

    // Timestamps (R15)
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.table('projects', (table) => {
    table.index(['organization_id'], 'idx_projects_organization_id');
    table.index(['organization_id', 'status'], 'idx_projects_org_status');
    table.index(['organization_id', 'deleted_at'], 'idx_projects_org_deleted');
    table.index(['created_by'], 'idx_projects_created_by');
  });

  await knex.raw(`
    CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);

  // ── Tasks ───────────────────────────────────────────────────────────────────
  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Isolation multi-tenant (R13) — redondant mais obligatoire pour les requêtes directes
    table
      .uuid('organization_id')
      .notNullable()
      .references('id')
      .inTable('organizations')
      .onDelete('CASCADE');

    table
      .uuid('project_id')
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE');

    table
      .uuid('created_by')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');

    table
      .uuid('assigned_to')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    // Hiérarchie (sous-tâches optionnelles — nullable = tâche racine)
    table
      .uuid('parent_task_id')
      .nullable()
      .references('id')
      .inTable('tasks')
      .onDelete('CASCADE');

    table.string('title', 500).notNullable();
    table.text('description').nullable();

    table
      .enum('status', ['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
      .notNullable()
      .defaultTo('todo');

    table
      .enum('priority', ['none', 'low', 'medium', 'high', 'urgent'])
      .notNullable()
      .defaultTo('medium');

    table.integer('position').notNullable().defaultTo(0);  // ordre dans la colonne Kanban
    table.decimal('estimated_hours', 5, 2).nullable();
    table.decimal('actual_hours', 5, 2).nullable();
    table.timestamp('due_date', { useTz: true }).nullable();
    table.timestamp('completed_at', { useTz: true }).nullable();

    // Soft-delete (R12)
    table.timestamp('deleted_at', { useTz: true }).nullable().defaultTo(null);

    // Timestamps (R15)
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Index (R16) — couvrent tous les patterns de filtre documentés dans le PRD
  await knex.schema.table('tasks', (table) => {
    table.index(['organization_id'], 'idx_tasks_organization_id');
    table.index(['project_id'], 'idx_tasks_project_id');
    table.index(['organization_id', 'project_id'], 'idx_tasks_org_project');
    table.index(['organization_id', 'status'], 'idx_tasks_org_status');
    table.index(['organization_id', 'priority'], 'idx_tasks_org_priority');
    table.index(['assigned_to'], 'idx_tasks_assigned_to');
    table.index(['organization_id', 'assigned_to'], 'idx_tasks_org_assigned');
    table.index(['organization_id', 'deleted_at'], 'idx_tasks_org_deleted');
    table.index(['due_date'], 'idx_tasks_due_date');
    table.index(['parent_task_id'], 'idx_tasks_parent');
    table.index(['project_id', 'status', 'position'], 'idx_tasks_kanban_order');
  });

  await knex.raw(`
    CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);

  // Contrainte : assigned_to doit appartenir à la même organisation
  // (vérifié au niveau service, pas de FK cross-table possible ici sans trigger)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION check_task_assignee_org()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.assigned_to IS NOT NULL THEN
        IF NOT EXISTS (
          SELECT 1 FROM users
          WHERE id = NEW.assigned_to
            AND organization_id = NEW.organization_id
            AND deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION 'assigned_to user does not belong to the same organization';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER trg_tasks_check_assignee_org
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION check_task_assignee_org();
  `);
};

/** @param {import('knex').Knex} knex */
exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS trg_tasks_check_assignee_org ON tasks');
  await knex.raw('DROP FUNCTION IF EXISTS check_task_assignee_org()');
  await knex.raw('DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks');
  await knex.raw('DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects');
  await knex.schema.dropTableIfExists('tasks');
  await knex.schema.dropTableIfExists('projects');
};
