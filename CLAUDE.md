# CLAUDE.md — TaskFlow

> Ce fichier fait autorité sur tout autre fichier de configuration.
> Claude Code DOIT appliquer toutes les règles ci-dessous à chaque session, sans exception.

---

## 1. Overview

TaskFlow est un SaaS multi-tenant de gestion de projets et de tâches.
Chaque organisation est totalement isolée : aucun utilisateur ne peut accéder aux données d'une autre organisation.

**Stack technique**
- Backend : Node.js 20 LTS · Express 4 · Knex.js 3
- Base de données : PostgreSQL 16
- Cache : Redis 7
- Frontend : React 18 · Vite 5
- Tests : Jest (unit + intégration) · Playwright (E2E)
- Conteneurs : Docker multi-stage builds
- CI/CD : GitHub Actions

**Commandes courantes**
```bash
npm run dev              # démarrer le serveur de développement
npm test                 # lancer tous les tests
npx knex migrate:latest  # exécuter les migrations
npx knex seed:run        # exécuter les seeds
docker compose up -d     # démarrer les conteneurs
```

---

## 2. Architecture

```
Request → Route → Controller → Service → Repository → Database
```

**Règles de couche — absolues**

- R01 · Les routes ne contiennent que la définition du endpoint et l'appel au controller. Zéro logique métier.
- R02 · Les controllers ne font que valider l'input, appeler le service, et formater la réponse HTTP. Zéro logique métier.
- R03 · Les services contiennent toute la logique métier. Ils appellent les repositories, jamais la base directement.
- R04 · Les repositories sont le seul endroit où des requêtes SQL / Knex sont écrites.
- R05 · Le module `src/api/` du frontend est le seul endroit où `fetch()` est appelé. Aucun composant ne fait de requête directe.

**Structure des dossiers**

```
backend/src/
  controllers/   # R02
  services/      # R03
  repositories/  # R04
  routes/        # R01
  middleware/    # auth, validation, error-handler
  database/
    migrations/  # fichiers Knex
    seeds/       # données de test
  cache/         # wrappers Redis

frontend/src/
  api/           # fetch() uniquement ici — R05
  components/    # composants réutilisables, sans état global
  features/      # domaines fonctionnels (tasks, projects, auth…)
  styles/        # variables CSS, thème global
  pages/         # assemblage de composants par route

docs/            # documentation projet et ADR
prompts/         # prompts réutilisables pour les LLM
```

---

## 3. Coding Conventions

- R06 · Tous les identifiants primaires sont des **UUID v4** (`uuid_generate_v4()`). Jamais d'entiers auto-incrémentés comme PK exposée.
- R07 · Nommage snake_case pour les colonnes SQL, camelCase pour les variables JS/TS.
- R08 · Chaque fichier exporte une seule responsabilité principale. Pas de fichiers "god".
- R09 · Les variables d'environnement sont lues une seule fois dans `config.js` (ou `config.ts`). Jamais de `process.env.X` éparpillé dans le code.
- R10 · Les constantes métier (statuts, rôles, limites) sont définies dans `src/constants/`. Jamais en dur dans le code.
- R11 · Pas de `console.log` en production. Utiliser le logger structuré (`pino` ou équivalent) avec les niveaux `info`, `warn`, `error`.

---

## 4. Database Rules

- R12 · **Soft-delete obligatoire** sur toutes les tables métier : colonne `deleted_at TIMESTAMPTZ DEFAULT NULL`. Jamais de `DELETE` physique sur des entités utilisateur. Les requêtes de lecture filtrent systématiquement `WHERE deleted_at IS NULL`.
- R13 · Toute requête qui récupère un enregistrement par ID **DOIT** aussi filtrer par `organization_id`. Exemple :
  ```js
  .where({ id, organization_id, deleted_at: null })
  ```
- R14 · Les migrations sont irréversibles en production : fournir systématiquement les méthodes `up` et `down`, mais ne jamais exécuter `down` en prod sans validation explicite.
- R15 · Les colonnes `created_at` et `updated_at` sont présentes sur toutes les tables, alimentées automatiquement (`DEFAULT NOW()` + trigger ou hook Knex).
- R16 · Les index sont créés sur toutes les colonnes utilisées en `WHERE` ou `JOIN` fréquents (`organization_id`, `user_id`, `status`, `deleted_at`).
- R17 · Les mots de passe sont hachés avec **bcrypt, facteur de coût ≥ 12**. Jamais stockés en clair ou avec MD5/SHA.

---

## 5. Testing Rules

- R18 · **Les tests sont écrits avant l'implémentation** (TDD). Pas de PR sans tests.
- R19 · Chaque endpoint API doit avoir au minimum quatre cas de test :
  - `200/201` — succès
  - `401` — non authentifié
  - `403` — authentifié mais non autorisé (accès inter-organisation → **403, jamais 404**)
  - `422` — données invalides
- R20 · Les tests d'intégration frappent une vraie base PostgreSQL de test. Pas de mock de base de données.
- R21 · Chaque test nettoie ses données (`afterEach` / transactions rollback). Les tests sont indépendants et peuvent s'exécuter dans n'importe quel ordre.

---

## 6. Frontend Rules

