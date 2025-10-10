# Scripts Logistix

Ce répertoire contient tous les scripts d'automatisation et de maintenance pour le projet Logistix.

## Scripts disponibles

### file-sorting-system.ts

Système de tri de fichiers pour Logistix. Ce script permet d'analyser, détecter et supprimer les fichiers non référencés dans le projet avec différentes stratégies et options de configuration.

#### Fonctionnalités

- Analyse approfondie des dépendances
- Détection des fichiers non référencés avec scoring de risque
- Sauvegarde sécurisée avant suppression
- Différents modes d'exécution (analyse, sauvegarde, suppression)
- Configuration flexible via JSON et variables d'environnement
- Logging progressif et rapports en temps réel
- Interface CLI complète avec commander.js

#### Modes d'exécution

1. **Mode analyse (dry-run)** - analyse les fichiers sans suppression

   ```bash
   ts-node file-sorting-system.ts analyze
   ```

2. **Mode sauvegarde seulement** - sauvegarde les fichiers sans suppression

   ```bash
   ts-node file-sorting-system.ts backup
   ```

3. **Mode suppression avec confirmation** - supprime les fichiers après confirmation

   ```bash
   ts-node file-sorting-system.ts delete
   ```

4. **Mode silencieux (batch)** - exécute sans interaction utilisateur

   ```bash
   ts-node file-sorting-system.ts silent
   ```

#### Configuration

Le script utilise un fichier de configuration `file-sorting-config.json` à la racine du projet. Vous pouvez également spécifier un fichier de configuration personnalisé avec l'option `-c` ou `--config`.

#### Options

- `-c, --config <path>` - chemin vers le fichier de configuration
- `-v, --verbose` - afficher plus de détails dans les logs
- `-h, --help` - afficher l'aide

### Utilisation

Pour exécuter le script, utilisez la commande suivante :

```bash
ts-node file-sorting-system.ts [commande] [options]
```

### Exemples

1. Exécuter une analyse complète du projet :

   ```bash
   ts-node file-sorting-system.ts analyze
   ```

2. Sauvegarder les fichiers non référencés :

   ```bash
   ts-node file-sorting-system.ts backup
   ```

3. Supprimer les fichiers non référencés avec confirmation :

   ```bash
   ts-node file-sorting-system.ts delete
   ```

4. Exécuter en mode silencieux avec un fichier de configuration personnalisé :

   ```bash
   ts-node file-sorting-system.ts -c custom-config.json silent
   ```

## Tests

Les tests pour les scripts sont disponibles dans le répertoire `__tests__`.

Pour exécuter les tests, utilisez la commande suivante :

```bash
npm test
