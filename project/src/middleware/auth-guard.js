// Auth guard middleware — wraps the auth.js 5-scope model into Express middleware.
// Compatible with the current demo-token scheme.
// Usage:
//   app.put("/api/some-write-route", requireAuth, handler);
//   app.put("/api/admin-only", requireAuth, requireRole("admin"), handler);

import { get } from "../db.js";
import { unauthorized, forbidden } from "../response.js";

/**
 * Extract current user from Bearer token (demo scheme).
 * Sets req.user on success, or returns 401.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return unauthorized(res, "请先登录");

  const token = header.replace("Bearer ", "");
  if (!token || !token.startsWith("demo-token-")) {
    return unauthorized(res, "无效的认证令牌");
  }

  const userId = token.replace("demo-token-", "");
  const user = get("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) return unauthorized(res, "用户不存在");

  // Parse roles from JSON string if necessary
  if (typeof user.roles === "string") {
    try { user.roles = JSON.parse(user.roles); } catch { user.roles = []; }
  }

  req.user = user;
  next();
}

/**
 * Require that req.user has at least one of the specified roles.
 * Must be used AFTER requireAuth.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    const hasRole = roles.some((r) => req.user.roles.includes(r));
    if (!hasRole) return forbidden(res, `需要以下角色之一: ${roles.join(", ")}`);
    next();
  };
}

/**
 * Check that the resource belongs to the current user.
 * `resourceGetter` is a function that returns the resource given the route params.
 * Must be used AFTER requireAuth.
 */
export function requireOwnership(getResource) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    const resource = getResource(req);
    if (!resource) {
      // Resource not found — let the route handler deal with 404
      return next();
    }
    // Check all possible ownership fields
    const uid = req.user.id;
    if (resource.userId === uid) return next();
    if (resource.ownerUserId === uid) return next();
    if (resource.user_id === uid) return next();
    return forbidden(res, "只能操作自己的资源");
  };
}