- R22 · Chaque opération asynchrone expose **trois états explicites : `loading` / `success` / `error`**. L'UI doit rendre un état visible pour chacun (spinner, contenu, message d'erreur). Pas d'état silencieux.
- R23 · Les **JWT sont stockés en cookie `httpOnly`, `Secure`, `SameSite=Strict`**. Jamais dans `localStorage` ni `sessionStorage`.
- R24 · Les formulaires valident les données côté client avant envoi, mais la validation côté serveur reste la source de vérité.
- R25 · Les composants sont découplés de la logique de fetch. Un composant reçoit des données via props ou un hook custom — il n'appelle jamais `fetch()` directement.
- R26 · Les messages d'erreur affichés à l'utilisateur sont humainement lisibles et ne révèlent aucun détail technique (stack trace, nom de table, requête SQL).

---

## 7. Forbidden Patterns

Les patterns suivants sont interdits. Claude Code ne les produira jamais, même si la requête les demande explicitement.

| # | Pattern interdit | Raison |
|---|-----------------|--------|
| F1 | `DELETE FROM … WHERE id = ?` sans `organization_id` | Violation d'isolation multi-tenant |
| F2 | `DELETE` physique sur une entité utilisateur | Viole le soft-delete (R12) |
| F3 | `localStorage.setItem('token', …)` | Viole la politique JWT (R23) |
| F4 | `process.env.X` hors de `config.js` | Viole R09 |
| F5 | Logique métier dans un controller ou une route | Viole R01–R02 |
| F6 | `fetch()` dans un composant React | Viole R05 et R25 |
| F7 | Retourner `404` pour un accès inter-organisation | Doit être `403` (R19) |
| F8 | Clé primaire entière auto-incrémentée exposée en API | Viole R06 |
| F9 | Mot de passe haché avec MD5, SHA-1 ou SHA-256 | Viole R17 |
| F10 | Migration sans méthode `down` | Viole R14 |

---

## 8. Security Rules

- R27 · Authentification : JWT en cookie `httpOnly`, `Secure`, `SameSite=Lax`. Jamais `localStorage`.
- R28 · Hachage de mot de passe : bcrypt avec facteur de coût ≥ 12. Jamais MD5, SHA-256, ou texte clair.
- R29 · Rate limit sur les endpoints d'auth : 5 tentatives par 15 minutes par IP. Réponse 429 avec `retry_after`.
- R30 · Valider **tous** les inputs utilisateur avec Joi à la frontière de la route. Ne jamais faire confiance à `req.body` sans validation.
- R31 · Headers de sécurité via Helmet : CSP, HSTS (prod uniquement), X-Frame-Options: deny, X-Content-Type-Options: nosniff, Referrer-Policy.
- R32 · CORS : liste d'origines explicites (`CORS_ORIGIN` env). Jamais de wildcard `*` en production.
- R33 · Secrets via variables d'environnement uniquement. Ne jamais committer `.env`. Ne jamais hardcoder.

---

## 9. Testing Rules (E2E)

- R34 · Les tests E2E couvrent les parcours critiques : inscription, connexion, création de tâche, visualisation de tâche.
- R35 · Les tests E2E tournent contre une base de test dédiée (`taskflow_test_e2e`), isolée de la base dev et de la base unit-test.
- R36 · Chaque test E2E est indépendant : pas d'état partagé entre les tests, fixtures réinitialisées dans `beforeEach`.

---

## 10. Deployment Rules

- R37 · Dockerfiles multi-stage : séparer le stage build du stage runtime. L'image finale utilise une base slim (alpine).
- R38 · Exécuter en tant qu'utilisateur non-root dans les conteneurs (`USER 1000` ou utilisateur nommé).
- R39 · Endpoint de healthcheck à `GET /healthz` retournant 200 + JSON status (inclut un ping DB).
- R40 · Koyeb est la plateforme de production. Région unique proche d'Abidjan : `fra` (Frankfurt).
- R41 · Pas de secrets dans `Dockerfile` ou `koyeb.yaml`. Tous via `koyeb secret create`.

---

## 11. Observability Rules

- R42 · Logs structurés en JSON. Jamais de `console.log()` en code de production. Utiliser Pino avec `level=info` par défaut, `level=debug` en dev.
- R43 · Chaque requête reçoit un `correlation_id` (UUID v4) à l'entrée, propagé dans tous les logs et appels downstream.
- R44 · Chaque log d'erreur inclut : `correlation_id`, `user_id` (si connu), `organization_id` (si connu), `error.name`, `error.message`, `error.stack`.

---

## 12. Always-On Behaviors

Ces comportements s'appliquent **automatiquement**, sans qu'il soit nécessaire de les demander.

- **Avant toute implémentation** : vérifier qu'un test couvrant le comportement existe (R18).
- **À chaque nouvelle table** : inclure `id UUID`, `organization_id UUID`, `created_at`, `updated_at`, `deleted_at` et les index associés (R06, R13, R12, R16).
- **À chaque nouveau endpoint** : générer les quatre tests minimaux success / 401 / 403 / 422 (R19).
- **À chaque composant avec fetch** : déplacer le fetch dans `src/api/`, exposer les trois états loading/success/error (R05, R22).
- **À chaque réponse d'erreur** : vérifier que le message est safe pour l'utilisateur final (R26).
- **À chaque query par ID** : s'assurer que `organization_id` est dans le `WHERE` (R13).
- **En cas de doute sur la couche** : se référer au diagramme Request → Route → Controller → Service → Repository (R01–R04).
