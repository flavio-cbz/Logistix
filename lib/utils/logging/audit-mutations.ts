/**
 * Audit Logger pour Mutations Critiques
 * 
 * Logger spécifique pour enregistrer toutes les opérations de création,
 * modification et suppression des entités critiques (produits, parcelles).
 * 
 * Format structuré pour faciliter l'analyse et la traçabilité.
 */

import { logger } from '@/lib/utils/logging/logger';

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditResource = 'produit' | 'parcelle' | 'user';

export interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  userId: string;
  username?: string;
  traceId?: string;
  changes?: Record<string, { before?: any; after?: any }>;
  metadata?: Record<string, any>;
}

/**
 * Logger principal pour les mutations critiques
 * 
 * @param entry - Informations complètes de l'audit
 */
export function logAuditMutation(entry: AuditLogEntry): void {
  const logMessage = `[AUDIT] ${entry.action.toUpperCase()} ${entry.resource} ${entry.resourceId}`;
  
  const context = {
    audit: true,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    userId: entry.userId,
    username: entry.username,
    traceId: entry.traceId,
    timestamp: entry.timestamp,
    changes: entry.changes,
    ...entry.metadata,
  };

  logger.info(logMessage, context);
}

/**
 * Helper: Log création d'une entité
 */
export function logCreate(
  resource: AuditResource,
  resourceId: string,
  userId: string,
  data: any,
  options?: { traceId?: string; username?: string; metadata?: Record<string, any> }
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: 'create',
    resource,
    resourceId,
    userId,
    changes: {
      data: { after: data },
    },
  };

  if (options?.username) entry.username = options.username;
  if (options?.traceId) entry.traceId = options.traceId;
  if (options?.metadata) entry.metadata = options.metadata;

  logAuditMutation(entry);
}

/**
 * Helper: Log mise à jour d'une entité
 */
export function logUpdate(
  resource: AuditResource,
  resourceId: string,
  userId: string,
  before: any,
  after: any,
  options?: { traceId?: string; username?: string; metadata?: Record<string, any> }
): void {
  // Calculer seulement les champs modifiés
  const changes: Record<string, { before: any; after: any }> = {};
  
  for (const key in after) {
    if (after[key] !== before[key]) {
      changes[key] = {
        before: before[key],
        after: after[key],
      };
    }
  }

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: 'update',
    resource,
    resourceId,
    userId,
    changes,
  };

  if (options?.username) entry.username = options.username;
  if (options?.traceId) entry.traceId = options.traceId;
  if (options?.metadata) entry.metadata = options.metadata;

  logAuditMutation(entry);
}

/**
 * Helper: Log suppression d'une entité
 */
export function logDelete(
  resource: AuditResource,
  resourceId: string,
  userId: string,
  data: any,
  options?: { traceId?: string; username?: string; metadata?: Record<string, any> }
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: 'delete',
    resource,
    resourceId,
    userId,
    changes: {
      data: { before: data },
    },
  };

  if (options?.username) entry.username = options.username;
  if (options?.traceId) entry.traceId = options.traceId;
  if (options?.metadata) entry.metadata = options.metadata;

  logAuditMutation(entry);
}

/**
 * Helper: Extraire les champs sensibles avant de logger
 * (retire passwords, tokens, secrets, etc.)
 */
export function sanitizeForAudit(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'password_hash',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'encryptionSecret',
    'encryption_secret',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
