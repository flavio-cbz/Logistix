Thought for 7 seconds### Comprendre les Bases de Données avec Authentification: Guide pour Débutants

En utilisant le projet Logistix comme exemple concret, je vais vous expliquer comment fonctionne une base de données avec authentification, étape par étape.

## 1. Fondamentaux des Bases de Données

### Qu'est-ce qu'une Base de Données?

Une base de données est un système organisé pour stocker, gérer et récupérer des informations. Imaginez-la comme une bibliothèque numérique où toutes vos données sont stockées de manière structurée.

**Analogie:** Si vous avez déjà utilisé Excel, une base de données est similaire, mais beaucoup plus puissante. Elle permet de stocker des données, d'établir des relations entre elles, et d'y accéder rapidement.

Dans Logistix, nous utilisons une base de données pour stocker:

- Les informations des utilisateurs (noms, emails, mots de passe)
- Les données des parcelles et produits
- Les sessions d'utilisateurs connectés


### Tables, Lignes et Colonnes

Une base de données relationnelle (comme celle utilisée dans Logistix) organise les données en:

- **Tables**: Collections de données liées (ex: table "users")
- **Colonnes**: Catégories d'information (ex: username, email)
- **Lignes**: Enregistrements individuels (ex: un utilisateur spécifique)


Voici comment les tables sont définies dans Logistix:

```typescript
// Création de la table users
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT,
  avatar TEXT,
  language TEXT DEFAULT 'fr',
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`)
```

### Types de Bases de Données

Il existe plusieurs types de bases de données:

1. **Bases de données relationnelles** (comme SQLite utilisée dans Logistix, mais aussi MySQL, PostgreSQL):

1. Organisent les données en tables avec des relations entre elles
2. Utilisent SQL (Structured Query Language) pour les requêtes
3. Idéales pour les données structurées avec des relations claires



2. **Bases de données NoSQL** (MongoDB, Firebase):

1. Plus flexibles dans la structure des données
2. Souvent utilisées pour les données non structurées ou semi-structurées
3. Généralement plus faciles à mettre à l'échelle horizontalement





Logistix utilise SQLite, une base de données relationnelle légère stockée dans un fichier:

```typescript
// Chemin vers la base de données
const dbPath = path.join(process.cwd(), "data", "logistix.db")
// Création de la connexion à la base de données
const db = new Database(dbPath)
```

### Schéma de Base de Données

Le schéma définit la structure de votre base de données: quelles tables existent, quelles colonnes elles contiennent, et comment les tables sont liées entre elles.

Dans Logistix, le schéma est défini lors de l'initialisation:

```typescript
function initializeDatabase() {
  // Création de la table users
  db.exec(`CREATE TABLE IF NOT EXISTS users (...)`);
  
  // Création de la table sessions
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (...)`);
  
  // Création de la table parcelles
  db.exec(`CREATE TABLE IF NOT EXISTS parcelles (...)`);
  
  // Création de la table produits
  db.exec(`CREATE TABLE IF NOT EXISTS produits (...)`);
}
```

## 2. Authentification et Autorisation

### Authentification vs Autorisation

- **Authentification**: Vérifier l'identité d'un utilisateur ("Qui êtes-vous?")
- **Autorisation**: Déterminer ce qu'un utilisateur peut faire ("Que pouvez-vous faire?")


### Processus d'Inscription (Registration)

L'inscription consiste à créer un nouveau compte utilisateur. Voici comment cela fonctionne dans Logistix:

1. L'utilisateur remplit un formulaire avec son nom d'utilisateur, email et mot de passe
2. Le système vérifie que le nom d'utilisateur et l'email ne sont pas déjà utilisés
3. Le mot de passe est haché (nous y reviendrons)
4. Les informations sont enregistrées dans la base de données


```typescript
export async function signUp(formData: FormData) {
  const username = formData.get("username") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  // Validation des données
  const validatedData = userSchema.parse({ username, email, password });
  
  // Création de l'utilisateur
  const user = createUser(validatedData.username, validatedData.email, validatedData.password);
  
  // Création d'une session
  const sessionId = createSession(user.id);
  
  return { success: true, message: "Inscription réussie" };
}
```

### Processus d'Authentification (Login)

L'authentification vérifie l'identité d'un utilisateur:

1. L'utilisateur fournit son identifiant (email ou nom d'utilisateur) et son mot de passe
2. Le système récupère l'utilisateur correspondant dans la base de données
3. Le système hache le mot de passe fourni et le compare avec celui stocké
4. Si les mots de passe correspondent, une session est créée


```typescript
export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  // Vérifier les identifiants
  const user = verifyCredentials(validatedData.email, validatedData.password);
  
  if (!user) {
    return { success: false, message: "Email ou mot de passe incorrect" };
  }
  
  // Créer une session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 jours
  
  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(sessionId, user.id, expiresAt);
  
  return {
    success: true,
    message: "Connexion réussie",
    sessionId: sessionId,
  };
}
```

