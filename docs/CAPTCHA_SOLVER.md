# Captcha Solver System - Documentation

## Vue d'ensemble

Le système de résolution de captchas pour LogistiX est une solution auto-hébergée et évolutive qui utilise l'intelligence artificielle pour résoudre automatiquement les captchas de type slider puzzle. Le système intègre un mécanisme d'apprentissage continu pour améliorer ses performances au fil du temps.

## Architecture

### Composants Principaux

1. **Domain Layer** (`lib/domain/entities/`)
   - `CaptchaAttempt`: Entité représentant une tentative de résolution
   - `TrainingData`: Entité représentant les données d'entraînement annotées

2. **Infrastructure Layer** (`lib/infrastructure/repositories/`)
   - `SQLiteCaptchaAttemptRepository`: Gestion de la persistance des tentatives
   - `SQLiteTrainingDataRepository`: Gestion de la persistance des données d'entraînement

3. **Application Layer** (`lib/application/use-cases/`)
   - `SolveCaptchaUseCase`: Cas d'usage pour résoudre un captcha
   - `ValidateCaptchaResultUseCase`: Cas d'usage pour valider le résultat
   - `AnnotateCaptchaUseCase`: Cas d'usage pour annoter manuellement
   - `GetTrainingStatsUseCase`: Cas d'usage pour obtenir les statistiques

4. **Services** (`lib/services/`)
   - `CaptchaSolverService`: Service principal de résolution de captchas
   - `CaptchaTrainingService`: Service de gestion de l'apprentissage continu

### Base de Données

Trois tables principales :

- **captcha_attempts**: Stocke toutes les tentatives de résolution
- **training_data**: Stocke les données annotées pour l'entraînement
- **model_metrics**: Stocke les métriques de performance du modèle

## API Endpoints

### POST `/api/v1/captcha/solve`
Résout un captcha en détectant la position du trou.

**Request Body:**
```json
{
  "imageUrl": "https://example.com/captcha.jpg",
  "puzzlePieceUrl": "https://example.com/piece.jpg",
  "metadata": {
    "source": "superbuy",
    "timestamp": "2025-11-13T19:00:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attemptId": "abc123",
    "detectedPosition": 145.5,
    "confidence": 0.92,
    "status": "pending",
    "message": "Captcha position detected. Waiting for validation."
  }
}
```

### POST `/api/v1/captcha/validate`
Valide le résultat d'une tentative de résolution.

**Request Body:**
```json
{
  "attemptId": "abc123",
  "success": true,
  "actualPosition": 147.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Captcha result validated successfully"
  }
}
```

### POST `/api/v1/captcha/annotate`
Annote manuellement un captcha pour l'entraînement.

**Request Body:**
```json
{
  "attemptId": "abc123",
  "gapPosition": 147.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trainingData": {
      "id": "xyz789",
      "attemptId": "abc123",
      "gapPosition": 147.0,
      "annotationSource": "manual",
      "isValidated": true
    }
  }
}
```

### GET `/api/v1/captcha/training/stats`
Récupère les statistiques d'entraînement.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSamples": 1250,
    "validatedSamples": 980,
    "unvalidatedSamples": 270,
    "manualAnnotations": 150,
    "automaticAnnotations": 1100,
    "successRate": 87.5,
    "averageError": 2.3
  }
}
```

## Workflow d'Utilisation

### 1. Résolution Automatique

```typescript
// Exemple d'utilisation
const response = await fetch('/api/v1/captcha/solve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'https://example.com/captcha.jpg',
    puzzlePieceUrl: 'https://example.com/piece.jpg'
  })
});

const { data } = await response.json();
// data.detectedPosition contient la position détectée
// Utiliser cette valeur pour déplacer le slider
```

### 2. Validation du Résultat

Après avoir tenté de résoudre le captcha sur le site cible :

```typescript
// Si la résolution a réussi
await fetch('/api/v1/captcha/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attemptId: data.attemptId,
    success: true,
    actualPosition: 147.0 // Position réelle si connue
  })
});

