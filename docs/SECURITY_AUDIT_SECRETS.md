# 🔐 Rapport d'Audit Sécurité - Gestion des Secrets

**Date** : 11 octobre 2025  
**Projet** : LogistiX  
**Criticité** : 🔴 **HAUTE**

---

## 📋 Résumé Exécutif

### Vulnérabilités Critiques Identifiées

1. **Stockage de secrets en clair dans SQLite** ⚠️ CRITIQUE
   - Table `app_secrets` stocke des valeurs sensibles non chiffrées
   - Colonne `value` en `text` plain dans `lib/database/schema.ts:492`
   - Utilisé par `SecretManager` pour stocker clés API (OpenAI, etc.)

2. **Secrets utilisateur en base** ⚠️ ÉLEVÉ
   - `users.encryptionSecret` stocké en clair (ligne 31)
   - Utilisé pour chiffrement tokens Vinted via `encryption-service.ts`

3. **Tokens de session potentiellement exposés** ⚠️ MOYEN
   - `vintedSessions.tokenExpiresAt` (ligne 453)
   - Pas de chiffrement documenté pour les tokens eux-mêmes

---

## 🔍 Analyse Détaillée

### 1. Table `app_secrets` (CRITIQUE)

**Fichier** : `lib/database/schema.ts` (lignes 483-502)

```typescript
export const appSecrets = sqliteTable(
  "app_secrets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    value: text("value").notNull(),  // ⚠️ SECRETS EN CLAIR
    isActive: integer("is_active").default(1).notNull(),
    createdAt: text("created_at"),
    updatedAt: text("updated_at"),
    revokedAt: text("revoked_at"),
  }
);
```

**Usage** : `lib/services/security/secret-manager.ts`

- Ligne 130 : `SELECT id, name, value, is_active FROM app_secrets`
- Ligne 223 : `UPDATE app_secrets SET value = ?, updated_at = ?`
- Ligne 231 : `INSERT INTO app_secrets (..., value, ...)`

**Risque** :

- ✅ Accès fichier DB = accès secrets (OpenAI API keys, etc.)
- ✅ Logs SQL peuvent exposer les valeurs
- ✅ Backups non chiffrés = fuite massive

---

### 2. `users.encryptionSecret` (ÉLEVÉ)

**Fichier** : `lib/database/schema.ts` (ligne 31)

```typescript
encryptionSecret: text("encryption_secret"),
```

**Usage** : `lib/services/security/encryption-service.ts`

- Utilisé dans `deriveUserKek()` pour dériver clés de chiffrement
- Stocké en hexadécimal 32 bytes généré par `generateUserSecret()`

**Risque** :

- Si DB compromise, tous les tokens Vinted utilisateurs sont déchiffrables
- Secret principal stocké en clair = clé maîtresse exposée

---

### 3. Password Hashes (✅ SÉCURISÉ)

**Fichier** : `lib/database/schema.ts` (ligne 29)

```typescript
passwordHash: text("password_hash").notNull(),
```

**Vérification** : `lib/utils/crypto.ts`

- ✅ Utilise `bcrypt.hash()` avec 10 rounds (ligne 124)
- ✅ Jamais stocké en clair
- ✅ Comparaison via `bcrypt.compare()` (ligne 165)

---

## 🛡️ Recommandations de Sécurisation

### 🔴 **Action Immédiate** (Priorité 1)

#### A. Migrer `app_secrets.value` vers variables d'environnement

**Étapes** :

1. **Créer `.env.local` pour secrets runtime** :

   ```bash
   # .env.local (NE JAMAIS COMMITTER)
   OPENAI_API_KEY=sk-...
   VINTED_API_KEY=...
   ENCRYPTION_MASTER_KEY=...  # Générer avec: openssl rand -hex 32
   ```

2. **Modifier `SecretManager` pour lire depuis env** :

   ```typescript
   // lib/services/security/secret-manager.ts
   public getSecret(name: string): string | undefined {
     // Priorité 1: Variables d'environnement
     const envKey = `SECRET_${name.toUpperCase()}`;
     if (process.env[envKey]) {
       return process.env[envKey];
     }
     
     // Fallback: base de données (déprécié, à supprimer)
     return this.secrets.get(name);
   }
   ```

3. **Supprimer progressivement la table `app_secrets`** :
   - Migration pour extraire secrets existants
   - Chiffrer les valeurs avant stockage temporaire
   - Déprécier l'API `setSecret()` pour écriture DB

#### B. Chiffrer `users.encryptionSecret`

**Solution** : Chiffrement avec clé maîtresse depuis env

