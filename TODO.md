# ✅ TODO Final - Plan d'Action consolidé (Mise à jour)

### Priorité 1 : [CRITIQUE] - Failles de Sécurité Immédiates

*Ces actions doivent être traitées en urgence absolue car elles représentent des risques de sécurité majeurs.*

1. **[ ] Remplacer le système de hachage de mot de passe.**
    - **Action :** Remplacer l'implémentation actuelle de `hashPassword` (basée sur `sha256`) par `bcrypt`. Utiliser `bcrypt.hash` pour le hachage et `bcrypt.compare` pour la vérification.
    - **Fichier :** `lib/services/auth/auth.ts`

2. **[ ] Corriger la logique d'authentification et supprimer les contournements.**
    - **Actions :**
        1. Modifier `verifyCredentials` pour qu'elle recherche l'utilisateur par son `username`, puis compare le hash du mot de passe avec `bcrypt.compare`.
        2. Mettre à jour l'API de login pour appeler cette nouvelle fonction `verifyCredentials` avec l'`identifier` et le `password`.
        3. **Auditer et supprimer l'authentification "legacy"** qui accorde des privilèges `admin` par défaut.
    - **Fichiers :** `lib/services/auth/auth.ts`, `app/api/v1/auth/login/route.ts`, `lib/services/auth/compat.ts`

3. **[ ] Chiffrer les Clés API au Repos**
    - **Action :** Implémenter le chiffrement pour le champ `apiKey` avant de le sauvegarder en base de données.
    - **Fichier :** [`app/api/v1/profile/ai-config/route.ts`](app/api/v1/profile/ai-config/route.ts:1)

4. **[ ] Chiffrer les Cookies Vinted au Repos**
    - **Action :** Appliquer la même logique de chiffrement pour les cookies de session Vinted stockés en base de données.
    - **Fichier :** [`lib/services/auth/vinted-session-manager.ts`](lib/services/auth/vinted-session-manager.ts:1)

5. **[ ] Retirer les Secrets du Code Source**
    - **Action :** Supprimer les tokens en clair du fichier de test et les charger depuis les variables d'environnement.
    - **Fichier :** [`scripts/testing/final-validation-test.ts`](scripts/testing/final-validation-test.ts:1)

6. **[ ] Sécuriser les Endpoints d'Administration**
    - **Action :** Ajouter un middleware de contrôle de rôle (`admin`) sur toutes les routes du dossier `/api/admin/*`.
    - **Fichiers :** Tout le dossier `app/api/admin/`

7. **[ ] Supprimer la Base de Données du Dépôt Git**
    - **Action :** Ajouter `data/logistix.db` au `.gitignore`, puis exécuter `git rm --cached data/logistix.db`.
    - **Fichier :** [`data/logistix.db`](data/logistix.db:1)

---

### Priorité 2 : [ÉLEVÉ] - Risques d'Intégrité des Données et Stabilité

*Ces actions corrigent des bugs qui peuvent entraîner une perte de données ou des pannes de l'application.*

1. **[ ] Rendre la Synchronisation de Données Atomique**
    - **Action :** Encadrer la suppression et l'insertion des données dans une transaction. Valider le payload avec Zod avant toute opération d'écriture.
    - **Fichier :** [`app/api/v1/data/sync/route.ts`](app/api/v1/data/sync/route.ts:1)

2. **[ ] Empêcher les Divisions par Zéro**
    - **Action :** Ajouter des gardes conditionnelles (`if (variable > 0)`) avant chaque calcul impliquant une division.
    - **Fichiers :** `lib/utils/formatting/calculations.ts`, `app/api/v1/parcelles/route.ts`, `app/api/v1/market-analysis/predict/route.ts`

3. **[ ] Gérer les Valeurs `undefined` dans l'UI**
    - **Action :** Utiliser systématiquement le chaînage optionnel (`?.`) et l'opérateur de coalescence nulle (`??`) pour éviter les crashs de rendu.
    - **Fichiers :** `components/features/statistiques/parcelles-table.tsx`, `components/features/market-analysis/widgets/product-info-widget.tsx`

