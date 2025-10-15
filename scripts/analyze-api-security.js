#!/usr/bin/env node

/**
 * Script d'analyse de sécurité des APIs
 * Génère un rapport de sécurité pour les endpoints et middlewares
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  projectRoot: path.join(__dirname, '..'),
  apiPath: path.join(__dirname, '..', 'app', 'api'),
  libPath: path.join(__dirname, '..', 'lib'),
  checksPath: path.join(__dirname, '..', '.github', 'workflows'),
};

// Résultats d'analyse
const results = {
  timestamp: new Date().toISOString(),
  apiEndpoints: [],
  securityIssues: [],
  recommendations: [],
  summary: {},
};

function computeSummary(endpoints, issues, exitCode) {
  const totalEndpoints = endpoints.length;
  const endpointsWithAuth = endpoints.filter(endpoint => endpoint.security.hasAuth).length;
  const endpointsWithValidation = endpoints.filter(endpoint => endpoint.security.hasValidation).length;
  const endpointsWithRateLimit = endpoints.filter(endpoint => endpoint.security.hasRateLimit).length;
  const securityScore = totalEndpoints > 0 ? Number(((endpointsWithAuth / totalEndpoints) * 100).toFixed(2)) : 0;

  const issuesBySeverity = issues.reduce(
    (acc, issue) => {
      const severity = issue.severity || 'UNKNOWN';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    },
    {}
  );

  return {
    generatedAt: new Date().toISOString(),
    totalEndpoints,
    endpointsWithAuth,
    endpointsWithValidation,
    endpointsWithRateLimit,
    securityScore,
    issues: issuesBySeverity,
    exitCode,
  };
}

function persistSummary(summary) {
  try {
    const summaryPath = path.join(CONFIG.projectRoot, 'security-analysis-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('[WARN] Unable to write security-analysis-summary.json:', error.message);
  }
}

/**
 * Scan des fichiers de route API
 */
function scanApiEndpoints() {
  console.error('[INFO] Scanning API endpoints...');
  
  const endpoints = [];
  const scanDir = (dir, prefix = '') => {
    try {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath, prefix + file + '/');
        } else if (file === 'route.ts' || file === 'route.js') {
          const relativePath = `app/api/${prefix}${file === 'route.ts' ? '' : 'route.ts'}`;
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Extraire méthodes HTTP
          const methods = extractHttpMethods(content);
          const middlewares = extractMiddlewares(content);
          const hasAuth = hasAuthValidation(content);
          const hasValidation = hasInputValidation(content);
          const hasRateLimit = hasRateLimiting(content);
          
          endpoints.push({
            path: prefix,
            file: fullPath,
            methods,
            middlewares,
            security: {
              hasAuth,
              hasValidation,
              hasRateLimit,
            },
          });
        }
      });
    } catch (err) {
      console.error(`[WARN] Error scanning ${dir}: ${err.message}`);
    }
  };

  try {
    scanDir(CONFIG.apiPath);
  } catch (err) {
    console.error(`[ERROR] Cannot scan API path: ${err.message}`);
  }

  return endpoints;
}

/**
 * Extrait les méthodes HTTP supportées
 */
function extractHttpMethods(content) {
  const methods = [];
  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  
  httpMethods.forEach(method => {
    const regex = new RegExp(`\\bexport\\s+(async\\s+)?function\\s+${method.toLowerCase()}|export\\s+const\\s+${method.toLowerCase()}\\s*=`, 'i');
    if (regex.test(content)) {
      methods.push(method);
    }
  });

  return methods.length > 0 ? methods : ['UNKNOWN'];
}

/**
 * Extrait les middlewares utilisés
 */
function extractMiddlewares(content) {
  const middlewares = [];
  
  if (content.includes('withErrorHandling')) middlewares.push('withErrorHandling');
  if (content.includes('requireAuth')) middlewares.push('requireAuth');
  if (content.includes('requireAdmin')) middlewares.push('requireAdmin');
  if (content.includes('rateLimitMiddleware')) middlewares.push('rateLimitMiddleware');
  if (content.includes('validateRequest')) middlewares.push('validateRequest');
  if (content.includes('corsMiddleware')) middlewares.push('corsMiddleware');

  return middlewares;
}

/**
 * Vérifie la présence de validation d'authentification
 */
function hasAuthValidation(content) {
  return /requireAuth|authenticateUser|checkToken|verifySession/.test(content);
}

/**
 * Vérifie la présence de validation d'entrée
 */
