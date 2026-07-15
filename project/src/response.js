// Unified API response helpers.
// Success:  { success: true,  data: {...} }
// Error:    { success: false, error: { code: "...", message: "..." } }

/**
 * Send a success response with data.
 */
export function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

/**
 * Send a list response (convenience, same as ok but semantically clear).
 */
export function list(res, data) {
  return res.status(200).json({ success: true, data });
}

/**
 * Send a created response (201).
 */
export function created(res, data) {
  return res.status(201).json({ success: true, data });
}

/**
 * Send an error response.
 */
export function fail(res, message, code = "ERROR", status = 400) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

// --- Convenience shortcuts ---

export function notFound(res, what = "资源") {
  return fail(res, `${what}不存在`, "NOT_FOUND", 404);
}

export function badRequest(res, message) {
  return fail(res, message, "BAD_REQUEST", 400);
}

export function unauthorized(res, message = "请先登录") {
  return fail(res, message, "UNAUTHORIZED", 401);
}

export function forbidden(res, message = "没有权限") {
  return fail(res, message, "FORBIDDEN", 403);
}

export function conflictErr(res, message) {
  return fail(res, message, "CONFLICT", 409);
}

export function internalError(res, message = "服务器内部错误") {
  return fail(res, message, "INTERNAL_ERROR", 500);
}