4. **[ ] Activer la Vérification Stricte au Build (CI)**
    - **Action :** Mettre `eslint.ignoreDuringBuilds` et `typescript.ignoreBuildErrors` à `false` dans la configuration de la CI et corriger les erreurs qui en résultent.
    - **Fichier :** `next.config.mjs`

5. **[ ] Anonymiser les Logs**
    - **Action :** Parcourir les appels au logger et masquer les informations personnelles (`identifier`, `apiKey`, `email`, etc.).
    - **Fichiers :** `app/api/v1/auth/login/enhanced-route.ts`, `app/api/v1/profile/ai-config/route.ts` (et autres)

---

### Priorité 3 : [MOYEN] - Amélioration de la Robustesse et de l'UX

*Ces actions améliorent la fiabilité, l'expérience utilisateur et réduisent la dette technique.*

1. **[ ] Ajouter Timeouts et Retries sur les Appels Externes**
    - **Action :** Utiliser un `AbortController` pour les `fetch` et implémenter une logique de `retry` pour les appels aux API Vinted et IA.
    - **Fichiers :** `app/api/v1/ai/inference/route.ts`, `lib/services/auth/vinted-auth-service.ts`, `scripts/analysis/market_analyzer.py`

2. **[ ] Supprimer la Logique d'Authentification Redondante dans l'UI**
    - **Action :** Supprimer le bloc de code `if (!user)` et la redirection, car cette logique est déjà gérée par `middleware.ts`.
    - **Fichier :** `app/(dashboard)/layout.tsx`

3. **[ ] Ajouter des Confirmations pour les Actions Destructrices**
    - **Action :** Remplacer les appels directs aux fonctions de suppression par une modale de confirmation.
    - **Fichier :** `app/(dashboard)/parcelles/page.tsx`

4. **[ ] Remplacer la Redirection `window.location.href`**
    - **Action :** Utiliser le hook `useRouter` de Next.js (`router.push('/path')`) pour une navigation côté client.
    - **Fichier :** `app/(dashboard)/analyse-marche/components/vinted-config-required.tsx`

5. **[ ] Mettre en place une Stratégie de Test**
    - **Action :** Écrire des tests unitaires pour les fonctions utilitaires critiques.
    - **Fichiers prioritaires :** `lib/utils/formatting/calculations.ts`, `lib/services/auth/token-manager.ts`

---

### Priorité 4 : [FAIBLE] - Nettoyage et Qualité de Vie

*Ces actions améliorent la lisibilité et la maintenabilité du code.*

1. **[ ] Centraliser la Logique Utillitaire (Crypto)**
    - **Action :** S'assurer que la fonction `hashPassword` (maintenant basée sur `bcrypt`) est définie à un seul endroit et importée là où elle est nécessaire, pour éviter la duplication.
    - **Fichiers :** `lib/services/auth/auth.ts`, `lib/services/database/db.ts` (vérifier si la fonction est dupliquée ici).

2. **[ ] Supprimer les Fichiers Inutiles ou Désactivés**
    - **Action :** Supprimer le code mort et les artefacts de développement identifiés.
    - **Fichiers à supprimer :** `app/api/v1/_disabled-similar-sales/route.ts`, `app/api/v1/parse-query/route.ts`, `lib/services/validation/product-test-suite.ts`, `ANALYSE.md`.

3. **[ ] Supprimer les Logs de Débogage**
    - **Action :** Rechercher et supprimer tous les appels à `console.log` qui ne sont pas pertinents pour la production.
    - **Fichiers notables :** `app/(dashboard)/layout.tsx`, `components/auth/login-form.tsx`.

## Fichiers mockés et leur utilité

- [`lib/services/examples/category-validation-service.mock.ts`](lib/services/examples/category-validation-service.mock.ts:1)  
  Fournit un service de validation de catégorie fictif (`categoryValidationService`) pour permettre l'exécution et la compilation des exemples sans dépendance réelle.  
  Utilisé pour :  
  - Simuler les méthodes de validation de catégorie (`validateCategory`, `validateCategoryForAnalysis`, etc.)
  - Permettre aux fichiers d'exemple de fonctionner même si le service réel n'est pas disponible.