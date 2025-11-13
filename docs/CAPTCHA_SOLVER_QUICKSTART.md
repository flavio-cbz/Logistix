# Système de Résolution de Captchas - Guide de Démarrage Rapide

## Introduction

Ce système permet de résoudre automatiquement les captchas de type slider puzzle (utilisés notamment sur les sites e-commerce chinois comme Superbuy) avec apprentissage continu pour améliorer les performances au fil du temps.

## Installation et Configuration

### Prérequis

1. Node.js >= 20.0.0
2. Un modèle YOLO entraîné pour la détection de captchas (optionnel pour les tests)
3. Accès à LogistiX avec authentification configurée

### Étape 1: Appliquer la Migration de Base de Données

```bash
npm run db:migrate
```

Cela créera les tables nécessaires :
- `captcha_attempts` - Stocke les tentatives de résolution
- `training_data` - Stocke les données d'entraînement
- `model_metrics` - Stocke les métriques de performance

### Étape 2: Intégrer votre Modèle YOLO (Optionnel)

Créez une implémentation du détecteur YOLO :

```typescript
// lib/services/yolo-detector-impl.ts
import { YOLODetector, YOLODetectionResult } from '@/lib/services/captcha-solver-service';

export class YOLOv8Detector implements YOLODetector {
  private model: any; // Votre modèle YOLO chargé

  constructor(modelPath: string) {
    // Charger votre modèle YOLO
    this.model = loadYOLOModel(modelPath);
  }

  async detect(imageUrl: string): Promise<YOLODetectionResult> {
    // 1. Charger et prétraiter l'image
    const image = await this.loadImage(imageUrl);
    
    // 2. Exécuter l'inférence
    const detections = await this.model.predict(image);
    
    // 3. Extraire la position du trou détecté
    const gapDetection = this.findGapDetection(detections);
    
    return {
      position: gapDetection.centerX,
      confidence: gapDetection.confidence,
      boundingBox: gapDetection.bbox,
    };
  }

  private async loadImage(url: string) {
    // Implémenter le chargement d'image
  }

  private findGapDetection(detections: any) {
    // Implémenter l'extraction de la détection de trou
  }
}
```

Ensuite, mettez à jour le service container :

```typescript
// lib/services/container.ts
import { YOLOv8Detector } from '@/lib/services/yolo-detector-impl';

// Dans la méthode getCaptchaSolverService()
const detector = new YOLOv8Detector('/path/to/your/model.pt');
const service = new CaptchaSolverService(attemptRepo, trainingRepo, detector);
```

## Utilisation

### 1. Résolution Basique d'un Captcha

```typescript
// Dans votre script de scraping
const response = await fetch('http://localhost:3000/api/v1/captcha/solve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${yourAuthToken}`,
  },
  body: JSON.stringify({
    imageUrl: 'https://example.com/captcha-background.jpg',
    puzzlePieceUrl: 'https://example.com/captcha-piece.jpg',
  }),
});

const { data } = await response.json();
console.log(`Position détectée: ${data.detectedPosition}px`);
console.log(`Confiance: ${data.confidence * 100}%`);

// Utiliser data.detectedPosition pour déplacer le slider
```

### 2. Workflow Complet avec Puppeteer

Voir l'exemple complet dans `scripts/captcha-solver-example.ts` :

```bash
# Configurer les variables d'environnement
export API_BASE_URL=http://localhost:3000
export AUTH_TOKEN=your-jwt-token
export TARGET_URL=https://site-with-captcha.com

# Exécuter l'exemple
npx tsx scripts/captcha-solver-example.ts
```

### 3. Valider les Résultats

Après chaque tentative, validez le résultat pour alimenter l'apprentissage :

```typescript
// Si le captcha a été résolu avec succès
await fetch('http://localhost:3000/api/v1/captcha/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${yourAuthToken}`,
  },
  body: JSON.stringify({
    attemptId: data.attemptId,
    success: true,
    actualPosition: 147.0, // Position réelle si connue
  }),
});
```

### 4. Annotation Manuelle

Pour corriger les erreurs et améliorer le modèle :

```typescript
await fetch('http://localhost:3000/api/v1/captcha/annotate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${yourAuthToken}`,
  },
  body: JSON.stringify({
    attemptId: 'abc123',
    gapPosition: 150.0, // Position correcte identifiée manuellement
  }),
});
```

### 5. Suivi des Performances

```typescript
const response = await fetch('http://localhost:3000/api/v1/captcha/training/stats', {
  headers: {
    'Authorization': `Bearer ${yourAuthToken}`,
  },
});

