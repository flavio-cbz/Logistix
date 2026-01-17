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
export function transformToCamelCase<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToCamelCase) as T;
  }

  if (typeof obj !== 'object') {
    return obj as T;
  }

  const result: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = transformToCamelCase(record[key]);
    }
  }
  return result as T;
}

/**
 * Transforme un objet de camelCase vers snake_case
 */
export function transformToSnakeCase<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToSnakeCase) as T;
  }

  if (typeof obj !== 'object') {
    return obj as T;
  }

  const result: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = transformToSnakeCase(record[key]);
    }
  }
  return result as T;
}

/**
 * Transforme spécifiquement une parcelle DB (snake_case) vers le format frontend (camelCase)
 */
export function transformParcelleFromDb(dbParcelle: Record<string, unknown>) {
  if (!dbParcelle) return null;

  return {
    id: dbParcelle['id'],
    userId: dbParcelle['user_id'],
    numero: dbParcelle['numero'],
    numeroSuivi: dbParcelle['numero_suivi'] ?? null,
    transporteur: dbParcelle['transporteur'],
    nom: dbParcelle['nom'],
    statut: dbParcelle['statut'],
    actif: Boolean(dbParcelle['actif']),
    prixAchat: dbParcelle['prix_achat'] ?? null,
    poids: dbParcelle['poids'] ?? null,
    prixTotal: dbParcelle['prix_total'] ?? null,
    prixParGramme: dbParcelle['prix_par_gramme'] ?? null,
    createdAt: dbParcelle['created_at'],
    updatedAt: dbParcelle['updated_at'],
  };
}

/**
 * Transforme une parcelle frontend (camelCase) vers le format DB (snake_case)
 */
export function transformParcelleToDb(frontendParcelle: Record<string, unknown>) {
  if (!frontendParcelle) return null;

  const dbParcelle: Record<string, unknown> = {};

  if (frontendParcelle['id'] !== undefined) dbParcelle['id'] = frontendParcelle['id'];
  if (frontendParcelle['userId'] !== undefined) dbParcelle['user_id'] = frontendParcelle['userId'];
  if (frontendParcelle['numero'] !== undefined) dbParcelle['numero'] = frontendParcelle['numero'];
  if (frontendParcelle['numeroSuivi'] !== undefined) dbParcelle['numero_suivi'] = frontendParcelle['numeroSuivi'];
  if (frontendParcelle['transporteur'] !== undefined) dbParcelle['transporteur'] = frontendParcelle['transporteur'];
  if (frontendParcelle['nom'] !== undefined) dbParcelle['nom'] = frontendParcelle['nom'];
  if (frontendParcelle['statut'] !== undefined) dbParcelle['statut'] = frontendParcelle['statut'];
  if (frontendParcelle['actif'] !== undefined) dbParcelle['actif'] = frontendParcelle['actif'] ? 1 : 0;
  if (frontendParcelle['prixAchat'] !== undefined) dbParcelle['prix_achat'] = frontendParcelle['prixAchat'];
  if (frontendParcelle['poids'] !== undefined) dbParcelle['poids'] = frontendParcelle['poids'];
  if (frontendParcelle['prixTotal'] !== undefined) dbParcelle['prix_total'] = frontendParcelle['prixTotal'];
  if (frontendParcelle['prixParGramme'] !== undefined) dbParcelle['prix_par_gramme'] = frontendParcelle['prixParGramme'];
  if (frontendParcelle['createdAt'] !== undefined) dbParcelle['created_at'] = frontendParcelle['createdAt'];
  if (frontendParcelle['updatedAt'] !== undefined) dbParcelle['updated_at'] = frontendParcelle['updatedAt'];

  return dbParcelle;
}
