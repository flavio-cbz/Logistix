<<<<<<< HEAD
/**
 * Design System - LogistiX
 * Export centralisé de tous les tokens et utilitaires
 */

export * from './tokens';

// Utilitaires d'aide pour les tokens
export const getSpacing = (size: keyof typeof import('./tokens').spacing) => {
    const { spacing } = require('./tokens');
    return spacing[size];
};

export const getColor = (color: keyof typeof import('./tokens').colors) => {
    const { colors } = require('./tokens');
    return colors[color];
};
=======
/**
 * Design System - LogistiX
 * Export centralisé de tous les tokens et utilitaires
 */

export * from './tokens';

// Utilitaires d'aide pour les tokens
export const getSpacing = (size: keyof typeof import('./tokens').spacing) => {
    const { spacing } = require('./tokens');
    return spacing[size];
};

export const getColor = (color: keyof typeof import('./tokens').colors) => {
    const { colors } = require('./tokens');
    return colors[color];
};
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
