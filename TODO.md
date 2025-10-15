# LogistiX

---
Tu es un architecte logiciel expert en TypeScript. Je souhaite intégrer une fonctionnalité d'analyse de marché basée sur des APIs non officielles de marketplaces dans mon application existante.

## CONTEXTE DE L'APPLICATION EXISTANTE

- **Stack**: TypeScript/Node.js avec architecture modulaire
- **Pattern**: Services découplés, injection de dépendances
- **Objectifs**: Extensibilité future (Leboncoin, eBay), performance optimisée
- **Contraintes**: Pas de surcharge de l'architecture existante, intégration transparente

## FOURNISSEURS D'API NON OFFICIELS IDENTIFIÉS

### **Vinted - Providers disponibles**[1][2][3]
```bash
# Options principales
npm install vinted-api                    # @Androz2091 - Le plus populaire
npm install @eliottoblinger/vinted       # Support proxies + pagination
npm install @skanix/vinted-client        # Moderne mais deprecated
```

**Caractéristiques des providers Vinted :**

- `vinted-api` (Androz2091) : 36+ stars, stable, recherche par URL[1]
- `@eliottoblinger/vinted` : Support pagination, proxies, getBrands()[2]
- `@skanix/vinted-client` : TypeScript natif mais plus maintenu[4]

### **eBay - Scrapers disponibles**[5]
```bash
# Python-based (à adapter en TypeScript)
git clone https://github.com/Simple-Python-Scrapy-Scrapers/ebay-scrapy-scraper
# Features: Anti-bot protection, prix, seller data, auction info
```

### **Leboncoin - Solutions identifiées**[6][7][8]
```bash
# API Immobilier (base pour extension)
git clone https://github.com/Fluximmo/api-immo-scrapper-leboncoin-pap
# Scrapy Spider avec support anti-detection
```

### **Templates/Frameworks génériques**[9][10][11]
```bash
# Templates TypeScript + Puppeteer
npm install puppeteer crawlee          # Crawlee = Apify's framework
git clone https://github.com/NoxelS/scraper  # Template TypeScript + Puppeteer
```

## EXIGENCES TECHNIQUES SPÉCIFIQUES

### 1. **Architecture Provider Abstraction**
Supporte multiple providers avec fallback automatique :
```typescript
interface MarketplaceProvider {
  name: 'vinted' | 'leboncoin' | 'ebay';
  authenticate(): Promise<AuthTokens>;
  search(query: SearchQuery, tokens?: AuthTokens): Promise<SearchResult[]>;
  getItem(id: string, tokens?: AuthTokens): Promise<Item>;
  isAvailable(): Promise<boolean>; // Health check
}
```

### 2. **Provider Factory avec Auto-Detection**
```typescript
// Doit supporter ces providers automatiquement
const providers = [
  new VintedProvider('vinted-api'),           // Fallback Androz2091
  new VintedProvider('@eliottoblinger'),      // Primary avec proxies
  new EbayProvider('scrapy-based'),           // À implémenter
  new LeboncoinProvider('puppeteer-based')   // À implémenter
];
```

### 3. **Système de Proxies et Anti-Detection**[2][5]

- Rotation automatique de proxies (résidentiels + datacenter)
- User-Agent rotation avec browser fingerprinting
- Rate limiting adaptatif par provider (1-2 req/sec Vinted)
- Circuit breaker avec exponential backoff

### 4. **Token/Session Management**

- Cookie Factory Puppeteer pour Vinted/Leboncoin[6]
- Session persistence avec Redis TTL
- Auto-refresh avec retry logic
- Multi-provider token pooling

## PLAN DE DÉVELOPPEMENT DEMANDÉ

**Crée-moi un plan de développement qui intègre ces providers existants :**

1. **Architecture modulaire** : Comment wrapper proprement ces packages npm dans mon abstraction

2. **Provider Integration Strategy** : 
   - Comment intégrer `vinted-api` d'Androz2091 comme fallback
   - Utiliser `@eliottoblinger/vinted` comme provider principal
   - Préparer l'architecture pour eBay/Leboncoin scrapers

3. **Proxy Management Service** : Système centralisé compatible avec tous les providers

4. **Health Monitoring** : Auto-détection de providers indisponibles + fallback

5. **Data Normalization** : Unification des formats de réponse entre providers

6. **Error Handling Strategy** : Gestion des bans, rate limits, tokens expirés

