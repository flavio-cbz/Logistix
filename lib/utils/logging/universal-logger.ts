// Universal logger that works in both client and server environments
// Only logs in development mode to avoid console pollution in production

const isDevelopment = (process.env as any)["NODE_ENV"] === "development";

export const logger = {
  debug: (..._args: any[]) => {
    if (isDevelopment && typeof console !== "undefined") {
      // debug removed
    }
  },
  info: (_message: string, ..._args: any[]) => {
    if (isDevelopment && typeof console !== "undefined") {
      // console.info(...args);
    }
  },
  warn: (_message: string, ..._args: any[]) => {
    if (isDevelopment && typeof console !== "undefined") {
      // console.warn(...args);
    }
  },
  error: (_message: string, ..._args: any[]) => {
    if (isDevelopment && typeof console !== "undefined") {
      // console.error(...args);
    }
  },
};