const { data } = await response.json();
console.log(`Taux de réussite: ${data.successRate}%`);
console.log(`Erreur moyenne: ${data.averageError}px`);
console.log(`Échantillons d'entraînement: ${data.totalSamples}`);
```

## Boucle d'Apprentissage Continu

### Workflow Automatique

1. **Résolution** → Le système tente de résoudre le captcha
2. **Validation** → Le résultat (succès/échec) est enregistré
3. **Collecte** → Les données sont ajoutées au dataset d'entraînement
4. **Annotation** → Validation automatique ou manuelle des données
5. **Ré-entraînement** → Une fois suffisamment de données (ex: 100+ échantillons validés)

### Script de Ré-entraînement Périodique

```typescript
// scripts/retrain-captcha-model.ts
import { serviceContainer } from '@/lib/services/container';

async function retrainModel() {
  const trainingService = serviceContainer.getCaptchaTrainingService();
  
  // Vérifier si assez de données
  const batch = await trainingService.prepareTrainingBatch(100);
  
  if (!batch.ready) {
    console.log(batch.message);
    return;
  }
  
  console.log(`Ré-entraînement avec ${batch.samples.length} échantillons...`);
  
  // Exporter les données pour YOLO
  const trainingDataset = batch.samples.map(sample => ({
    image: sample.imageUrl,
    label: sample.gapPosition,
  }));
  
  // Appeler votre script de ré-entraînement YOLO
  // await trainYOLOModel(trainingDataset);
  
  // Enregistrer les métriques
  await trainingService.recordModelPerformance('v1.1', {
    successRate: 89.5,
    averageConfidence: 0.91,
    averageError: 2.1,
    totalAttempts: 250,
    successfulAttempts: 224,
  });
}

retrainModel();
```

### Automatisation avec Cron

```bash
# Ajouter au crontab pour ré-entraîner chaque semaine
0 2 * * 0 cd /path/to/Logistix && npx tsx scripts/retrain-captcha-model.ts
```

## Tests

### Exécuter les Tests Unitaires

```bash
npm run test:unit tests/unit/domain/captcha-attempt.entity.test.ts
npm run test:unit tests/unit/domain/training-data.entity.test.ts
```

### Test d'Intégration Manuel

1. Démarrer le serveur : `npm run dev`
2. Créer un utilisateur et obtenir un token JWT
3. Tester l'API avec curl :

```bash
# Résoudre un captcha
curl -X POST http://localhost:3000/api/v1/captcha/solve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "imageUrl": "https://example.com/captcha.jpg",
    "puzzlePieceUrl": "https://example.com/piece.jpg"
  }'

# Obtenir les statistiques
curl http://localhost:3000/api/v1/captcha/training/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Métriques et Monitoring

### Métriques Disponibles

- **Taux de réussite** : % de captchas résolus correctement
- **Confiance moyenne** : Score de confiance moyen du modèle
- **Erreur moyenne** : Distance moyenne entre détection et position réelle (en pixels)
- **Échantillons d'entraînement** : Total et répartition (manuel/auto, validé/non validé)

### Dashboard (À Venir)

Une interface UI sera ajoutée pour :
- Visualiser les performances en temps réel
- Annoter manuellement les échecs
- Voir l'historique des tentatives
- Gérer les versions du modèle

## Dépannage

### Problème: Faible taux de réussite (<60%)

**Solutions:**
1. Augmenter le nombre d'annotations manuelles (objectif: 100+)
2. Vérifier que le modèle YOLO est bien entraîné sur des captchas similaires
3. Ajuster le preprocessing des images
4. Collecter plus de données variées (différents sites, conditions)

### Problème: Erreur "Model not found"

Si aucun détecteur YOLO n'est configuré, le système utilise un fallback (positions aléatoires). Pour de vraies performances :
1. Entraînez ou obtenez un modèle YOLO pour la détection de captchas
2. Implémentez l'interface `YOLODetector`
3. Injectez-le dans le service via le container

### Problème: Performances lentes

**Solutions:**
1. Optimisez le modèle (quantization, pruning)
2. Utilisez un GPU pour l'inférence
3. Ajoutez un cache Redis pour les prédictions
4. Implémentez le traitement en batch

## Ressources

- **Documentation complète** : `docs/CAPTCHA_SOLVER.md`
- **Exemple d'utilisation** : `scripts/captcha-solver-example.ts`
- **Code source** :
  - Entities: `lib/domain/entities/captcha-*.ts`
  - Services: `lib/services/captcha-*.ts`
  - API: `app/api/v1/captcha/*/route.ts`

## Support

Pour toute question ou problème :
1. Consultez la documentation dans `docs/CAPTCHA_SOLVER.md`
2. Vérifiez les tests unitaires pour des exemples d'utilisation
3. Ouvrez une issue sur GitHub avec les détails

## Licence

Ce module fait partie du projet LogistiX et suit la même licence ISC.
