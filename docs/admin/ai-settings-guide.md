# Guide d'Administration des Paramètres AI

## Vue d'ensemble

L'interface d'administration AI permet de configurer et gérer tous les aspects de l'intelligence artificielle directement depuis l'application, sans avoir besoin de redémarrer les services ou modifier des variables d'environnement.

## Accès à l'Interface

L'interface d'administration AI est accessible à l'adresse :
```
https://votre-domaine.com/admin/ai-settings
```

## Sections de Configuration

### 1. Statut du Système AI

**Localisation** : En haut de la page

**Fonctionnalités** :
- Activation/désactivation globale de l'AI
- Statut de connexion OpenAI en temps réel
- Indicateurs visuels de l'état du système

**Actions disponibles** :
- Basculer l'activation de l'AI avec un simple switch
- Tester la connexion OpenAI

### 2. Onglet Général

**Configuration OpenAI** :
- **Clé API** : Saisie sécurisée de la clé API OpenAI
- **URL de base** : Personnalisation de l'endpoint API (optionnel)
- **Organisation** : ID d'organisation OpenAI (optionnel)
- **Test de connexion** : Bouton pour valider la configuration

**Bonnes pratiques** :
- Utilisez toujours des clés API avec les permissions minimales nécessaires
- Testez la connexion après chaque modification
- L'URL de base n'est nécessaire que pour des configurations personnalisées

### 3. Onglet Services

**Insights de Marché** :
- **Activation** : Enable/disable du service d'insights
- **Modèle** : Sélection du modèle OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
- **Température** : Contrôle de la créativité des réponses (0-2)
- **Timeout** : Délai maximum d'attente en millisecondes
- **Tentatives** : Nombre de tentatives en cas d'échec

**Recommandations** :
- **Activation** : Enable/disable du service de recommandations
- **Timeout** : Délai maximum d'attente
- **Tentatives** : Nombre de tentatives en cas d'échec

**Recommandations de configuration** :
- **GPT-4** : Meilleure qualité, plus coûteux
- **GPT-3.5 Turbo** : Plus rapide, moins coûteux
- **Température 0.3** : Bon équilibre créativité/cohérence
- **Timeout 30s** : Suffisant pour la plupart des analyses

### 4. Onglet Performance

**Qualité des Données** :
- **Points de données minimum** : Seuil minimum pour déclencher l'analyse
- **Confiance minimum** : Seuil de confiance acceptable (0-1)
- **Temps de traitement max** : Limite de temps de traitement

**Système de Fallback** :
- **Activation** : Enable/disable du système de secours
- **Timeout** : Délai avant activation du fallback

**Optimisation des performances** :
- Augmentez les seuils de qualité pour des analyses plus fiables
- Réduisez les timeouts pour des réponses plus rapides
- Activez toujours le fallback pour la robustesse

### 5. Onglet Coûts

**Contrôles de Coûts** :
- **Tokens max par requête** : Limite le nombre de tokens par analyse
- **Coût max par requête** : Limite le coût en dollars par requête
- **Limite quotidienne** : Limite le nombre total de tokens par jour

**Surveillance des coûts** :
- Surveillez régulièrement ces métriques
- Ajustez les limites selon votre budget
- Utilisez les alertes pour éviter les dépassements

**Recommandations budgétaires** :
- **Développement** : 1000 tokens/requête, $0.05/requête, 10k tokens/jour
- **Production** : 3000 tokens/requête, $0.15/requête, 100k tokens/jour

### 6. Onglet Cache

**Configuration du Cache** :
- **Activation** : Enable/disable du cache en mémoire
- **Durée de vie** : Temps de conservation des données en secondes
- **Taille maximum** : Nombre maximum d'entrées en cache

**Statistiques en Temps Réel** :
- **Taux de réussite** : Pourcentage de requêtes servies depuis le cache
- **Entrées** : Nombre d'éléments actuellement en cache
- **Hits/Misses** : Compteurs de succès et d'échecs
- **Mémoire utilisée** : Estimation de l'utilisation mémoire

