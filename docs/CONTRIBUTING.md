> **ℹ️ Ce guide a été consolidé. Pour les règles essentielles et le workflow, voir le [README.md](../README.md). Ce fichier détaille les conventions et processus de contribution avancés.**

# Guide de Contribution

Bienvenue dans le projet ! Nous sommes ravis que vous souhaitiez y contribuer. Ce document a pour but de formaliser nos pratiques de collaboration pour garantir la qualité et la cohérence de notre travail.

## Table des matières

1. [Introduction](#introduction)
2. [Conventions de code](#conventions-de-code)
3. [Processus de revue de code](#processus-de-revue-de-code)
4. [Gestion des branches](#gestion-des-branches)
5. [Documentation](#documentation)
6. [Intégration des nouveaux contributeurs](#intégration-des-nouveaux-contributeurs)

---

## Introduction

Ce guide s'adresse à toute personne souhaitant participer au développement du projet. Il décrit les standards que nous suivons en matière de codage, de revue, de gestion des branches et de documentation. Le respect de ces règles est essentiel pour maintenir un projet sain et faciliter la collaboration.

---

## Conventions de code

La cohérence du code est primordiale pour sa lisibilité et sa maintenabilité.

### Structure des fichiers

L'organisation de nos fichiers suit une logique modulaire et fonctionnelle. Veuillez la respecter lors de l'ajout de nouvelles fonctionnalités. Pour une vue d'ensemble de l'architecture, consultez le document de référence : [ARCHITECTURE.md](../ARCHITECTURE.md).

### Commentaires

- **Clarté avant tout** : Commentez les sections de code complexes ou celles dont l'intention n'est pas évidente.
- **JSDoc pour les fonctions** : Toute nouvelle fonction exportée doit être documentée avec JSDoc, en précisant son rôle, ses paramètres et sa valeur de retour.

```javascript
/**
 * Calcule le prix total TTC à partir d'un prix HT et d'un taux de TVA.
 * @param {number} prixHT - Le prix hors taxes.
 * @param {number} tauxTVA - Le taux de TVA (ex: 0.2 pour 20%).
 * @returns {number} Le prix total toutes taxes comprises.
 */
```

### Formatage

Nous n'imposons pas d'outils de formatage stricts pour le moment, mais nous vous demandons de respecter le style du code existant dans les fichiers que vous modifiez. La cohérence prime sur les préférences personnelles.

---

## Processus de revue de code

Chaque contribution doit être validée par au moins un autre membre de l'équipe avant d'être intégrée.

### Workflow de relecture

1. **Création de la Pull Request (PR)** : Une fois votre développement terminé, ouvrez une PR en ciblant la branche `main`.
2. **Description claire** : Rédigez une description expliquant le contexte, les changements apportés et la manière de les tester.
3. **Revue** : Un ou plusieurs relecteurs sont assignés. Ils peuvent laisser des commentaires ou demander des modifications.
4. **Approbation et Merge** : Une fois la PR approuvée, elle peut être fusionnée dans `main`.

### Critères d'acceptation

Pour qu'une PR soit acceptée, elle doit :

- Répondre au besoin initial.
- Respecter les conventions de code.
- Inclure la documentation nécessaire.
- Ne pas introduire de régressions.

---

## Gestion des branches

Une stratégie de branche claire est indispensable pour éviter les conflits et organiser le travail.

### Modèle de branches

- `main` : Branche principale, toujours stable et déployable.
- `feature/...` : Branches de développement pour les nouvelles fonctionnalités.
- `fix/...` : Branches pour la correction de bugs.
- `docs/...` : Branches pour les modifications de la documentation.

### Conventions de nommage

Le nom de la branche doit être explicite et en anglais. Utilisez des tirets pour séparer les mots.

- **Bon** : `feature/user-authentication`, `fix/login-form-bug`
- **Mauvais** : `feat/auth`, `correctif`

---

## Documentation

La documentation est aussi importante que le code lui-même.

### Références

Le document [ARCHITECTURE.md](../ARCHITECTURE.md) est notre source de vérité pour tout ce qui concerne la structure globale du projet.

### Exigences

Toute nouvelle fonctionnalité doit être accompagnée de sa documentation. Si vous modifiez un comportement existant, mettez à jour la documentation correspondante.

### Exemple : Documenter un composant React

```jsx
// components/ui/MonComposant.tsx

import React from 'react';

/**
 * @description Un composant affichant un message de bienvenue.
 * @param {object} props - Les propriétés du composant.
 * @param {string} props.nom - Le nom à afficher dans le message.
 * @returns {JSX.Element}
 */
const MonComposant = ({ nom }) => {
  return <div>Bonjour, {nom} !</div>;
};

export default MonComposant;
```

---

## Intégration des nouveaux contributeurs

Nous encourageons les nouvelles contributions !

### Premières contributions

Si vous êtes nouveau sur le projet, nous vous recommandons de commencer par des tâches simples pour vous familiariser avec le code et nos processus.

### Problèmes recommandés

Recherchez les tickets avec l'étiquette `good first issue` dans notre système de gestion de projet. Ce sont des tâches idéales pour débuter.

### Points de contact

Si vous avez des questions, n'hésitez pas à contacter les mainteneurs du projet ou à poser vos questions sur le canal de communication dédié.
