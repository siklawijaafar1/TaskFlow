const bcrypt = require('bcrypt');

/**
 * Seed 01 — données de démonstration réalistes
 *
 * 2 organisations · 6 utilisateurs · 4 projets · 20 tâches
 * Chaque organisation est totalement isolée (R13 CLAUDE.md).
 * Mots de passe hachés bcrypt(12) — R17.
 *
 * Usage : npx knex seed:run (depuis backend/)
 */

// UUIDs fixes pour reproductibilité entre runs
const IDS = {
  // Organisations
  orgAlpha: 'a1a00000-0000-4000-8000-000000000001',
  orgBeta:  'b2b00000-0000-4000-8000-000000000002',

  // Utilisateurs org Alpha
  aliceOwner: 'a1a00000-0000-4000-8000-000000000010',
  bobAdmin:   'a1a00000-0000-4000-8000-000000000011',
  claraM:     'a1a00000-0000-4000-8000-000000000012',

  // Utilisateurs org Beta
  diegoOwner: 'b2b00000-0000-4000-8000-000000000020',
  emmaAdmin:  'b2b00000-0000-4000-8000-000000000021',
  faridM:     'b2b00000-0000-4000-8000-000000000022',

  // Projets org Alpha
  projAlphaDash: 'a1a00000-0000-4000-8000-000000000030',
  projAlphaApi:  'a1a00000-0000-4000-8000-000000000031',

  // Projets org Beta
  projBetaMobile: 'b2b00000-0000-4000-8000-000000000040',
  projBetaInfra:  'b2b00000-0000-4000-8000-000000000041',
};

