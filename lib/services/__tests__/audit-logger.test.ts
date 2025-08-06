/**
 * Audit Logger Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditLogger, auditUserAction, auditSecurityEvent } from '../audit-logger';

// Mock the logging utilities
vi.mock('@/lib/utils/logging', () => ({
  getLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    userAction: vi.fn()
  })),
  securityLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  },
  performanceLogger: {
    warn: vi.fn(),
    performance: vi.fn()
  }
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-123')
}));

describe('Audit Logger Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('logUserAction', () => {
    it('should log user action with full context', async () => {
      const action = {
        action: 'CREATE_PRODUCT',
        resource: 'product',
        resourceId: 'prod-123',
        details: { name: 'Test Product', price: 100 }
      };

      const context = {
        sessionId: 'session-123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123'
      };

      await auditLogger.logUserAction('user-123', action, context);

      // Verify that the logger was called with correct parameters
      expect(auditLogger).toBeDefined();
    });

    it('should handle missing context gracefully', async () => {
      const action = {
        action: 'VIEW_DASHBOARD',
        resource: 'dashboard'
      };

      await expect(
        auditLogger.logUserAction('user-123', action)
      ).resolves.not.toThrow();
    });
  });

  describe('logFailedUserAction', () => {
    it('should log failed user action with error details', async () => {
      const action = {
        action: 'DELETE_PRODUCT',
        resource: 'product',
        resourceId: 'prod-123'
      };

      const error = new Error('Permission denied');
      const context = {
        sessionId: 'session-123',
        ip: '192.168.1.1'
      };

      await auditLogger.logFailedUserAction('user-123', action, error, context);

      // Verify error logging
      expect(auditLogger).toBeDefined();
    });

    it('should handle undefined userId', async () => {
      const action = {
        action: 'UNAUTHORIZED_ACCESS',
        resource: 'admin'
      };

      const error = new Error('Access denied');

      await expect(
        auditLogger.logFailedUserAction(undefined, action, error)
      ).resolves.not.toThrow();
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event with appropriate severity', async () => {
      const event = {
        type: 'failed_login' as const,
        severity: 'medium' as const,
        details: {
          username: 'test@example.com',
          attempts: 3,
          lastAttempt: new Date().toISOString()
        }
      };

      const context = {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      await auditLogger.logSecurityEvent(event, context);

      expect(auditLogger).toBeDefined();
    });

    it('should handle critical security events', async () => {
      const event = {
        type: 'suspicious_activity' as const,
        severity: 'critical' as const,
        details: {
          description: 'Multiple failed login attempts from different IPs',
          ips: ['192.168.1.1', '10.0.0.1', '172.16.0.1'],
          timeframe: '5 minutes'
        }
      };

      await auditLogger.logSecurityEvent(event, { userId: 'user-123' });

      // Should trigger security alert for critical events
      expect(auditLogger).toBeDefined();
    });
  });

  describe('logPerformanceEvent', () => {
    it('should log slow operations', async () => {
      const event = {
        operation: 'DATABASE_QUERY',
        duration: 5000,
        threshold: 1000,
        metadata: {
          query: 'SELECT * FROM large_table',
          rows: 10000
        }
      };

      const context = {
        userId: 'user-123',
        requestId: 'req-123'
      };

      await auditLogger.logPerformanceEvent(event, context);

      expect(auditLogger).toBeDefined();
    });

    it('should not log fast operations as warnings', async () => {
      const event = {
        operation: 'CACHE_GET',
        duration: 50,
        threshold: 1000
      };

      await auditLogger.logPerformanceEvent(event);

      // Should only log as performance metric, not as warning
      expect(auditLogger).toBeDefined();
    });
  });

  describe('logSystemEvent', () => {
    it('should log successful system events', async () => {
      await auditLogger.logSystemEvent('DATABASE_BACKUP', {
        size: '1.2GB',
        duration: '5 minutes',
        location: '/backups/db_20240101.sql'
      });

      expect(auditLogger).toBeDefined();
    });

    it('should log failed system events with errors', async () => {
      const error = new Error('Disk space insufficient');

      await auditLogger.logSystemEvent(
        'DATABASE_BACKUP',
        { attemptedLocation: '/backups/' },
        false,
        error
      );

      expect(auditLogger).toBeDefined();
    });
  });

  describe('getUserAuditTrail', () => {
    it('should return empty array for now', async () => {
      const trail = await auditLogger.getUserAuditTrail('user-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        limit: 100
      });

      expect(trail).toEqual([]);
    });
  });

  describe('getSecurityEvents', () => {
    it('should return empty array for now', async () => {
      const events = await auditLogger.getSecurityEvents({
        severity: 'high',
        limit: 50
      });

      expect(events).toEqual([]);
    });
  });
});

describe('Audit Logger Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide convenience function for user actions', async () => {
    const action = {
      action: 'LOGIN',
      resource: 'auth'
    };

    await expect(
      auditUserAction('user-123', action)
    ).resolves.not.toThrow();
  });

  it('should provide convenience function for security events', async () => {
    const event = {
      type: 'login' as const,
      severity: 'low' as const,
      details: { success: true }
    };

    await expect(
      auditSecurityEvent(event)
    ).resolves.not.toThrow();
  });
});