**Actions disponibles** :
- **Vider le cache** : Supprime toutes les entrées du cache
- **Actualisation automatique** : Les stats se mettent à jour toutes les 30 secondes

**Optimisation du cache** :
- Visez un taux de réussite >70%
- Augmentez la TTL pour des données stables
- Augmentez la taille pour plus de données en cache
- Videz le cache après des changements de configuration

## Gestion des Configurations

### Sauvegarde des Paramètres

**Sauvegarde automatique** :
- Tous les paramètres sont sauvegardés en base de données
- Persistance automatique entre les redémarrages
- Historique des modifications (à venir)

**Sauvegarde manuelle** :
- Cliquez sur "Sauvegarder" pour appliquer les modifications
- Les changements sont appliqués immédiatement
- Aucun redémarrage de service requis

### Réinitialisation

**Réinitialisation complète** :
- Bouton "Réinitialiser" pour revenir aux valeurs par défaut
- Confirmation requise pour éviter les erreurs
- Tous les paramètres sont restaurés instantanément

### Validation des Paramètres

**Validation automatique** :
- Vérification des plages de valeurs
- Validation des formats (clés API, URLs)
- Messages d'erreur explicites

**Règles de validation** :
- Timeouts : 5-60 secondes
- Température : 0-2
- Confiance : 0-1
- Coûts : >0
- Clé API : Format OpenAI valide

## Monitoring et Alertes

### Indicateurs de Santé

**Statut de Connexion** :
- Vert : Connexion OpenAI OK
- Rouge : Problème de connexion
- Test automatique lors des modifications

**Performance du Cache** :
- Badge vert : Taux de réussite >70%
- Badge gris : Taux de réussite <70%
- Mise à jour en temps réel

### Notifications

**Notifications de Succès** :
- Confirmation des sauvegardes
- Succès des tests de connexion
- Opérations de cache réussies

**Notifications d'Erreur** :
- Erreurs de validation
- Échecs de connexion
- Problèmes de sauvegarde

## Bonnes Pratiques

### Configuration Initiale

1. **Configurez la clé API OpenAI** en premier
2. **Testez la connexion** avant d'activer les services
3. **Commencez avec des paramètres conservateurs**
4. **Activez le cache** pour optimiser les performances
5. **Définissez des limites de coûts** appropriées

### Maintenance Régulière

1. **Surveillez les statistiques du cache** hebdomadairement
2. **Ajustez les paramètres** selon l'utilisation réelle
3. **Vérifiez les coûts** mensuellement
4. **Testez la connexion** après les mises à jour

### Optimisation des Performances

1. **Augmentez la TTL du cache** pour des données stables
2. **Utilisez GPT-3.5 Turbo** pour des tâches simples
3. **Ajustez les timeouts** selon vos besoins
4. **Surveillez le taux de fallback** (<10% recommandé)

### Sécurité

1. **Limitez l'accès** à l'interface d'administration
2. **Utilisez des clés API** avec permissions minimales
3. **Surveillez l'utilisation** pour détecter les anomalies
4. **Sauvegardez la configuration** régulièrement

## Dépannage

### Problèmes Courants

**"Connexion OpenAI échouée"** :
- Vérifiez la clé API
- Testez la connectivité réseau
- Vérifiez les quotas OpenAI

**"Taux de cache faible"** :
- Augmentez la TTL
- Vérifiez la variabilité des requêtes
- Augmentez la taille du cache

**"Coûts élevés"** :
- Réduisez les limites de tokens
- Utilisez un modèle moins coûteux
- Optimisez le cache

### Support

Pour obtenir de l'aide :
1. Consultez les logs d'application
2. Vérifiez les statistiques du cache
3. Testez la connexion OpenAI
4. Contactez l'équipe technique si nécessaire

## Changelog

### Version 1.0
- Interface d'administration complète
- Configuration en temps réel
- Cache en mémoire intégré
- Statistiques de performance
- Validation automatique des paramètres