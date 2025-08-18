// Universal logger that works in both client and server environments
// Only logs in development mode to avoid console pollution in production

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment && typeof console !== 'undefined') {
      // debug removed
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment && typeof console !== 'undefined') {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment && typeof console !== 'undefined') {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment && typeof console !== 'undefined') {
      console.error(...args);
    }
  },
}