function hasInputValidation(content) {
  return /validateRequest|zod|parse\(|validate\(|schema\.parse/.test(content);
}

/**
 * Vérifie la présence de rate limiting
 */
function hasRateLimiting(content) {
  return /rateLimit|rateLimitMiddleware|LoginBruteForce|throttle|limit/.test(content);
}

/**
 * Analyse les problèmes de sécurité
 */
function analyzeSecurityIssues(endpoints) {
  console.error('[INFO] Analyzing security issues...');
  
  const issues = [];

  // Vérifier endpoints sans auth
  endpoints.forEach(endpoint => {
    // Endpoints publics acceptables
    const publicEndpoints = ['/health', '/auth/register', '/auth/login', '/status'];
    const isPublic = publicEndpoints.some(p => endpoint.path.includes(p));

    if (!isPublic && !endpoint.security.hasAuth) {
      issues.push({
        severity: 'HIGH',
        endpoint: endpoint.path,
        issue: 'Missing authentication',
        recommendation: 'Add requireAuth() middleware',
      });
    }

    // Endpoints sensibles sans validation
    const sensitiveEndpoints = ['/settings', '/profile', '/sessions'];
    const isSensitive = sensitiveEndpoints.some(p => endpoint.path.includes(p));

    if (isSensitive && !endpoint.security.hasValidation) {
      issues.push({
        severity: 'MEDIUM',
        endpoint: endpoint.path,
        issue: 'Missing input validation',
        recommendation: 'Add validateRequest() middleware with Zod schema',
      });
    }

    // Endpoints login sans rate limiting
    if (endpoint.path.includes('/auth/login') && !endpoint.security.hasRateLimit) {
      issues.push({
        severity: 'HIGH',
        endpoint: endpoint.path,
        issue: 'Missing rate limiting on login endpoint',
        recommendation: 'Add rate limiting to prevent brute force attacks',
      });
    }
  });

  return issues;
}

/**
 * Formatte le rapport
 */
function formatReport(endpoints, issues) {
  let report = '';

  report += `${'='.repeat(80)}\n`;
  report += `API Security Analysis Report\n`;
  report += `Generated: ${results.timestamp}\n`;
  report += `${'='.repeat(80)}\n\n`;

  // Résumé
  report += `## SUMMARY\n`;
  const totalEndpoints = endpoints.length;
  const endpointsWithAuth = endpoints.filter(e => e.security.hasAuth).length;
  const endpointsWithValidation = endpoints.filter(e => e.security.hasValidation).length;
  const endpointsWithRateLimit = endpoints.filter(e => e.security.hasRateLimit).length;
  const securityScore = totalEndpoints > 0 ? ((endpointsWithAuth / totalEndpoints) * 100).toFixed(2) : '0.00';

  report += `- Total Endpoints: ${totalEndpoints}\n`;
  report += `- With Authentication: ${endpointsWithAuth}\n`;
  report += `- With Input Validation: ${endpointsWithValidation}\n`;
  report += `- With Rate Limiting: ${endpointsWithRateLimit}\n`;
  report += `- Security Issues Found: ${issues.length}\n\n`;

  report += `Endpoints sécurisés: ${endpointsWithAuth}\n`;
  report += `Total endpoints: ${totalEndpoints}\n`;
  report += `Pourcentage sécurisé: ${securityScore}%\n\n`;

  // Endpoints
  report += `## API ENDPOINTS (${endpoints.length})\n`;
  report += `${'─'.repeat(80)}\n`;
  endpoints.forEach(endpoint => {
    const securityIcon = endpoint.security.hasAuth ? '🔒' : '🔓';
    report += `${securityIcon} ${endpoint.path}\n`;
    report += `   Methods: ${endpoint.methods.join(', ')}\n`;
    if (endpoint.middlewares.length > 0) {
      report += `   Middlewares: ${endpoint.middlewares.join(', ')}\n`;
    }
    report += `   Auth: ${endpoint.security.hasAuth ? '✓' : '✗'} | `;
    report += `Validation: ${endpoint.security.hasValidation ? '✓' : '✗'} | `;
    report += `Rate Limit: ${endpoint.security.hasRateLimit ? '✓' : '✗'}\n\n`;
  });

  // Issues
  let exitCode = 0;
  if (issues.length > 0) {
    report += `## SECURITY ISSUES (${issues.length})\n`;
    report += `${'─'.repeat(80)}\n`;
    
    const highSeverity = issues.filter(i => i.severity === 'HIGH');
    const mediumSeverity = issues.filter(i => i.severity === 'MEDIUM');
    const lowSeverity = issues.filter(i => i.severity === 'LOW');

    if (highSeverity.length > 0) {
      report += `\n### HIGH SEVERITY (${highSeverity.length})\n`;
      highSeverity.forEach(issue => {
        report += `⚠️  ${issue.endpoint}: ${issue.issue}\n`;
        report += `    → ${issue.recommendation}\n\n`;
      });
      exitCode = 1;
    }

    if (mediumSeverity.length > 0) {
      report += `\n### MEDIUM SEVERITY (${mediumSeverity.length})\n`;
      mediumSeverity.forEach(issue => {
        report += `⚡ ${issue.endpoint}: ${issue.issue}\n`;
        report += `    → ${issue.recommendation}\n\n`;
      });
    }

    if (lowSeverity.length > 0) {
      report += `\n### LOW SEVERITY (${lowSeverity.length})\n`;
      lowSeverity.forEach(issue => {
        report += `ℹ️  ${issue.endpoint}: ${issue.issue}\n`;
        report += `    → ${issue.recommendation}\n\n`;
      });
    }
  } else {
    report += `## SECURITY ISSUES\n`;
    report += `✓ No critical security issues detected\n\n`;
  }

  // Recommendations
  report += `## RECOMMENDATIONS\n`;
  report += `${'─'.repeat(80)}\n`;
  report += `1. Ensure all protected endpoints use requireAuth() middleware\n`;
  report += `2. Implement input validation for all endpoints accepting user data\n`;
  report += `3. Add rate limiting to authentication endpoints\n`;
  report += `4. Use HTTPS in production (enforced by deployment)\n`;
  report += `5. Rotate secrets regularly (API keys, JWT secrets, etc.)\n`;
  report += `6. Monitor failed login attempts and suspicious activity\n`;
  report += `7. Keep dependencies updated and scan for vulnerabilities\n\n`;

  // Exit code based on issues
  report += `${'='.repeat(80)}\n`;
  report += `Exit Code: ${exitCode}\n`;

  return { report, exitCode };
}

/**
 * Main
 */
function main() {
  try {
  const endpoints = scanApiEndpoints();
  const issues = analyzeSecurityIssues(endpoints);
  const { report, exitCode } = formatReport(endpoints, issues);

  const summary = computeSummary(endpoints, issues, exitCode);
  results.summary = summary;
  persistSummary(summary);

    // Output
    console.log(report);

    process.exit(exitCode);
  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
