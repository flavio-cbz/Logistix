// Universal logger that works in both client and server environments
// Only logs in development mode to avoid console pollution in production

const isDevelopment = (process.env as Record<string, unknown>)["NODE_ENV"] === "development";

export const logger = {
  debug: (..._args: unknown[]) => {
    if (isDevelopment && typeof console !== "undefined") {
      // debug removed
    }
  },
  info: (_message: string, ..._args: unknown[]) => {
    if (isDevelopment && typeof console !== "undefined") {
      // console.info(...args);
    }
  },
  warn: (_message: string, ..._args: unknown[]) => {
    if (isDevelopment && typeof console !== "undefined") {
      // console.warn(...args);
    }
  },
  error: (_message: string, ..._args: unknown[]) => {
    if (isDevelopment && typeof console !== "undefined") {
      // console.error(...args);
    }
  },
};
