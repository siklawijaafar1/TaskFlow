# PLAN — TaskFlow · Tranche Verticale Checkpoint 1

> **Version** : 1.0 · **Date** : 2026-05-11  
> **Statut** : Validé (passe critique Architecte + Critique)  
> **Référence** : PRD.md v1.0

---

## Passe 1 — Revue Critique

> *Rôle : chercher les failles, les ambiguïtés, les violations des règles CLAUDE.md.*

### Problèmes identifiés avant implémentation

| # | Problème | Règle violée | Résolution |
|---|---|---|---|
| C1 | `project.repository.js` n'applique pas le soft-delete sur `findById` et `findAllByOrg` | R12 | Ajouter `.whereNull('deleted_at')` dans les deux queries |
| C2 | Le seed `db/seeds/001_base_data.js` utilise la colonne `full_name` alors que la migration `users` définit `name` | R07 | Corriger le seed ou éliminer l'ambiguïté |
| C3 | Le seed `db/seeds/001_base_data.js` insère `status: 'in_review'` alors que l'enum tasks backend accepte `'review'` | R10 | Aligner le seed sur les constantes du service |
| C4 | Deux jeux de migrations coexistent (`db/migrations/` et `backend/src/database/migrations/`) — risque de désynchronisation | R04 | Le backend est la source de vérité ; les tests utilisent ces migrations |
| C5 | `errorHandler.js` utilise `console.error` en production | R11 | Remplacer par le logger structuré (`winston`) |
| C6 | Seed backend `01_demo_data.js` ne contient que 2 tâches — le cahier des charges en exige 20 sur 2 orgs | — | Réécrire le seed complet |
| C7 | Le test GET utilise `priority: 'urgent'` dans un champ POST — vérifier que la validation l'accepte | R19 | Confirmé valide : `['low', 'medium', 'high', 'urgent']` ✓ |

### Verdict Critique

**Go** — les problèmes sont localisés, aucun n'est bloquant architecturalement.  
Actions obligatoires avant merge : C1, C3, C6. Actions recommandées : C2, C5.

---

## Passe 2 — Plan Architecte

> *Rôle : définir l'ordre d'implémentation, les dépendances et les points de contrôle.*

---

## Bloc A — Configuration & Documentation ✅

### A1 · CLAUDE.md
**Statut :** Complété  
**Fichier :** `CLAUDE.md`  
**Contenu :** 26 règles (R01–R26), 10 patterns interdits (F1–F10), 8 behaviors always-on.

### A2 · PRD.md
**Statut :** Complété  
**Fichier :** `docs/PRD.md`  
**Contenu :** Personas, US-01 à US-04, contrat API, critères de validation.

### A3 · PLAN.md
**Statut :** En cours (ce fichier)  
**Fichier :** `docs/PLAN.md`

---

## Bloc B — Infrastructure Docker & Base de données

### B1 · docker-compose.dev.yml
**Statut :** Complété  
**Services :** PostgreSQL 16 (port 5432), Redis 7 (port 6379)

```yaml
# Extrait — configuration complète dans le fichier
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: taskflow_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### B2 · .env.example
**Statut :** Complété  
Variables : `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `REDIS_URL`, `PORT`, `FRONTEND_URL`

### B3 · knexfile.js
**Statut :** Complété (backend/knexfile.js)  
Environnements : `development`, `test`, `production`

---

## Bloc C — Migrations & Seed

### C1 · Migrations Knex (backend/src/database/migrations/)

| Fichier | Table | Colonnes clés |
|---|---|---|
| `20240101_001_create_organizations.js` | organizations | id UUID, name, slug, timestamps |
| `20240101_002_create_users.js` | users | id UUID, organization_id FK, email, password_hash, name, role, timestamps |
| `20240101_003_create_projects.js` | projects | id UUID, organization_id FK, created_by FK, name, description, status, timestamps |
| `20240101_004_create_tasks.js` | tasks | id UUID, organization_id FK, project_id FK, created_by FK, assigned_to FK, title, description, status, priority, due_date, timestamps |
| `20260428_005_add_soft_delete.js` | toutes | `deleted_at TIMESTAMPTZ NULL` sur organizations, users, projects, tasks |
| `20260428_006_add_task_fields.js` | tasks | parent_task_id, position, estimated_hours, actual_hours, completed_at |

**Règles respectées :** R06 (UUID), R12 (soft-delete), R13 (organization_id FK), R14 (méthodes up+down), R15 (timestamps), R16 (index)

### C2 · Seed — 20 tâches sur 2 organisations

**Statut :** Mis à jour  
**Fichier :** `backend/src/database/seeds/01_demo_data.js`

```
Organisation A — Alpha Studio
  ├── Projet : Dashboard Redesign (8 tâches)
  └── Projet : API v2 Migration (4 tâches)

Organisation B — Beta Ventures  
  ├── Projet : Application Mobile MVP (5 tâches)
  └── Projet : Infrastructure Cloud (3 tâches)

Total : 20 tâches · 2 orgs · 4 projets · 6 utilisateurs
```

