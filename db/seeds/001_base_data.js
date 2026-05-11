/**
 * Seed 001 — données de base réalistes
 *
 * 2 organisations · 6 utilisateurs · 4 projets · 12 tâches = 24 enregistrements
 * Chaque organisation est totalement isolée (R13).
 *
 * Usage : npx knex seed:run --knexfile knexfile.js
 */

const bcrypt = require('bcrypt');

// UUIDs fixes pour reproductibilité entre runs
const IDS = {
  // Organisations
  orgAlpha:  'a1000000-0000-4000-8000-000000000001',
  orgBeta:   'b2000000-0000-4000-8000-000000000002',

  // Utilisateurs org Alpha
  aliceOwner:  'a1000000-0000-4000-8000-000000000010',
  bobAdmin:    'a1000000-0000-4000-8000-000000000011',
  claraM:      'a1000000-0000-4000-8000-000000000012',

  // Utilisateurs org Beta
  diegOwner:  'b2000000-0000-4000-8000-000000000020',
  emmaAdmin:  'b2000000-0000-4000-8000-000000000021',
  faridM:     'b2000000-0000-4000-8000-000000000022',

  // Projets org Alpha
  projAlphaDash:  'a1000000-0000-4000-8000-000000000030',
  projAlphaApi:   'a1000000-0000-4000-8000-000000000031',

  // Projets org Beta
  projBetaMobile: 'b2000000-0000-4000-8000-000000000040',
  projBetaInfra:  'b2000000-0000-4000-8000-000000000041',
};

