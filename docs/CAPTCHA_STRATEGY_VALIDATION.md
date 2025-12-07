# Validation de la Stratégie de Résolution du Captcha

## 🎯 Guide de Résolution (Référence)

Selon le guide fourni, le captcha est un **puzzle à glissière (slider)** avec :

1. **tc-piece** : Emplacement cible (forme claire/vide, l'encoche) - généralement situé sur le **côté gauche** de l'image
2. **tc-drag** : Pièce mobile (forme sombre) qui doit se **déplacer vers la droite**
3. **Objectif** : Superposer tc-drag sur tc-piece en glissant le curseur bleu vers la droite

---

## ✅ Validation du Code Actuel

### 1. Détection YOLO (`yolo-captcha-service.ts`)

#### Code analysé

```typescript
private computeDeltaXImage(piece: YoloDetection, drag: YoloDetection): number {
  // tc-drag (pièce mobile) doit se déplacer horizontalement vers tc-piece (emplacement cible)
  // Delta positif = mouvement vers la droite (conforme au guide de résolution)
  const pieceCenterX = piece.bbox.x + piece.bbox.width / 2;
  const dragCenterX = drag.bbox.x + drag.bbox.width / 2;
  return pieceCenterX - dragCenterX;
}
```

**✅ CONFORME** : Le calcul `pieceCenterX - dragCenterX` retourne un **delta positif** quand tc-piece est à droite de tc-drag, ce qui correspond à un mouvement vers la droite.

---

### 2. Analyse du Puzzle (`analysis.ts`)

#### Code analysé (lignes 66-72)

```typescript
// The distance the piece needs to travel in the puzzle image (pixels)
const distanceInImagePx = gapCenterPx - pieceCenterPx;

// Convert this image-space distance to page/CSS pixels (what the slider needs to move)
const rawDistancePagePx = distanceInImagePx / pixelRatio;
```

**Note importante** : Ce code utilise `gapCenterPx - pieceCenterPx` où :

- `gapCenterPx` = centre de l'emplacement cible (détecté par YOLO comme `tc-piece`)
- `pieceCenterPx` = centre de la pièce mobile (détecté par YOLO comme `tc-drag`)

#### Vérification de cohérence

- Dans `analysis.ts` ligne 53-56 :

  ```typescript
  const pieceCenterPx = pieceFromYolo 
    ? pieceFromYolo.x + pieceFromYolo.width / 2
    : gapCenterPx * 0.1;
  ```

  → `pieceCenterPx` correspond à la position de **tc-drag** (pièce mobile)

- `gapCenterPx` correspond à la position de **tc-piece** (emplacement cible)

Donc : `distanceInImagePx = gapCenterPx - pieceCenterPx` = `tc-piece - tc-drag`

**✅ CONFORME** : Si tc-piece est à droite de tc-drag (cas standard), le delta est positif.

---

### 3. Annotations Visuelles (`debug.ts`)

#### Flèche de mouvement (lignes 56-65)

```typescript
if (opts.arrow) {
  const fromX = typeof opts.arrow.from === 'number' ? opts.arrow.from : opts.arrow.from.x;
  const fromY = typeof opts.arrow.from === 'number' ? Math.round(height * 0.62) : opts.arrow.from.y;
  const toX = typeof opts.arrow.to === 'number' ? opts.arrow.to : opts.arrow.to.x;
  const toY = typeof opts.arrow.to === 'number' ? Math.round(height * 0.62) : opts.arrow.to.y;
  rects.push(
    `<line x1="${fromX.toFixed(1)}" y1="${fromY.toFixed(1)}" x2="${toX.toFixed(1)}" y2="${toY.toFixed(1)}" stroke="#ffcc00" stroke-width="3" marker-end="url(#arrowhead)" />`
  );
}
```

#### Appelé depuis `analysis.ts` (lignes 127-134)

```typescript
const arrowFromX = pieceCenterPx;  // tc-drag (pièce mobile)
const arrowToX = gapCenterPx;      // tc-piece (emplacement cible)
const arrowY = Math.round(png.height * 0.62);

const annotationPath = await annotatePuzzle(
  puzzle,
  {
    arrow: { from: arrowFromX, to: arrowToX }
  }
);
```

**✅ CONFORME** : La flèche va de `tc-drag` (FROM) vers `tc-piece` (TO), illustrant le mouvement vers la droite.

---

## 🔍 Nomenclature des Variables

### Potentiel de confusion identifié

Dans `analysis.ts`, la variable `pieceCenterPx` est **trompeuse** :

```typescript
const pieceCenterPx = pieceFromYolo 
  ? pieceFromYolo.x + pieceFromYolo.width / 2
  : gapCenterPx * 0.1;
```

- `pieceFromYolo` contient les données de **tc-drag** (la pièce MOBILE)
- Le nom `pieceCenterPx` suggère "pièce" mais représente en fait **tc-drag**

### Recommandation

Renommer pour plus de clarté :

- `pieceCenterPx` → `dragCenterPx` (pièce mobile)
- `gapCenterPx` reste `gapCenterPx` (emplacement cible)

---

## 📊 Résumé de Validation

| Composant | Vérification | Statut |
|-----------|-------------|--------|
| **computeDeltaXImage** | `piece - drag` donne delta positif vers droite | ✅ CONFORME |
| **analyzePuzzle** | `gapCenterPx - pieceCenterPx` cohérent | ✅ CONFORME |
| **Flèche d'annotation** | FROM=tc-drag, TO=tc-piece | ✅ CONFORME |
| **Nomenclature** | Variables pourraient être plus claires | ⚠️ AMÉLIORATION RECOMMANDÉE |

---

## 🧪 Test de Validation

Pour valider visuellement la stratégie sur une image de captcha :

```bash
# Annoter une image de captcha avec les détections YOLO
npx ts-node scripts/captcha/annotate-yolo-detections.ts captcha-debug/sample.png

# L'image annotée montrera :
# - tc-piece (VERT) = Emplacement cible
# - tc-drag (ROUGE) = Pièce mobile
# - Flèche jaune = Direction du mouvement (gauche → droite)
# - Delta calculé en pixels
```

L'annotation visuelle confirmera :

1. tc-drag est bien la pièce sombre mobile
2. tc-piece est bien l'encoche cible (forme claire/vide)
3. La flèche va bien de gauche vers droite
4. Le delta calculé correspond bien au mouvement requis

---

## 🎯 Conclusion

**La stratégie de résolution implémentée est CONFORME au guide fourni.**

Les détections YOLO sont correctement interprétées :

- **tc-drag** = Pièce mobile (forme sombre) à déplacer
- **tc-piece** = Emplacement cible (forme claire/vide)
- Le mouvement calculé va bien **de tc-drag vers tc-piece** (généralement de gauche à droite)
- Les annotations visuelles illustrent correctement la stratégie

### Améliorations suggérées

1. ✅ Renommer `pieceCenterPx` → `dragCenterPx` pour éviter la confusion
2. ✅ Ajouter des commentaires explicites sur la sémantique des classes YOLO (déjà fait dans `types.ts`)
3. ✅ Script d'annotation visuelle créé pour validation rapide

---

**Document généré le** : 16 novembre 2025  
**Auteur** : Bolt (GitHub Copilot)  
**Version** : 1.0
