# Fiche Règle 04 : Conventions de Code (TypeScript / Frontend / Styling)

## Objectif

Documenter les conventions de style et d'architecture pour produire un code lisible, testable et maintenable.

## Règles générales

- Langage : TypeScript strict autant que possible (`tsconfig.json` with `strict` recommended).
- Indentation : 2 espaces (convention du projet).
- Nommage : anglais pour les identifiers publics (camelCase pour variables/fonctions, PascalCase pour composants/classes, UPPER_SNAKE_CASE pour constantes d'environnement).
- Fonctions pures quand possible ; éviter effets de bord globaux.

## tsconfig suggéré (extraits clés)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["DOM", "ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Frontend (React)

- Structure recommandée :

  - `src/components/` : composants réutilisables (atomes)
  - `src/features/<feature>/` : composants + hooks + services propres à une feature
  - `src/hooks/` : hooks réutilisables
  - `src/utils/` : utilitaires purs

- Composants :

  - Props typées explicitement
  - Small components: Single Responsibility
  - Eviter `any` dans les props publiques

## Styling

- Tailwind CSS : utilitaire principal. Favoriser classes utilitaires plutôt que CSS global inutile.
- Centraliser variantes réutilisables (wrappers UI) dans `components/ui/`.
- Accessibilité : `aria-*`, focus visible, contraste ratio >= 4.5 pour textes normaux.

## Linting / Formatting / Hooks

- ESLint + Prettier doivent être exécutés via les scripts `npm run lint` et `npm run format`.
- Recommandation pre-commit : Husky + lint-staged

```bash
# package.json (extrait)
"husky": {
  "hooks": {
    "pre-commit": "npx lint-staged"
  }
},
"lint-staged": {
  "**/*.{ts,tsx,js,jsx}": [
    "npm run lint -- --fix",
    "npm run format -- --write",
    "git add"
  ]
}
```

## Tests

- Tester la logique métier (`lib/services`) avec tests unitaires.
- Composants : React Testing Library.
- Tests d'intégration : scenarios end-to-end pour flows cruciaux.

## Commit / PR

- Format de message : `<scope>: <verbe à l'impératif> — courte description` (ex: `auth: add token refresh handler`).
- PR doit inclure : description, tickets liés, tests ajoutés, instructions de validation.
- Avant commit : run lint + tests unitaires pertinents + build smoke-test.

## Documentation et onboarding

- Toute règle nouvelle ou modifiée doit être ajoutée dans `.kilocode/rules/`.
- Ajouter exemples de code dans `docs/` quand une convention est non triviale.

---

Propositions additionnelles :

- Créer `.github/PULL_REQUEST_TEMPLATE.md` et `CONTRIBUTING.md` (si non présent) avec template de validation et checklist.
- Mettre en place un script `npm run checks` qui exécute `tsc --noEmit`, `npm run lint`, `npm test -- --watchAll=false` pour CI simple.
