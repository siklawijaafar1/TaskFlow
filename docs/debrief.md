# TaskFlow — Auto-debrief

---

# Auto-debrief Checkpoint 1

*(Rédigé lors du Checkpoint 1 — voir commit checkpoint-1)*

## 1. Quel concept ai-je le moins compris ?
La mise en place du schéma multi-tenant (organization_id sur toutes les tables) et la règle de retourner 403 (pas 404) pour les accès inter-organisation. Le concept est simple mais le réflexe est contre-intuitif au début.

## 2. Quelle difficulté m'a pris le plus de temps à résoudre ?
La configuration de Knex pour les migrations avec plusieurs environnements (dev/test/production) et le `knexfile.js` qui lit les variables d'env correctement.

## 3. Que referais-je différemment ?
Écrire d'abord les tests (TDD strict) plutôt de valider l'implémentation en cours de route. Cela aurait rendu chaque étape plus claire.

## 4. Qu'est-ce que j'ai le mieux compris ?
L'architecture en couches : Route → Controller → Service → Repository. Une fois ce patron intériorisé, chaque ajout de fonctionnalité suit le même chemin prévisible.

---

# Auto-debrief Checkpoint 2

## 1. Quel concept des Modules 6-10 ai-je le moins compris, et que dois-je relire ?

Le concept que j'ai le moins maîtrisé est le pipeline de déploiement Koyeb dans son ensemble — en particulier comment le `koyeb.yaml` orchestre les secrets (référencés par nom, jamais inline), comment le healthcheck influe sur le rolling update, et comment supervisord gère les deux processus (nginx + Node) dans un seul conteneur. Ce sont des couches que j'ai configurées sans en comprendre toutes les interactions. À relire : la documentation Koyeb sur les services, le comportement du healthcheck grace_period, et la documentation supervisord sur autorestart.

## 2. Quelle erreur de production aurait pu être catastrophique, et qu'est-ce qui l'a évitée ?

L'endpoint `POST /api/test/reset-db` qui tronque toutes les tables. Si cet endpoint avait été exposé en production, n'importe qui aurait pu détruire toute la base de données en un seul appel HTTP. Ce qui l'a évité : la garde `if (process.env.NODE_ENV === 'test_e2e')` dans `app.js`, qui rend l'endpoint inexistant dans tout autre environnement. Second exemple : committer un JWT_SECRET en clair dans Git — évité par `.gitignore` strict et la discipline `koyeb secret create` (valeur jamais stockée localement en clair après création).

## 3. Si je devais refaire ce Checkpoint 2 en 3 heures au lieu de 5, qu'est-ce que je couperais ?

Je couperais les tests E2E complets (Playwright) et me contenterais d'un smoke test minimal (homepage loads). Les tests E2E sont précieux mais coûteux à maintenir. Je garderais en priorité : l'auth JWT réelle, Helmet/CORS/rate-limit, le Dockerfile, la CI GitHub Actions, et Pino logging — ce sont les fondations non-négociables. Le runbook et l'audit Lighthouse seraient la deuxième priorité. Le cache Redis passerait en dernier.

## 4. Quel module continuera d'être utile dans tous mes projets futurs, et lequel était spécifique à TaskFlow ?

**Universellement utiles (chaque projet futur) :**
- Module 6 (sécurité) : JWT httpOnly cookies, bcrypt, rate limiting, Helmet, CORS allow-list — ce sont des standards applicables à tout SaaS web.
- Module 8 (Docker multi-stage) : le patron build/runtime séparé et `.dockerignore` s'applique à n'importe quel backend Node.js.
- Module 9 (CI/CD) : le workflow GitHub Actions tests → build → deploy est identique quel que soit le projet.
- Module 10 (Pino + correlation_id) : le logging structuré JSON est indispensable dès qu'on a plus d'un utilisateur.

**Spécifique à TaskFlow :**
- La stratégie de cache Redis avec le pattern `tasks:org:<id>:*` — elle est liée au modèle de domaine multi-tenant de TaskFlow (listes de tâches par organisation). Un autre projet avec un autre modèle de données aura une stratégie de cache différente.
- Le mono-conteneur nginx+Node+supervisord — c'est une optimisation pour le free tier Koyeb à 1 service. Dans un projet avec plus de ressources, on séparerait les deux services.
