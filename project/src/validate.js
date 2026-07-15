// Lightweight input validation helpers.
// No external dependency — just simple checks that return error messages or null.

/**
 * Check that all required fields are present and non-empty in `body`.
 * Returns the first missing field name, or null if all present.
 *
 * acceptEmpty: list of field names that are allowed to be empty string
 */
export function required(body, fields, { acceptEmpty = [] } = {}) {
  for (const f of fields) {
    const val = body[f];
    if (val === undefined || val === null) return f;
    if (!acceptEmpty.includes(f) && typeof val === "string" && val.trim() === "") return f;
  }
  return null;
}

/**
 * Check that value is one of the allowed options.
 * Returns error message or null.
 */
export function oneOf(value, allowed, name = "值") {
  if (!allowed.includes(value)) {
    return `${name}必须是以下之一: ${allowed.join(", ")}`;
  }
  return null;
}

/**
 * Check that value is an array.
 * Returns error message or null.
 */
export function isArray(value, name = "值") {
  if (!Array.isArray(value)) {
    return `${name}必须是数组`;
  }
  return null;
}

/**
 * Check that value is a valid non-empty string.
 */
export function isString(value, name = "值") {
  if (typeof value !== "string" || value.trim() === "") {
    return `${name}必须是非空字符串`;
  }
  return null;
}

/**
 * Run multiple validations and return the first error, or null.
 * Usage:
 *   const err = firstError([
 *     required(body, ["title", "slug"]),
 *     oneOf(body.status, ["draft", "published"], "status"),
 *   ]);
 *   if (err) return badRequest(res, err);
 */
export function firstError(checks) {
  for (const c of checks) {
    if (c) return c;
  }
  return null;
}
