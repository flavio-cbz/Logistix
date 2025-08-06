/**
 * Security Testing Utilities
 * Provides helper functions and utilities for security vulnerability testing
 */

export interface SecurityTestPayload {
    type: 'sql_injection' | 'xss' | 'csrf' | 'path_traversal' | 'command_injection'
    payload: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface SecurityTestResult {
    payload: SecurityTestPayload
    response: {
        status: number
        body: any
        headers: any
    }
    vulnerable: boolean
    details: string
}

/**
 * SQL Injection test payloads
 */
export const SQL_INJECTION_PAYLOADS: SecurityTestPayload[] = [
    {
        type: 'sql_injection',
        payload: "'; DROP TABLE users; --",
        description: 'Table drop attempt',
        severity: 'critical'
    },
    {
        type: 'sql_injection',
        payload: "' OR '1'='1' --",
        description: 'Authentication bypass attempt',
        severity: 'high'
    },
    {
        type: 'sql_injection',
        payload: "' UNION SELECT * FROM users --",
        description: 'Data extraction attempt',
        severity: 'high'
    },
    {
        type: 'sql_injection',
        payload: "'; UPDATE users SET role = 'admin' WHERE id = 1; --",
        description: 'Privilege escalation attempt',
        severity: 'critical'
    },
    {
        type: 'sql_injection',
        payload: "' OR 1=1 LIMIT 1 OFFSET 0 --",
        description: 'Data enumeration attempt',
        severity: 'medium'
    },
    {
        type: 'sql_injection',
        payload: "'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
        description: 'User injection attempt',
        severity: 'high'
    },
    {
        type: 'sql_injection',
        payload: "' AND (SELECT COUNT(*) FROM users) > 0 --",
        description: 'Information disclosure attempt',
        severity: 'medium'
    },
    {
        type: 'sql_injection',
        payload: "'; EXEC xp_cmdshell('dir'); --",
        description: 'Command execution attempt',
        severity: 'critical'
    }
]

/**
 * XSS test payloads
 */
export const XSS_PAYLOADS: SecurityTestPayload[] = [
    {
        type: 'xss',
        payload: '<script>alert("xss")</script>',
        description: 'Basic script injection',
        severity: 'high'
    },
    {
        type: 'xss',
        payload: '<img src="x" onerror="alert(\'xss\')" />',
        description: 'Image tag with onerror handler',
        severity: 'high'
    },
    {
        type: 'xss',
        payload: '<svg onload="alert(\'xss\')" />',
        description: 'SVG with onload handler',
        severity: 'high'
    },
    {
        type: 'xss',
        payload: 'javascript:alert("xss")',
        description: 'JavaScript protocol injection',
        severity: 'medium'
    },
    {
        type: 'xss',
        payload: '<iframe src="javascript:alert(\'xss\')"></iframe>',
        description: 'Iframe with JavaScript source',
        severity: 'high'
    },
    {
        type: 'xss',
        payload: '<body onload="alert(\'xss\')" />',
        description: 'Body tag with onload handler',
        severity: 'high'
    },
    {
        type: 'xss',
        payload: '<div onclick="alert(\'xss\')">Click me</div>',
        description: 'Div with onclick handler',
        severity: 'medium'
    },
    {
        type: 'xss',
        payload: '<input type="text" value="<script>alert(\'xss\')</script>" />',
        description: 'Input with script in value',
        severity: 'medium'
    },
    {
        type: 'xss',
        payload: '"><script>alert("xss")</script>',
        description: 'Attribute escape attempt',
        severity: 'high'
    },
    {
        type: 'xss',
        payload: '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>">\'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>',
        description: 'Complex XSS payload',
        severity: 'high'
    }
]

/**
 * Path traversal test payloads
 */
export const PATH_TRAVERSAL_PAYLOADS: SecurityTestPayload[] = [
    {
        type: 'path_traversal',
        payload: '../../../etc/passwd',
        description: 'Unix password file access',
        severity: 'high'
    },
    {
        type: 'path_traversal',
        payload: '..\\..\\..\\windows\\system32\\config\\sam',
        description: 'Windows SAM file access',
        severity: 'high'
    },
    {
        type: 'path_traversal',
        payload: '....//....//....//etc/passwd',
        description: 'Double encoding traversal',
        severity: 'high'
    },
    {
        type: 'path_traversal',
        payload: '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        description: 'URL encoded traversal',
        severity: 'high'
    },
    {
        type: 'path_traversal',
        payload: '..%252f..%252f..%252fetc%252fpasswd',
        description: 'Double URL encoded traversal',
        severity: 'high'
    }
]

/**
 * Command injection test payloads
 */
export const COMMAND_INJECTION_PAYLOADS: SecurityTestPayload[] = [
    {
        type: 'command_injection',
        payload: '; ls -la',
        description: 'Unix command injection',
        severity: 'critical'
    },
    {
        type: 'command_injection',
        payload: '& dir',
        description: 'Windows command injection',
        severity: 'critical'
    },
    {
        type: 'command_injection',
        payload: '| whoami',
        description: 'Pipe command injection',
        severity: 'critical'
    },
    {
        type: 'command_injection',
        payload: '`id`',
        description: 'Backtick command injection',
        severity: 'critical'
    },
    {
        type: 'command_injection',
        payload: '$(id)',
        description: 'Command substitution injection',
        severity: 'critical'
    }
]

/**
 * Security test analyzer
 */
export class SecurityTestAnalyzer {
    /**
     * Analyze response for SQL injection vulnerabilities
     */
    static analyzeSQLInjection(response: any, payload: SecurityTestPayload): SecurityTestResult {
        const responseText = JSON.stringify(response.body).toLowerCase()
        const vulnerable = 
            response.status === 500 ||
            responseText.includes('sql') ||
            responseText.includes('syntax error') ||
            responseText.includes('mysql') ||
            responseText.includes('sqlite') ||
            responseText.includes('postgresql') ||
            responseText.includes('ora-') ||
            responseText.includes('microsoft ole db')

        return {
            payload,
            response: {
                status: response.status,
                body: response.body,
                headers: response.headers
            },
            vulnerable,
            details: vulnerable 
                ? 'Response indicates potential SQL injection vulnerability'
                : 'No SQL injection vulnerability detected'
        }
    }