7. **Testing Strategy** : Comment tester sans se faire bannir des plateformes

## INTÉGRATION AVEC PROVIDERS EXISTANTS

### Provider Vinted - Stratégie de fallback
```typescript
// Utilise @eliottoblinger en primary, fallback sur Androz2091
class VintedProvider {
  private primaryClient = new EliottVinted();
  private fallbackClient = new AndrozVinted();
  
  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      return await this.primaryClient.search(query);
    } catch (error) {
      console.warn('Primary provider failed, using fallback');
      return await this.fallbackClient.search(query);
    }
  }
}
```

### Provider eBay - Adaptation du scraper Python
Comment adapter le scraper Scrapy eBay en TypeScript avec Crawlee/Puppeteer.[11][5]

### Provider Leboncoin - Extension du scraper immo
Comment étendre l'API immobilier Fluximmo pour tous les produits.[7]

## CRITÈRES DE SUCCÈS

- ✅ Intégration transparente des packages npm existants
- ✅ Fallback automatique entre providers (ex: Androz2091 ↔ Eliott)
- ✅ Support proxies rotatifs pour éviter les bans
- ✅ Architecture extensible pour nouveaux scrapers GitHub
- ✅ Zero impact performance sur l'app existante
- ✅ Health checks automatiques des providers

## LIVRABLES ATTENDUS

1. Plan d'intégration des packages npm existants[1][2]
2. Architecture de wrapper pour providers GitHub[9][11]
3. Système de fallback entre providers Vinted
4. Roadmap pour adaptation eBay/Leboncoin scrapers
5. Code d'exemple utilisant les packages identifiés

**Optimise pour réutiliser au maximum l'existant GitHub/npm plutôt que de réinventer.**

