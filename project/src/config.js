// Centralized configuration — all env vars read here with defaults.
// Import this module anywhere config is needed instead of reading process.env directly.

export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  dbPath: process.env.DB_PATH || "db/ary.sqlite",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  isDev: (process.env.NODE_ENV || "development") !== "production",
};
