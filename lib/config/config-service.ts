export const configService = {
    get: (key: string) => process.env[key],
    getNumber: (key: string, defaultValue: number) => {
        const val = process.env[key];
        return val ? parseInt(val, 10) : defaultValue;
    },
    getBoolean: (key: string, defaultValue: boolean) => {
        const val = process.env[key];
        return val ? val === 'true' : defaultValue;
    },
    getDatabasePath: () => process.env['DATABASE_PATH'] || 'f:/Youcloud/Documents/Projets/Logistix/prisma/dev.db',
    validateConfiguration: () => ({ valid: true, errors: [] }),
    getEnvironment: () => process.env['NODE_ENV'] || 'development',
    getFeatureFlags: () => ({
        newAuth: true,
        betaFeatures: false,
    }),
    getPort: () => parseInt(process.env['PORT'] || '3000', 10),
    getCorsOrigins: () => (process.env['CORS_ORIGINS'] || '*').split(','),
    getJwtSecret: () => {
        const secret = process.env['JWT_SECRET'];
        const environment = process.env['NODE_ENV'] || 'development';

        // CRITICAL SECURITY: Never use default secret in production
        if (!secret && environment === 'production') {
            throw new Error(
                'JWT_SECRET environment variable must be set in production. ' +
                'Generate a secure secret with: openssl rand -base64 32'
            );
        }

        // In development/test, use a default for convenience
        // This is safe because dev databases contain no real user data
        return secret || 'dev-only-secret-do-not-use-in-production';
    },
    getAllAdvancedFeatureFlags: () => ({}),
};
