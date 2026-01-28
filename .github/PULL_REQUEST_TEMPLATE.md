# Titre de la PR

<!-- Résumez en une ligne l'objectif de la PR -->

## Type de changement

- [ ] 🐛 Bugfix
- [ ] ✨ Nouvelle fonctionnalité
- [ ] 🔨 Refactor
- [ ] 📚 Documentation
- [ ] 🧪 Tests

## Description

Expliquez brièvement ce que fait cette PR et pourquoi.

## Checklist avant PR

### Qualité de Code (OBLIGATOIRE)
- [ ] `npm run checks` exécuté et vert
- [ ] Pas de `console.log` (utilise `logger`)
- [ ] Pas de `any` sans justification

### Tests (OBLIGATOIRE pour tout code)
- [ ] ✅ J'ai ajouté des tests unitaires pour les nouvelles fonctionnalités
- [ ] ✅ `npm test` passe sans erreur
- [ ] ✅ La couverture n'a pas diminué (vérifier CI)

> ⚠️ **PRs sans tests pour du code seront rejetées automatiquement** (voir CI coverage gate)

### Documentation
- [ ] Documentation mise à jour si nécessaire
- [ ] Si changement d'architecture : ADR créé dans `docs/adr/`

## Instructions de validation

Décrivez comment valider manuellement la PR.

## ADR associé

<!-- Si cette PR implémente une décision architecturale, liez l'ADR -->
- [ ] ADR-XXX: [Titre] ou N/A

## Déploiement

Indiquez si des migrations DB ou variables d'environnement sont nécessaires.

