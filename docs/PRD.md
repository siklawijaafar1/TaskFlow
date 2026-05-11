# PRD — TaskFlow · Tranche Verticale Checkpoint 1

> **Version** : 1.0 · **Date** : 2026-05-11  
> **Statut** : Approuvé — implémentation en cours  
> **Auteur** : Équipe Produit TaskFlow

---

## 1. Vue d'ensemble

### 1.1 Contexte

TaskFlow est un SaaS multi-tenant de gestion de projets et de tâches destiné aux petites et moyennes équipes de développement. Chaque organisation est un silo étanche : aucun utilisateur ne peut accéder aux données d'une autre organisation.

Le Checkpoint 1 livre la **tranche verticale minimale** : création et consultation d'une tâche, de la base de données jusqu'à l'interface utilisateur, en passant par l'API REST.

### 1.2 Problème à résoudre

Les équipes de développement perdent en moyenne **2,3 heures par semaine** à jongler entre des outils de suivi fragmentés (tickets GitHub, Notion, feuilles de calcul). TaskFlow centralise le suivi en offrant une source de vérité unique par organisation.

### 1.3 Objectifs mesurables (Checkpoint 1)

| Objectif | Indicateur | Cible |
|---|---|---|
| API fonctionnelle | Tests verts TDD | 100 % (12/12 cas) |
| Isolation multi-tenant | 403 sur accès inter-org | Systématique |
| Interface utilisable | États loading/success/error | Visibles dans l'UI |
| Qualité du code | Respect des règles CLAUDE.md | 0 violation F1–F10 |

---

## 2. Utilisateurs cibles

### 2.1 Personas

**Persona A — Alice, Tech Lead (organisation propriétaire)**
- Crée les projets et délègue les tâches à son équipe
- A besoin d'une vue rapide de l'avancement sans fouiller dans le code
- Frustration principale : les outils existants ne respectent pas la confidentialité inter-clients

**Persona B — Bob, Développeur senior (membre)**
- Reçoit des tâches assignées et met à jour leur statut
- Travaille en multi-onglets et attend des retours instantanés
- Frustration principale : les formulaires qui perdent les données après une erreur

### 2.2 Anti-personas (hors scope Checkpoint 1)

- Utilisateurs non authentifiés (pas de mode public)
- Organisations multi-fuseaux horaires (internationalisation reportée)
- Clients mobiles natifs (web uniquement pour cette tranche)

---

## 3. Périmètre fonctionnel — Checkpoint 1

### 3.1 User stories incluses

#### US-01 · Créer une tâche

```
En tant que membre authentifié d'une organisation,
Je veux créer une tâche dans un projet qui m'appartient,
Afin de suivre une unité de travail avec titre, priorité et statut.
```

**Critères d'acceptation :**
- [ ] POST /api/v1/tasks retourne 201 avec le document complet
- [ ] Le champ `title` est obligatoire (422 si absent ou vide)
- [ ] Le champ `project_id` est obligatoire (422 si absent)
- [ ] Les valeurs invalides de `status` ou `priority` retournent 422
- [ ] Un utilisateur non authentifié reçoit 401
- [ ] Un utilisateur d'une autre organisation reçoit 403 (jamais 404)
- [ ] Les champs par défaut : `status = todo`, `priority = medium`

#### US-02 · Consulter une tâche

```
En tant que membre authentifié de l'organisation propriétaire,
Je veux accéder au détail d'une tâche par son identifiant,
Afin d'en consulter toutes les informations sans pouvoir accéder aux tâches d'autres organisations.
```

**Critères d'acceptation :**
- [ ] GET /api/v1/tasks/:id retourne 200 avec le document complet
- [ ] Un utilisateur non authentifié reçoit 401
- [ ] Un utilisateur d'une autre organisation reçoit 403 (pas 404)
- [ ] Une tâche supprimée (soft-delete) retourne 403
- [ ] Un id inexistant retourne 403 (pas 404 — R19)