**Statuts et priorités variés :** todo, in_progress, review, done × low, medium, high, urgent  
**Mot de passe** : `TaskFlow2026!` haché bcrypt(12) — R17

---

## Bloc D — API Backend (TDD)

### Méthodologie TDD appliquée

```
1. Écrire le test (RED)
2. Vérifier que le test échoue pour la bonne raison
3. Écrire l'implémentation minimale (GREEN)
4. Refactorer sans casser les tests
```

### D1 · Middleware `authenticate`

**Fichier :** `backend/src/middleware/authenticate.js`  
**Responsabilité :** Vérifie le cookie JWT `httpOnly`, peuple `req.user`

```js
// Pseudo-code
function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = { ...jwt.verify(token, JWT_SECRET), id: payload.sub };
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}
```

### D2 · Repository — `task.repository.js`

**Fichier :** `backend/src/repositories/task.repository.js`  
**Fonctions :** `findAllByOrg`, `findById`, `create`, `update`, `softDelete`

**Pattern obligatoire (R12 + R13) :**
```js
function findById(organizationId, id) {
  return db('tasks')
    .where({ id, organization_id: organizationId })
    .whereNull('deleted_at')   // R12
    .select(PUBLIC_COLUMNS)
    .first();
}
```

### D3 · Service — `task.service.js`

**Fichier :** `backend/src/services/task.service.js`  
**Responsabilité :** Logique métier (validation, 403 inter-org)

**Décisions clés :**
- Retourne 403 (pas 404) pour tout accès hors-org ou tâche supprimée — F7
- Valide `status` ∈ `['todo', 'in_progress', 'review', 'done']` — R10
- Valide `priority` ∈ `['low', 'medium', 'high', 'urgent']` — R10
- Vérifie que `project_id` appartient à `organizationId` avant création

### D4 · Controller — `task.controller.js`

**Fichier :** `backend/src/controllers/task.controller.js`  
**Responsabilité :** Délègue au service, formate la réponse HTTP. Zéro logique métier — R02

### D5 · Routes — `task.routes.js`

**Fichier :** `backend/src/routes/task.routes.js`  
**Responsabilité :** Définit les endpoints, applique `authenticate`. Zéro logique métier — R01

```
GET    /api/v1/tasks          → taskController.list
POST   /api/v1/tasks          → taskController.create
GET    /api/v1/tasks/:id      → taskController.getById
PUT    /api/v1/tasks/:id      → taskController.update
DELETE /api/v1/tasks/:id      → taskController.remove
```

### D6 · Tests d'intégration

**Fichier :** `src/features/tasks/tasks.test.js`  
**Couverture :** 14 cas de test (POST × 9, GET × 5)

```
POST /api/v1/tasks
  ✓ 201 — crée une tâche et retourne le document complet
  ✓ 201 — les champs optionnels ont des valeurs par défaut sensées
  ✓ 401 — rejette une requête sans cookie d'authentification
  ✓ 422 — rejette si title est absent
  ✓ 422 — rejette si title est une chaîne vide
  ✓ 422 — rejette si project_id est absent
  ✓ 422 — rejette une valeur de status invalide
  ✓ 422 — rejette une valeur de priority invalide
  ✓ 403 — isolation multi-tenant : org B ≠ org A

GET /api/v1/tasks/:id
  ✓ 200 — retourne la tâche à son organisation propriétaire
  ✓ 401 — rejette une requête sans cookie
  ✓ 403 — isolation multi-tenant : org B ne lit pas org A
  ✓ 403 — 403 (pas 404) pour id inexistant
  ✓ 403 — tâche soft-deleted invisible
```

**Auth mockée :** `makeAuthCookie(userId, orgId, role)` génère un JWT valide signé avec le vrai secret — pas de stub de middleware, le middleware réel tourne.

---

## Bloc E — Frontend React

### E1 · API Client — `frontend/src/api/`

**Fichier :** `frontend/src/api/tasks.js`  
**Règle :** Seul endroit où `fetch()` est appelé pour le domaine Task — R05

```js
export const tasksApi = {
  list(filters)    → GET /api/v1/tasks?...
  create(data)     → POST /api/v1/tasks
  getById(id)      → GET /api/v1/tasks/:id
  update(id, data) → PUT /api/v1/tasks/:id
  remove(id)       → DELETE /api/v1/tasks/:id
};
```

### E2 · Composant `TaskCard`

**Fichier :** `frontend/src/features/tasks/TaskCard.jsx`  
**Responsabilité :** Affiche le résumé d'une tâche (title, status, priority, due_date)  
**Props :** `task`, `onClick?`  
**Accessibilité :** `role="button"`, `tabIndex`, `onKeyDown` si cliquable

### E3 · Composant `TaskList`

