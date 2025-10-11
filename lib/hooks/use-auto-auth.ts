/**
 * Hooks React pour l'authentification auto-configurable
 * Fournit un accès facile à la configuration d'authentification dans les composants
 */

import { useState, useEffect } from "react";
import {
  autoAuthConfig,
  AutoAuthConfig,
  SecurityAssessment,
} from "../services/auto-auth-config";
import { diagnoseAuthConfiguration } from "../services/auto-auth-integration";

export interface UseAutoAuthResult {
  config: AutoAuthConfig | null;
  loading: boolean;
  error: string | null;
  regenerate: () => Promise<void>;
}

/**
 * Hook principal pour accéder à la configuration d'authentification automatique
 */
export function useAutoAuth(): UseAutoAuthResult {
  const [config, setConfig] = useState<AutoAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const newConfig = await autoAuthConfig.generateAuthConfig();
      setConfig(newConfig);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erreur de configuration d'authentification";
      setError(errorMessage);
      console.error(
        "Erreur lors du chargement de la configuration d'authentification:",
        err,
      );
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    await loadConfig();
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    error,
    regenerate,
  };
}

/**
 * Hook spécialisé pour les paramètres JWT
 */
export function useJwtConfig() {
  const { config, loading, error } = useAutoAuth();

  return {
    jwtSecret: config?.jwtSecret || null,
    accessTokenExpiry: config?.accessTokenExpiry || null,
    refreshTokenExpiry: config?.refreshTokenExpiry || null,
    loading,
    error,
  };
}

/**
 * Hook spécialisé pour la configuration des cookies
 */
export function useCookieConfig() {
  const { config, loading, error } = useAutoAuth();

  return {
    cookieName: config?.cookieName || null,
    cookieMaxAge: config?.cookieMaxAge || null,
    sessionDuration: config?.sessionDuration || null,
    loading,
    error,
  };
}

/**
 * Hook spécialisé pour les paramètres de sécurité
 */
export function useSecurityConfig() {
  const { config, loading, error } = useAutoAuth();

  return {
    bcryptRounds: config?.bcryptRounds || null,
    maxLoginAttempts: config?.maxLoginAttempts || null,
    lockoutDuration: config?.lockoutDuration || null,
    passwordMinLength: config?.passwordMinLength || null,
    passwordMaxLength: config?.passwordMaxLength || null,
    loading,
    error,
  };
}

/**
 * Hook spécialisé pour la configuration admin
 */
export function useAdminConfig() {
  const { config, loading, error } = useAutoAuth();

  return {
    adminPassword: config?.adminPassword || null,
    environment: config?.environment || null,
    loading,
    error,
  };
}

/**
 * Hook pour l'évaluation de sécurité
 */
export function useSecurityAssessment() {
  const [assessment, setAssessment] = useState<SecurityAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      const newAssessment = await autoAuthConfig.assessSecurity();
      setAssessment(newAssessment);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur d'évaluation de sécurité";
      setError(errorMessage);
      console.error("Erreur lors de l'évaluation de sécurité:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssessment();
  }, []);

  return {
    assessment,
    overallScore: assessment?.overallScore || 0,
    jwtSecretStrength: assessment?.jwtSecretStrength || 0,
    passwordPolicyStrength: assessment?.passwordPolicyStrength || 0,
    sessionSecurity: assessment?.sessionSecurity || 0,
    recommendations: assessment?.recommendations || [],
    warnings: assessment?.warnings || [],
    loading,
    error,
    recheck: loadAssessment,
  };
}

/**
 * Hook pour le diagnostic de l'authentification
 */
export function useAuthDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<{
    configured: boolean;
    securityScore: number;
    warnings: string[];
    recommendations: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      const result = await diagnoseAuthConfiguration();
      setDiagnostics({
        configured: result.status === 'ok',
        securityScore: result.issues.length === 0 ? 100 : 50,
        warnings: result.issues,
        recommendations: result.issues.length > 0 ? ['Vérifier la configuration'] : [],
      });
    } catch (err) {
      console.error("Erreur lors du diagnostic:", err);
      setDiagnostics({
        configured: false,
        securityScore: 0,
        warnings: ["Erreur de diagnostic"],
        recommendations: ["Vérifier les logs"],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return {
    diagnostics,
    configured: diagnostics?.configured || false,
    securityScore: diagnostics?.securityScore || 0,
    warnings: diagnostics?.warnings || [],
    recommendations: diagnostics?.recommendations || [],
    loading,
    rerun: runDiagnostics,
  };
}

/**
 * Hook pour la rotation automatique des secrets
 */
export function useSecretRotation() {
  const [rotating, setRotating] = useState(false);
  const [lastRotation, setLastRotation] = useState<Date | null>(null);

  const rotateSecrets = async () => {
    try {
      setRotating(true);
      console.log("🔄 Rotation des secrets d'authentification...");

      await autoAuthConfig.generateAuthConfig();
      setLastRotation(new Date());

      console.log("✅ Secrets d'authentification régénérés avec succès");

      // Recharger la page pour appliquer les nouveaux secrets
      window.location.reload();
    } catch (error) {
      console.error("❌ Erreur lors de la rotation des secrets:", error);
      throw error;
    } finally {
      setRotating(false);
    }
  };

  return {
    rotateSecrets,
    rotating,
    lastRotation,
    canRotate: !rotating,
  };
}