### Stockage Sécurisé des Mots de Passe

Les mots de passe ne sont **jamais** stockés en texte clair dans une base de données. Ils sont "hachés" à l'aide d'algorithmes cryptographiques.

**Hachage**: Transformation d'un texte en une chaîne de caractères fixe et irréversible.

Dans Logistix, nous utilisons SHA-256 pour hacher les mots de passe:

```typescript
// Fonction pour hacher un mot de passe
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}
```

> **Note**: Dans une application de production, on utiliserait généralement des algorithmes plus robustes comme bcrypt ou Argon2, qui incluent également un "sel" (valeur aléatoire unique) pour chaque mot de passe.



### Rôles et Permissions

Les rôles définissent ce qu'un utilisateur peut faire dans l'application. Dans Logistix, nous avons:

- **Utilisateurs réguliers**: Peuvent gérer leurs propres parcelles et produits
- **Administrateurs**: Peuvent gérer tous les utilisateurs et accéder à des fonctionnalités spéciales


```typescript
// Fonction pour vérifier si l'utilisateur est un administrateur
export function isAdmin(userId: string): boolean {
  try {
    const user = db
      .prepare(`
      SELECT username FROM users
      WHERE id = ?
    `)
      .get(userId);

    return user && user.username === "admin";
  } catch (error) {
    console.error("Erreur lors de la vérification du statut d'administrateur:", error);
    return false;
  }
}
```

### Comment Fonctionne l'Autorisation

L'autorisation vérifie les permissions avant de permettre une action:

```typescript
// Fonction pour vérifier si l'utilisateur est un administrateur
export function requireAdmin() {
  const user = requireAuth();

  if (user.username !== "admin") {
    throw new Error("Non autorisé");
  }
}

// Utilisation dans une route d'API
export async function getStats() {
  requireAdmin(); // Vérifie que l'utilisateur est admin
  return getDatabaseStats();
}
```

## 3. Interaction avec la Base de Données

### Requêtes de Base de Données

Les applications interagissent avec les bases de données via des requêtes. Dans les bases de données relationnelles, on utilise SQL.

#### Commandes SQL de Base:

1. **SELECT**: Récupérer des données

```sql
SELECT * FROM users WHERE username = 'admin'
```


2. **INSERT**: Ajouter des données

```sql
INSERT INTO users (id, username, email, password_hash) 
VALUES ('123', 'john', 'john@example.com', 'hashed_password')
```


3. **UPDATE**: Modifier des données

```sql
UPDATE users SET email = 'new_email@example.com' WHERE id = '123'
```


4. **DELETE**: Supprimer des données

```sql
DELETE FROM users WHERE id = '123'
```




Dans Logistix, ces requêtes sont exécutées via l'API de SQLite:

```typescript
// SELECT - Récupérer un utilisateur
const user = db
  .prepare(`
    SELECT id, username, email FROM users
    WHERE username = ?
  `)
  .get('admin');

// INSERT - Ajouter un utilisateur
db.prepare(`
  INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(id, username, email, passwordHash, timestamp, timestamp);

// UPDATE - Mettre à jour un utilisateur
db.prepare(`
  UPDATE users
  SET username = ?, email = ?, updated_at = ?
  WHERE id = ?
`).run(username, email, timestamp, userId);

// DELETE - Supprimer un utilisateur
db.prepare("DELETE FROM users WHERE id = ?").run(userId);
```

### ORM et Bibliothèques Clientes

Un ORM (Object-Relational Mapper) simplifie l'interaction avec la base de données en permettant de manipuler des objets plutôt que d'écrire des requêtes SQL.

Logistix n'utilise pas d'ORM complet, mais utilise `better-sqlite3` comme bibliothèque cliente pour interagir avec SQLite.

## 4. Étapes d'Implémentation

### 1. Choisir un Système de Base de Données

Logistix utilise SQLite, une base de données légère stockée dans un fichier, idéale pour les applications de petite à moyenne taille.

```typescript
// Chemin vers la base de données
const dbPath = path.join(process.cwd(), "data", "logistix.db");
```

### 2. Configurer le Serveur de Base de Données

Avec SQLite, il n'y a pas de serveur séparé à configurer - la base de données est un fichier.

```typescript
// Création de la connexion à la base de données
const db = new Database(dbPath);
```

### 3. Créer la Base de Données et les Tables

```typescript
// Création de la table users
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT,
  avatar TEXT,
  language TEXT DEFAULT 'fr',
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

