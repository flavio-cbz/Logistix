# Migration Complète du Schéma de Base de Données

## 📋 Vue d'ensemble

Ce fichier de migration (`0000_complete_schema.sql`) crée **toutes les tables nécessaires** pour l'application LogistiX avec leur structure complète, incluant :

- ✅ Toutes les colonnes du schéma principal
- ✅ Toutes les colonnes legacy pour la compatibilité
- ✅ Tous les index pour les performances
- ✅ Toutes les contraintes de clés étrangères

## 🚀 Utilisation

### Option 1 : Via le script Node.js (Recommandé)

```bash
npm run db:migrate:complete
```

Ce script :

- ✅ Applique toutes les migrations de manière transactionnelle
- ✅ Gère les tables déjà existantes (idempotent)
- ✅ Affiche un rapport détaillé
- ✅ Vérifie la structure finale

### Option 2 : Via SQLite directement

```bash
sqlite3 data/logistix.db < drizzle/migrations/0009_complete_schema.sql
```

## 📊 Tables créées

### Tables principales

**users** - Gestion des utilisateurs
**parcelles** - Gestion des colis/parcelles
**products** - Catalogue de produits (avec colonnes legacy)

### Tables d'analyse de marché

**market_analyses** - Analyses de marché
**similar_sales** - Cache des ventes similaires
**tracked_products** - Produits suivis

### Tables utilisateur

**user_preferences** - Préférences utilisateur
**user_actions** - Actions utilisateur (inclut les recherches avec type 'search_query')

### Tables sécurité/session

**vinted_sessions** - Sessions Vinted
**app_secrets** - Secrets d'application

## 🔑 Colonnes Legacy dans `products`

Pour assurer la compatibilité avec le code existant (notamment le dashboard), la table `products` inclut des **colonnes en double** avec différentes conventions de nommage :

### Noms et descriptions

- `name` / `nom` - Nom du produit
- `description` / `details` - Description/détails

### Prix et finances

- `price` - Prix d'achat principal ✨ **Nouveau**
- `selling_price` / `prix_vente` / `prixVente` - Prix de vente
- `prix_article` / `prixArticle` - Prix d'achat legacy
- `prix_article_ttc` / `prixArticleTTC` - Prix TTC
- `cout_livraison` / `prix_livraison` / `prixLivraison` - Coût de livraison
- `benefices` - Bénéfices calculés

### Références

- `parcelle_id` / `parcelleId` - Référence à la parcelle

### Dates

- `date_vente` / `dateVente` - Date de vente legacy
- `sold_at` - Date de vente moderne ✨ **Nouveau**
- `temps_en_ligne` - Temps en ligne calculé

## ⚠️ Notes importantes

- **Colonnes legacy** : Ne pas supprimer les colonnes legacy sans vérifier tous les usages dans le code
- **Performance** : Les index sont critiques, ne pas les supprimer
- **Clés étrangères** : Activées avec `ON DELETE CASCADE` ou `SET NULL` selon le cas
- **Types JSON** : Stockés comme TEXT, à parser en application
