/**
 * Validation Session Manager
 * Manages validation sessions and their lifecycle
 * Requirements: 4.1, 4.2 - Session management and progress tracking
 */

import type { ValidationReport } from './types';
// Simple logger disabled
// import { logger } from '@/lib/utils/simple-logger.js';
import { MonitoringState, ValidationMonitor } from './validation-monitor';

// Mock logger since logger is disabled
const logger = {
  error: (msg: string, data?: any) => console.error(`[SessionManager] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[SessionManager] ${msg}`, data || ''),
info: (msg: string, data?: any) => console.info(`[SessionManager] ${msg}`, data || ''),
};

export interface ValidationSession {
  validationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  completedAt?: string;
  progress: number;
  report?: ValidationReport;
  error?: string;
  userId: string;
  configuration?: {
    debugMode: boolean;
    hasToken: boolean;
  };
  monitoring: MonitoringState;
}

/**
 * Validation Session Manager
 * In production, this would use Redis or a database for persistence
 */
export class ValidationSessionManager {
  private static instance: ValidationSessionManager;
  private sessions = new Map<string, ValidationSession>();

  private constructor() {}

  public static getInstance(): ValidationSessionManager {
    if (!ValidationSessionManager.instance) {
      ValidationSessionManager.instance = new ValidationSessionManager();
    }
    return ValidationSessionManager.instance;
  }

  /**
   * Create a new validation session
   */
  createSession(userId: string, debugMode: boolean = false): string {
    const validationId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();

    const initialMonitor = new ValidationMonitor();

    const session: ValidationSession = {
      validationId,
      status: 'pending',
      startTime,
      progress: 0,
      userId,
      configuration: {
        debugMode,
        hasToken: true // Will be validated during execution
      },
      monitoring: initialMonitor.getState(),
    };

    this.sessions.set(validationId, session);

    logger.info(`Created validation session: ${validationId}`, { 
      userId, 
      debugMode 
    });

    return validationId;
  }

  /**
   * Get a validation session by ID
   */
  getSession(validationId: string): ValidationSession | null {
    return this.sessions.get(validationId) || null;
  }

  /**
   * Update session monitoring state
   */
  updateSessionMonitoring(validationId: string, monitoringState: MonitoringState): boolean {
    const session = this.sessions.get(validationId);
    if (!session) {
      logger.warn(`Attempted to update monitoring for non-existent session: ${validationId}`);
      return false;
    }

    session.monitoring = monitoringState;
    session.progress = monitoringState.progress;
    session.status = monitoringState.status.toLowerCase() as ValidationSession['status'];

    this.sessions.set(validationId, session);
    return true;
  }

  /**
   * Update session status
   */
  updateSessionStatus(
    validationId: string, 
    status: ValidationSession['status'], 
    progress?: number,
    error?: string
  ): boolean {
    const session = this.sessions.get(validationId);
    if (!session) {
      logger.warn(`Attempted to update non-existent session: ${validationId}`);
      return false;
    }

    session.status = status;
    if (progress !== undefined) {
      session.progress = Math.max(0, Math.min(100, progress));
    }
    if (error) {
      session.error = error;
    }
    if (status === 'completed' || status === 'failed') {
      session.completedAt = new Date().toISOString();
    }

    this.sessions.set(validationId, session);

    logger.info(`Updated session ${validationId}`, { 
      status, 
      progress: session.progress,
      hasError: !!error
    });

    return true;
  }

  /**
   * Set validation report for a session
   */
  setSessionReport(validationId: string, report: ValidationReport): boolean {
    const session = this.sessions.get(validationId);
    if (!session) {
      logger.warn(`Attempted to set report for non-existent session: ${validationId}`);
      return false;
    }

    session.report = report;
    session.status = report.overallSuccess ? 'completed' : 'failed';
    session.progress = 100;
    session.completedAt = new Date().toISOString();

    if (!report.overallSuccess) {
      session.error = report.recommendations.join('; ');
    }

    this.sessions.set(validationId, session);

    logger.info(`Set report for session ${validationId}`, { 
      overallSuccess: report.overallSuccess,
      productTests: report.productTests.length,
      recommendations: report.recommendations.length
    });

    return true;
  }

  /**
   * Get all sessions for a user (admin gets all)
   */
  getUserSessions(userId: string, isAdmin: boolean = false): ValidationSession[] {
    const sessions = Array.from(this.sessions.values());
    
    if (isAdmin) {
      return sessions.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    }

    return sessions
      .filter(session => session.userId === userId)
      .sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
  }

  /**
   * Delete a validation session
   */
  deleteSession(validationId: string): boolean {
    const session = this.sessions.get(validationId);
    if (!session) {
      logger.warn(`Attempted to delete non-existent session: ${validationId}`);
      return false;
    }

    // Don't allow deletion of running validations
    if (session.status === 'running') {
      logger.warn(`Attempted to delete running session: ${validationId}`);
      return false;
    }

    this.sessions.delete(validationId);

    logger.info(`Deleted validation session: ${validationId}`, { 
      status: session.status,
      hadReport: !!session.report
    });

    return true;
  }

  /**
   * Clean up old sessions (older than 24 hours)
   */
  cleanupOldSessions(): number {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    let deletedCount = 0;

    for (const [validationId, session] of this.sessions.entries()) {
      const sessionTime = new Date(session.startTime);
      
      // Only delete completed or failed sessions older than cutoff
      if (sessionTime < cutoffTime && 
          (session.status === 'completed' || session.status === 'failed')) {
        this.sessions.delete(validationId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old validation sessions`);
    }

    return deletedCount;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    oldestSession?: string;
    newestSession?: string;
  } {
    const sessions = Array.from(this.sessions.values());
    
    const stats = {
      total: sessions.length,
      pending: sessions.filter(s => s.status === 'pending').length,
      running: sessions.filter(s => s.status === 'running').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      failed: sessions.filter(s => s.status === 'failed').length,
      oldestSession: undefined as string | undefined,
      newestSession: undefined as string | undefined
    };

    if (sessions.length > 0) {
      const sorted = sessions.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      stats.oldestSession = sorted[0]?.startTime;
      stats.newestSession = sorted[sorted.length - 1]?.startTime;
    }

    return stats;
  }

  /**
   * Check if a user has any running validations
   */
  hasRunningValidation(userId: string): boolean {
    return Array.from(this.sessions.values()).some(
      session => session.userId === userId && session.status === 'running'
    );
  }

  /**
   * Get running validations count
   */
  getRunningValidationsCount(): number {
    return Array.from(this.sessions.values()).filter(
      session => session.status === 'running'
    ).length;
  }
}

// Export singleton instance
export const validationSessionManager = ValidationSessionManager.getInstance();