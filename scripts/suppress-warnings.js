#!/usr/bin/env node

/**
 * Script pour supprimer les warnings webpack spécifiques
 * Utilisé pour nettoyer la sortie de build des warnings non critiques
 */

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Liste des patterns de warnings à supprimer
const suppressedWarnings = [
  /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
  /require-in-the-middle/,
  /@opentelemetry/,
  /@sentry/,
  /node_modules/,
];

// Fonction pour vérifier si un message doit être supprimé
function shouldSuppressMessage(message) {
  const messageStr = String(message);
  return suppressedWarnings.some(pattern => pattern.test(messageStr));
}

// Override console.warn
console.warn = function(...args) {
  const message = args.join(' ');
  if (!shouldSuppressMessage(message)) {
    originalConsoleWarn.apply(console, args);
  }
};

// Override console.error pour les warnings webpack
console.error = function(...args) {
  const message = args.join(' ');
  if (!shouldSuppressMessage(message)) {
    originalConsoleError.apply(console, args);
  }
};

// Export pour utilisation dans d'autres scripts
module.exports = {
  suppressedWarnings,
  shouldSuppressMessage,
};