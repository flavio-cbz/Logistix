# Tests Vinted Integration

Ce dossier contient les tests pour l'intégration Vinted de LogistiX.

## Tests disponibles

### 1. `test-vinted-services-direct.ts`
Test direct des services Vinted sans passer par l'API Next.js.

**Fonctionnalités testées :**
- ✅ Extraction des tokens depuis le cookie
- ✅ Chiffrement/déchiffrement des credentials
- ✅ Validation du token d'accès
- ✅ Renouvellement automatique du token
- ✅ Analyse de marché avec recherche de produits

**Usage :**
```bash
# Avec variables d'environnement
VINTED_CREDENTIALS_SECRET="your_secret" VINTED_CREDENTIALS_SALT="your_salt" tsx scripts/tests/test-vinted-services-direct.ts

# Ou en PowerShell
$env:VINTED_CREDENTIALS_SECRET="your_secret"; $env:VINTED_CREDENTIALS_SALT="your_salt"; tsx scripts/tests/test-vinted-services-direct.ts
```

### 2. `test-and-cleanup-vinted-integration.ts`
Test complet de l'intégration avec nettoyage du projet.

**Fonctionnalités testées :**
- Base de données et schéma
- Chiffrement des credentials
- API d'authentification Vinted
- Recherche de produits
- Nettoyage des fichiers obsolètes

**Usage :**
```bash
tsx scripts/tests/test-and-cleanup-vinted-integration.ts
```

## Configuration requise

### Variables d'environnement
Ajoutez ces variables à votre `.env.local` :

```env
# Configuration Vinted
VINTED_CREDENTIALS_SECRET=your_vinted_credentials_secret_key_here_change_this_in_production
VINTED_CREDENTIALS_SALT=your_vinted_credentials_salt_here_change_this_in_production
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Cookie Vinted
Pour tester avec un vrai cookie, modifiez la variable `TEST_COOKIE` dans les fichiers de test avec un cookie valide au format :

```
v_udt=...; access_token_web=...; refresh_token_web=...; [autres cookies]
```

## Résultats attendus

### Test réussi
```
🧪 Test direct des services Vinted

📝 Test d'extraction des tokens...
✅ Access token extrait: Oui (754 caractères)
✅ Refresh token extrait: Oui (756 caractères)

🔐 Test de chiffrement...
✅ Chiffrement/déchiffrement: OK

🔍 Test de validation du token...
✅ Token valide: Oui
   Status: 200

📊 Test d'analyse de marché...
✅ Analyse réussie!
   Volume de ventes: 25
   Prix moyen: 45.50€
   Fourchette: 20€ - 80€
   Marque: Nike (ID: 123)
```

### Token expiré (normal)
```
🔍 Test de validation du token...
✅ Token valide: Non
   Status: 200

🔄 Test de renouvellement du token...
✅ Token renouvelé avec succès
   Nouveau access token: eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmNObzFEb3JIM2oyN0J1...
```

## Architecture testée

L'intégration Vinted utilise :

1. **VintedAuthService** : Gestion automatique des tokens
2. **VintedCredentialService** : Chiffrement sécurisé des cookies
3. **VintedMarketAnalysisService** : Analyse de marché et recherche de produits
4. **API Routes** : `/api/v1/vinted/auth` et `/api/v1/market-analysis`

## Dépannage

### Erreur "VINTED_CREDENTIALS_SECRET est requise"
Configurez les variables d'environnement comme indiqué ci-dessus.

### Erreur 401 lors de l'analyse
Le cookie Vinted est expiré. Obtenez un nouveau cookie depuis votre navigateur.

### Erreur de connexion
Vérifiez que le serveur Next.js fonctionne sur le port 3000.