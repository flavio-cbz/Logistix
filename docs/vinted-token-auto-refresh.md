# Système de Rafraîchissement Automatique des Tokens Vinted

## 🎯 Vue d'ensemble

Le système de rafraîchissement automatique des tokens Vinted maintient une session active en renouvelant automatiquement les tokens d'accès expirés. Cela garantit que les fonctionnalités d'analyse de marché Vinted restent opérationnelles sans intervention manuelle.

## ✅ Statut d'intégration

**🎉 SYSTÈME COMPLÈTEMENT INTÉGRÉ ET OPÉRATIONNEL**

- Initialisation automatique au démarrage de l'application
- Scheduler configuré pour vérifier les tokens toutes les 30 minutes
- Rafraîchissement automatique des tokens expirés
- Sauvegarde sécurisée en base de données
- API de contrôle et monitoring
- Gestion complète des erreurs et logging

## 🏗️ Architecture

### Composants principaux

1. **TokenRefreshScheduler** (`lib/services/scheduler/token-refresh-scheduler.ts`)
   - Planificateur périodique configurable
   - Vérifie et rafraîchit les tokens automatiquement

2. **VintedSessionManager** (`lib/services/auth/vinted-session-manager.ts`)
   - Gère les sessions Vinted en base de données
   - Valide et renouvelle les tokens expirés

3. **VintedAuthService** (`lib/services/auth/vinted-auth-service.ts`)
   - Extraction et validation des tokens
   - Appels API pour le rafraîchissement

4. **API Endpoints**
   - `/api/v1/vinted/scheduler` : Contrôle du scheduler
   - `/api/v1/vinted/auth` : Authentification Vinted
   - `/api/v1/market-analysis/token` : Récupération des tokens

#### Schéma global

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION NEXT.JS                      │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────────┐ │
│  │ instrumentation │───▶│        Scheduler Manager         │ │
│  │      .ts        │    │                                  │ │
│  └─────────────────┘    │  ┌─────────────────────────────┐ │ │
│                         │  │  TokenRefreshScheduler      │ │ │
│  ┌─────────────────┐    │  │  - Intervalle: 30min        │ │ │
│  │   API Routes    │    │  │  - Auto-start: ✅           │ │ │
│  │                 │    │  └─────────────────────────────┘ │ │
│  │ /vinted/auth    │    └──────────────────────────────────┘ │
│  │ /vinted/scheduler│                     │                  │
│  │ /market-analysis│                     ▼                  │
│  └─────────────────┘    ┌──────────────────────────────────┐ │
│                         │      VintedSessionManager       │ │
│                         │                                  │ │
│                         │  ┌─────────────────────────────┐ │ │
│                         │  │     VintedAuthService       │ │ │
│                         │  │  - Token extraction         │ │ │
│                         │  │  - Token validation         │ │ │
│                         │  │  - Token refresh            │ │ │
│                         │  └─────────────────────────────┘ │ │
│                         └──────────────────────────────────┘ │
│                                         │                    │
│                                         ▼                    │
│                         ┌──────────────────────────────────┐ │
│                         │         Base de Données         │ │
│                         │                                  │ │
│                         │  ┌─────────────────────────────┐ │ │
│                         │  │      vinted_sessions        │ │ │
│                         │  │  - Sessions chiffrées       │ │ │
│                         │  │  - Statuts et métadonnées   │ │ │
│                         │  └─────────────────────────────┘ │ │
│                         └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Configuration

### Variables d'environnement (.env)

```env
# Activation du rafraîchissement automatique
VINTED_AUTO_REFRESH_ENABLED=true

# Intervalle de vérification (en minutes)
VINTED_TOKEN_REFRESH_INTERVAL_MINUTES=30

# Clé de chiffrement pour les sessions
VINTED_CREDENTIALS_SECRET=your_secret_key

# Session Vinted (optionnel pour initialisation)
VINTED_SESSION=your_session_data

# Credentials Vinted (si nécessaire)
VINTED_USERNAME=your_email
VINTED_PASSWORD=your_password
```

### Paramètres

- **VINTED_AUTO_REFRESH_ENABLED** : Active/désactive le renouvellement automatique
- **VINTED_TOKEN_REFRESH_INTERVAL_MINUTES** : Intervalle de vérification (défaut : 30 minutes)
- **VINTED_SESSION** : Session Vinted chiffrée stockée en base
- **VINTED_CREDENTIALS_SECRET** : Clé de chiffrement pour les sessions