#### US-03 · Voir la liste de ses tâches

```
En tant que membre authentifié,
Je veux voir la liste des tâches de mon organisation avec états de chargement clairs,
Afin de suivre l'avancement en temps réel.
```

**Critères d'acceptation :**
- [ ] Affiche un skeleton de chargement (état loading)
- [ ] Affiche les tâches sous forme de cartes (état success)
- [ ] Affiche un message d'erreur humain (état error)
- [ ] Affiche un état vide si aucune tâche

#### US-04 · Formulaire de création de tâche

```
En tant que membre authentifié,
Je veux créer une tâche via un formulaire avec validation en temps réel,
Afin d'éviter les allers-retours avec le serveur pour des erreurs basiques.
```

**Critères d'acceptation :**
- [ ] Validation côté client avant envoi (titre requis, projet requis)
- [ ] Affiche les erreurs par champ avec message lisible
- [ ] Affiche un spinner pendant la soumission
- [ ] Affiche une bannière de succès après création
- [ ] Ne révèle aucun détail technique dans les messages d'erreur

### 3.2 User stories exclues (backlog)

- US-05 : Modifier une tâche (PATCH /api/v1/tasks/:id)
- US-06 : Supprimer (soft-delete) une tâche
- US-07 : Assigner une tâche à un membre
- US-08 : Filtrer les tâches par statut/priorité
- US-09 : Vue Kanban
- US-10 : Notifications temps réel (WebSocket)

---

## 4. Exigences non-fonctionnelles

### 4.1 Sécurité (non-négociable)

| Règle | Exigence |
|---|---|
| Multi-tenant isolation | Chaque query par ID filtre sur `organization_id` (R13) |
| Authentification | JWT en cookie `httpOnly`, `Secure`, `SameSite=Strict` (R23) |
| Mots de passe | bcrypt, facteur ≥ 12 (R17) |
| Soft-delete | Jamais de DELETE physique sur entité utilisateur (R12) |
| Réponses inter-org | 403, jamais 404 (F7) |

### 4.2 Architecture

- Séparation stricte Route → Controller → Service → Repository (R01–R04)
- `fetch()` uniquement dans `frontend/src/api/` (R05, R25)
- UUID v4 comme clés primaires exposées (R06)
- Variables d'environnement centralisées dans `config.js` (R09)

### 4.3 Performance

- Réponse API < 200 ms (p95) en développement local avec DB locale
- Skeleton de chargement affiché immédiatement (0 ms latence perçue)

### 4.4 Accessibilité

- Attributs ARIA sur tous les états (loading, error, empty)
- Navigation clavier sur les cartes cliquables
- Messages d'erreur liés aux champs via `aria-describedby`

---

## 5. Modèle de données — entités du Checkpoint 1

### 5.1 Entité `Task`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| id | UUID | PK, NOT NULL | Identifiant unique v4 |
| organization_id | UUID | FK → organizations, NOT NULL | Isolation multi-tenant |
| project_id | UUID | FK → projects, NOT NULL | Projet parent |
| created_by | UUID | FK → users, NOT NULL | Créateur de la tâche |
| assigned_to | UUID | FK → users, NULL | Assignataire (optionnel) |
| parent_task_id | UUID | FK → tasks, NULL | Tâche parente (sous-tâche) |
| title | VARCHAR(500) | NOT NULL | Titre de la tâche |
| description | TEXT | NULL | Contexte détaillé |
| status | ENUM | NOT NULL, défaut 'todo' | todo / in_progress / review / done |
| priority | ENUM | NOT NULL, défaut 'medium' | low / medium / high / urgent |
| position | INTEGER | NOT NULL, défaut 0 | Ordre dans la colonne Kanban |
| estimated_hours | DECIMAL(5,2) | NULL | Estimation en heures |
| actual_hours | DECIMAL(5,2) | NULL | Temps réel passé |
| due_date | DATE | NULL | Date d'échéance |
| completed_at | TIMESTAMPTZ | NULL | Horodatage de complétion |
| deleted_at | TIMESTAMPTZ | NULL | Soft-delete (R12) |
| created_at | TIMESTAMPTZ | NOT NULL, défaut NOW() | Création automatique |
| updated_at | TIMESTAMPTZ | NOT NULL, défaut NOW() | Mise à jour automatique |

