# Documentation LogistiX

Cette documentation a été organisée et consolidée pour réduire la redondance et améliorer la navigation.

## 📚 Structure de la Documentation

### 🏗️ Architecture et Développement

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture générale du système
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Guide de développement complet
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guide de contribution au projet

### 🚀 Déploiement

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guide de déploiement général (Docker, Vercel, serveurs)
- **[deployment/deployment-strategy.md](./deployment/deployment-strategy.md)** - Stratégie de déploiement AI consolidée (inclut checklist, dépannage, monitoring)

### 🧪 Tests

- **[TESTING.md](./TESTING.md)** - Guide de test général
- **[testing/TEST_DOCUMENTATION.md](./testing/TEST_DOCUMENTATION.md)** - Documentation complète des tests (inclut meilleures pratiques, onboarding, dépannage)

### 🔧 Configuration et Maintenance

- **[AI_MODEL_SELECTION.md](./AI_MODEL_SELECTION.md)** - Sélection et configuration des modèles AI
- **[vinted-token-auto-refresh.md](./vinted-token-auto-refresh.md)** - Système de rafraîchissement automatique des tokens Vinted
- **[database-connection-optimization.md](./database-connection-optimization.md)** - Optimisation des connexions base de données
- **[reset-database.md](./reset-database.md)** - Procédures de réinitialisation de la base de données

### 📊 Monitoring et Dépannage

- **[MONITORING.md](./MONITORING.md)** - Configuration du monitoring
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Guide de dépannage général
- **[auth-emergency.md](./auth-emergency.md)** - Procédures d'urgence pour l'authentification Vinted

### 📖 Guides Utilisateur

- **[FEATURES_OVERVIEW.md](./FEATURES_OVERVIEW.md)** - Vue d'ensemble des fonctionnalités
- **[MANUAL_VALIDATION_GUIDE.md](./MANUAL_VALIDATION_GUIDE.md)** - Guide de validation manuelle
- **[admin/ai-settings-guide.md](./admin/ai-settings-guide.md)** - Guide des paramètres AI pour les administrateurs

### 🔌 API

- **[API.md](./API.md)** - Documentation générale de l'API
- **[api/market-analysis.openapi.yaml](./api/market-analysis.openapi.yaml)** - Spécification OpenAPI pour l'analyse de marché

## 🗂️ Fichiers Supprimés lors de la Consolidation

Les fichiers suivants ont été supprimés car leur contenu a été consolidé dans d'autres documents :

### Documentation Vinted

- `spec-technique-token-vinted.md` → Consolidé dans `vinted-token-auto-refresh.md`
- `SYSTEM_WITHOUT_ENV.md` → Consolidé dans `vinted-token-auto-refresh.md`

### Documentation de Déploiement AI

- `deployment/ai-deployment-checklist.md` → Consolidé dans `deployment/deployment-strategy.md`
- `deployment/ai-features-deployment-guide.md` → Consolidé dans `deployment/deployment-strategy.md`
- `deployment/ai-troubleshooting-guide.md` → Consolidé dans `deployment/deployment-strategy.md`

### Documentation de Tests

- `testing/BEST_PRACTICES.md` → Consolidé dans `testing/TEST_DOCUMENTATION.md`
- `testing/ONBOARDING_GUIDE.md` → Consolidé dans `testing/TEST_DOCUMENTATION.md`
- `testing/TROUBLESHOOTING_GUIDE.md` → Consolidé dans `testing/TEST_DOCUMENTATION.md`

### Documentation de Planification

- `observability-integration-plan.md` → Supprimé (document de planification obsolète)

## 🎯 Avantages de la Nouvelle Organisation

### ✅ Réduction de la Redondance

- **Avant** : 20+ fichiers avec beaucoup de duplication
- **Après** : 15 fichiers avec contenu unique et consolidé

### ✅ Navigation Améliorée

- Structure claire par domaine fonctionnel
- Références croisées entre documents
- Index centralisé dans ce README

### ✅ Maintenance Simplifiée

- Moins de fichiers à maintenir
- Informations centralisées par sujet
- Réduction des incohérences

### ✅ Expérience Développeur Améliorée

- Documentation plus facile à trouver
- Guides complets dans des fichiers uniques
- Moins de navigation entre fichiers

## 🔍 Comment Naviguer

1. **Pour débuter** : Commencez par `DEVELOPMENT.md` pour la configuration de l'environnement
2. **Pour déployer** : Consultez `DEPLOYMENT.md` puis `deployment/deployment-strategy.md` pour l'AI
3. **Pour tester** : Référez-vous à `testing/TEST_DOCUMENTATION.md` pour tout ce qui concerne les tests
4. **Pour dépanner** : Utilisez `TROUBLESHOOTING.md` et les guides spécialisés selon le domaine

## 📝 Contribution à la Documentation

Lors de l'ajout de nouvelle documentation :

1. **Vérifiez** si le contenu peut être ajouté à un fichier existant
2. **Évitez** la duplication d'informations
3. **Mettez à jour** ce README si vous créez de nouveaux fichiers
4. **Ajoutez** des références croisées appropriées

Cette organisation vise à maintenir une documentation claire, complète et facile à naviguer pour tous les contributeurs du projet LogistiX.
