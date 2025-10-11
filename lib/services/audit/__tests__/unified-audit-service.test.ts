/**
 * Tests pour le service d'audit unifié
 * 
 * @module services/audit/__tests__/unified-audit-service.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  UnifiedAuditService,
  auditService,
  AUDIT_FORMAT_VERSION,
  type MutationAuditEvent,
  type SecurityAuditEvent,
  type SystemAuditEvent,
  type PerformanceAuditEvent,
} from '../unified-audit-service';

describe('UnifiedAuditService', () => {
  let service: UnifiedAuditService;

  beforeEach(() => {
    service = new UnifiedAuditService();
    service.clearBuffer();
  });

  afterEach(() => {
    service.clearBuffer();
  });

  describe('Configuration', () => {
    it('devrait utiliser la config par défaut', () => {
      const config = service.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.logMutations).toBe(true);
      expect(config.logSecurity).toBe(true);
      expect(config.logSystem).toBe(true);
      expect(config.logPerformance).toBe(true);
      expect(config.autoSanitize).toBe(true);
      expect(config.performanceThreshold).toBe(1000);
    });

    it('devrait permettre une config personnalisée', () => {
      const customService = new UnifiedAuditService({
        enabled: false,
        performanceThreshold: 500,
      });

      const config = customService.getConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.performanceThreshold).toBe(500);
    });

    it('devrait permettre de mettre à jour la config', () => {
      service.updateConfig({ performanceThreshold: 2000 });
      
      const config = service.getConfig();
      expect(config.performanceThreshold).toBe(2000);
    });
  });

  describe('Mutations (CRUD)', () => {
    it('devrait logger une création', async () => {
      await service.logMutation({
        action: 'create',
        resource: 'produit',
        resourceId: 'prod-123',
        changes: {
          data: {
            after: { nom: 'Test Product', prix: 99.99 },
          },
        },
        userId: 'user-123',
        username: 'testuser',
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as MutationAuditEvent;
      expect(event.type).toBe('mutation');
      expect(event.action).toBe('create');
      expect(event.resource).toBe('produit');
      expect(event.resourceId).toBe('prod-123');
      expect(event.userId).toBe('user-123');
      expect(event.username).toBe('testuser');
      expect(event.version).toBe(AUDIT_FORMAT_VERSION);
      expect(event.success).toBe(true);
    });

    it('devrait logger une mise à jour', async () => {
      await service.logMutation({
        action: 'update',
        resource: 'produit',
        resourceId: 'prod-123',
        changes: {
          nom: { before: 'Old Name', after: 'New Name' },
          prix: { before: 99.99, after: 149.99 },
        },
        userId: 'user-123',
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as MutationAuditEvent;
      expect(event.action).toBe('update');
      expect(event.changes['nom']).toEqual({ before: 'Old Name', after: 'New Name' });
      expect(event.changes['prix']).toEqual({ before: 99.99, after: 149.99 });
    });

    it('devrait logger une suppression', async () => {
      await service.logMutation({
        action: 'delete',
        resource: 'produit',
        resourceId: 'prod-123',
        changes: {
          data: {
            before: { nom: 'Test Product', prix: 99.99 },
          },
        },
        userId: 'user-123',
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as MutationAuditEvent;
      expect(event.action).toBe('delete');
    });

    it('devrait sanitizer les données sensibles', async () => {
      await service.logMutation({
        action: 'update',
        resource: 'user',
        resourceId: 'user-123',
        changes: {
          password: { before: 'oldpass123', after: 'newpass456' },
          email: { before: 'old@example.com', after: 'new@example.com' },
          token: { before: 'abc123', after: 'def456' },
        },
        userId: 'admin-123',
      });

      const events = service.getBufferedEvents();
      const event = events[0] as MutationAuditEvent;

      expect(event.changes['password']).toEqual({ before: '[REDACTED]', after: '[REDACTED]' });
      expect(event.changes['token']).toEqual({ before: '[REDACTED]', after: '[REDACTED]' });
      expect(event.changes['email']).toEqual({ before: 'old@example.com', after: 'new@example.com' });
    });

    it('ne devrait pas logger si logMutations désactivé', async () => {
      service.updateConfig({ logMutations: false });

      await service.logMutation({
        action: 'create',
        resource: 'produit',
        resourceId: 'prod-123',
        changes: { data: { after: {} } },
        userId: 'user-123',
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('Événements de sécurité', () => {
    it('devrait logger une connexion réussie', async () => {
      await service.logSecurity({
        securityEventType: 'login',
        severity: 'low',
        success: true,
        userId: 'user-123',
        username: 'testuser',
        ip: '192.168.1.1',
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as SecurityAuditEvent;
      expect(event.type).toBe('security');
      expect(event.securityEventType).toBe('login');
      expect(event.severity).toBe('low');
      expect(event.success).toBe(true);
      expect(event.ip).toBe('192.168.1.1');
    });

    it('devrait logger une tentative de connexion échouée', async () => {
      await service.logSecurity({
        securityEventType: 'login_failed',
        severity: 'medium',
        success: false,
        reason: 'Invalid password',
        ip: '192.168.1.1',
        details: { attempts: 3 },
      });

      const events = service.getBufferedEvents();
      const event = events[0] as SecurityAuditEvent;

      expect(event.success).toBe(false);
      expect(event.reason).toBe('Invalid password');
      expect(event.details?.['attempts']).toBe(3);
    });

    it('devrait logger un blocage brute force', async () => {
      await service.logSecurity({
        securityEventType: 'brute_force_blocked',
        severity: 'high',
        success: false,
        reason: 'Too many failed attempts',
        username: 'testuser',
        ip: '192.168.1.1',
        details: { attempts: 5, blockDuration: 60000 },
      });

      const events = service.getBufferedEvents();
      const event = events[0] as SecurityAuditEvent;

      expect(event.securityEventType).toBe('brute_force_blocked');
      expect(event.severity).toBe('high');
      expect(event.details?.['attempts']).toBe(5);
    });

    it('ne devrait pas logger si logSecurity désactivé', async () => {
      service.updateConfig({ logSecurity: false });

      await service.logSecurity({
        securityEventType: 'login',
        severity: 'low',
        success: true,
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('Événements système', () => {
    it('devrait logger un événement de migration réussi', async () => {
      await service.logSystem({
        category: 'migration',
        description: 'Migration 0003 appliquée avec succès',
        success: true,
        userId: 'system',
        details: { migrationFile: '0003_add_column.sql' },
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as SystemAuditEvent;
      expect(event.type).toBe('system');
      expect(event.category).toBe('migration');
      expect(event.success).toBe(true);
    });

    it('devrait logger une erreur système', async () => {
      await service.logSystem({
        category: 'error',
        description: 'Échec de connexion à la base de données',
        success: false,
        error: 'ECONNREFUSED',
        details: { dbHost: 'localhost', dbPort: 5432 },
      });

      const events = service.getBufferedEvents();
      const event = events[0] as SystemAuditEvent;

      expect(event.success).toBe(false);
      expect(event.error).toBe('ECONNREFUSED');
    });

    it('ne devrait pas logger si logSystem désactivé', async () => {
      service.updateConfig({ logSystem: false });

      await service.logSystem({
        category: 'maintenance',
        description: 'Maintenance programmée',
        success: true,
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('Événements de performance', () => {
    it('devrait logger une opération lente', async () => {
      await service.logPerformance({
        operation: 'database.query.findAll',
        duration: 1500,
        threshold: 1000,
        details: { query: 'SELECT * FROM products', rowCount: 1000 },
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as PerformanceAuditEvent;
      expect(event.type).toBe('performance');
      expect(event.operation).toBe('database.query.findAll');
      expect(event.duration).toBe(1500);
      expect(event.threshold).toBe(1000);
      expect(event.thresholdExceeded).toBe(true);
    });

    it('devrait utiliser le seuil par défaut', async () => {
      await service.logPerformance({
        operation: 'api.request',
        duration: 800,
      });

      const events = service.getBufferedEvents();
      
      // Ne devrait pas logger car sous le seuil par défaut
      expect(events).toHaveLength(0);
    });

    it('devrait logger si le seuil est explicitement fourni', async () => {
      await service.logPerformance({
        operation: 'api.request',
        duration: 800,
        threshold: 500,
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as PerformanceAuditEvent;
      expect(event.thresholdExceeded).toBe(true);
    });

    it('ne devrait pas logger si logPerformance désactivé', async () => {
      service.updateConfig({ logPerformance: false });

      await service.logPerformance({
        operation: 'test',
        duration: 2000,
        threshold: 1000,
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('Buffer', () => {
    it('devrait ajouter des événements au buffer', async () => {
      await service.logMutation({
        action: 'create',
        resource: 'produit',
        resourceId: 'prod-1',
        changes: {},
        userId: 'user-1',
      });

      await service.logMutation({
        action: 'update',
        resource: 'produit',
        resourceId: 'prod-2',
        changes: {},
        userId: 'user-1',
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(2);
    });

    it('devrait limiter la taille du buffer', async () => {
      // Créer 150 événements (buffer max = 100)
      for (let i = 0; i < 150; i++) {
        await service.logMutation({
          action: 'create',
          resource: 'produit',
          resourceId: `prod-${i}`,
          changes: {},
          userId: 'user-1',
        });
      }

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(100);
      
      // Le premier événement devrait avoir été supprimé
      const firstEvent = events[0] as MutationAuditEvent;
      expect(firstEvent.resourceId).toBe('prod-50');
    });

    it('devrait pouvoir vider le buffer', async () => {
      await service.logMutation({
        action: 'create',
        resource: 'produit',
        resourceId: 'prod-1',
        changes: {},
        userId: 'user-1',
      });

      expect(service.getBufferedEvents()).toHaveLength(1);

      service.clearBuffer();
      
      expect(service.getBufferedEvents()).toHaveLength(0);
    });
  });

  describe('Champs requis et optionnels', () => {
    it('devrait accepter des événements avec seulement les champs requis', async () => {
      await service.logMutation({
        action: 'create',
        resource: 'produit',
        resourceId: 'prod-123',
        changes: {},
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(1);

      const event = events[0] as MutationAuditEvent;
      expect(event.id).toBeDefined();
      expect(event.version).toBe(AUDIT_FORMAT_VERSION);
      expect(event.timestamp).toBeDefined();
      expect(event.userId).toBeUndefined();
    });

    it('devrait inclure tous les champs optionnels fournis', async () => {
      await service.logMutation({
        action: 'create',
        resource: 'produit',
        resourceId: 'prod-123',
        changes: {},
        userId: 'user-123',
        username: 'testuser',
        sessionId: 'session-456',
        traceId: 'trace-789',
        requestId: 'req-000',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { source: 'api' },
      });

      const events = service.getBufferedEvents();
      const event = events[0] as MutationAuditEvent;

      expect(event.userId).toBe('user-123');
      expect(event.username).toBe('testuser');
      expect(event.sessionId).toBe('session-456');
      expect(event.traceId).toBe('trace-789');
      expect(event.requestId).toBe('req-000');
      expect(event.ip).toBe('192.168.1.1');
      expect(event.userAgent).toBe('Mozilla/5.0');
      expect(event.metadata?.['source']).toBe('api');
    });
  });

  describe('Service désactivé', () => {
    it('ne devrait rien logger si le service est désactivé', async () => {
      service.updateConfig({ enabled: false });

      await service.logMutation({
        action: 'create',
        resource: 'produit',
        resourceId: 'prod-123',
        changes: {},
      });

      await service.logSecurity({
        securityEventType: 'login',
        severity: 'low',
        success: true,
      });

      await service.logSystem({
        category: 'maintenance',
        description: 'Test',
        success: true,
      });

      const events = service.getBufferedEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('Instance singleton', () => {
    it('devrait fournir une instance singleton', () => {
      expect(auditService).toBeInstanceOf(UnifiedAuditService);
      expect(auditService.getConfig).toBeDefined();
    });
  });
});