    /**
     * Analyze response for XSS vulnerabilities
     */
    static analyzeXSS(response: any, payload: SecurityTestPayload): SecurityTestResult {
        const responseText = JSON.stringify(response.body)
        const vulnerable = 
            responseText.includes('<script>') ||
            responseText.includes('onerror') ||
            responseText.includes('onload') ||
            responseText.includes('onclick') ||
            responseText.includes('javascript:') ||
            responseText.includes(payload.payload)

        return {
            payload,
            response: {
                status: response.status,
                body: response.body,
                headers: response.headers
            },
            vulnerable,
            details: vulnerable 
                ? 'Response contains unescaped user input - potential XSS vulnerability'
                : 'User input appears to be properly sanitized'
        }
    }

    /**
     * Analyze response for path traversal vulnerabilities
     */
    static analyzePathTraversal(response: any, payload: SecurityTestPayload): SecurityTestResult {
        const responseText = JSON.stringify(response.body).toLowerCase()
        const vulnerable = 
            responseText.includes('root:') ||
            responseText.includes('administrator:') ||
            responseText.includes('etc/passwd') ||
            responseText.includes('system32') ||
            response.status === 200 && responseText.length > 1000

        return {
            payload,
            response: {
                status: response.status,
                body: response.body,
                headers: response.headers
            },
            vulnerable,
            details: vulnerable 
                ? 'Response indicates potential path traversal vulnerability'
                : 'No path traversal vulnerability detected'
        }
    }

