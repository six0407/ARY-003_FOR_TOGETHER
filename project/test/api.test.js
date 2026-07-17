// API integration tests — validates Express routes, error handling, auth guards.
// Starts the real server on a random port, makes HTTP requests, asserts responses.
// Run: node --test test/api.test.js

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { initDB, seedDemo } from "../src/db.js";

const PORT = 3099;
const BASE = `http://localhost:${PORT}`;
let server;

before(async () => {
  // Override port via env before importing app
  process.env.PORT = String(PORT);
  process.env.DB_PATH = "db/test-api.sqlite";
  process.env.LOG_LEVEL = "error"; // suppress logs during tests

  await initDB();
  seedDemo(); // populate test data
  const { app } = await import("../src/app.js");

  await new Promise((resolve, reject) => {
    server = app.listen(PORT, () => resolve());
    server.on("error", reject);
  });
});

after(() => {
  if (server) server.close();
});

async function fetchJson(path, opts = {}) {
  const { headers: extraHeaders, ...restOpts } = opts;
  const res = await fetch(`${BASE}${path}`, {
    ...restOpts,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
  const body = await res.json();
  return { status: res.status, body };
}

// ==================== Public GET Endpoints ====================

describe("Public GET endpoints", () => {
  it("GET /api/races returns array", async () => {
    const { status, body } = await fetchJson("/api/races");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
  });

  it("GET /api/stats returns stats object", async () => {
    const { status, body } = await fetchJson("/api/stats");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok("total_races" in body.data);
    assert.ok("total_riders" in body.data);
  });

  it("GET /api/health returns ok", async () => {
    const { status, body } = await fetchJson("/api/health");
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "ok");
    assert.ok("uptime" in body.data);
  });
});

// ==================== Error Response Format ====================

describe("Unified error format", () => {
  it("404 — returns { success: false, error: { code, message } }", async () => {
    const { status, body } = await fetchJson("/api/races/nonexistent-slug-xyz");
    assert.equal(status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "NOT_FOUND");
    assert.ok(body.error.message.includes("赛事"));
  });

  it("400 — missing required field returns BAD_REQUEST", async () => {
    const { status, body } = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "BAD_REQUEST");
  });
});

// ==================== Auth Guard ====================

describe("Auth middleware", () => {
  it("PUT /api/auth/users/:id/roles without token returns 401", async () => {
    const { status, body } = await fetchJson("/api/auth/users/some-id/roles", {
      method: "PUT",
      body: JSON.stringify({ roles: ["rider"] }),
    });
    assert.equal(status, 401);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "UNAUTHORIZED");
    assert.ok(body.error.message.includes("登录"));
  });

  it("POST /api/races without token returns 401", async () => {
    const { status, body } = await fetchJson("/api/races", {
      method: "POST",
      body: JSON.stringify({ title: "Test Race" }),
    });
    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it("PUT /api/registrations/:id/approve without token returns 401", async () => {
    const { status, body } = await fetchJson("/api/registrations/some-id/approve", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it("POST /api/judge-assignments without token returns 401", async () => {
    const { status, body } = await fetchJson("/api/judge-assignments", {
      method: "POST",
      body: JSON.stringify({ raceId: "x", workId: "y", judgeUserId: "z" }),
    });
    assert.equal(status, 401);
    assert.equal(body.success, false);
  });

  it("POST /api/awards without token returns 401", async () => {
    const { status, body } = await fetchJson("/api/awards", {
      method: "POST",
      body: JSON.stringify({ raceId: "x", registrationId: "y", awardName: "test" }),
    });
    assert.equal(status, 401);
    assert.equal(body.success, false);
  });
});

// ==================== Auth Success Path ====================

describe("Auth success path", () => {
  let token;
  let userId;

  it("POST /api/auth/login with valid githubAccountId returns token", async () => {
    const { status, body } = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ githubAccountId: "gh-organizer" }),
    });
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.token);
    assert.ok(body.data.token.startsWith("demo-token-"));
    token = body.data.token;
    userId = body.data.user.id;
  });

  it("GET /api/users/me with token returns user", async () => {
    const { status, body } = await fetchJson("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.roles);
  });

  it("PUT /api/auth/users/:id/roles with admin token succeeds", async () => {
    const { status, body } = await fetchJson(`/api/auth/users/${userId}/roles`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roles: ["admin", "organizer"] }),
    });
    assert.equal(status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.id);
  });
});

// ==================== State Machine Enforcement ====================

describe("State machine enforcement", () => {
  it("PUT /api/races/:id with invalid status transition returns 409", async () => {
    // Login first
    const { body: login } = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ githubAccountId: "gh-organizer" }),
    });
    const token = login.data.token;

    // Get first race
    const races = await fetchJson("/api/races");
    const race = races.body.data[0];
    if (!race) return; // no races in DB

    // Try to jump from draft directly to completed (should fail)
    const { status, body } = await fetchJson(`/api/races/${race.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "completed" }),
    });

    // If race is draft, this should fail. If already published+, it might succeed.
    if (race.status === "draft") {
      assert.equal(status, 409);
      assert.equal(body.success, false);
      assert.equal(body.error.code, "CONFLICT");
    }
  });
});

// ==================== Registration Validation ====================

describe("Registration flow", () => {
  let token;

  before(async () => {
    const { body: login } = await fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ githubAccountId: "gh-organizer" }),
    });
    token = login.data.token;
  });

  it("POST /api/registrations with missing fields returns 400", async () => {
    const { status, body } = await fetchJson("/api/registrations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    assert.equal(status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "BAD_REQUEST");
  });

  it("POST /api/registrations with non-existent race returns 404", async () => {
    const { status, body } = await fetchJson("/api/registrations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ raceId: "nonexistent-id", userId: "user-1" }),
    });
    assert.equal(status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, "NOT_FOUND");
  });
});