// Si la résolution a échoué
await fetch('/api/v1/captcha/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attemptId: data.attemptId,
    success: false
  })
});
```

### 3. Annotation Manuelle (Optionnel)

Pour corriger ou améliorer les données d'entraînement :

```typescript
await fetch('/api/v1/captcha/annotate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attemptId: 'abc123',
    gapPosition: 147.0 // Position correcte identifiée manuellement
  })
});
```

## Apprentissage Continu

### Collecte Automatique

Le système collecte automatiquement les données d'entraînement :
- Chaque tentative réussie est enregistrée avec la position détectée et la position réelle
- Les données sont marquées comme `automatic` et nécessitent une validation
- Les données validées peuvent être utilisées pour ré-entraîner le modèle

### Processus de Ré-entraînement

1. **Collecte de données**: Les tentatives réussies sont automatiquement ajoutées
2. **Validation**: Les données peuvent être validées manuellement ou automatiquement
3. **Préparation du batch**: Une fois un seuil atteint (ex: 100 échantillons validés)
4. **Ré-entraînement**: Le modèle YOLO est ré-entraîné avec les nouvelles données
5. **Évaluation**: Les métriques de performance sont enregistrées

### Métriques de Performance

Le système suit :
- **Taux de réussite**: Pourcentage de captchas résolus avec succès
- **Confiance moyenne**: Score de confiance moyen des détections
- **Erreur moyenne**: Distance moyenne entre position détectée et réelle
- **Nombre de tentatives**: Total et tentatives réussies

## Intégration YOLO

### Interface YOLODetector

Le service accepte une implémentation de l'interface `YOLODetector` :

```typescript
interface YOLODetector {
  detect(imageUrl: string): Promise<YOLODetectionResult>;
}

interface YOLODetectionResult {
  position: number;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

### Exemple d'Implémentation

```typescript
class YOLOv8Detector implements YOLODetector {
  async detect(imageUrl: string): Promise<YOLODetectionResult> {
    // 1. Charger l'image
    const image = await this.loadImage(imageUrl);
    
    // 2. Prétraiter l'image
    const preprocessed = this.preprocess(image);
    
    // 3. Exécuter l'inférence YOLO
    const detections = await this.model.predict(preprocessed);
    
    // 4. Post-traiter les résultats
    const gapDetection = this.findGapDetection(detections);
    
    return {
      position: gapDetection.centerX,
      confidence: gapDetection.confidence,
      boundingBox: gapDetection.bbox
    };
  }
}

// Utilisation
const detector = new YOLOv8Detector('/path/to/model.pt');
const service = new CaptchaSolverService(
  attemptRepo,
  trainingRepo,
  detector
);
```

## Sécurité et Confidentialité

- **Authentification requise**: Tous les endpoints nécessitent une authentification
- **Isolation des données**: Chaque utilisateur ne peut voir que ses propres tentatives
- **Stockage local**: Toutes les données sont stockées localement (SQLite)
- **Pas de dépendance externe**: Solution 100% auto-hébergée

## Performance et Scalabilité

### Optimisations

- **Indexes de base de données**: Sur user_id, status, dates pour des requêtes rapides
- **Singleton services**: Les services sont instanciés une seule fois via le container
- **Pagination**: Support de la pagination pour les grandes listes

### Limitations Actuelles

- **Modèle YOLO**: Non inclus (doit être fourni par l'utilisateur)
- **Traitement d'images**: Pas de prétraitement automatique
- **Parallélisation**: Pas de support pour le traitement en batch parallèle

## Évolutions Futures

- [ ] Intégration d'un modèle YOLO pré-entraîné
- [ ] Interface UI pour la visualisation et l'annotation
- [ ] Support du ré-entraînement automatique
- [ ] API de gestion des modèles (versioning, rollback)
- [ ] Support multi-types de captchas
- [ ] Export des datasets d'entraînement
- [ ] Métriques en temps réel avec dashboard

## Troubleshooting

### Problème: Taux de réussite faible

**Solutions:**
1. Augmenter le nombre de données d'entraînement annotées manuellement
2. Vérifier la qualité des images (résolution, format)
3. Ajuster les hyperparamètres du modèle YOLO
4. Valider que le modèle est bien entraîné sur des captchas similaires

### Problème: Erreurs de détection importantes

**Solutions:**
1. Annoter manuellement les cas d'échec
2. Augmenter la diversité des données d'entraînement
3. Vérifier le preprocessing des images
4. Envisager un fine-tuning du modèle

### Problème: Performances lentes

**Solutions:**
1. Optimiser le modèle YOLO (quantization, pruning)
2. Mettre en cache les prédictions pour les images similaires
3. Utiliser un GPU pour l'inférence si disponible
4. Implémenter un système de queue pour le traitement en batch

## Références

- Documentation YOLO: [Ultralytics YOLOv8](https://docs.ultralytics.com/)
- Architecture DDD: `docs/ARCHITECTURE.md`
- Tests: `docs/TESTING.md`
- Guide de développement: `docs/DEVELOPMENT_GUIDE.md`