    /**
     * Analyze response for command injection vulnerabilities
     */
    static analyzeCommandInjection(response: any, payload: SecurityTestPayload): SecurityTestResult {
        const responseText = JSON.stringify(response.body).toLowerCase()
        const vulnerable = 
            responseText.includes('uid=') ||
            responseText.includes('gid=') ||
            responseText.includes('volume in drive') ||
            responseText.includes('directory of') ||
            response.status === 500

        return {
            payload,
            response: {
                status: response.status,
                body: response.body,
                headers: response.headers
            },
            vulnerable,
            details: vulnerable 
                ? 'Response indicates potential command injection vulnerability'
                : 'No command injection vulnerability detected'
        }
    }

    /**
     * Generate comprehensive security test report
     */
    static generateSecurityReport(results: SecurityTestResult[]): {
        summary: {
            total_tests: number
            vulnerabilities_found: number
            critical_vulnerabilities: number
            high_vulnerabilities: number
            medium_vulnerabilities: number
            low_vulnerabilities: number
        }
        vulnerabilities: SecurityTestResult[]
        recommendations: string[]
    } {
        const vulnerabilities = results.filter(r => r.vulnerable)
        
        const summary = {
            total_tests: results.length,
            vulnerabilities_found: vulnerabilities.length,
            critical_vulnerabilities: vulnerabilities.filter(v => v.payload.severity === 'critical').length,
            high_vulnerabilities: vulnerabilities.filter(v => v.payload.severity === 'high').length,
            medium_vulnerabilities: vulnerabilities.filter(v => v.payload.severity === 'medium').length,
            low_vulnerabilities: vulnerabilities.filter(v => v.payload.severity === 'low').length
        }

        const recommendations = []
        
        if (vulnerabilities.some(v => v.payload.type === 'sql_injection')) {
            recommendations.push('Implement parameterized queries and input validation to prevent SQL injection')
        }
        
        if (vulnerabilities.some(v => v.payload.type === 'xss')) {
            recommendations.push('Implement proper input sanitization and output encoding to prevent XSS')
        }
        
        if (vulnerabilities.some(v => v.payload.type === 'path_traversal')) {
            recommendations.push('Validate and sanitize file paths to prevent directory traversal')
        }
        
        if (vulnerabilities.some(v => v.payload.type === 'command_injection')) {
            recommendations.push('Avoid executing user input as system commands and use safe alternatives')
        }

        return {
            summary,
            vulnerabilities,
            recommendations
        }
    }
}

/**
 * Rate limiting test utilities
 */
export class RateLimitTester {
    /**
     * Test rate limiting on an endpoint
     */
    static async testRateLimit(
        apiClient: any,
        endpoint: string,
        method: 'get' | 'post' | 'put' | 'delete' = 'get',
        requestCount: number = 50,
        headers: any = {}
    ): Promise<{
        requests_made: number
        rate_limited: boolean
        first_rate_limit_at: number | null
        response_codes: number[]
    }> {
        const responses: number[] = []
        let firstRateLimitAt: number | null = null

        for (let i = 0; i < requestCount; i++) {
            try {
                const response = await apiClient[method](endpoint)
                    .set(headers)

                responses.push(response.status)

                if (response.status === 429 && firstRateLimitAt === null) {
                    firstRateLimitAt = i + 1
                }
            } catch (error) {
                responses.push(500)
            }
        }

        return {
            requests_made: requestCount,
            rate_limited: responses.includes(429),
            first_rate_limit_at: firstRateLimitAt,
            response_codes: responses
        }
    }
}

/**
 * Session security test utilities
 */
export class SessionSecurityTester {
    /**
     * Test session fixation vulnerability
     */
    static async testSessionFixation(
        apiClient: any,
        loginEndpoint: string,
        credentials: any,
        fixedSessionId: string = 'fixed-session-12345'
    ): Promise<{
        vulnerable: boolean
        details: string
        new_session_id?: string
    }> {
        const response = await apiClient
            .post(loginEndpoint)
            .set('Cookie', `session_id=${fixedSessionId}`)
            .send(credentials)

        if (response.status === 200) {
            const cookies = response.headers['set-cookie'] as string[]
            const sessionCookie = cookies?.find((cookie: string) => cookie.includes('session_id'))
            
            if (sessionCookie) {
                const newSessionId = sessionCookie.split('session_id=')[1].split(';')[0]
                const vulnerable = newSessionId === fixedSessionId

                return {
                    vulnerable,
                    details: vulnerable 
                        ? 'Application accepts predetermined session ID - vulnerable to session fixation'
                        : 'Application generates new session ID on login - protected against session fixation',
                    new_session_id: newSessionId
                }
            }
        }

        return {
            vulnerable: false,
            details: 'Unable to determine session fixation vulnerability'
        }
    }

