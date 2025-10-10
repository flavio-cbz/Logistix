# Tests Différentiels SQLite vs PostgreSQL

Ce dossier contient les tests d'intégration qui valident la compatibilité entre les implémentations SQLite et PostgreSQL des repositories.

## Objectif

Garantir que les mêmes opérations CRUD produisent des résultats identiques sur SQLite et PostgreSQL, assurant ainsi une migration transparente entre les deux bases de données.

## Structure

- `postgres-basic.test.ts` - Tests PostgreSQL uniquement (Phase 1)
- `sqlite-postgres-diff.test.ts` - Tests différentiels complets (Phase 2, TODO)

## Phase 1: Tests PostgreSQL (Actuel)

Tests de base pour valider l'implémentation PostgreSQL :

### Repositories testés
- `PostgresProduitRepository`
- `PostgresParcelleRepository`

### Opérations couvertes
- **CREATE**: Création d'entités avec validation
- **READ**: Recherche par ID, user ID, critères spécifiques
- **UPDATE**: Modification de champs avec validation
- **DELETE**: Suppression avec vérification d'existence
- **SEARCH**: Recherche textuelle et filtres

### Cas d'erreur testés
- `NotFoundError` pour entités inexistantes
- `ValidationError` pour données invalides
- `DatabaseError` pour problèmes de connexion
- Contraintes d'unicité (ex: numéro parcelle par utilisateur)

## Configuration des tests

### Variables d'environnement

```bash
# PostgreSQL de test
TEST_POSTGRES_HOST=localhost
TEST_POSTGRES_PORT=5432
TEST_POSTGRES_DATABASE=logistix_test
TEST_POSTGRES_USERNAME=postgres
TEST_POSTGRES_PASSWORD=postgres
```

### Prérequis

1. **Base PostgreSQL de test** disponible sur le host configuré
2. **Schéma** : Les tables `products` et `parcelles` doivent exister avec le même schéma que SQLite
3. **Permissions** : L'utilisateur test doit pouvoir CREATE/DROP/SELECT/UPDATE/DELETE

### Exécution

```bash
# Tous les tests différentiels
npm run test:integration tests/integration/differential/

# Tests PostgreSQL uniquement
npm run test:integration tests/integration/differential/postgres-basic.test.ts
```

## Phase 2: Tests Différentiels (TODO)

### Stratégie de comparaison

1. **Setup dual** : Initialiser SQLite et PostgreSQL en parallèle
2. **Opérations miroir** : Exécuter les mêmes CRUD sur les deux DBs
3. **Comparaison résultats** : Valider que les entités retournées sont identiques
4. **Nettoyage synchronisé** : Nettoyer les deux DBs après chaque test

### Tests différentiels prévus

```typescript
describe('Differential Tests: SQLite vs PostgreSQL', () => {
  it('should create identical products on both databases', async () => {
    const productData = { /* ... */ };
    
    const sqliteProduct = await sqliteProduitRepo.create(productData);
    const postgresProduct = await postgresProduitRepo.create(productData);
    
    // Comparer tous les champs sauf IDs (UUID vs auto-increment)
    expect(sqliteProduct.nom).toBe(postgresProduct.nom);
    expect(sqliteProduct.prix).toBe(postgresProduct.prix);
    // ... autres champs
  });
  
  it('should return same search results on both databases', async () => {
    // Peupler les deux DBs avec les mêmes données
    // Exécuter la même recherche
    // Comparer les résultats
  });
});
```

### Défis techniques

1. **IDs différents** : SQLite (integer) vs PostgreSQL (UUID)
2. **Types de données** : Mapping exact des types numériques
3. **Dates/timestamps** : Format et précision
4. **Encodage texte** : UTF-8, collations, case sensitivity

## Outils de validation

### Métriques de performance

Les tests mesurent aussi la performance relative :

```typescript
const sqliteTime = await measureOperation(() => sqliteRepo.findByUserId(userId));
const postgresTime = await measureOperation(() => postgresRepo.findByUserId(userId));

// Log des différences de performance
console.log(`SQLite: ${sqliteTime}ms, PostgreSQL: ${postgresTime}ms`);
```

### Intégrité référentielle

Validation des contraintes FK entre `products` et `parcelles` :

```typescript
// Créer parcelle sur les deux DBs
// Créer produit lié à la parcelle
// Tenter de supprimer la parcelle (devrait échouer)
// Supprimer le produit puis la parcelle (devrait réussir)
```

## Résultats attendus

✅ **Tous les tests doivent passer** sur PostgreSQL  
✅ **Même comportement** sur SQLite et PostgreSQL  
✅ **Mêmes erreurs** levées dans les cas d'échec  
✅ **Performance acceptable** sur les deux implémentations  

## Utilisation en CI/CD

Ces tests s'intègrent dans le pipeline de validation :

```yaml
# .github/workflows/test.yml
- name: Run Differential Tests
  run: npm run test:integration -- tests/integration/differential/
  env:
    TEST_POSTGRES_HOST: postgres
    TEST_POSTGRES_DATABASE: logistix_test
```