// next.config.mjs

let userConfig;
try {
  // Importer le module et utiliser la valeur par défaut si elle existe
  const importedUserConfig = await import('./user-next.config.mjs');
  userConfig = importedUserConfig.default || importedUserConfig;
} catch (e) {
  // Ignore l'erreur si le fichier n'existe pas
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) return;
  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

export default nextConfig;
