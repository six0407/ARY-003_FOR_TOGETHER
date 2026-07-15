// Structured logger — adds timestamp, level, and module context.
// Usage: logger.info("app", "server started", { port: 3000 })
// Output: [2026-07-15T10:30:00.123Z] INFO  [app] server started {"port":3000}

import { config } from "./config.js";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[config.logLevel] ?? LEVELS.info;

function format(level, module, msg, data) {
  const ts = new Date().toISOString();
  const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : "";
  return `[${ts}] ${level.padEnd(5)} [${module}] ${msg}${dataStr}`;
}

function shouldLog(level) {
  return (LEVELS[level] ?? 0) >= currentLevel;
}

export const logger = {
  debug(module, msg, data) {
    if (shouldLog("debug")) console.debug(format("DEBUG", module, msg, data));
  },
  info(module, msg, data) {
    if (shouldLog("info")) console.info(format("INFO", module, msg, data));
  },
  warn(module, msg, data) {
    if (shouldLog("warn")) console.warn(format("WARN", module, msg, data));
  },
  error(module, msg, data) {
    // Auto-include stack for Error objects
    const enriched = data instanceof Error
      ? { message: data.message, stack: data.stack, ...(data.code ? { code: data.code } : {}) }
      : data;
    console.error(format("ERROR", module, msg, enriched));
  },
};
