# Stratégie de Stabilisation "Antigravity" pour Logistix

## 1. Le Diagnostic : Pourquoi le Chaos Revient ?

Dans un environnement "Agent-First", l'entropie augmente exponentiellement avec le nombre d'agents. Vos problèmes actuels ("ajout d'une feature = bug ailleurs") proviennent de trois carences structurelles :

1.  **Absence de "Contrat"** : Les agents modifient le code sans vérifier s'ils brisent des contrats existants (types, tests).
2.  **Myopie Contextuelle** : Les agents ne voient que leur tâche immédiate, pas l'impact global.
3.  **Dette Silencieuse** : Les erreurs de type et les tests manquants s'accumulent jusqu'au point de rupture.

## 2. La Solution : Le Protocole de Stabilisation

Nous allons transformer Logistix en une forteresse inébranlable en 3 phases.

### Phase 1 : Le "Lockdown" (Immédiat)
*Objectif : Arrêter l'hémorragie.*

1.  **Zéro Tolérance TypeScript** :
    *   Réparer *toutes* les erreurs de compilation actuelles (`npm run typecheck`).
    *   Interdire tout nouveau code contenant `any`.
2.  **Sanctuarisation du Noyau** :
    *   Identifier les fichiers critiques (`lib/services`, `drizzle/schema`).
    *   Créer des règles strictes : "Interdiction de toucher à ces fichiers sans un Plan de Migration validé".

### Phase 2 : La Gouvernance des Agents (Semaine 1)
*Objectif : Transformer les agents en ingénieurs disciplinés.*

1.  **Règles d'Engagement (System Prompt)** :
    *   **Règle #1** : "Tu ne touches pas au code tant que tu n'as pas lu `activeContext.md`."
    *   **Règle #2** : "Tu ne commites pas tant que `npm run typecheck` n'est pas vert."
    *   **Règle #3** : "Si tu modifies une fonction, tu dois mettre à jour ou créer son test unitaire."
2.  **Workflow "Spec-First"** :
    *   Tout changement complexe commence par un *Artifact* de Planification.
    *   L'humain valide le plan *avant* que l'agent n'écrive une ligne de code.

### Phase 3 : L'Automatisation de la Défense (Semaine 2+)
*Objectif : Rendre la stabilité automatique.*

1.  **Tests de Non-Régression (TNR)** :
    *   Mise en place de tests d'intégration critiques (ex: Scrape Vinted -> Save DB).
    *   Si un agent casse un TNR, son travail est automatiquement rejeté.
2.  **Pre-commit Hooks** :
    *   Empêcher physiquement l'ajout de code cassé dans le dépôt.

## 3. Plan d'Action Concret

Voici les prochaines étapes que je vais exécuter pour vous :

1.  **[URGENT] Réparation du Typecheck** : Nous ne pouvons rien construire sur des fondations brisées. Je vais corriger les erreurs actuelles.
2.  **Configuration des Règles Agents** : Je vais créer un fichier de règles que vous pourrez copier dans votre configuration d'agent.
3.  **Mise en place du "Quality Gate"** : Création d'un script de vérification rapide que les agents devront lancer.

---

**Validation** : Êtes-vous d'accord pour commencer par la **Réparation du Typecheck** (Phase 1) ?