// Création de la table sessions
db.exec(`
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);
```

### 4. Implémenter l'Inscription et la Connexion

Voir les sections précédentes sur l'inscription et l'authentification.

### 5. Implémenter la Logique d'Autorisation

```typescript
// Middleware pour protéger les routes
export async function middleware(req: NextRequest) {
  // Vérifier si l'utilisateur est connecté via le cookie de session
  const sessionId = req.cookies.get("session_id")?.value;
  const isAuthenticated = !!sessionId;

  // Routes protégées qui nécessitent une authentification
  const protectedRoutes = ["/dashboard", "/profile", "/produits", "/parcelles", "/statistiques", "/admin"];

  // Vérifier si l'URL actuelle est une route protégée
  const isProtectedRoute = protectedRoutes.some((route) => path === route || path.startsWith(`${route}/`));

  // Si l'utilisateur n'est pas connecté et essaie d'accéder à une page protégée
  if (!isAuthenticated && isProtectedRoute) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }
  
  return NextResponse.next();
}
```

## 5. Considérations de Sécurité

### Stockage Sécurisé des Mots de Passe

Comme mentionné, Logistix utilise le hachage SHA-256:

```typescript
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}
```

### Prévention des Injections SQL

Logistix utilise des requêtes préparées pour éviter les injections SQL:

```typescript
// Utilisation de paramètres (?) pour éviter les injections SQL
const user = db
  .prepare(`
    SELECT id, username, email FROM users
    WHERE username = ?
  `)
  .get(username);
```

### Gestion des Sessions

Logistix utilise des sessions pour maintenir l'authentification:

```typescript
// Création d'une session
const sessionId = generateId();
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 jours

db.prepare(`
  INSERT INTO sessions (id, user_id, expires_at)
  VALUES (?, ?, ?)
`).run(sessionId, userId, expiresAt);

// Vérification d'une session
export function getSessionUser() {
  const sessionId = cookies().get("session_id")?.value;

  if (!sessionId) {
    return null;
  }

  const session = db
    .prepare(`
    SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.email
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `)
    .get(sessionId);

  // Vérifier si la session a expiré
  if (new Date(session.expires_at) < new Date()) {
    // Supprimer la session expirée
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    cookies().delete("session_id");
    return null;
  }

  return {
    id: session.user_id,
    username: session.username,
    email: session.email,
    isAdmin: session.username === "admin",
  };
}
```

## 6. Exemple Pratique: Flux d'Authentification dans Logistix

Voici comment fonctionne l'authentification dans Logistix:

1. **Inscription**:

1. L'utilisateur remplit le formulaire d'inscription
2. Le serveur vérifie que le nom d'utilisateur et l'email sont uniques
3. Le mot de passe est haché
4. Un nouvel utilisateur est créé dans la base de données
5. Une session est créée et un cookie est défini



2. **Connexion**:

1. L'utilisateur entre son identifiant et son mot de passe
2. Le serveur vérifie les identifiants
3. Si valides, une session est créée et un cookie est défini



3. **Vérification de Session**:

1. À chaque requête, le middleware vérifie si un cookie de session valide existe
2. Si oui, l'utilisateur est considéré comme authentifié
3. Si non, l'utilisateur est redirigé vers la page de connexion pour les routes protégées



4. **Déconnexion**:

1. L'utilisateur clique sur "Déconnexion"
2. La session est supprimée de la base de données
3. Le cookie est supprimé





## 7. Ressources pour Approfondir

Pour en apprendre davantage sur les bases de données et l'authentification:

### Bases de Données

- [SQLite Tutorial](https://www.sqlitetutorial.net/)
- [SQL pour les débutants sur W3Schools](https://www.w3schools.com/sql/)
- [Cours "Databases: Relational Databases and SQL" de Stanford](https://online.stanford.edu/courses/soe-ydatabases0001-databases-relational-databases-and-sql)


### Authentification et Sécurité

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Auth0 Blog](https://auth0.com/blog/)


### Next.js et Bases de Données

- [Documentation Next.js sur l'authentification](https://nextjs.org/docs/authentication)
- [Tutoriel Prisma avec Next.js](https://www.prisma.io/nextjs)


## Conclusion

Les bases de données avec authentification sont essentielles pour presque toutes les applications modernes. Elles permettent de stocker des données de manière structurée et sécurisée, tout en contrôlant qui peut accéder à quoi.

Le projet Logistix illustre bien comment ces concepts sont mis en œuvre dans une application réelle, avec:

- Une base de données SQLite pour stocker les données
- Un système d'authentification pour vérifier l'identité des utilisateurs
- Un système d'autorisation pour contrôler l'accès aux fonctionnalités
- Des mesures de sécurité comme le hachage des mots de passe et la protection contre les injections SQL


En comprenant ces concepts fondamentaux, vous avez maintenant une base solide pour explorer davantage le développement d'applications avec bases de données.