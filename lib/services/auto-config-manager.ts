// Simple auto-config-manager replacement

export const autoConfigManager = {
  getCurrentConfig: () => ({
    performance: {
      profile: 'standard'
    }
  })
};

export const getApiTimeout = () => 30000; // 30 seconds
export const getAnalysisTimeout = () => 60000; // 60 seconds  
export const getPollingInterval = () => 5000; // 5 seconds
export const getMaxRetries = () => 3;
export const getCookieMaxAge = () => 7 * 24 * 60 * 60 * 1000; // 7 days