```typescript
// lib/database/schema.ts
export const users = sqliteTable("users", {
  // ...
  encryptionSecret: text("encryption_secret").notNull(), // Chiffré avec MASTER_KEY
  // ...
});

// lib/utils/crypto.ts - Nouvelle fonction
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_MASTER_KEY!, 'hex');

export function encryptUserSecret(plainSecret: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainSecret, 'hex'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  
  // Format: IV (16 bytes) + AuthTag (16 bytes) + Encrypted Data
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptUserSecret(encryptedSecret: string): string {
  const data = Buffer.from(encryptedSecret, 'base64');
  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  
  const decipher = createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('hex');
}
```

---

### 🟠 **Actions Court Terme** (Priorité 2)

#### C. Audit des logs SQL

**Vérifier** : `lib/utils/logging/logger.ts`

- ✅ Ne pas logger les valeurs de colonnes sensibles
- ✅ Masquer automatiquement les patterns `value`, `secret`, `token`, `key`

```typescript
// lib/utils/logging/logger.ts - Sanitizer
function sanitizeSensitiveData(message: string): string {
  return message
    .replace(/value\s*=\s*'[^']+'/gi, "value='***'")
    .replace(/secret\s*=\s*'[^']+'/gi, "secret='***'")
    .replace(/token\s*=\s*'[^']+'/gi, "token='***'")
    .replace(/api_key\s*=\s*'[^']+'/gi, "api_key='***'");
}
```

#### D. Rotation des secrets

**Implémenter** : Mécanisme de rotation automatique

- Ajouter colonne `app_secrets.rotatedAt`
- Alerter si secret > 90 jours
- API pour rotation sans downtime

---

### 🟢 **Améliorations Long Terme** (Priorité 3)

#### E. Intégration HashiCorp Vault ou AWS Secrets Manager

**Pour production** :

- Service externe dédié à la gestion de secrets
- Rotation automatique
- Audit trail complet
- Chiffrement hardware (HSM)

#### F. Chiffrement au repos de la DB SQLite

**Options** :

1. **SQLCipher** : Chiffrement natif SQLite

   ```bash
   npm install @journeyapps/sqlcipher
   ```

2. **LUKS** (Linux) : Chiffrement du disque au niveau OS

   ```bash
   cryptsetup luksFormat /dev/sdX
   ```

---

## 📊 Matrice de Risques

| Vulnérabilité | Impact | Probabilité | Risque | Action |
|--------------|--------|-------------|--------|--------|
| Secrets DB en clair | 🔴 Critique | 🟠 Moyenne | 🔴 **HAUTE** | Migration env immédiate |
| encryptionSecret clair | 🟠 Élevé | 🟠 Moyenne | 🟠 **MOYENNE** | Chiffrement master key |
| Logs SQL exposent secrets | 🟡 Moyen | 🟢 Faible | 🟡 **FAIBLE** | Sanitizer logs |
| Pas de rotation secrets | 🟡 Moyen | 🟢 Faible | 🟡 **FAIBLE** | Rotation auto |

---

## ✅ Checklist de Mise en Conformité

### Phase 1 : Urgence (Cette semaine)

- [ ] Créer `.env.local` avec secrets actuels
- [ ] Modifier `SecretManager.getSecret()` pour lire env en priorité
- [ ] Générer `ENCRYPTION_MASTER_KEY` pour chiffrement user secrets
- [ ] Tester en local que l'app fonctionne avec secrets depuis env

### Phase 2 : Sécurisation (Prochain sprint)

- [ ] Implémenter `encryptUserSecret()` / `decryptUserSecret()`
- [ ] Migration pour chiffrer `users.encryptionSecret` existants
- [ ] Ajouter sanitizer logs SQL
- [ ] Documenter process de rotation manuelle des secrets

### Phase 3 : Industrialisation (Futur)

- [ ] Évaluer HashiCorp Vault vs AWS Secrets Manager
- [ ] POC avec SQLCipher pour DB chiffrée
- [ ] Implémenter rotation automatique
- [ ] Audit trail complet des accès secrets

---

## 📞 Contact & Support

**Référent Sécurité** : Flavio (Développeur Principal)  
**Documentation** : `docs/SECURITY.md` (à créer)  
**Incident Security** : <security@logistix.local>

---

## 📚 Références

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST SP 800-57 - Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [CWE-256: Unprotected Storage of Credentials](https://cwe.mitre.org/data/definitions/256.html)
- [SQLCipher Documentation](https://www.zetetic.net/sqlcipher/sqlcipher-api/)

---

**Rapport généré automatiquement - LogistiX Security Audit v1.0**
