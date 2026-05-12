# TaskFlow — Runbook d'incident

> Version 1.0 · Checkpoint 2 · Rédiger en temps de paix, utilisé en temps de guerre.

---

## Incidents fréquents

### 1. L'app ne répond plus (503 Service Unavailable)

**Diagnostic :**
```bash
koyeb service get taskflow/web
koyeb service logs taskflow/web -t runtime --tail 200
```

**Causes possibles :**
- Conteneur crashé (OOM, exception Node non gérée, healthcheck DB raté)
- Connection pool Postgres épuisé → `connection slots are reserved`
- Postgres en auto-sleep (voir incident 4)
- Quota free tier Koyeb dépassé (1 Go bande passante mensuelle)

**Résolution :**
```bash
koyeb service redeploy taskflow/web
```
Si récurrent : passer à `instance_type: nano` dans `koyeb.yaml` (~3 USD/mois).

---

### 2. Les utilisateurs voient une page blanche

**Diagnostic :**
```bash
curl https://taskflow-myorg.koyeb.app/healthz
curl -I https://taskflow-myorg.koyeb.app/
```

**Causes :**
- Conteneur en panne (voir incident 1)
- nginx démarré mais Express crashé → supervisord redémarre en boucle
  ```bash
  koyeb service logs taskflow/web | grep -i 'api\|error\|crash'
  ```
- Build frontend cassé (variable d'env manquante au build) → redéployer

---

### 3. Erreurs 500 sporadiques

**Diagnostic avec correlation_id :**
```bash
# Récupérer l'ID depuis l'header X-Correlation-Id (DevTools Network)
koyeb service logs taskflow/web -t runtime --tail 2000 | grep "<correlation_id>"
```
Tous les logs de cette requête s'affichent. La propagation `correlation_id` (Étape 54) permet de retracer n'importe quelle erreur en production.

---

### 4. Base Postgres lente / timeout

**Cause la plus fréquente :** auto-sleep du free tier (5 min d'inactivité → réveil 2-5s).

**Diagnostic :**
```bash
koyeb database get taskflow-db
# Vérifier status HEALTHY
```

**Si lent en continu :**
```bash
DATABASE_URL="postgres://..." psql -c "\timing on"
# EXPLAIN ANALYZE <requête lente>
```
Vérifier les index. Si `Seq Scan` sur une table > 1000 lignes → créer un index.

**Prévention avant démo :** faire une requête 3 minutes avant la présentation.

---

### 5. Cache Redis stale (l'utilisateur ne voit pas sa nouvelle tâche)

**Symptôme :** tâche créée, absente de la liste.

**Diagnostic :** Upstash dashboard → Data Browser → vérifier les clés `tasks:org:*`.

**Résolution rapide :**
```bash
# Vider le cache
redis-cli -u "$UPSTASH_REDIS_URL" FLUSHDB
```

**Résolution long-terme :** vérifier `task.service.js` → `cache.delByPattern()` appelé après `create()`.

---

### 6. Le déploiement automatique a échoué

**Diagnostic :** GitHub Actions onglet → cliquer sur le workflow `Deploy to Koyeb` échoué.

**Causes fréquentes :**
- Token Koyeb expiré → régénérer sur https://app.koyeb.com/user/settings/api/ et mettre à jour le secret GitHub `KOYEB_TOKEN`
- Build Docker cassé → reproduire en local : `docker build . -t taskflow:test`
- Healthcheck échoue après déploiement → vérifier les secrets Koyeb

**Rollback d'urgence :**
```bash
koyeb service rollback taskflow/web
```

---

### 7. Rate limit déclenché sur des utilisateurs légitimes

**Symptôme :** utilisateurs reçoivent 429 sur login après quelques tentatives.

**Diagnostic :**
```bash
koyeb service logs taskflow/web | grep "429\|rate_limit"
```

**Résolution :** vérifier si un bot ou un mauvais client effectue des appels répétés.
Dans `rate-limit.js`, ajuster `windowMs` ou `max` si nécessaire, puis redéployer.

---

## Contacts et ressources

| Service | Status page | Support |
|---------|-------------|---------|
| Koyeb | https://status.koyeb.com | support@koyeb.com |
| Upstash | https://status.upstash.com | Discord Upstash |
| Resend | https://status.resend.com | support@resend.com |

---

## Procédure d'urgence universelle

1. Récupérer le `correlation_id` depuis l'header `X-Correlation-Id` de la requête en erreur.
2. Chercher dans les logs :
   ```bash
   koyeb service logs taskflow/web -t runtime --tail 2000 | grep "<id>"
   ```
3. Stack trace visible → reproduire en local, corriger, redéployer.
4. Timeout/connexion → `koyeb service redeploy taskflow/web`.
5. Rien ne marche → `koyeb service rollback taskflow/web`.