**Fichier :** `frontend/src/features/tasks/TaskList.jsx`  
**Responsabilité :** Gère les 3 états obligatoires (R22)

| État | Rendu |
|---|---|
| `loading=true` | 3 blocs skeleton animés (pulse) |
| `error` défini | `<div role="alert">` avec message |
| `tasks.length === 0` | Message "aucune tâche" |
| Succès | `<ul>` de `<TaskCard>` |

### E4 · Composant `TaskCreate`

**Fichier :** `frontend/src/features/tasks/TaskCreate.jsx`  
**Responsabilité :** Formulaire de création avec validation et 3 états  
**États :** `loading` (spinner + disabled), `success` (bannière verte), `error` (message par champ ou global)  
**Validation côté client (R24) :** title non vide, project_id sélectionné  
**Sécurité (R26) :** Aucun détail technique dans les messages d'erreur affichés

### E5 · Design Tokens

**Fichier :** `frontend/src/styles/tokens.css`  
Variables CSS pour statuts, priorités, spacing, typographie, ombres, transitions.

---

## Bloc F — Audit UI

### F1 · Checklist d'audit appliquée

| Critère | Résultat | Action |
|---|---|---|
| Contraste WCAG AA (4.5:1) sur badges | ✅ Conforme | — |
| Focus visible sur éléments cliquables | ✅ `focus-visible` défini | — |
| Attributs ARIA sur états dynamiques | ✅ `aria-busy`, `aria-live`, `aria-label` | — |
| Messages d'erreur associés aux champs | ✅ `aria-describedby` | — |
| Taille minimale des zones de clic (44×44px) | ⚠️ Boutons < 44px en mobile | **Fixé** : `min-height: 44px` ajouté |
| Skeleton visible sans JS | ✅ CSS pur, pas de JS pour l'animation | — |
| Responsive ≤ 480px | ✅ `@media (max-width: 480px)` sur `.row` | — |
| Pas de `console.log` en production | ⚠️ `errorHandler.js` utilise `console.error` | Noté — correction post-checkpoint |

### F2 · Correctif appliqué — Boutons mobiles

**Problème :** Les boutons `.btnPrimary` et `.btnSecondary` n'atteignaient pas la taille minimale de 44×44 px recommandée par WCAG 2.5.5 sur mobile.

**Solution :**
```css
/* TaskCreate.module.css — fix audit UI */
.btnPrimary,
.btnSecondary {
  min-height: 44px;
}
```

---

## Bloc G — Git & Livraison

### G1 · Structure de branches

```
main
└── checkpoint-1   ← branche de livraison Checkpoint 1
```

### G2 · Commits sur `checkpoint-1`

```
feat: add CLAUDE.md with 26 rules (A)
feat: add PRD and PLAN documents (B)
feat: add Knex migrations (orgs, users, projects, tasks) (C)
feat: add seed with 20 tasks across 2 organizations (C)
feat: implement POST /api/v1/tasks with TDD tests (D)
feat: implement GET /api/v1/tasks/:id with TDD tests (D)
feat: add TaskCard, TaskList, TaskCreate React components (E)
fix: apply UI audit corrections (F)
chore: configure github actions CI (G)
```

### G3 · CI GitHub Actions

**Fichier :** `.github/workflows/ci.yml`  
**Jobs :** lint → test (Jest) → build  
**Déclencheur :** `push` et `pull_request` sur `main` et `checkpoint-1`

---

## Dépendances inter-blocs

```
A (CLAUDE.md, docs)
│
├─→ C (Migrations + Seed)
│     └─→ D (Tests TDD → Implémentation API)
│               └─→ E (Frontend connecté à l'API)
│                       └─→ F (Audit UI)
│
└─→ G (Git — une fois tous les blocs verts)
```

---

## Points de contrôle (Definition of Done)

### Checkpoint Bloc C
- [ ] `npx knex migrate:latest` s'exécute sans erreur
- [ ] `npx knex seed:run` insère exactement 20 tâches sur 2 orgs
- [ ] Seed idempotent (plusieurs runs = même état)

### Checkpoint Bloc D
- [ ] `npm test` : 14/14 tests verts
- [ ] Aucune query sans `organization_id` dans le WHERE
- [ ] Aucun 404 renvoyé pour un accès inter-organisation

### Checkpoint Bloc E
- [ ] État `loading` visible (skeleton)
- [ ] État `error` visible (message humain)
- [ ] État `success` visible (liste de cartes)
- [ ] Aucun `fetch()` dans un composant React

### Checkpoint Bloc F
- [ ] Contraste WCAG AA vérifié sur tous les badges
- [ ] Focus visible sur les éléments interactifs
- [ ] Boutons ≥ 44×44px sur mobile

### Checkpoint Final
- [ ] Branch `checkpoint-1` créée et pushée
- [ ] `npm test` passe à 100 %
- [ ] 0 violation des règles F1–F10 de CLAUDE.md
