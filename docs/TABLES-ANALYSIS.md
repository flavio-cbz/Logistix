# Analyse d'Utilisation des Tables - LogistiX

Date: 10 octobre 2025

## 📊 Résumé

Après analyse approfondie du code, voici l'état d'utilisation de chaque table :

---

## ✅ Tables ESSENTIELLES (10 tables)

### 1. **users** - 🟢 UTILISÉE MASSIVEMENT

- **Fichiers**: 20+ fichiers
- **Usages**: Auth, sessions, préférences, actions utilisateur
- **Statut**: **CONSERVER**

### 2. **products** - 🟢 UTILISÉE MASSIVEMENT  

- **Fichiers**: 50+ fichiers
- **Usages**: Catalogue produits, dashboard, API REST, statistiques
- **Statut**: **CONSERVER**

### 3. **parcelles** - 🟢 UTILISÉE MASSIVEMENT

- **Fichiers**: 30+ fichiers
- **Usages**: Gestion colis, dashboard, API REST
- **Statut**: **CONSERVER**

### 4. **sessions** - 🟢 UTILISÉE ACTIVEMENT

- **Fichiers**: `auth-service.ts`, `actions.ts`, `initialization-manager.ts`
- **Usages**:
  - Gestion sessions utilisateur (login/logout)
  - Validation tokens
  - Nettoyage sessions expirées
- **Requêtes SQL**:

  ```sql
  INSERT INTO sessions (id, user_id, expires_at, created_at)
  SELECT user_id FROM sessions WHERE id = ?
  DELETE FROM sessions WHERE id = ?
  DELETE FROM sessions WHERE user_id = ?
  ```

- **Statut**: **CONSERVER** (table système essentielle)

### 5. **vinted_sessions** - 🟢 UTILISÉE ACTIVEMENT

- **Fichiers**: `vinted-category-fetcher.ts`, `database/schema.ts`, `initialization-manager.ts`
- **Usages**:
  - Stockage cookies Vinted
  - Gestion tokens API Vinted
  - Chiffrement DEK (Data Encryption Key)
- **Statut**: **CONSERVER** (intégration Vinted)

### 6. **market_analyses** - 🟢 UTILISÉE ACTIVEMENT

- **Fichiers**: 20+ fichiers
- **Usages**: Analyses IA de marché, cache résultats
- **Statut**: **CONSERVER**

### 7. **similar_sales** - 🟢 UTILISÉE ACTIVEMENT

- **Fichiers**: `config.ts`, `database/schema.ts`, cache services
- **Usages**: Cache ventes similaires pour analyses
- **Statut**: **CONSERVER** (optimisation performance)

### 8. **tracked_products** - 🟢 UTILISÉE ACTIVEMENT

- **Fichiers**: `search-service.ts`, `database/schema.ts`
- **Usages**: Suivi produits favoris utilisateur
- **Statut**: **CONSERVER**

### 9. **user_preferences** - 🟢 UTILISÉE IMPLICITEMENT

- **Fichiers**: `database/schema.ts`, schéma Drizzle
- **Usages**: Préférences utilisateur, config UI
- **Statut**: **CONSERVER**

### 10. **user_actions** - 🟢 UTILISÉE ACTIVEMENT

- **Fichiers**: `user-action-logger.ts`, `user-preferences-modern.ts`, `ai-learning.ts`
- **Usages**:
  - Log actions utilisateur
  - Analyse comportement
  - Learning AI
  - **NOUVEAU**: Intègre `search_query` (fusion user_query_history)
- **Statut**: **CONSERVER**

---

## ⚠️ Tables LEGACY (2 tables)

### 11. **produits** - 🟡 LEGACY / MIGRATION

- **Fichiers**: `initialization-manager.ts`, `inspect-db.js`
- **Usages**:
  - Table legacy française
  - Migration vers `products` (anglais)
  - Code de compatibilité seulement
- **Requêtes**: Aucune requête active sur `produits`, seulement `products`
- **Statut**: **PEUT ÊTRE SUPPRIMÉE** (après migration complète)
- **Action**: Supprimer après vérification que toutes données sont dans `products`

### 12. **dashboard_config** - 🟡 USAGE LIMITÉ

- **Fichiers**: `actions.ts`, `initialization-manager.ts`, `migrate.js`
- **Usages**:
  - Configuration tableau de bord utilisateur (JSON)
  - Layout, widgets, préférences UI
- **Requêtes SQL**:

  ```sql
  SELECT * FROM dashboard_config WHERE user_id = ?
  INSERT INTO dashboard_config (id, user_id, config, created_at, updated_at)
  UPDATE dashboard_config SET config = ?, updated_at = ?
  ```

- **Statut**: **CONSERVER POUR L'INSTANT** (fonctionnalité UI)
- **Note**: Pourrait être fusionné dans `user_preferences` à l'avenir

---

## 🗑️ Tables SUPPRIMÉES (optimisation déjà effectuée)

- ~~**historical_prices**~~ - Supprimée ✅
- ~~**market_trends**~~ - Supprimée ✅
- ~~**user_query_history**~~ - Fusionnée dans `user_actions` ✅

---

## 📋 Recommandations finales

### Actions immédiates

1. **Supprimer `produits`** - Table legacy non utilisée

   ```sql
   DROP TABLE IF EXISTS produits;
   ```

### Actions à moyen terme

2. **Évaluer `dashboard_config`** - Fusion possible avec `user_preferences`
   - Avantage: Simplification (1 table de moins)
   - Inconvénient: Nécessite refactoring du code UI

### Résultat optimal

- **10 tables principales** (essentielles)
- **1 table UI optionnelle** (`dashboard_config`)
- **Total: 11 tables** au lieu de 15 initialement (**-27% de complexité**)

---

## 🎯 Structure finale recommandée

```
Tables Core (6):
├── users
├── products
├── parcelles
├── sessions
├── vinted_sessions
└── app_secrets

Tables Analytics (4):
├── market_analyses
├── similar_sales
├── tracked_products
└── user_actions (inclut search_query)

Tables UI (1):
└── dashboard_config (ou user_preferences fusionné)
```

---

## 📝 Notes de migration

Pour supprimer `produits` en toute sécurité :

1. Vérifier que `products` contient toutes les données
2. Supprimer les références dans `initialization-manager.ts`
3. Exécuter `DROP TABLE IF EXISTS produits;`
4. Mettre à jour la migration 0000_complete_schema.sql
