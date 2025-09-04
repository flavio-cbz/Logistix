# Plan de Refonte de l'Interface de Création d'Analyse de Marché

Ce document décrit l'architecture et le plan d'implémentation pour la nouvelle interface de création d'analyse de marché.

## 1. Objectifs

- Remplacer la modale de création par une page dédiée pour une meilleure expérience utilisateur.
- Améliorer l'ergonomie en rendant toutes les options de configuration visibles et accessibles.
- Introduire de nouvelles fonctionnalités comme la sauvegarde de templates et la prévisualisation des résultats.

## 2. Architecture Fichiers

La nouvelle interface sera hébergée sous une nouvelle route : `app/(dashboard)/analyse-marche/creer`.

La structure des fichiers sera la suivante :

```text
app/(dashboard)/analyse-marche/
├── creer/
│   ├── page.tsx               # Point d'entrée de la nouvelle page de création
│   └── components/
│       ├── analysis-creation-dashboard.tsx  # Composant principal de la page (le "shell")
│       ├── product-info-card.tsx          # Carte pour le nom du produit, catégorie, marque
│       ├── filters-card.tsx               # Carte pour les filtres (état, etc.)
│       ├── settings-card.tsx              # Carte pour les paramètres (nb de produits)
│       └── preview-results.tsx            # (Optionnel) Composant pour la prévisualisation
└── ... (fichiers existants)
```

## 3. Flux de Données

Le flux de données restera similaire à l'existant, en utilisant `react-hook-form` pour la gestion de l'état du formulaire, `zod` pour la validation, et le store `zustand` (`useMarketAnalysisStore`) pour l'état global.

1. `page.tsx` importera et affichera `AnalysisCreationDashboard`.
2. `AnalysisCreationDashboard` initialisera `react-hook-form` et passera le contrôle du formulaire aux différentes cartes (`product-info-card`, `filters-card`, etc.).
3. Chaque carte contiendra un sous-ensemble des champs du formulaire.
4. La soumission du formulaire sera gérée par `AnalysisCreationDashboard` qui appellera le service `launchMarketAnalysis`.

---
*Ce document sera mis à jour au fur et à mesure de l'avancement du projet.*

## 4. Wireframe Textuel de l'Interface

La page sera structurée en une grille flexible (2 colonnes sur grand écran, 1 colonne sur mobile) avec une colonne latérale pour les actions et le résumé.

```text
+--------------------------------------------------------------------------+
| Nouvelle Analyse de Marché                               [Retour] [Sauver] |
+--------------------------------------------------------------------------+
|                                                                          |
|  +--------------------------------------+  +----------------------------+  |
|  | Card: Informations Produit (1/2)     |  | Card: Résumé & Actions (2/2) |  |
|  |--------------------------------------|  |----------------------------|  |
|  |                                      |  |                            |  |
|  | [Label] Nom du produit *             |  | [Résumé de la recherche]   |  |
|  | [Input: "Nike Air Max 90"]           |  |                            |  |
|  |                                      |  | [Prévisualisation: ~XXX    |  |
|  | [Label] Catégorie *                  |  | articles trouvés]          |  |
|  | [Selector: "Chaussures > Baskets"]   |  |                            |  |
|  |                                      |  | [Bouton: Lancer l'Analyse] |  |
|  | [Label] Marque (optionnel)           |  |                            |  |
|  | [Selector: "Nike"]                   |  |                            |  |
|  |                                      |  |                            |  |
|  +--------------------------------------+  +----------------------------+  |
|                                                                          |
|  +--------------------------------------+                                  |
|  | Card: Filtres                        |                                  |
|  |--------------------------------------|                                  |
|  |                                      |                                  |
|  | [Label] État de l'article            |                                  |
|  | [Checkbox] Neuf avec étiquette       |                                  |
|  | [Checkbox] Très bon état             |                                  |
|  | ...                                  |                                  |
|  |                                      |                                  |
|  +--------------------------------------+                                  |
|                                                                          |
|  +--------------------------------------+                                  |
|  | Card: Paramètres de l'Analyse        |                                  |
|  |--------------------------------------|                                  |
|  |                                      |                                  |
|  | [Label] Nombre de produits           |                                  |
|  | [Slider/Input: 100]                  |                                  |
|  |                                      |                                  |
|  +--------------------------------------+                                  |
|                                                                          |
+--------------------------------------------------------------------------+
```

## 5. Analyse de Faisabilité des Nouvelles Fonctionnalités

### 5.1. Templates d'Analyse (Sauvegarde de Recherches)

- **Faisabilité :** Élevée.
- **Approche Technique :**
  1. **Base de Données :** Créer une nouvelle table `analysis_templates` dans le schéma Drizzle.
      - Colonnes : `id`, `userId`, `templateName`, `productName`, `catalogId`, `brandId`, `maxProducts`, `itemStates` (stocké en JSON), `createdAt`, `updatedAt`.
  2. **Backend (API) :** Créer un nouvel ensemble de routes CRUD sous `app/api/v1/market-analysis/templates/`.
      - `GET /`: Lister les templates de l'utilisateur connecté.
      - `POST /`: Créer un nouveau template.
      - `PUT /:id`: Mettre à jour un template existant.
      - `DELETE /:id`: Supprimer un template.
  3. **Frontend :**
      - Ajouter un bouton "Sauvegarder" ou "Sauvegarder comme template" sur la page de création.
      - Ajouter un menu déroulant "Charger un template" qui sera peuplé par un appel à l'API `GET /api/v1/market-analysis/templates/`.

### 5.2. Prévisualisation des Résultats

- **Faisabilité :** Moyenne à Élevée. Dépend de la capacité de l'API Vinted à retourner rapidement le nombre de résultats sans récupérer tous les articles.
- **Approche Technique :**
  1. **Backend (API) :** Créer un nouvel endpoint `app/api/v1/market-analysis/preview/route.ts`.
      - Cet endpoint prendra en paramètre les mêmes filtres que la recherche principale (`MarketAnalysisRequest`).
      - Il effectuera un appel à l'API Vinted en demandant un nombre très limité de résultats (ex: `page_size=1`) ou en utilisant un paramètre d'API Vinted qui retourne uniquement le total si disponible.
      - Il retournera un objet simple, ex: `{ "totalCount": 1234 }`.
  2. **Frontend :**
      - Sur la page de création, dans la carte "Résumé & Actions", ajouter une section pour afficher le résultat de la prévisualisation.
      - Déclencher un appel à l'endpoint de prévisualisation (avec un *debounce* de 500ms) chaque fois qu'un filtre principal (nom du produit, catégorie, marque, état) est modifié.
      - Afficher un état de chargement pendant l'appel.
