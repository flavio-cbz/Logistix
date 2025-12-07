<<<<<<< HEAD
/**
 * Utilitaire de transformation entre snake_case et camelCase
 * Utilisé pour convertir les données entre la DB (snake_case) et le frontend (camelCase)
 */

/**
 * Convertit une clé snake_case en camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convertit une clé camelCase en snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Transforme un objet de snake_case vers camelCase
 */
export function transformToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToCamelCase) as any;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = transformToCamelCase(obj[key]);
    }
  }
  return result;
}

/**
 * Transforme un objet de camelCase vers snake_case
 */
export function transformToSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToSnakeCase) as any;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = transformToSnakeCase(obj[key]);
    }
  }
  return result;
}

/**
 * Transforme spécifiquement une parcelle DB (snake_case) vers le format frontend (camelCase)
 */
export function transformParcelleFromDb(dbParcelle: any) {
  if (!dbParcelle) return null;

  return {
    id: dbParcelle.id,
    userId: dbParcelle.user_id,
    numero: dbParcelle.numero,
    numeroSuivi: dbParcelle.numero_suivi ?? null,
    transporteur: dbParcelle.transporteur,
    nom: dbParcelle.nom,
    statut: dbParcelle.statut,
    actif: Boolean(dbParcelle.actif),
    prixAchat: dbParcelle.prix_achat ?? null,
    poids: dbParcelle.poids ?? null,
    prixTotal: dbParcelle.prix_total ?? null,
    prixParGramme: dbParcelle.prix_par_gramme ?? null,
    createdAt: dbParcelle.created_at,
    updatedAt: dbParcelle.updated_at,
  };
}

/**
 * Transforme une parcelle frontend (camelCase) vers le format DB (snake_case)
 */
export function transformParcelleToDb(frontendParcelle: any) {
  if (!frontendParcelle) return null;

  const dbParcelle: any = {};

  if (frontendParcelle.id !== undefined) dbParcelle.id = frontendParcelle.id;
  if (frontendParcelle.userId !== undefined) dbParcelle.user_id = frontendParcelle.userId;
  if (frontendParcelle.numero !== undefined) dbParcelle.numero = frontendParcelle.numero;
  if (frontendParcelle.numeroSuivi !== undefined) dbParcelle.numero_suivi = frontendParcelle.numeroSuivi;
  if (frontendParcelle.transporteur !== undefined) dbParcelle.transporteur = frontendParcelle.transporteur;
  if (frontendParcelle.nom !== undefined) dbParcelle.nom = frontendParcelle.nom;
  if (frontendParcelle.statut !== undefined) dbParcelle.statut = frontendParcelle.statut;
  if (frontendParcelle.actif !== undefined) dbParcelle.actif = frontendParcelle.actif ? 1 : 0;
  if (frontendParcelle.prixAchat !== undefined) dbParcelle.prix_achat = frontendParcelle.prixAchat;
  if (frontendParcelle.poids !== undefined) dbParcelle.poids = frontendParcelle.poids;
  if (frontendParcelle.prixTotal !== undefined) dbParcelle.prix_total = frontendParcelle.prixTotal;
  if (frontendParcelle.prixParGramme !== undefined) dbParcelle.prix_par_gramme = frontendParcelle.prixParGramme;
  if (frontendParcelle.createdAt !== undefined) dbParcelle.created_at = frontendParcelle.createdAt;
  if (frontendParcelle.updatedAt !== undefined) dbParcelle.updated_at = frontendParcelle.updatedAt;

  return dbParcelle;
}
=======
/**
 * Utilitaire de transformation entre snake_case et camelCase
 * Utilisé pour convertir les données entre la DB (snake_case) et le frontend (camelCase)
 */

/**
 * Convertit une clé snake_case en camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convertit une clé camelCase en snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Transforme un objet de snake_case vers camelCase
 */
export function transformToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToCamelCase) as any;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = transformToCamelCase(obj[key]);
    }
  }
  return result;
}

/**
 * Transforme un objet de camelCase vers snake_case
 */
export function transformToSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToSnakeCase) as any;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = transformToSnakeCase(obj[key]);
    }
  }
  return result;
}

/**
 * Transforme spécifiquement une parcelle DB (snake_case) vers le format frontend (camelCase)
 */
export function transformParcelleFromDb(dbParcelle: any) {
  if (!dbParcelle) return null;

  return {
    id: dbParcelle.id,
    userId: dbParcelle.user_id,
    numero: dbParcelle.numero,
    numeroSuivi: dbParcelle.numero_suivi ?? null,
    transporteur: dbParcelle.transporteur,
    nom: dbParcelle.nom,
    statut: dbParcelle.statut,
    actif: Boolean(dbParcelle.actif),
    prixAchat: dbParcelle.prix_achat ?? null,
    poids: dbParcelle.poids ?? null,
    prixTotal: dbParcelle.prix_total ?? null,
    prixParGramme: dbParcelle.prix_par_gramme ?? null,
    createdAt: dbParcelle.created_at,
    updatedAt: dbParcelle.updated_at,
  };
}

/**
 * Transforme une parcelle frontend (camelCase) vers le format DB (snake_case)
 */
export function transformParcelleToDb(frontendParcelle: any) {
  if (!frontendParcelle) return null;

  const dbParcelle: any = {};

  if (frontendParcelle.id !== undefined) dbParcelle.id = frontendParcelle.id;
  if (frontendParcelle.userId !== undefined) dbParcelle.user_id = frontendParcelle.userId;
  if (frontendParcelle.numero !== undefined) dbParcelle.numero = frontendParcelle.numero;
  if (frontendParcelle.numeroSuivi !== undefined) dbParcelle.numero_suivi = frontendParcelle.numeroSuivi;
  if (frontendParcelle.transporteur !== undefined) dbParcelle.transporteur = frontendParcelle.transporteur;
  if (frontendParcelle.nom !== undefined) dbParcelle.nom = frontendParcelle.nom;
  if (frontendParcelle.statut !== undefined) dbParcelle.statut = frontendParcelle.statut;
  if (frontendParcelle.actif !== undefined) dbParcelle.actif = frontendParcelle.actif ? 1 : 0;
  if (frontendParcelle.prixAchat !== undefined) dbParcelle.prix_achat = frontendParcelle.prixAchat;
  if (frontendParcelle.poids !== undefined) dbParcelle.poids = frontendParcelle.poids;
  if (frontendParcelle.prixTotal !== undefined) dbParcelle.prix_total = frontendParcelle.prixTotal;
  if (frontendParcelle.prixParGramme !== undefined) dbParcelle.prix_par_gramme = frontendParcelle.prixParGramme;
  if (frontendParcelle.createdAt !== undefined) dbParcelle.created_at = frontendParcelle.createdAt;
  if (frontendParcelle.updatedAt !== undefined) dbParcelle.updated_at = frontendParcelle.updatedAt;

  return dbParcelle;
}
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
