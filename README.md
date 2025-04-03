# LogistiX - Gestion de Parcelles et Produits

LogistiX est une application web complète dédiée à la gestion de parcelles et de produits agricoles. Elle permet de suivre les ventes, d'analyser les bénéfices et de gérer efficacement vos ressources. Ce dépôt contient le code source de l’application ainsi que tous les outils nécessaires à son déploiement et à son évolution.

## Table des Matières

- [Fonctionnalités](#fonctionnalités)
- [Technologies Utilisées](#technologies-utilisées)
- [Prérequis](#prérequis)
- [Installation et Démarrage](#installation-et-démarrage)
  - [En Développement](#en-développement)
  - [En Production](#en-production)
  - [Déploiement avec Docker](#déploiement-avec-docker)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Tests](#tests)
- [Contribuer](#contribuer)
- [Licence](#licence)
- [Auteurs et Remerciements](#auteurs-et-remerciements)
- [Contact](#contact)

## Fonctionnalités

- **Gestion des Parcelles** : Ajout, modification et suppression de parcelles.
- **Gestion des Produits** : Création, mise à jour et suivi des ventes de produits.
- **Tableau de Bord Personnalisable** : Visualisations interactives et statistiques détaillées.
- **Analyse des Performances** : Suivi des bénéfices et des indicateurs de performance.
- **Import/Export de Données** : Outils intégrés pour faciliter la manipulation et le transfert de données.

## Technologies Utilisées

- **Next.js** : Pour une interface utilisateur moderne et réactive.
- **TypeScript** : Pour un code robuste et bien typé.
- **Tailwind CSS** : Pour des interfaces élégantes et personnalisables.
- **Node.js** : Pour l’exécution côté serveur.
- **Docker** : Pour une conteneurisation facilitant le déploiement.

## Prérequis

- **Node.js** : Version 18 ou supérieure.
- **npm** ou **pnpm** : Pour la gestion des dépendances.
- **Docker** (optionnel) : Pour déployer l’application dans un environnement conteneurisé.

## Installation et Démarrage

### En Développement

1. **Cloner le dépôt** :
    ```bash
    git clone https://github.com/flavio-cbz/Logistix.git
    cd Logistix
    ```
2. **Installer les dépendances** :
    ```bash
    npm install
    ```
    ou, si vous utilisez pnpm :
    ```bash
    pnpm install
    ```
3. **Démarrer l'application en mode développement** :
    ```bash
    npm run dev
    ```
    ou
    ```bash
    pnpm dev
    ```
4. **Accéder à l'application** :
    Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### En Production

1. **Installer les dépendances** :
    ```bash
    npm install
    ```
2. **Construire l'application** :
    ```bash
    npm run build
    ```
3. **Démarrer l'application** :
    ```bash
    npm start
    ```

### Déploiement avec Docker

Une image Docker officielle est disponible sur [Docker Hub](https://hub.docker.com/r/nethunter59/logistix) pour simplifier le déploiement.

#### Exemple de fichier `docker-compose.yml`

```yaml
version: '3.8'
services:
  logistix:
    image: nethunter59/logistix
    container_name: logistix
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
```

Pour déployer l'application avec Docker Compose :

1. Placez ce fichier `docker-compose.yml` à la racine du projet.
2. Assurez-vous que le répertoire `data` contenant le fichier `admin-password.txt` existe.
3. Exécutez :
    ```bash
    docker-compose up --build
    ```
4. Accédez à l'application via [http://localhost:3000](http://localhost:3000).

#### Identifiants de Connexion par Défaut

- **Email** : admin@logistix.local  
- **Nom d'utilisateur** : admin  
- **Mot de passe** : admin123  

> Ces identifiants sont configurables en modifiant le fichier `data/admin-password.txt`.

## Configuration

Pour adapter l’application à votre environnement, vous pouvez définir des variables d’environnement dans un fichier `.env` placé à la racine du projet. Par exemple :

```env
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000/api
```

Adaptez ces valeurs en fonction de vos besoins.

## Utilisation

- **Gestion des Parcelles** : Ajoutez, modifiez ou supprimez des parcelles via l’interface dédiée.
- **Gestion des Produits** : Créez, mettez à jour et suivez les ventes de vos produits.
- **Tableau de Bord** : Personnalisez le tableau de bord pour visualiser les statistiques et indicateurs clés en temps réel.
- **Import/Export** : Transférez vos données facilement grâce aux outils d’import/export intégrés.

## Tests

*(Section à compléter selon l’implémentation des tests)*

Pour exécuter les tests (si configurés) :
```bash
npm run test
```

Des informations complémentaires sur la couverture et la configuration des tests seront ajoutées ultérieurement.

## Contribuer

Les contributions sont les bienvenues ! Pour contribuer :

1. **Forkez** le dépôt.
2. **Créez** une branche pour votre nouvelle fonctionnalité ou correction :
    ```bash
    git checkout -b feature/nouvelle-fonctionnalité
    ```
3. **Commitez** vos modifications :
    ```bash
    git commit -m "Ajout d'une nouvelle fonctionnalité"
    ```
4. **Poussez** votre branche :
    ```bash
    git push origin feature/nouvelle-fonctionnalité
    ```
5. **Ouvrez** une Pull Request pour soumettre vos modifications.

Merci de respecter les bonnes pratiques de contribution et de consulter, le cas échéant, un futur guide [CONTRIBUTING.md].

## Licence

Ce projet est sous licence [MIT](LICENSE) *(ou autre licence à préciser)*. Veuillez consulter le fichier LICENSE pour plus de détails.

## Auteurs et Remerciements

- **Flavio CBZ** – Créateur du projet  
  [GitHub](https://github.com/flavio-cbz)
