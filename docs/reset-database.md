# Réinitialisation de la Base de Données

Ce document décrit comment utiliser la fonction `resetDatabase` pour supprimer et réinitialiser la base de données `logistix.db`.

**ATTENTION :** Cette opération est destructive et supprimera toutes les données existantes de la base de données. Elle est destinée à être utilisée uniquement en environnement de développement ou de test.

## Fonction `resetDatabase`

La fonction `resetDatabase` est disponible dans `lib/services/db.ts`. Elle effectue les actions suivantes :

1. Ferme toute connexion active à la base de données.
2. Supprime le fichier `data/logistix.db` ainsi que ses fichiers de journal (`.db-shm`, `.db-wal`).
3. Réinitialise la base de données en appelant la fonction `initializeDatabase()`, ce qui recrée le fichier de base de données et initialise le schéma avec les tables par défaut.

## Utilisation

Pour utiliser cette fonction, vous pouvez l'importer et l'appeler depuis un script ou une route API dédiée (uniquement en développement).

**Exemple d'utilisation (pour un script de développement) :**

```typescript
import { resetDatabase } from '../lib/services/db';

console.log('Tentative de réinitialisation de la base de données...');
const success = resetDatabase();

if (success) {
  console.log('Base de données réinitialisée avec succès.');
} else {
  console.error('Échec de la réinitialisation de la base de données. Vérifiez les logs pour plus de détails.');
}
```

## Précautions

* **Environnement de Production :** La fonction `resetDatabase` inclut une vérification de l'environnement. Elle refusera de s'exécuter si la variable d'environnement `NODE_ENV` est définie sur `production`. Assurez-vous que cette variable est correctement configurée dans vos environnements.
* **Perte de Données :** L'exécution de cette fonction entraînera une perte irréversible de toutes les données stockées dans `logistix.db`. Sauvegardez vos données si nécessaire avant de procéder.
* **Accès :** Restreignez l'accès à cette fonction aux utilisateurs ou aux rôles appropriés, et ne l'exposez jamais directement via une API accessible publiquement en production.