    /**
     * Test session cookie security attributes
     */
    static testSessionCookieSecurity(cookies: string[]): {
        has_httponly: boolean
        has_secure: boolean
        has_samesite: boolean
        recommendations: string[]
    } {
        const sessionCookie = cookies?.find((cookie: string) => cookie.includes('session_id'))
        
        if (!sessionCookie) {
            return {
                has_httponly: false,
                has_secure: false,
                has_samesite: false,
                recommendations: ['No session cookie found']
            }
        }

        const hasHttpOnly = /HttpOnly/i.test(sessionCookie)
        const hasSecure = /Secure/i.test(sessionCookie)
        const hasSameSite = /SameSite/i.test(sessionCookie)

        const recommendations = []
        if (!hasHttpOnly) recommendations.push('Add HttpOnly flag to session cookie')
        if (!hasSecure) recommendations.push('Add Secure flag to session cookie for HTTPS')
        if (!hasSameSite) recommendations.push('Add SameSite attribute to session cookie')

        return {
            has_httponly: hasHttpOnly,
            has_secure: hasSecure,
            has_samesite: hasSameSite,
            recommendations
        }
    }
}

/**
 * Input validation test utilities
 */
export class InputValidationTester {
    /**
     * Generate boundary value test cases
     */
    static generateBoundaryValues(): {
        numeric: any[]
        string: any[]
        special: any[]
    } {
        return {
            numeric: [
                -1,
                0,
                Number.MAX_SAFE_INTEGER,
                Number.MIN_SAFE_INTEGER,
                Number.POSITIVE_INFINITY,
                Number.NEGATIVE_INFINITY,
                Number.NaN,
                3.14159,
                -3.14159
            ],
            string: [
                '',
                ' ',
                'a'.repeat(10000),
                '\n\r\t',
                '🚀🎉💻', // Unicode characters
                'null',
                'undefined',
                'true',
                'false'
            ],
            special: [
                null,
                undefined,
                {},
                [],
                true,
                false
            ]
        }
    }

    /**
     * Test file upload security
     */
    static generateMaliciousFileTests(): {
        filename: string
        content: Buffer
        description: string
        severity: 'low' | 'medium' | 'high' | 'critical'
    }[] {
        return [
            {
                filename: '../../../etc/passwd',
                content: Buffer.from('root:x:0:0:root:/root:/bin/bash'),
                description: 'Path traversal in filename',
                severity: 'high'
            },
            {
                filename: 'script.js',
                content: Buffer.from('alert("xss")'),
                description: 'JavaScript file upload',
                severity: 'medium'
            },
            {
                filename: 'malware.exe',
                content: Buffer.from('MZ\x90\x00'), // PE header
                description: 'Executable file upload',
                severity: 'high'
            },
            {
                filename: '<script>alert("xss")</script>.txt',
                content: Buffer.from('test content'),
                description: 'XSS in filename',
                severity: 'medium'
            },
            {
                filename: 'file"; rm -rf /; echo ".txt',
                content: Buffer.from('test content'),
                description: 'Command injection in filename',
                severity: 'critical'
            }
        ]
    }
}