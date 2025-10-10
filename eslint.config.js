module.exports = [
  {
    ignores: [
      "node_modules/**", 
      "dist/**", 
      ".next/**", 
      "build/**", 
      "coverage/**", 
      "public/**", 
      "**/*.min.js",
      "examples/**",
      "scripts/**", // Ignorer tous les scripts pour l'instant
      "tests/**", // Ignorer les tests pour l'instant
      "tailwind.config.ts", // Ignorer temporairement
      "vitest.config.ts" // Fichier de configuration
    ]
  },
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "middleware.ts", "vitest.setup.ts", "types/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parser: require("@typescript-eslint/parser"),
      parserOptions: { 
        ecmaFeatures: { jsx: true }
        // Pas de project pour éviter les erreurs de parsing
      },
      globals: { 
        window: "readonly", 
        document: "readonly", 
        navigator: "readonly",
        console: "readonly",
        process: "readonly"
      }
    },
    settings: { react: { version: "detect" } },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      react: require("eslint-plugin-react"),
      "react-hooks": require("eslint-plugin-react-hooks"),
      "jsx-a11y": require("eslint-plugin-jsx-a11y")
    },
    rules: {
      // TypeScript rules - mode pragmatique (sans type information)
      "@typescript-eslint/no-unused-vars": "off", // Désactivé temporairement
      "@typescript-eslint/no-explicit-any": "off", // Désactivé temporairement
      "@typescript-eslint/no-non-null-assertion": "off", // Désactivé temporairement
      // Règles qui nécessitent type information - désactivées sans project
      "@typescript-eslint/prefer-nullish-coalescing": "off", 
      "@typescript-eslint/prefer-optional-chain": "off",
      
      // React rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off", // Désactivé temporairement
      
      // General rules
      "no-console": "off", // Autorisé temporairement
      "prefer-const": "error",
      "no-var": "error",
      "no-undef": "off" // TypeScript gère cela
    }
  }
];