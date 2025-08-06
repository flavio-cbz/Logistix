// Configuration webpack pour supprimer les warnings spécifiques
module.exports = {
    // Supprimer les warnings critiques liés aux dépendances dynamiques
    ignoreWarnings: [
        {
            module: /require-in-the-middle/,
        },
        {
            module: /@opentelemetry/,
        },
        {
            module: /@sentry/,
        },
        /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
    ],

    // Configuration pour les modules externes
    externals: {
        'require-in-the-middle': 'commonjs require-in-the-middle',
        '@opentelemetry/instrumentation': 'commonjs @opentelemetry/instrumentation',
    },

    // Supprimer les warnings dans les stats
    stats: {
        warnings: false,
        warningsFilter: [
            /Critical dependency/,
            /require-in-the-middle/,
            /@opentelemetry/,
            /@sentry/,
        ],
    },
};