### 5.2 Contrat API

#### POST /api/v1/tasks

**Corps de la requête :**
```json
{
  "project_id":      "uuid",
  "title":           "string (requis, non vide)",
  "description":     "string (optionnel)",
  "status":          "todo | in_progress | review | done (défaut: todo)",
  "priority":        "low | medium | high | urgent (défaut: medium)",
  "estimated_hours": "number (optionnel)",
  "due_date":        "date ISO (optionnel)",
  "assigned_to":     "uuid (optionnel)"
}
```

**Réponses :**
| Code | Corps | Condition |
|---|---|---|
| 201 | `{ task: TaskObject }` | Succès |
| 401 | `{ error: "Authentication required" }` | Cookie absent/invalide |
| 403 | `{ error: "Project not found" }` | Projet hors organisation |
| 422 | `{ error: "title is required" }` | Validation échouée |

#### GET /api/v1/tasks/:id

**Réponses :**
| Code | Corps | Condition |
|---|---|---|
| 200 | `{ task: TaskObject }` | Succès, tâche visible |
| 401 | `{ error: "Authentication required" }` | Cookie absent/invalide |
| 403 | `{ error: "Task not found" }` | Hors org, supprimée, inexistante |

---

## 6. Critères de validation du Checkpoint 1

### 6.1 Tests automatisés (obligatoires)

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
  ✓ 403 — isolation multi-tenant : org B ne peut pas créer dans org A

GET /api/v1/tasks/:id
  ✓ 200 — retourne la tâche à son organisation propriétaire
  ✓ 401 — rejette une requête sans cookie
  ✓ 403 — isolation multi-tenant : org B ne peut pas lire la tâche de org A
  ✓ 403 — retourne 403 (pas 404) pour un id inexistant
  ✓ 403 — un utilisateur supprimé (soft-delete) ne voit plus sa tâche
```

### 6.2 Checklist de livraison

- [ ] `npm test` passe à 100 % (aucun test rouge)
- [ ] `docs/PRD.md` — ce fichier, approuvé
- [ ] `docs/PLAN.md` — plan d'implémentation validé
- [ ] Migrations Knex : 3 fichiers minimum (orgs+users, projects, tasks)
- [ ] Seed : 20 tâches réalistes réparties sur 2 organisations
- [ ] Composants React : TaskCard, TaskList, TaskCreate (3 états chacun)
- [ ] Branch `checkpoint-1` pushée sur GitHub

---

## 7. Risques et hypothèses

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Schema drift entre db/ et backend/ migrations | Moyenne | Haut | Utiliser uniquement les migrations backend, supprimer l'ambiguïté |
| JWT secret mal configuré en test | Faible | Haut | `process.env.JWT_SECRET` défini dans le setup Jest |
| Seed qui casse les tests (data stale) | Moyenne | Moyen | Tests auto-nettoyants via `beforeEach` truncation |
| Accès inter-org retournant 404 au lieu de 403 | Faible | Haut | Rule F7 codée dans errorHandler + tests dédiés |

---

## 8. Glossaire

| Terme | Définition |
|---|---|
| Organisation | Tenant isolé — silo de données complet |
| Soft-delete | Marquage `deleted_at IS NOT NULL` ; jamais de DELETE physique |
| Multi-tenant isolation | Chaque query filtre systématiquement sur `organization_id` |
| TDD | Test-Driven Development : tests écrits avant l'implémentation |
| UUID v4 | Identifiant universel aléatoire, format 8-4-4-4-12 hexadécimal |