/** @param {import('knex').Knex} knex */
exports.seed = async function (knex) {
  // Nettoyage dans l'ordre inverse des FK pour idempotence
  await knex('tasks').del();
  await knex('projects').del();
  await knex('users').del();
  await knex('organizations').del();

  // ── Mot de passe partagé (bcrypt 12, R17) ──────────────────────────────────
  const passwordHash = await bcrypt.hash('TaskFlow2026!', 12);

  // ── Organisations ──────────────────────────────────────────────────────────
  await knex('organizations').insert([
    { id: IDS.orgAlpha, name: 'Alpha Studio',   slug: 'alpha-studio'  },
    { id: IDS.orgBeta,  name: 'Beta Ventures',  slug: 'beta-ventures' },
  ]);

  // ── Utilisateurs ───────────────────────────────────────────────────────────
  await knex('users').insert([
    // Alpha Studio
    {
      id:              IDS.aliceOwner,
      organization_id: IDS.orgAlpha,
      email:           'alice@alpha-studio.io',
      password_hash:   passwordHash,
      name:            'Alice Moreau',
      role:            'owner',
    },
    {
      id:              IDS.bobAdmin,
      organization_id: IDS.orgAlpha,
      email:           'bob@alpha-studio.io',
      password_hash:   passwordHash,
      name:            'Bob Nguyen',
      role:            'admin',
    },
    {
      id:              IDS.claraM,
      organization_id: IDS.orgAlpha,
      email:           'clara@alpha-studio.io',
      password_hash:   passwordHash,
      name:            'Clara Martineau',
      role:            'member',
    },
    // Beta Ventures
    {
      id:              IDS.diegoOwner,
      organization_id: IDS.orgBeta,
      email:           'diego@beta-ventures.io',
      password_hash:   passwordHash,
      name:            'Diego Ramirez',
      role:            'owner',
    },
    {
      id:              IDS.emmaAdmin,
      organization_id: IDS.orgBeta,
      email:           'emma@beta-ventures.io',
      password_hash:   passwordHash,
      name:            'Emma Fischer',
      role:            'admin',
    },
    {
      id:              IDS.faridM,
      organization_id: IDS.orgBeta,
      email:           'farid@beta-ventures.io',
      password_hash:   passwordHash,
      name:            'Farid Oualid',
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
      description:     'Refonte complète de l\'interface d\'administration.',
      status:          'active',
    },
    {
      id:              IDS.projAlphaApi,
      organization_id: IDS.orgAlpha,
      created_by:      IDS.bobAdmin,
      name:            'API v2 Migration',
      description:     'Migration de REST vers GraphQL avec rétrocompatibilité v1.',
      status:          'active',
    },
    // Beta Ventures
    {
      id:              IDS.projBetaMobile,
      organization_id: IDS.orgBeta,
      created_by:      IDS.diegoOwner,
      name:            'Application Mobile MVP',
      description:     'Première version de l\'app iOS/Android pour les clients Beta.',
      status:          'active',
    },
    {
      id:              IDS.projBetaInfra,
      organization_id: IDS.orgBeta,
      created_by:      IDS.emmaAdmin,
      name:            'Infrastructure Cloud',
      description:     'Migration vers AWS ECS avec Terraform.',
      status:          'active',
    },
  ]);

  // ── Tâches : 20 au total réparties sur 2 organisations ────────────────────
  const now = new Date();
  const d = (days) => new Date(now.getTime() + days * 86400000).toISOString().split('T')[0];

  await knex('tasks').insert([

    // ═══════════════════════════════════════════════════════════════════════
    // ORG ALPHA — Dashboard Redesign (8 tâches)
    // ═══════════════════════════════════════════════════════════════════════
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.claraM,
      title:           'Audit UX de l\'interface existante',
      description:     'Identifier les 10 points de friction via Hotjar et les entretiens utilisateurs.',
      status:          'done',
      priority:        'high',
      position:        1,
      estimated_hours: 8,
      due_date:        d(-14),
      completed_at:    new Date(now.getTime() - 12 * 86400000),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.bobAdmin,
      title:           'Créer le système de design (tokens + composants)',
      description:     'Définir couleurs, typographies et composants Figma.',
      status:          'in_progress',
      priority:        'urgent',
      position:        2,
      estimated_hours: 24,
      due_date:        d(7),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.bobAdmin,
      assigned_to:     IDS.claraM,
      title:           'Implémenter les composants React Storybook',
      description:     'Traduire les composants Figma en React avec Storybook.',
      status:          'todo',
      priority:        'high',
      position:        3,
      estimated_hours: 40,
      due_date:        d(21),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.aliceOwner,
      title:           'Définir la palette de couleurs accessibles WCAG AA',
      description:     'Vérifier le contraste (4.5:1) de toutes les combinaisons couleurs.',
      status:          'done',
      priority:        'medium',
      position:        4,
      estimated_hours: 4,
      due_date:        d(-20),
      completed_at:    new Date(now.getTime() - 18 * 86400000),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.bobAdmin,
      assigned_to:     IDS.claraM,
      title:           'Intégrer les tests visuels avec Percy',
      description:     'Configurer Percy CI pour détecter les régressions visuelles.',
      status:          'todo',
      priority:        'medium',
      position:        5,
      estimated_hours: 8,
      due_date:        d(30),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.claraM,
      assigned_to:     IDS.claraM,
      title:           'Rédiger la documentation du design system',
      description:     'Documenter chaque composant avec exemples d\'usage et props.',
      status:          'todo',
      priority:        'low',
      position:        6,
      estimated_hours: 12,
      due_date:        d(45),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.bobAdmin,
      title:           'Migration du header et de la navigation',
      description:     'Refondre le header avec le nouveau design system.',
      status:          'review',
      priority:        'high',
      position:        7,
      estimated_hours: 16,
      due_date:        d(3),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaDash,
      created_by:      IDS.aliceOwner,
      assigned_to:     null,
      title:           'Tests d\'accessibilité E2E avec axe-core',
      description:     'Intégrer axe-core dans les tests Playwright pour l\'accessibilité.',
      status:          'todo',
      priority:        'medium',
      position:        8,
      estimated_hours: 6,
      due_date:        d(60),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ORG ALPHA — API v2 Migration (4 tâches)
    // ═══════════════════════════════════════════════════════════════════════
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaApi,
      created_by:      IDS.bobAdmin,
      assigned_to:     IDS.bobAdmin,
      title:           'Cartographier tous les endpoints REST v1',
      description:     'Lister les 47 endpoints, documenter payloads et dépendances clients.',
      status:          'done',
      priority:        'urgent',
      position:        1,
      estimated_hours: 16,
      due_date:        d(-21),
      completed_at:    new Date(now.getTime() - 20 * 86400000),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaApi,
      created_by:      IDS.bobAdmin,
      assigned_to:     IDS.bobAdmin,
      title:           'Définir le schéma GraphQL initial',
      description:     'Rédiger le schéma SDL pour Organization, User, Project, Task.',
      status:          'review',
      priority:        'high',
      position:        2,
      estimated_hours: 12,
      due_date:        d(2),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaApi,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.claraM,
      title:           'Mettre en place la couche DataLoader (N+1)',
      description:     'Implémenter DataLoader pour les resolvers imbriqués.',
      status:          'todo',
      priority:        'medium',
      position:        3,
      estimated_hours: 20,
      due_date:        d(35),
    },
    {
      organization_id: IDS.orgAlpha,
      project_id:      IDS.projAlphaApi,
      created_by:      IDS.aliceOwner,
      assigned_to:     IDS.bobAdmin,
      title:           'Maintenir la rétrocompatibilité API v1 (6 mois)',
      description:     'Wrapper de traduction REST→GraphQL pour les clients existants.',
      status:          'in_progress',
      priority:        'urgent',
      position:        4,
      estimated_hours: 32,
      due_date:        d(14),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ORG BETA — Application Mobile MVP (5 tâches)
    // ═══════════════════════════════════════════════════════════════════════
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaMobile,
      created_by:      IDS.diegoOwner,
      assigned_to:     IDS.faridM,
      title:           'Setup React Native + Expo + navigation',
      description:     'Initialiser Expo, configurer React Navigation v6 et CI Expo EAS.',
      status:          'done',
      priority:        'urgent',
      position:        1,
      estimated_hours: 8,
      due_date:        d(-7),
      completed_at:    new Date(now.getTime() - 6 * 86400000),
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaMobile,
      created_by:      IDS.emmaAdmin,
      assigned_to:     IDS.faridM,
      title:           'Écran d\'authentification (login / register)',
      description:     'Formulaires, validation Zod, gestion du JWT en SecureStore.',
      status:          'in_progress',
      priority:        'high',
      position:        2,
      estimated_hours: 16,
      due_date:        d(5),
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaMobile,
      created_by:      IDS.diegoOwner,
      assigned_to:     IDS.emmaAdmin,
      title:           'Liste et détail des tâches (offline-first)',
      description:     'TanStack Query + MMKV pour persistance hors ligne.',
      status:          'todo',
      priority:        'high',
      position:        3,
      estimated_hours: 24,
      due_date:        d(18),
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaMobile,
      created_by:      IDS.emmaAdmin,
      assigned_to:     IDS.faridM,
      title:           'Notifications push (Expo Notifications)',
      description:     'Intégrer Expo Notifications avec backend webhook pour les assignations.',
      status:          'todo',
      priority:        'medium',
      position:        4,
      estimated_hours: 12,
      due_date:        d(35),
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaMobile,
      created_by:      IDS.diegoOwner,
      assigned_to:     null,
      title:           'Publication sur l\'App Store et Google Play',
      description:     'Préparer les assets (icônes, screenshots) et soumettre à review.',
      status:          'todo',
      priority:        'low',
      position:        5,
      estimated_hours: 8,
      due_date:        d(90),
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ORG BETA — Infrastructure Cloud (3 tâches)
    // ═══════════════════════════════════════════════════════════════════════
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
      due_date:        d(-30),
      completed_at:    new Date(now.getTime() - 28 * 86400000),
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaInfra,
      created_by:      IDS.emmaAdmin,
      assigned_to:     IDS.faridM,
      title:           'Écrire les modules Terraform (VPC, ECS, RDS)',
      description:     'Modules réutilisables : VPC, cluster ECS, RDS PostgreSQL 16, ElastiCache.',
      status:          'in_progress',
      priority:        'high',
      position:        2,
      estimated_hours: 40,
      due_date:        d(-5),
    },
    {
      organization_id: IDS.orgBeta,
      project_id:      IDS.projBetaInfra,
      created_by:      IDS.diegoOwner,
      assigned_to:     null,
      title:           'Valider le plan de migration des données',
      description:     'Procédure zero-downtime avec pg_dump + restore + validation checksum.',
      status:          'todo',
      priority:        'medium',
      position:        3,
      estimated_hours: 8,
      due_date:        d(10),
    },

  ]); // 20 tâches au total

  console.log('✓ Seed 01 : 2 orgs · 6 users · 4 projects · 20 tasks insérés.');
};
