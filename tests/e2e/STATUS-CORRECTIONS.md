# État des Tests E2E - Corrections Nécessaires

**Date** : 6 octobre 2025  
**Statut Global** : Tests E2E fonctionnels mais nécessitent quelques ajustements

## ✅ Succès

1. **Infrastructure de test** : Complètement opérationnelle
   - Playwright installé et configuré
   - Global setup fonctionne
   - Browsers installés (Chromium, Firefox, Webkit)
   - Scripts npm configurés

2. **Authentification** : ✅ FONCTIONNE
   - Correction du sélecteur de mot de passe (`#password` au lieu de placeholder)
   - Login réussi avec `admin/admin123`
   - Redirection vers `/dashboard` OK

3. **Navigation** : ✅ FONCTIONNE
   - Accès à `/produits` réussi
   - Passage en mode liste OK

4. **Formulaire de création** : ✅ FONCTIONNE
   - Ouverture du formulaire OK
   - Remplissage des champs OK
   - Calculs automatiques OK (3.50€ de frais de port, 13.50€ total)
   - Soumission OK
   - **Produit créé en DB** (le compteur augmente)

## ⚠️ Problèmes Identifiés

### 1. Affichage du produit créé (P1 - Bloquant pour les tests)

**Symptôme** :

- Le produit est créé avec succès (compteur +1)
- Mais il n'apparaît PAS dans la liste même après actualisation
- `getByRole('cell', { name: 'Robe test' })` timeout

**Hypothèses** :

1. Le produit est créé mais la liste ne se rafraîchit pas automatiquement
2. Il y a un filtre actif qui masque le nouveau produit
3. La vue par défaut est en "cartes" et pas en "liste"
4. Le sélecteur de la liste est incorrect

**Actions à faire** :

- [ ] Vérifier le screenshot du test pour voir l'état réel de la page
- [ ] Vérifier si la page affiche "liste" ou "cartes"
- [ ] Vérifier s'il y a des filtres actifs (stock, actif/vendu, etc.)
- [ ] Peut-être forcer un rechargement complet de la page : `page.reload()`
- [ ] Ou vérifier si le produit apparaît dans la vue "cartes" plutôt que "liste"

### 2. Global Setup Instable

**Symptôme** :

- Parfois timeout en attendant le serveur (30 tentatives)
- Le serveur est pourtant actif

**Solution appliquée** :

- Réduit à 10 tentatives
- Ajout d'un try/finally pour fermer le browser
- Ne pas bloquer si le serveur ne répond pas (log d'avertissement)

**Amélioration possible** :

- Utiliser un simple TCP check au lieu de lancer un browser
- Ou simplement vérifier `netstat` avant de lancer les tests

## 📋 Tests à Réaliser Après Correction

Une fois le problème d'affichage résolu :

1. **Test 1 - Création** : Devrait PASSER ✅
2. **Test 2a - Duplication** : Va échouer avec erreur HTTP 400 ❌ (BUG CONNU)
3. **Test 2b - Modification** : Devrait PASSER (avec bug mineur de chargement des données) ⚠️
4. **Test 3 - Mode Vendu** : Va échouer avec erreur HTTP 500 ❌ (BUG CRITIQUE)
5. **Test Synthèse** : Affichera 2 succès / 2 échecs

## 🔧 Corrections Recommandées (par priorité)

### Priorité IMMÉDIATE : Débloquer les tests

**Option A** : Utiliser la vue "cartes" pour vérifier

```typescript
// Au lieu de chercher une cellule dans un tableau
await expect(page.getByRole('cell', { name: TEST_PRODUCT.nom })).toBeVisible();

// Chercher dans la vue cartes
await expect(page.locator('.card, [data-testid="product-card"]')
  .filter({ hasText: TEST_PRODUCT.nom })).toBeVisible();
```

**Option B** : Recharger complètement la page

```typescript
// Après création
await page.reload({ waitUntil: 'networkidle' });
await waitForDataLoad(page);
```

**Option C** : Simplifier la vérification

```typescript
// Ne plus chercher visuellement, juste vérifier le compteur
expect(newProductCount).toBe(initialProductCount + 1);
// Et passer au test suivant
```

### Priorité P0 : Bugs application (après tests fonctionnels)

1. **HTTP 500 sur activation mode Vendu** - CRITIQUE
   - Crash serveur
   - Endpoint : `/api/v1/produits/[id]/sales` (POST)

2. **HTTP 400 sur duplication** - CRITIQUE
   - Bad Request
   - Endpoint : `/api/v1/produits/[id]/duplicate` (POST)

### Priorité P1 : UX

3. **Données non chargées dans formulaire d'édition** - MAJEUR
   - Poids affiche 0g
   - Parcelle non sélectionnée

### Priorité P2 : Cosmétique

4. **Coût d'expédition non affiché dans liste** - MINEUR
   - Affiche 0.00€ au lieu de 3.50€

## 📊 Recommandation

**Action Immédiate** :

1. Examiner le screenshot du test échoué (`test-results/produits-workflow...png`)
2. Déterminer si la page est en mode "liste" ou "cartes"
3. Ajuster le test en conséquence
4. Une fois que Test 1 passe, lancer la suite complète pour confirmer les 4 bugs

**Temps estimé** : 10-15 minutes pour débloquer le Test 1

Voulez-vous que j'examine les screenshots maintenant ou préférez-vous ajuster manuellement le test ?
