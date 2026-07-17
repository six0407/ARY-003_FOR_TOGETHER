// Centralized configuration — all env vars read here with defaults.
// Import this module anywhere config is needed instead of reading process.env directly.

export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  dbPath: process.env.DB_PATH || "db/ary.sqlite",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  isDev: (process.env.NODE_ENV || "development") !== "production",
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/api/auth/github/callback",
  // Auto-assign 'rider' role to users belonging to this GitHub org (empty = disabled)
  githubOrg: process.env.GITHUB_ORG || "",
};