/** @param {import('knex').Knex} knex */
exports.seed = async function (knex) {
  // Nettoyage dans l'ordre inverse des FK
  await knex('tasks').del();
  await knex('projects').del();
  await knex('users').del();
  await knex('organizations').del();

  // ── Mot de passe partagé (bcrypt 12, R17) ──────────────────────────────────
  const passwordHash = await bcrypt.hash('TaskFlow2026!', 12);

  // ── Organisations ──────────────────────────────────────────────────────────
  await knex('organizations').insert([
    {
      id:          IDS.orgAlpha,
      name:        'Alpha Studio',
      slug:        'alpha-studio',
      plan:        'pro',
      max_members: 20,
    },
    {
      id:          IDS.orgBeta,
      name:        'Beta Ventures',
      slug:        'beta-ventures',
      plan:        'free',
      max_members: 5,
    },
  ]);

  // ── Utilisateurs ───────────────────────────────────────────────────────────
  await knex('users').insert([
    // Alpha Studio
    {
      id:              IDS.aliceOwner,
      organization_id: IDS.orgAlpha,
      email:           'alice@alpha-studio.io',
      password_hash:   passwordHash,
      full_name:       'Alice Moreau',
      role:            'owner',
    },
    {
      id:              IDS.bobAdmin,
      organization_id: IDS.orgAlpha,
      email:           'bob@alpha-studio.io',
      password_hash:   passwordHash,
      full_name:       'Bob Nguyen',
      role:            'admin',
    },
    {
      id:              IDS.claraM,
      organization_id: IDS.orgAlpha,
      email:           'clara@alpha-studio.io',
      password_hash:   passwordHash,
      full_name:       'Clara Martineau',
      role:            'member',
    },

    // Beta Ventures
    {
      id:              IDS.diegOwner,
      organization_id: IDS.orgBeta,
      email:           'diego@beta-ventures.io',
      password_hash:   passwordHash,
      full_name:       'Diego Ramirez',
      role:            'owner',
    },
    {
      id:              IDS.emmaAdmin,
      organization_id: IDS.orgBeta,
      email:           'emma@beta-ventures.io',
      password_hash:   passwordHash,
      full_name:       'Emma Fischer',
      role:            'admin',
    },
    {
      id:              IDS.faridM,
      organization_id: IDS.orgBeta,
      email:           'farid@beta-ventures.io',
      password_hash:   passwordHash,
      full_name:       'Farid Oualid',
      role:            'member',
    },
  ]);

  // ── Projets ────────────────────────────────────────────────────────────────
  await knex('projects').insert([
    // Alpha Studio
    {
      id:              IDS.projAlphaDash,
      organization_id: IDS.orgAlpha,
      created_by:      IDS.aliceOwner,
      name:            'Dashboard Redesign',
      description:     'Refonte complète de l\'interface d\'administration avec la nouvelle charte graphique.',
      color:           '#6366f1',
      status:          'active',
      start_date:      '2026-04-01',
      end_date:        '2026-06-30',
    },
    {
      id:              IDS.projAlphaApi,
      organization_id: IDS.orgAlpha,
      created_by:      IDS.bobAdmin,
      name:            'API v2 Migration',
      description:     'Migration de REST vers GraphQL avec maintien de la rétrocompatibilité v1 pendant 6 mois.',
      color:           '#f59e0b',
      status:          'active',
      start_date:      '2026-03-15',
      end_date:        '2026-07-31',
    },

    // Beta Ventures
    {
      id:              IDS.projBetaMobile,
      organization_id: IDS.orgBeta,
      created_by:      IDS.diegOwner,
      name:            'Application Mobile MVP',
      description:     'Première version de l\'app iOS/Android pour les clients Beta.',
      color:           '#10b981',
      status:          'active',
      start_date:      '2026-04-15',
      end_date:        '2026-09-01',
    },
    {
      id:              IDS.projBetaInfra,
      organization_id: IDS.orgBeta,
      created_by:      IDS.emmaAdmin,
      name:            'Infrastructure Cloud',
      description:     'Migration de l\'hébergement mutualisé vers AWS ECS avec Terraform.',
      color:           '#ef4444',
      status:          'paused',
      start_date:      '2026-02-01',
      end_date:        '2026-05-31',
    },
  ]);

  // ── Tâches ─────────────────────────────────────────────────────────────────
  const now = new Date();
  const daysFromNow = (d) => new Date(now.getTime() + d * 86400000).toISOString();

  await knex('tasks').insert([

    // ── Dashboard Redesign (Alpha) ──────────────────────────────────────────
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.claraM,
      title:           'Audit UX de l\'interface existante',
      description:     'Identifier les 10 points de friction principaux via Hotjar et les entretiens utilisateurs.',
      status:          'done',
      priority:        'high',
      position:        1,
      estimated_hours: 8,
      actual_hours:    10,
      due_date:        daysFromNow(-14),
      completed_at:    daysFromNow(-12),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.bobAdmin,
      title:           'Créer le système de design (tokens + composants)',
      description:     'Définir les couleurs, typographies, espacements et créer les composants Figma.',
      status:          'in_progress',
      priority:        'urgent',
      position:        2,
      estimated_hours: 24,
      actual_hours:    null,
      due_date:        daysFromNow(7),
      completed_at:    null,
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.bobAdmin,
      assigned_to:     IDS.claraM,
      title:           'Implémenter les composants React Storybook',
      description:     'Traduire les composants Figma en React avec Storybook et tests visuels.',
      status:          'todo',
      priority:        'high',
      position:        3,
      estimated_hours: 40,
      actual_hours:    null,
      due_date:        daysFromNow(21),
      completed_at:    null,
    },

    // ── API v2 Migration (Alpha) ────────────────────────────────────────────
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaApi,
      created_by:      IDS.bobAdmin,
      assigned_to:     IDS.bobAdmin,
      title:           'Cartographier tous les endpoints REST v1',
      description:     'Lister les 47 endpoints, documenter les payloads et identifier les dépendances clients.',
      status:          'done',
      priority:        'urgent',
      position:        1,
      estimated_hours: 16,
      actual_hours:    14,
      due_date:        daysFromNow(-21),
      completed_at:    daysFromNow(-20),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaApi,
      created_by:      IDS.bobAdmin,
      assigned_to:     IDS.bobAdmin,
      title:           'Définir le schéma GraphQL initial',
      description:     'Rédiger le schéma SDL pour les entités Organization, User, Project, Task.',
      status:          'in_review',
      priority:        'high',
      position:        2,
      estimated_hours: 12,
      actual_hours:    11,
      due_date:        daysFromNow(2),
      completed_at:    null,
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaApi,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.claraM,
      title:           'Mettre en place la couche DataLoader (N+1)',
      description:     'Implémenter DataLoader pour les resolvers imbriqués afin d\'éviter les requêtes N+1.',
      status:          'todo',
      priority:        'medium',
      position:        3,
      estimated_hours: 20,
      actual_hours:    null,
      due_date:        daysFromNow(35),
      completed_at:    null,
    },

    // ── Application Mobile MVP (Beta) ───────────────────────────────────────
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaMobile,
      created_by:      IDS.diegOwner,
      assigned_to:     IDS.faridM,
      title:           'Setup React Native + Expo + navigation',
      description:     'Initialiser le projet Expo, configurer React Navigation v6 et la CI Expo EAS.',
      status:          'done',
      priority:        'urgent',
      position:        1,
      estimated_hours: 8,
      actual_hours:    6,
      due_date:        daysFromNow(-7),
      completed_at:    daysFromNow(-6),
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaMobile,
      created_by:      IDS.emmaAdmin,
      assigned_to:     IDS.faridM,
      title:           'Écran d\'authentification (login / register)',
      description:     'Formulaires, validation Zod, gestion du token JWT en SecureStore.',
      status:          'in_progress',
      priority:        'high',
      position:        2,
      estimated_hours: 16,
      actual_hours:    null,
      due_date:        daysFromNow(5),
      completed_at:    null,
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaMobile,
      created_by:      IDS.diegOwner,
      assigned_to:     IDS.emmaAdmin,
      title:           'Liste et détail des tâches (offline-first)',
      description:     'Implémenter avec TanStack Query + MMKV pour la persistance hors ligne.',
      status:          'todo',
      priority:        'high',
      position:        3,
      estimated_hours: 24,
      actual_hours:    null,
      due_date:        daysFromNow(18),
      completed_at:    null,
    },

    // ── Infrastructure Cloud (Beta) ─────────────────────────────────────────
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaInfra,
      created_by:      IDS.emmaAdmin,
      assigned_to:     IDS.emmaAdmin,
      title:           'Rédiger l\'architecture cible AWS',
      description:     'Diagramme C4, choix ECS Fargate vs Lambda, politique IAM minimale.',
      status:          'done',
      priority:        'urgent',
      position:        1,
      estimated_hours: 12,
      actual_hours:    14,
      due_date:        daysFromNow(-30),
      completed_at:    daysFromNow(-28),
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaInfra,
      created_by:      IDS.emmaAdmin,
      assigned_to:     IDS.faridM,
      title:           'Écrire les modules Terraform (VPC, ECS, RDS)',
      description:     'Modules réutilisables pour VPC, cluster ECS, RDS PostgreSQL 16, ElastiCache.',
      status:          'in_progress',
      priority:        'high',
      position:        2,
      estimated_hours: 40,
      actual_hours:    null,
      due_date:        daysFromNow(-5),
      completed_at:    null,
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaInfra,
      created_by:      IDS.diegOwner,
      assigned_to:     null,
      title:           'Valider le plan de migration des données',
      description:     'Procédure de migration zero-downtime avec pg_dump + restore + validation checksum.',
      status:          'todo',
      priority:        'medium',
      position:        3,
      estimated_hours: 8,
      actual_hours:    null,
      due_date:        daysFromNow(10),
      completed_at:    null,
    },
  ]);

  console.log('✓ Seed 001 : 2 orgs · 6 users · 4 projects · 12 tasks insérés');
};
