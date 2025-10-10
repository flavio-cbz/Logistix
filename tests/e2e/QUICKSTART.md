# 🚀 Guide de Démarrage Rapide - Test Produits

## Installation et Configuration

### 1. Prérequis

Assurez-vous d'avoir installé les dépendances Playwright :

```bash
npx playwright install
```

### 2. Démarrer le serveur

Dans un terminal, lancez le serveur de développement :

```bash
npm run dev
```

Attendez que le serveur soit prêt (il affichera l'URL `http://localhost:3000`).

## Exécution Rapide

### Option 1 : Via npm (Recommandé)

```bash
# Tous les tests en mode headless (rapide)
npm run test:e2e:produits

# Avec interface graphique (pour voir le test en action)
npm run test:e2e:produits:headed

# Mode debug (pour investiguer)
npm run test:e2e:produits:debug
```

### Option 2 : Via le script bash (Linux/Mac)

```bash
# Rendre le script exécutable (une seule fois)
chmod +x tests/e2e/run-produits-test.sh

# Exécuter tous les tests
./tests/e2e/run-produits-test.sh

# Avec interface graphique
./tests/e2e/run-produits-test.sh --headed

# Test spécifique (création uniquement)
./tests/e2e/run-produits-test.sh --creation --headed
```

### Option 3 : Directement avec Playwright

```bash
# Tous les tests
npx playwright test tests/e2e/produits-workflow.spec.ts

# Test spécifique
npx playwright test tests/e2e/produits-workflow.spec.ts -g "Étape 1"
```

## Tests Disponibles

| Test | Description | Statut Attendu | Commande |
|------|-------------|----------------|----------|
| **Création** | Crée un nouveau produit | ✅ SUCCÈS | `--creation` |
| **Duplication** | Duplique un produit | ❌ BUG (400) | `--duplication` |
| **Modification** | Modifie un produit | ✅ SUCCÈS (avec bug mineur) | `--modification` |
| **Mode Vendu** | Active le statut vendu | ❌ BUG (500) | `--vendu` |
| **Synthèse** | Rapport complet | 50% | `--synthesis` |

## Résultats Attendus

### ✅ Tests qui devraient PASSER

1. **Création de produit**
   - Formulaire se remplit correctement
   - Calculs automatiques fonctionnent
   - Produit créé visible dans la liste

2. **Modification de produit**
   - Nom change correctement
   - Produit mis à jour dans la liste
   - ⚠️ Note : Poids et parcelle non préchargés (bug mineur)

### ❌ Tests qui vont ÉCHOUER (bugs connus)

3. **Duplication**
   - ❌ Erreur HTTP 400 (Bad Request)
   - Bug critique à corriger

4. **Mode Vendu**
   - ❌ Erreur HTTP 500 (Internal Server Error)
   - Bug critique à corriger

## Interpréter les Résultats

### Logs Console

Les tests affichent des logs colorés :

```
🔵 Test 1/4 : Création de produit...
✅ Création : SUCCÈS

🔵 Test 2/4 : Modification de produit...
⚠️ BUG CONFIRMÉ : Le poids n'est pas chargé
✅ Modification : SUCCÈS

❌ BUG CRITIQUE CONFIRMÉ : Erreur 500 lors de l'activation du statut Vendu
```

### Rapport HTML

Après l'exécution, consultez le rapport détaillé :

```bash
npx playwright show-report
```

Le rapport HTML montre :

- ✅ Tests réussis en vert
- ❌ Tests échoués en rouge
- 📸 Captures d'écran des échecs
- 🎬 Vidéos des tests (si configuré)

## Dépannage

### Le serveur n'est pas accessible

```bash
# Vérifier que le serveur est lancé
curl http://localhost:3000

# Relancer le serveur
npm run dev
```

### Les tests échouent de manière inattendue

```bash
# Exécuter en mode debug pour voir ce qui se passe
npm run test:e2e:produits:debug

# Ou en mode headed
npm run test:e2e:produits:headed
```

### Erreur "Timeout waiting for..."

Le serveur est peut-être trop lent. Augmentez le timeout dans `playwright.config.ts` :

```typescript
timeout: 60000, // 60 secondes au lieu de 30
```

### Problèmes d'authentification

Vérifiez que l'utilisateur de test existe :

- Username : `admin`
- Password : `admin123`

Si nécessaire, créez l'utilisateur via le script de seed :

```bash
npm run db:seed
```

## Commandes Utiles

```bash
# Voir la liste de tous les tests
npx playwright test --list

# Exécuter un seul test nommé
npx playwright test -g "Créer un produit"

# Exécuter avec plusieurs workers (parallèle)
npx playwright test --workers=4

# Générer un rapport après coup
npx playwright show-report

# Nettoyer les anciens rapports
rm -rf test-results playwright-report
```

## Prochaines Étapes

1. **Corriger les bugs critiques** :
   - Erreur 500 sur le mode Vendu
   - Erreur 400 sur la duplication

2. **Améliorer le chargement** :
   - Précharger poids et parcelle dans le formulaire

3. **Étendre les tests** :
   - Ajouter tests de suppression
   - Tester les validations de formulaire
   - Tester les calculs de bénéfice

## Support

- 📖 Documentation complète : `tests/e2e/README-PRODUITS-WORKFLOW.md`
- 🐛 Bugs identifiés : Voir section "Bugs Identifiés" du README
- 🎭 Playwright Docs : <https://playwright.dev/>

---

**Dernière mise à jour** : 6 octobre 2025
