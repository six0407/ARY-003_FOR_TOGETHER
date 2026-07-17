// Auth middleware implementing the 5 scopes: public, own, assigned, managed_race, system.
// Mirrors dev-1-auth-policy.md §2.2 and §3.

import { stores } from "./stores.js";

// --- published_states per resource ---
const PUBLISHED_STATES = {
  Race: ["published", "registration", "running", "submitting", "judging", "completed"],
};

function isPublic(resource, resourceType) {
  const states = PUBLISHED_STATES[resourceType];
  if (states) {
    return resource.visibility === "public" && states.includes(resource.status);
  }
  return resource.visibility === "public";
}

function isOwn(resource, user) {
  if (!user) return false;
  const uid = user.id || user.userId;
  // Try all possible ownership fields
  if (resource.userId === uid) return true;
  if (resource.ownerUserId === uid) return true;
  // For rider reports, resolve via registration
  if (resource.subjectRegistrationId) {
    const reg = stores.registrations.get(resource.subjectRegistrationId);
    if (reg && reg.userId === uid) return true;
  }
  return false;
}

function isAssigned(workId, user) {
  if (!user || !user.roles.includes("judge")) return false;
  const uid = user.id || user.userId;
  const assignment = stores.judgeAssignments.first(
    (a) => a.workId === workId && a.judgeUserId === uid && a.status !== "completed",
  );
  return !!assignment;
}

function isManagedRace(resource, user) {
  if (!user) return false;
  // Admin always has full access to any race
  if (user.roles.includes("admin")) return true;
  if (!user.roles.includes("organizer")) return false;
  const uid = user.id || user.userId;

  // Resolve raceId from resource
  let raceId = resource.raceId;
  if (!raceId && resource.registrationId) {
    const reg = stores.registrations.get(resource.registrationId);
    if (reg) raceId = reg.raceId;
  }
  if (!raceId && resource.id) {
    // Try direct race lookup
    const race = stores.races.get(resource.id);
    if (race) raceId = resource.id;
  }
  if (!raceId) return false;

  const race = stores.races.get(raceId);
  if (!race) return false;

  return (
    race.organizerUserIds.includes(uid) || race.createdByUserId === uid
  );
}

function isSystem(user) {
  return user && user.roles.includes("admin");
}

// --- Unified gate functions ---

function publicGate(resource, resourceType) {
  return isPublic(resource, resourceType);
}

function ownGate(resource, user) {
  if (!user) return false;
  return isOwn(resource, user);
}

function assignedGate(workId, user) {
  return isAssigned(workId, user);
}

function managedRaceGate(resource, user) {
  return isManagedRace(resource, user);
}

function adminGate(user) {
  return isSystem(user);
}

// --- Resource-specific action checks ---

// Returns { allowed: true } or { allowed: false, reason: "..." }
function auth(action, resource, user, extra = {}) {
  const { resourceType, workId } = extra;

  // 1. Resource existence (caller should check before auth)
  // 2. Public shortcut
  if (action.startsWith("view_public") || action.startsWith("list_public") || action === "get_public") {
    if (isPublic(resource, resourceType)) return { allowed: true };
  }

  // 3. User identity
  if (!user && !action.startsWith("view_public") && !action.startsWith("list_public")) {
    return { allowed: false, reason: "AUTH_REQUIRED" };
  }

  // 4-6. Role + scope + additional checks
  // These are action-specific; the caller (test) uses lower-level gates directly.
  return { allowed: false, reason: "SCOPE_NOT_DETERMINED_USE_SPECIFIC_GATE" };
}

// --- Authenticity filters ---
function authenticityFilter(result, user) {
  // Only return verified/verification_failed/quarantined + reason
  // Never return raw message content
  const allowed = ["verified", "verification_failed", "quarantined"];
  if (!allowed.includes(result.authenticityStatus)) {
    return { status: "filtered", allowed: false };
  }
  return {
    status: result.authenticityStatus,
    reason: result.authenticityReason ?? null,
    lastVerifiedAt: result.lastVerifiedAt ?? null,
  };
}

function quarantineSummaryFilter(record, user) {
  if (!record) return null;
  return {
    failureReason: record.failureReason,
    quarantinedAt: record.quarantinedAt,
    quarantineStatus: record.quarantineStatus,
    caConnectionId: record.caConnectionId,
  };
}

export {
  // Low-level gates
  publicGate,
  ownGate,
  assignedGate,
  managedRaceGate,
  adminGate,
  isOwn,
  isAssigned,
  isManagedRace,
  isSystem,
  // Authenticity
  authenticityFilter,
  quarantineSummaryFilter,
  // Unified
  auth,
};