## 🔄 Fonctionnement automatique

```
1. 🚀 Démarrage Next.js → instrumentation.ts initialise les schedulers
2. ⏰ Toutes les 30 minutes → Vérification automatique des tokens
3. 🔍 Si token expiré → Détection automatique (statut 401)
4. 🔄 Rafraîchissement → Appel API Vinted pour nouveaux tokens
5. 💾 Sauvegarde → Nouveaux tokens chiffrés en base de données
6. 📊 Logging → Suivi complet de toutes les opérations
```

### Exemple d'initialisation

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeSchedulers } = await import('./lib/services/scheduler');
    initializeSchedulers();
  }
}
```

## 🛠️ Scripts de maintenance et de test

```bash
# Vérification de l'intégration
npm run vinted:verify

# Diagnostic complet du système
npm run vinted:diagnostic

# Initialisation d'une session Vinted
npm run vinted:init-session

# Test avec session réelle
npm run vinted:test-refresh

# Rapport détaillé du système
npm run vinted:report

# Test rapide de la configuration
npm run test:token-quick

# Test complet du système
npm run test:token-refresh

# Diagnostic complet
node scripts/diagnostic-token-system.js
```

## 🌐 API de contrôle

### Statut du scheduler

```http
GET /api/v1/vinted/scheduler
```

Réponse :

```json
{
  "isActive": true,
  "autoRefreshEnabled": true,
  "intervalMinutes": 30
}
```

### Contrôle du scheduler

```http
POST /api/v1/vinted/scheduler
Content-Type: application/json

{
  "action": "start|stop|restart",
  "intervalMinutes": 30
}
```

## 📊 Monitoring et logs

Le système génère des logs détaillés :

```
[TokenRefreshScheduler] Scheduler démarré - rafraîchissement toutes les 30 minutes
[VintedSessionManager] Session validée pour l'utilisateur admin
[VintedSessionManager] Token rafraîchi avec succès pour l'utilisateur admin
```

### Statuts en base de données

Les sessions Vinted ont différents statuts :
- `active` : Session valide et opérationnelle
- `expired` : Token expiré, nécessite un rafraîchissement
- `error` : Erreur lors du rafraîchissement
- `requires_configuration` : Configuration manquante

## 🔧 Maintenance et dépannage

### Vérifications régulières

1. **Logs d'application** - Vérifier les messages du scheduler
2. **Statut des sessions** - Consulter la table `vinted_sessions`
3. **Tests périodiques** - Exécuter les scripts de diagnostic

### Dépannage

#### Le scheduler ne démarre pas

- Vérifiez `VINTED_AUTO_REFRESH_ENABLED=true` dans .env
- Consultez les logs d'application au démarrage
- Utilisez `npm run vinted:verify` pour diagnostiquer
- Vérifiez que l'application Next.js est en mode serveur

#### Échec du rafraîchissement

- Vérifiez la validité de la session Vinted en base
- Contrôlez la connectivité réseau vers vinted.fr
- Consultez les logs pour les détails d'erreur
- Vérifiez les credentials de chiffrement

#### Tokens non extraits

- Vérifiez le format de la session en base de données
- Testez le déchiffrement avec `npm run vinted:diagnostic`
- Réinitialisez la session avec `npm run vinted:init-session`
- Contrôlez la structure du cookie déchiffré

## 🎯 Avantages

✅ Automatique – Aucune intervention manuelle requise  
✅ Fiable – Gestion robuste des erreurs et fallbacks  
✅ Sécurisé – Sessions chiffrées en base de données  
✅ Configurable – Intervalles et comportements ajustables  
✅ Monitorable – Logs détaillés et API de contrôle  
✅ Testable – Suite complète de tests et diagnostics

## 📈 Métriques de performance

- **Temps de réponse API** : < 5 secondes
- **Intervalle de vérification** : 30 minutes (configurable)
- **Taux de succès attendu** : > 95%
- **Sécurité** : Tokens chiffrés AES-256
- **Stockage** : Base de données SQLite
- **Durée de vie des tokens** : ~24 heures

## 🚀 Utilisation avec de vrais tokens

1. **Connectez-vous sur vinted.fr**
2. **Récupérez les cookies de session** depuis les outils de développement
3. **Initialisez la session** : `npm run vinted:init-session`
4. **Le système prend le relais automatiquement**

---

**Le système de rafraîchissement automatique des tokens Vinted garantit une disponibilité continue des fonctionnalités d'analyse de marché sans interruption de service.** 🎉