[1](https://github.com/Androz2091/vinted-api)
[2](https://www.npmjs.com/package/@eliottoblinger/vinted)
[3](https://github.com/MrBalourd/Vinted-API)
[4](https://github.com/SkanixDev/vinted-client)
[5](https://github.com/Simple-Python-Scrapy-Scrapers/ebay-scrapy-scraper)
[6](https://lorisgautier.fr/blog/comment-scraper-leboncoin)
[7](https://github.com/Fluximmo/api-immo-scrapper-leboncoin-pap)
[8](https://scrapeops.io/websites/leboncoin/how-to-scrape-leboncoin)
[9](https://github.com/NoxelS/scraper)
[10](https://github.com/pskd73/ts-scraper)
[11](https://github.com/apify/crawlee)
[12](https://github.com/vincenzoAiello/VintedAPI)
[13](https://github.com/topics/vinted-api)
[14](https://github.com/node-steam/market-pricing)
[15](https://github.com/Remi-deronzier/vinted-api)
[16](https://www.reddit.com/r/node/comments/4j0wzr/write_an_api_wrapper_in_nodejs/)
[17](https://socket.dev/npm/package/vinted-api)
[18](https://github.com/Parking-Master/node_perplexityai)
[19](https://github.com/scrapfly/scrapfly-scrapers)
[20](https://codesandbox.io/s/vinted-api-1vthtm)
[21](https://www.npmjs.com/search?q=keywords%3Aapi-wrapper)
[22](https://blog.appsignal.com/2024/09/11/top-5-http-request-libraries-for-nodejs.html)
[23](https://www.vint-aide.com/t/api-vinted-pro-enfin-une-vraie-api-officielle/2108)
[24](https://www.npmjs.com/search?q=marketplace&page=4)
[25](https://www.reddit.com/r/node/comments/1hrtytj/test_api_librarywrapper_npm_package/)
[26](https://github.com/StreakYC/node-api-wrapper)
[27](https://dev.to/projectescape/web-monetization-for-npm-packages-3g6o)
[28](https://www.heroku.com/blog/build-openapi-apis-nodejs-fastify/)
[29](https://socket.dev/npm/package/cc-data-api-wrapper)
[30](https://github.com/topics/unofficial-api)
[31](https://www.jsdelivr.com/package/npm/xapi-wrapper)
[32](https://github.com/vermaysha/hoyoapi)
[33](https://www.npmjs.com/search?q=keywords%3AAPI+wrapper)
[34](https://github.com/topics/scraper)
[35](https://www.reddit.com/r/node/comments/ukdigp/looking_for_good_examples_of_api_wrappers/)
[36](https://github.com/teambit/oxlint-node)
[37](https://github.com/topics/scraper?l=typescript&o=desc&s=updated)
[38](https://www.youtube.com/watch?v=qHA4PNTSLmc)
[39](https://pixeljets.com/blog/building-modern-express-js-api/)
---

## 🚨 URGENT / BLOQUANTS

### Corrections Critiques

- [x] Implementer la page /profil et la modification du mot de passe et informations liés au profil.
- [x] Implementer la page /settings et la modification des settings globaux.
- [ ] Implementer la page /help
- [ ] Tester et verifier les calculs dans la page /statistique et /dashboard.
- [ ] Implementer la fonctionalité /analyse-marche pas à pas
- [ ] Automatiser la saisie des produits et parcelles via l'API SuperBuy.

## 🔧 INTÉGRATIONS MARCHÉ & DONNÉES

### Vinted (Base Existante)

- [ ] Développer l'intégration complète des métadonnées Vinted (synchronisation catalogues, hiérarchie catégories, infos marques)
- [ ] Implémenter le renouvellement automatique des tokens Vinted
- [ ] Ajouter la validation des credentials Vinted avec gestion d'erreurs
- [ ] Développer le parsing intelligent des requêtes Vinted avec analyse sémantique
- [ ] Intégrer les données de marché Vinted dans les analyses de prix historiques

### Superbuy (Achats Automatisés)

- [ ] Étudier et documenter l'API Superbuy (endpoints, authentification, rate limits)
- [ ] Développer le service d'authentification Superbuy avec gestion des tokens
- [ ] Créer le connecteur API Superbuy pour récupérer les commandes et produits
- [ ] Implémenter la synchronisation automatique des nouvelles commandes Superbuy
- [ ] Développer le mapping automatique des données Superbuy vers le modèle LogistiX
- [ ] Ajouter la validation et nettoyage des données importées depuis Superbuy
- [ ] Créer l'interface utilisateur pour configurer l'intégration Superbuy
- [ ] Implémenter la gestion des erreurs et retry automatique pour l'API Superbuy
- [ ] Développer les webhooks Superbuy pour les mises à jour en temps réel
- [ ] Ajouter la déduplication automatique des produits déjà importés
- [ ] Créer les scripts de synchronisation initiale pour l'historique Superbuy
- [ ] Implémenter le monitoring et alertes pour l'intégration Superbuy
- [ ] Développer les rapports d'import avec statistiques et erreurs
- [ ] Ajouter la configuration des catégories et tags automatiques selon les données Superbuy
- [ ] Créer les tests d'intégration pour valider l'import automatique Superbuy

### Architecture Backend Superbuy

- [ ] Créer le modèle de données pour stocker les configurations d'intégration Superbuy
- [ ] Développer le service de cache pour les réponses API Superbuy (éviter les appels répétés)
- [ ] Implémenter le système de queue pour traiter les imports Superbuy en arrière-plan
- [ ] Ajouter les migrations de base de données pour les tables liées à Superbuy
- [ ] Créer les endpoints API internes pour gérer l'intégration Superbuy
- [ ] Développer le service de transformation des devises (yuan → euro) avec taux actualisés
- [ ] Implémenter la gestion des statuts de commandes Superbuy (en transit, livré, etc.)
- [ ] Ajouter la réconciliation automatique entre commandes Superbuy et parcelles LogistiX

### Sources Multiples d'Analyses (Extension)

#### 🔥 PRIORITAIRES (7 plateformes clés)

- [ ] **Vinted** - Excellente pour habits seconde main (marché français dominant)
- [ ] **Leboncoin** - Parfaite pour habits et électronique d'occasion (France)
- [ ] **eBay** - Référence mondiale pour habits, parfums et électronique (toutes conditions)
- [ ] **Amazon Marketplace** - Essentielle pour électronique et parfums (prix neufs)
- [ ] **Cdiscount** - Marché français fort pour électronique et parfums
- [ ] **AliExpress** - Idéale pour électronique discount et habits tendance
- [ ] **Facebook Marketplace** - Locale et gratuite pour habits et électronique

#### 🟡 SECONDAIRES (Selon stratégie)

- [ ] **Poshmark** - Excellente pour habits de mode seconde main (marché US)
- [ ] **Depop** - Parfaite pour habits vintage et streetwear
- [ ] **Mercari** - Bonne pour habits et électronique (marché US/Japon)
- [ ] **Wish** - Électronique discount et habits tendance
- [ ] **Rakuten** - Habits et parfums (marché français)
- [ ] **Vestiaire Collective** - Luxe pour habits et parfums haut de gamme
- [ ] **StockX** - Excellente pour sneakers et habits streetwear authentifiés
- [ ] **TheRealReal** - Luxe pour habits et parfums de marque
- [ ] **Wallapop** - Bonne couverture européenne pour habits

#### 🟠 SPÉCIALISÉES (Selon niche)

- [ ] **Etsy** - Parfaite pour habits artisanaux et parfums naturels
- [ ] **Rebag** - Luxe pour sacs et parfums de marque
- [ ] **Fashionphile** - Accessoires et parfums de luxe
- [ ] **GOAT** - Sneakers et habits streetwear rares
- [ ] **Gearbest** - Électronique tech à bas prix
- [ ] **Banggood** - Gadgets et électronique innovante

---

## 🎨 INTERFACE UTILISATEUR & EXPÉRIENCE

### Composants UI et Accessibilité

- [x] Développer les composants de graphiques avancés pour les visualisations
- [x] Ajouter les composants de recherche et filtres avancés
- [x] Développer les composants de formulaires avec validation en temps réel
- [ ] Ajouter les composants de chargement et états d'attente élégants
- [ ] Développer les composants de navigation responsive et intuitive

### Dashboard et Analytics

- [ ] Créer les tableaux de bord comparatifs multi-plateformes
- [ ] Implémenter l'analyse des écarts de prix entre plateformes
- [ ] Développer les alertes d'opportunités d'arbitrage inter-plateformes
- [ ] Ajouter l'analyse de la couverture géographique par marketplace
- [ ] Créer les rapports de tendances globales consolidées
- [ ] Implémenter la recommandation de plateforme optimale par produit
- [ ] Développer l'analyse prédictive des volumes de vente par source
- [ ] Ajouter la détection automatique des niches rentables multi-sources

---

## 🤖 INTELLIGENCE ARTIFICIELLE & AUTOMATISATION

### Services IA et Machine Learning

- [ ] Finaliser le service d'apprentissage IA pour analyser les comportements utilisateur
- [ ] Implémenter les recommandations personnalisées basées sur l'historique
- [ ] Développer l'analyse prédictive des prix de marché Vinted
- [ ] Ajouter la détection automatique d'anomalies dans les données
- [ ] Implémenter le feedback learning pour améliorer les prédictions
- [ ] Développer l'optimisation automatique des stratégies de vente
- [ ] Ajouter l'analyse sémantique des descriptions de produits pour la catégorisation

### APIs IA et Modèles

- [ ] Développer l'API complète pour les modèles IA et apprentissage automatique
- [ ] Développer l'API de modèles IA pour l'analyse prédictive
- [ ] Développer les fonctionnalités IA : prédictions de prix, recommandations personnalisées, détection d'anomalies
- [ ] Implémenter l'apprentissage automatique pour l'optimisation des analyses de marché
- [x] Ajouter la configuration IA dans le profil utilisateur avec monitoring des performances

### Planificateur et Tâches Automatisées

- [ ] Développer le système de cron scheduler pour les tâches récurrentes
- [ ] Implémenter la synchronisation automatique des catalogues Vinted
- [ ] Ajouter la planification des analyses de marché périodiques
- [ ] Développer les workers pour les tâches en arrière-plan
- [ ] Implémenter la queue de jobs avec retry automatique
- [ ] Développer le monitoring en temps réel des processus automatisés

---

## 🔒 SÉCURITÉ & INFRASTRUCTURE

### Services de Sécurité et Cryptage

- [ ] Finaliser le service de cryptage pour les tokens Vinted utilisateurs
- [ ] Implémenter le gestionnaire de secrets pour les clés d'API
- [ ] Développer l'audit logger pour tracer toutes les actions utilisateur
- [ ] Ajouter la validation robuste des sessions avec rotation automatique
- [ ] Implémenter la protection contre les attaques de force brute
- [ ] Développer le service d'authentification à deux facteurs (2FA)
- [ ] Ajouter la gestion des permissions granulaires par rôle utilisateur

### Système de Cache et Performance

- [x] Finaliser le système de cache manager pour les analyses de marché
- [ ] Implémenter le cache Redis pour les données persistantes
- [ ] Ajouter la compression et rotation des logs de performance
- [ ] Développer le système de métriques temps réel
- [ ] Implémenter le prefetching intelligent des données fréquemment utilisées
- [ ] Ajouter la mise en cache des requêtes Vinted avec TTL configurables
- [ ] Développer le cache distribué pour les environnements multi-instances

### DevOps / Déploiement

- [ ] Construire et tester l'image Docker (rebuild better-sqlite3, volume data)
- [ ] Générer/valider un fichier .env de prod depuis le script
- [ ] Vérifier NEXT_PUBLIC_* et clés Supabase (si utilisé)
- [ ] Définir un volume persistant `/app/data` dans `docker-compose.yml` + HEALTHCHECK
- [ ] Exporter `DATABASE_PATH` dans l'image (`ENV DATABASE_PATH=/app/data/logistix.db`) et utiliser côté app
- [ ] Ajouter `.dockerignore`/exclure backups et artefacts (backup-*, coverage, logs bruts) si manquants
- [ ] Développer l'explorateur de données pour l'administration
- [ ] Implémenter le monitoring système et métriques de performance
- [ ] Ajouter des scripts de sauvegarde automatisée avec rotation
- [ ] Développer le tableau de bord de monitoring de base de données

---

## 🧪 TESTS & QUALITÉ

### Tests Ciblés

- [ ] Tests unitaires pour les services IA et apprentissage automatique
- [x] Tests unitaires pour les use-cases Parcelles (create/list)
- [ ] Tests d'intégration pour les APIs externes (Vinted, metadata)
- [ ] Tests end-to-end pour les workflows complets (import → analyse → export)
- [ ] Tests de performance pour les analyses de marché et calculs statistiques
- [ ] Tests de sécurité pour l'authentification et validation des entrées

#### Remédiations suites existantes

- [x] Réparer les mocks SQLite dans `database-service.test.ts`
- [x] Réparer les mocks auth/cookies dans `auth-service.test.ts`
- [x] Corriger la résolution des alias Vitest (`vite-tsconfig-paths` ou équivalent)
- [x] Mettre à jour les attentes SQL multiligne dans `search-service.test.ts`
- [x] Ajuster `validateQueryParams` pour relancer les erreurs invalides

### Scripts et Automatisations

- [ ] Développer les scripts d'analyse approfondie (deep_iterative_analyze.js, iterative_analyze.js)
- [ ] Implémenter les scripts de maintenance cron pour les tâches planifiées
- [ ] Ajouter les scripts de production pour le déploiement automatisé
- [ ] Développer les scripts de développement pour faciliter le workflow
- [ ] Créer des scripts d'administration pour la gestion des utilisateurs et données
- [ ] Implémenter les scripts de test pour la validation automatisée
- [ ] Ajouter des scripts d'analyse de dépendances et maintenance du projet

---

## 📊 ANALYTICS & BUSINESS INTELLIGENCE

### Métriques et KPIs

- [ ] Développer les métriques et KPIs complets (CA, marges, taux de rotation)
- [ ] Implémenter les rapports automatisés périodiques
- [ ] Ajouter les analyses de tendances et recommandations automatiques
- [ ] Développer les alertes de performance et métriques techniques

### Analytics Avancés

- [ ] Développer le système de tracking des événements utilisateur
- [ ] Implémenter les tableaux de bord analytics temps réel
- [ ] Ajouter l'analyse des entonnoirs de conversion (parcours utilisateur)
- [ ] Développer les rapports de performance automatisés
- [x] Implémenter la segmentation intelligente des utilisateurs
- [ ] Ajouter l'analyse prédictive des revenus et tendances

---

## 🔗 INTÉGRATIONS & APIs

### APIs Internes

- [ ] Implémenter l'API de cache pour optimiser les performances
- [ ] Ajouter l'API de santé système pour le monitoring
- [ ] Développer l'API de métadonnées pour l'enrichissement des données
- [ ] Implémenter l'API de recherche avancée avec filtres complexes
- [ ] Ajouter l'API de seed pour l'initialisation des données de test
- [ ] Développer l'API de profils utilisateurs avec configurations personnalisées

### Services Tiers

- [ ] Implémenter l'intégration avec des services de livraison (Colissimo, Chronopost)

---

## 🚀 FONCTIONNALITÉS PRODUIT AVANCÉES

### Fonctionnalités à Forte Valeur

- [ ] Alertes en temps réel pour les changements de marché
- [ ] Système d'abonnements aux catégories et produits

---

## 📈 OPTIMISATIONS & FUTUR

### Améliorations Techniques

- [ ] Typage strict des variables d'environnement avec Zod (ex: `zod-env`) et fail-fast au boot
- [ ] Feature flags centralisés (ex: `DEBUG_ROUTES_ENABLED`, `DEBUG_LOGGING`, `ENABLE_CACHE`) — guard explicit dans le code
- [ ] Rate limiting et anti-bruteforce (login/API) — middleware commun (ex: mémoire/Redis via `REDIS_URL`)
- [ ] Validation d'API avec Zod + génération OpenAPI (ou doc Markdown) pour `/api/v1/*`
- [ ] Caching des réponses Vinted (TTL, clé par paramètres) — Redis si dispo, fallback mémoire
- [ ] Observabilité: Sentry + OpenTelemetry (corrélation `requestId`, temps DB/API)
- [ ] CI/CD GitHub Actions (typecheck, lint, tests, build Docker, secret scan) + badges
- [ ] i18n (fr/en) avec `next-intl` et extraction des libellés
- [ ] Sécurité headers/CSP renforcés et cookies `Secure`, `HttpOnly`, `SameSite=Strict`
- [ ] Jobs planifiés (node-cron) pour rafraîchir caches/analyses, bascule BullMQ si `REDIS_URL`

---

## 📋 ROADMAP D'IMPLÉMENTATION

### Phase 1 : Base Essentielle (3-4 plateformes)

- [ ] Vinted (habits seconde main France)
- [ ] eBay (tous produits, international)
- [ ] Amazon (électronique & parfums neufs)
- [ ] Leboncoin (habits & électronique France)

### Phase 2 : Extension Française (2 plateformes)

- [ ] Cdiscount (électronique & parfums)
- [ ] Facebook Marketplace (locale, gratuite)

### Phase 3 : Marchés Spécialisés (3-4 plateformes)

- [ ] AliExpress (électronique discount)
- [ ] Poshmark (habits mode US)
- [ ] Depop (habits streetwear/vintage)
- [ ] Rakuten (parfums & habits France)

### Phase 4 : Luxe & Niche (optionnel)

- [ ] Vestiaire Collective (luxe habits/parfums)
- [ ] StockX (sneakers authentifiées)
- [ ] TheRealReal (luxe seconde main)

---

## 🎯 MÉTRIQUES DE SUCCÈS

### Phase 1 : Validation de Base

- [ ] Couverture de 80% des recherches habits en France (Vinted + Leboncoin)
- [ ] Données de prix fiables pour 90% des produits électroniques populaires
- [ ] Réduction de 50% du temps d'analyse de marché vs méthode manuelle
- [ ] Précision des prédictions de prix > 85%

### Phase 2 : Expansion Française

- [ ] Analyse complète du marché français pour les 3 catégories
- [ ] Détection automatique des tendances saisonnières
- [ ] Alertes prix en temps réel pour produits stratégiques
- [ ] Intégration des données locales dans les recommandations

### Phase 3 : Intelligence Internationale

- [ ] Comparaisons prix France vs US vs Asie pour opportunités d'arbitrage
- [ ] Détection de niches rentables par plateforme
- [ ] Recommandations automatiques de plateforme optimale par produit
- [ ] Analyse des écarts de prix entre marchés

### Phase 4 : Optimisation Avancée

- [ ] Prédictions de prix avec IA (précision > 90%)
- [ ] Détection automatique d'anomalies et opportunités
- [ ] Dashboard personnalisé par catégorie de produit
- [ ] ROI positif démontré sur les décisions d'achat/vente

---

## 💰 ESTIMATION DES BÉNÉFICES

### Pour les HABITS

- **Vinted + Leboncoin** : Couverture 90% du marché français seconde main
- **eBay + Poshmark** : Accès aux tendances internationales
- **Résultat** : Optimisation des prix de revente +20-30%

### Pour les PARFUMS

- **eBay + Amazon** : Prix authentifiés et neufs
- **Cdiscount + Rakuten** : Marché français complet
- **Résultat** : Meilleures décisions d'achat, réduction des pertes

### Pour l'ÉLECTRONIQUE

- **Amazon + eBay** : Données de référence fiables
- **AliExpress + Cdiscount** : Tendances prix discount
- **Résultat** : Détection des bonnes affaires, optimisation des stocks
