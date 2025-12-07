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
    getJwtSecret: () => process.env['JWT_SECRET'] || 'secret',
    getAllAdvancedFeatureFlags: () => ({}),
};
