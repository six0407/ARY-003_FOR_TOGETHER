// Global Express error handler middleware.
// Catches any unhandled errors from route handlers, logs them, and returns
// a consistent JSON error response.
//
// To signal an expected error from a route, throw an AppError:
//   throw new AppError("赛事不存在", "NOT_FOUND", 404);
//
// Any other Error is treated as a 500 internal error.

import { logger } from "../logger.js";

export class AppError extends Error {
  constructor(message, code = "ERROR", statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Express 4-arg error handler. Must be registered LAST after all routes.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const code = status === 500 ? "INTERNAL_ERROR" : err.code || "ERROR";
  const message = status === 500 ? "服务器内部错误" : err.message;

  logger.error("express", err.message, {
    code,
    status,
    path: _req.path,
    method: _req.method,
    stack: err.stack?.split("\n").slice(0, 3).join(" | "),
  });

  res.status(status).json({
    success: false,
    error: { code, message },
  });
}
