// Express API server — the real application backbone.
// 004 upgrade: unified error handling, auth middleware, state-machine enforcement,
// structured logging, and centralized config.

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { initDB, seedDemo, all, get, run, insert, update, save, uid, now } from "./db.js";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { ok, list, created, fail, notFound, badRequest, unauthorized, forbidden, conflictErr, internalError } from "./response.js";
import { required, oneOf, firstError } from "./validate.js";
import { AppError, errorHandler } from "./middleware/error-handler.js";
import { requireAuth, requireRole } from "./middleware/auth-guard.js";
import {
  raceCanTransition, registrationCanTransition, workCanTransition, awardCanTransition,
} from "./state-machine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const app = express();
app.use(cors());
app.use(express.json());

// Auth Middleware & Helpers
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }
  const token = authHeader.replace("Bearer demo-token-", "");
  const user = get("SELECT * FROM users WHERE id = ?", [token]);
  if (!user) {
    req.user = null;
    return next();
  }
  user.roles = JSON.parse(user.roles || "[]");
  user.profile = JSON.parse(user.profile || "{}");
  req.user = user;
  next();
});

function requireAdmin(req, res, next) {
  if (!req.user) return unauthorized(res);
  if (!req.user.roles.includes("admin")) {
    return forbidden(res, "需要管理员角色");
  }
  next();
}

function isOrganizerOfRace(user, raceId) {
  if (!user) return false;
  if (user.roles.includes("admin")) return true;
  if (!user.roles.includes("organizer")) return false;
  const race = get("SELECT * FROM races WHERE id = ?", [raceId]);
  if (!race) return false;
  const orgIds = JSON.parse(race.organizer_user_ids || "[]");
  return orgIds.includes(user.id) || race.created_by_user_id === user.id;
}

// Root → home page (data-driven public gallery)
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "home.html")));

// Console → race management SPA
app.get("/console", (_req, res) => res.sendFile(path.join(publicDir, "console.html")));

// Admin → admin console
app.get("/admin", (_req, res) => res.sendFile(path.join(publicDir, "admin.html")));

// Live Hall → real-time race display
app.get("/live-hall", (_req, res) => res.sendFile(path.join(publicDir, "live-hall.html")));

// Screen Console → big screen display
app.get("/screen", (_req, res) => res.sendFile(path.join(publicDir, "screen.html")));

// New IA pages
app.get("/cooperation", (_req, res) => res.sendFile(path.join(publicDir, "cooperation.html")));
app.get("/rider", (_req, res) => res.sendFile(path.join(publicDir, "rider.html")));
app.get("/work", (_req, res) => res.sendFile(path.join(publicDir, "work.html")));
app.get("/review", (_req, res) => res.sendFile(path.join(publicDir, "review.html")));

// Static files (after explicit routes)
app.use(express.static(publicDir));

// ==================== Auth Routes ====================

// POST /api/auth/login — demo login (returns user + token placeholder)
app.post("/api/auth/login", (req, res) => {
  const { githubAccountId } = req.body;
  if (!githubAccountId) return badRequest(res, "githubAccountId 必填");

  const user = get("SELECT * FROM users WHERE github_account_id = ?", [githubAccountId]);
  if (!user) return notFound(res, "用户");

  // Parse JSON fields
  user.roles = JSON.parse(user.roles || "[]");
  user.profile = JSON.parse(user.profile || "{}");
  ok(res, { user, token: `demo-token-${user.id}` });
});

// GET /api/auth/users — list all users
app.get("/api/auth/users", (_req, res) => {
  const users = all("SELECT * FROM users ORDER BY created_at DESC");
  list(res, users.map(parseUser));
});

// GET /api/users/me — current user detail (by demo token)
app.get("/api/users/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer demo-token-", "");
  if (!token) return unauthorized(res);
  const user = get("SELECT * FROM users WHERE id = ?", [token]);
  if (!user) return notFound(res, "用户");
  ok(res, parseUser(user));
});

// PUT /api/auth/users/:id/roles — update user roles (admin only)
app.put("/api/auth/users/:id/roles", requireAuth, requireRole("admin"), (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;
  if (!Array.isArray(roles)) return badRequest(res, "roles 必须是数组");

  const user = get("SELECT * FROM users WHERE id = ?", [id]);
  if (!user) return notFound(res, "用户");

  const validRoles = ["rider", "judge", "organizer", "admin"];
  const invalid = roles.filter((r) => !validRoles.includes(r));
  if (invalid.length > 0) return badRequest(res, `无效角色: ${invalid.join(", ")}`);

  update("users", id, { roles: JSON.stringify(roles), updated_at: now() });
  save();
  ok(res, { id, roles });
});

// ==================== GitHub OAuth Routes ====================

// GET /api/auth/github — redirect to GitHub authorization page
app.get("/api/auth/github", (_req, res) => {
  if (!config.githubClientId) {
    // Friendly message when OAuth not configured
    return res.status(200).send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GitHub OAuth 配置</title><style>body{font-family:Outfit,system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b;}.card{max-width:520px;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;}h1{font-size:22px;margin-bottom:12px;}p{font-size:15px;line-height:1.6;color:#64748b;margin-bottom:24px;}code{background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:13px;}.btn{display:inline-block;padding:10px 24px;background:#24292f;color:white;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;}</style></head><body><div class="card">
<h1>🔑 GitHub OAuth 未配置</h1>
<p>要使用 GitHub 登录，需要在项目根目录创建 <code>.env</code> 文件（参考 <code>.env.example</code>），填入从 <a href="https://github.com/settings/developers" target="_blank">GitHub OAuth Apps</a> 获取的 <code>GITHUB_CLIENT_ID</code> 和 <code>GITHUB_CLIENT_SECRET</code>。</p>
<p>您也可以使用 Console 中的 <strong>演示账号</strong> 登录测试全部功能。</p>
<a href="/console" class="btn">前往 Console →</a>
</div></body></html>`);
  }
  const url = "https://github.com/login/oauth/authorize" +
    `?client_id=${config.githubClientId}` +
    `&redirect_uri=${config.githubCallbackUrl}` +
    `&scope=read:user`;
  res.redirect(url);
});

// GET /api/auth/github/callback — handle GitHub OAuth callback
app.get("/api/auth/github/callback", async (req, res, next) => {
  try {
    const { code, error: oauthError } = req.query;
    if (oauthError) return badRequest(res, `GitHub 授权失败: ${oauthError}`);
    if (!code) return badRequest(res, "缺少授权码");

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return badRequest(res, "获取 GitHub access_token 失败: " + (tokenData.error_description || tokenData.error));

    // 2. Fetch user info from GitHub
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return internalError(res, "获取 GitHub 用户信息失败");
    const gh = await userRes.json();

    // 3. Match or create ARY user
    let user = get("SELECT * FROM users WHERE github_account_id = ?", [gh.login]);
    if (!user) {
      // Auto-create new user
      const id = uid();
      const t = now();
      const profile = JSON.stringify({
        avatar_url: gh.avatar_url,
        name: gh.name || gh.login,
        bio: gh.bio || "",
        company: gh.company || "",
        blog: gh.blog || "",
        location: gh.location || "",
      });

      // Determine default roles
      let defaultRoles = [];
      // Rule 1: First user ever gets admin + organizer
      const userCount = all("SELECT COUNT(*) as count FROM users")[0]?.count || 0;
      if (userCount === 0) {
        defaultRoles = ["admin", "organizer"];
        logger.info("auth", "First user — granted admin+organizer roles", { login: gh.login });
      }
      // Rule 2: Belongs to configured GitHub org → rider
      if (config.githubOrg) {
        try {
          const orgRes = await fetch(`https://api.github.com/orgs/${config.githubOrg}/members/${gh.login}`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (orgRes.ok) {
            defaultRoles.push("rider");
            logger.info("auth", "Org member — granted rider role", { login: gh.login, org: config.githubOrg });
          }
        } catch (orgErr) {
          logger.warn("auth", "Failed to check GitHub org membership", { login: gh.login, error: orgErr.message });
        }
      }

      run(
        `INSERT INTO users (id, slug, display_name, github_account_id, roles, profile, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, gh.login, gh.name || gh.login,
         gh.login, JSON.stringify(defaultRoles), profile, t, t],
      );
      save();
      logger.info("auth", "New user auto-created via GitHub OAuth", { id, login: gh.login, roles: defaultRoles });
      user = get("SELECT * FROM users WHERE id = ?", [id]);
    } else {
      // Update profile on each login
      const existingProfile = JSON.parse(user.profile || "{}");
      existingProfile.avatar_url = gh.avatar_url || existingProfile.avatar_url;
      if (gh.name) existingProfile.name = gh.name;
      const patch = {
        profile: JSON.stringify(existingProfile),
        updated_at: now(),
      };
      if (gh.name) patch.display_name = gh.name;
      update("users", user.id, patch);
      save();

      // Upgrade: check org membership for existing users with empty roles
      if (config.githubOrg && (!user.roles || JSON.parse(user.roles).length === 0)) {
        try {
          const orgRes = await fetch(`https://api.github.com/orgs/${config.githubOrg}/members/${gh.login}`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (orgRes.ok) {
            const currentRoles = JSON.parse(user.roles || "[]");
            currentRoles.push("rider");
            update("users", user.id, { roles: JSON.stringify(currentRoles), updated_at: now() });
            save();
            logger.info("auth", "Existing user upgraded — granted rider role", { login: gh.login, org: config.githubOrg });
          }
        } catch (orgErr) {
          logger.warn("auth", "Failed to check GitHub org membership for existing user", { login: gh.login, error: orgErr.message });
        }
      }
    }

    // 4. Parse and return (same format as demo login)
    user = get("SELECT * FROM users WHERE id = ?", [user.id]);
    user.roles = JSON.parse(user.roles || "[]");
    user.profile = JSON.parse(user.profile || "{}");

    // Redirect back to console with token in hash (SPA-friendly)
    res.redirect(`/console#token=demo-token-${user.id}`);
  } catch (e) {
    next(e);
  }
});

// ==================== Race Routes ====================

// GET /api/races — public race list
app.get("/api/races", (_req, res) => {
  const races = all("SELECT * FROM races ORDER BY created_at DESC");
  list(res, races.map((r) => ({
      ...r,
      time_windows: JSON.parse(r.time_windows || "{}"),
      award_settings: JSON.parse(r.award_settings || "[]"),
      organizer_user_ids: JSON.parse(r.organizer_user_ids || "[]"),
      registration_count: all(
        "SELECT COUNT(*) as count FROM registrations WHERE race_id = ?",
        [r.id],
      )[0]?.count || 0,
    })));
});

// POST /api/races — create a new race (organizer only)
app.post("/api/races", requireAuth, (req, res) => {
  const { title, slug, challengeBrief, status, organizerUserIds } = req.body;
  if (!title) return badRequest(res, "title 必填");

  const id = uid();
  const t = now();
  const raceSlug = slug || `race-${id.slice(0, 8)}`;

  // Check slug uniqueness
  const existing = get("SELECT * FROM races WHERE slug = ?", [raceSlug]);
  if (existing) return conflictErr(res, `slug "${raceSlug}" 已存在`);

  run(
    `INSERT INTO races (id, slug, title, challenge_brief, status, time_windows, award_settings, organizer_user_ids, created_by_user_id, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, raceSlug, title, challengeBrief || "", status || "draft",
      JSON.stringify({}), JSON.stringify([]),
      JSON.stringify(organizerUserIds || []),
      organizerUserIds?.[0] || req.user?.id || "system",
      "public", t, t,
    ],
  );
  save();
  logger.info("race", `Created race "${title}"`, { id, slug: raceSlug });
  created(res, { id, slug: raceSlug, title, status: status || "draft" });
});

// PUT /api/races/:id — update race settings
app.put("/api/races/:id", requireAuth, (req, res) => {
  const race = get("SELECT * FROM races WHERE id = ?", [req.params.id]);
  if (!race) return notFound(res, "赛事");

  const { title, challengeBrief, status, rules, timeWindows } = req.body;

  // State-machine guard: validate status transition
  if (status !== undefined && status !== race.status) {
    const { ok: valid, reason } = raceCanTransition(race.status, status);
    if (!valid) return conflictErr(res, `状态变更不允许: ${reason}`);
  }

  const patch = { updated_at: now() };
  if (title !== undefined) patch.title = title;
  if (challengeBrief !== undefined) patch.challenge_brief = challengeBrief;
  if (status !== undefined) patch.status = status;
  if (rules !== undefined) patch.rules = rules;
  if (timeWindows !== undefined) patch.time_windows = JSON.stringify(timeWindows);

  update("races", race.id, patch);
  save();
  logger.info("race", `Updated race`, { id: race.id, status: status || race.status });
  ok(res, { id: race.id });
});

// GET /api/races/:slug — single race detail
app.get("/api/races/:slug", (req, res) => {
  const race = get("SELECT * FROM races WHERE slug = ?", [req.params.slug]);
  if (!race) return notFound(res, "赛事");
  race.time_windows = JSON.parse(race.time_windows || "{}");
  race.award_settings = JSON.parse(race.award_settings || "[]");
  race.organizer_user_ids = JSON.parse(race.organizer_user_ids || "[]");

  const registrations = all("SELECT * FROM registrations WHERE race_id = ?", [race.id]);
  const works = all("SELECT w.* FROM works w JOIN registrations r ON w.registration_id = r.id WHERE r.race_id = ?", [race.id]);
  const awards = all("SELECT * FROM awards WHERE race_id = ? AND status = 'published'", [race.id]);

  ok(res, {
    ...race,
    registration_count: registrations.length,
    work_count: works.length,
    awards: awards.map(parseAward),
    works: works.map(parseWork),
  });
});

// GET /api/races/:slug/works — race works
app.get("/api/races/:slug/works", (req, res) => {
  const race = get("SELECT * FROM races WHERE slug = ?", [req.params.slug]);
  if (!race) return notFound(res, "赛事");

  const works = all(
    `SELECT w.*, u.display_name as author_name, u.slug as author_slug
     FROM works w
     JOIN registrations r ON w.registration_id = r.id
     JOIN users u ON w.owner_user_id = u.id
     WHERE r.race_id = ?
     ORDER BY w.submitted_at DESC`,
    [race.id],
  );
  list(res, works.map(parseWork));
});

// GET /api/races/:slug/results — race results
app.get("/api/races/:slug/results", (req, res) => {
  const race = get("SELECT * FROM races WHERE slug = ?", [req.params.slug]);
  if (!race) return notFound(res, "赛事");

  const awards = all(
    `SELECT a.*, u.display_name as rider_name, w.title as work_title
     FROM awards a
     LEFT JOIN users u ON (SELECT user_id FROM registrations WHERE id = a.registration_id) = u.id
     LEFT JOIN works w ON a.work_id = w.id
     WHERE a.race_id = ? AND a.status = 'published'
     ORDER BY a.rank ASC`,
    [race.id],
  );
  list(res, awards.map(parseAward));
});

// ==================== Registration Routes ====================

// POST /api/registrations — submit registration (public, no auth required for MVP)
app.post("/api/registrations", (req, res) => {
  if (!req.user) return unauthorized(res);
  const { raceId, userId } = req.body;
  if (!raceId || !userId) return badRequest(res, "raceId 和 userId 必填");

  if (req.user.id !== userId && !req.user.roles.includes("admin")) {
    return forbidden(res, "您只能为自己报名");
  }

  const race = get("SELECT * FROM races WHERE id = ?", [raceId]);
  if (!race) return notFound(res, "赛事");

  // Check unique constraint
  const existing = get("SELECT * FROM registrations WHERE race_id = ? AND user_id = ?", [
    raceId,
    userId,
  ]);
  if (existing) {
    return conflictErr(res, `您已报名此赛事 (constraint: ${raceId}::${userId})`);
  }

  const t = now();
  const id = uid();
  run(
    `INSERT INTO registrations (id, race_id, user_id, status, submitted_at, review_flags, created_at, updated_at)
     VALUES (?, ?, ?, 'submitted', ?, '[]', ?, ?)`,
    [id, raceId, userId, t, t, t],
  );
  save();

  logger.info("registration", "Registration submitted", { id, raceId, userId });
  created(res, { id, status: "submitted" });
});

// PUT /api/registrations/:id/approve — approve registration
app.put("/api/registrations/:id/approve", requireAuth, (req, res) => {
  const reg = get("SELECT * FROM registrations WHERE id = ?", [req.params.id]);
  if (!reg) return notFound(res, "报名");

  // State-machine guard
  if (reg.status !== "approved") {
    const { ok: valid, reason } = registrationCanTransition(reg.status, "approved");
    if (!valid) return conflictErr(res, `无法审批: ${reason}`);
  }

  if (!isOrganizerOfRace(req.user, reg.race_id)) {
    return forbidden(res, "您不是该赛事的主办方");
  }

  const transition = registrationCanTransition(reg.status, "approved");
  if (!transition.ok) {
    return badRequest(res, `无法批准报名: ${transition.reason}`);
  }

  if (reg.status === "approved") {
    // Idempotent: ensure RaceProject exists
    const rp = get("SELECT * FROM race_projects WHERE registration_id = ?", [reg.id]);
    return ok(res, {
      registration_id: reg.id,
      race_project_id: rp?.id,
      reason: "RaceProject 已存在（幂等跳过）",
    });
  }

  const t = now();
  const approvedBy = req.body.approvedByUserId || req.user?.id || "system";

  // Update registration
  update("registrations", reg.id, {
    status: "approved",
    approved_at: t,
    approved_by_user_id: approvedBy,
    updated_at: t,
  });

  // Create RaceProject
  const rpId = uid();
  run(
    `INSERT OR IGNORE INTO race_projects (id, registration_id, race_id, user_id, aggregate_ingestion_status, connection_health, authenticity_summary, review_flags, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'not_configured', 'no_signal', '{}', '[]', ?, ?)`,
    [rpId, reg.id, reg.race_id, reg.user_id, t, t],
  );
  save();

  logger.info("registration", "Registration approved", { id: reg.id, raceProjectId: rpId });
  ok(res, {
    registration_id: reg.id,
    race_project_id: rpId,
  });
});

// PUT /api/registrations/:id/reject — reject registration
app.put("/api/registrations/:id/reject", requireAuth, (req, res) => {
  const reg = get("SELECT * FROM registrations WHERE id = ?", [req.params.id]);
  if (!reg) return notFound(res, "报名");

  // State-machine guard
  const { ok: valid, reason } = registrationCanTransition(reg.status, "rejected");
  if (!valid) return conflictErr(res, `无法拒绝: ${reason}`);

  const t = now();
  update("registrations", reg.id, {
    status: "rejected",
    rejected_at: t,
    rejected_reason: req.body.reason || "主办方拒绝了报名",
    updated_at: t,
  });
  save();
  logger.info("registration", "Registration rejected", { id: reg.id });
  ok(res, { id: reg.id, status: "rejected" });
});

// GET /api/registrations?userId=X — user's registrations
app.get("/api/registrations", (req, res) => {
  const { userId, raceId } = req.query;
  let sql = "SELECT * FROM registrations WHERE 1=1";
  const params = [];
  if (userId) {
    sql += " AND user_id = ?";
    params.push(userId);
  }
  if (raceId) {
    sql += " AND race_id = ?";
    params.push(raceId);
  }
  const regs = all(sql, params);
  list(res, regs.map((r) => ({ ...r, review_flags: JSON.parse(r.review_flags || "[]") })));
});

// ==================== Work Routes ====================

// POST /api/works — create/submit work
app.post("/api/works", requireAuth, (req, res) => {
  const { registrationId, title, summary, description, repoUrl } = req.body;
  if (!registrationId || !title) return badRequest(res, "registrationId 和 title 必填");

  const reg = get("SELECT * FROM registrations WHERE id = ?", [registrationId]);
  if (!reg) return notFound(res, "报名");

  if (req.user.id !== reg.user_id && !req.user.roles.includes("admin")) {
    return forbidden(res, "您只能为自己的报名提交作品");
  }

  // Check unique constraint (MVP: 1 work per registration)
  const existing = get("SELECT * FROM works WHERE registration_id = ?", [registrationId]);
  if (existing) return conflictErr(res, "该报名已有作品（MVP 限制一个作品）");

  const t = now();
  const workId = uid();
  run(
    `INSERT INTO works (id, registration_id, race_id, owner_user_id, title, summary, description, repo_url, status, submitted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
    [workId, registrationId, reg.race_id, reg.user_id, title, summary || "", description || "", repoUrl || null, t, t, t],
  );
  save();
  logger.info("work", "Work submitted", { id: workId, registrationId });
  created(res, { id: workId, status: "submitted" });
});

// PUT /api/works/:id — update work
app.put("/api/works/:id", (req, res) => {
  if (!req.user) return unauthorized(res);

  const work = get("SELECT * FROM works WHERE id = ?", [req.params.id]);
  if (!work) return notFound(res, "作品");

  if (req.user.id !== work.owner_user_id && !req.user.roles.includes("admin")) {
    return forbidden(res, "您只能修改自己的作品");
  }

  if (work.status === "locked") {
    return badRequest(res, "作品已被锁定，无法修改");
  }

  const { title, summary, description, repoUrl } = req.body;
  if (!title) return badRequest(res, "作品标题必填");

  const t = now();
  update("works", work.id, {
    title,
    summary: summary || "",
    description: description || "",
    repo_url: repoUrl || null,
    updated_at: t
  });
  save();

  ok(res, { id: work.id, status: work.status });
});

// GET /api/works — list works (with optional filter)
app.get("/api/works", (req, res) => {
  const { raceId } = req.query;
  let sql =
    "SELECT w.*, u.display_name as author_name FROM works w JOIN users u ON w.owner_user_id = u.id WHERE 1=1";
  const params = [];
  if (raceId) {
    sql += " AND w.race_id = ?";
    params.push(raceId);
  }
  sql += " ORDER BY w.submitted_at DESC";
  list(res, all(sql, params).map(parseWork));
});

// ==================== CA Routes ====================

// GET /api/ca-connections?raceProjectId=X
app.get("/api/ca-connections", (req, res) => {
  const { raceProjectId } = req.query;
  const conns = raceProjectId
    ? all("SELECT * FROM ca_connections WHERE race_project_id = ?", [raceProjectId])
    : all("SELECT * FROM ca_connections ORDER BY created_at DESC");
  list(res, conns);
});

// POST /api/ca-connections — register a CA connection
app.post("/api/ca-connections", requireAuth, (req, res) => {
  const { raceProjectId, connectorId, caProjectId, caType } = req.body;
  if (!raceProjectId || !connectorId) return badRequest(res, "raceProjectId 和 connectorId 必填");

  const rp = get("SELECT * FROM race_projects WHERE id = ?", [raceProjectId]);
  if (!rp) return notFound(res, "RaceProject");

  if (req.user.id !== rp.user_id && !req.user.roles.includes("admin")) {
    return forbidden(res, "您只能为自己的 RaceProject 登记 CA 连接");
  }

  const t = now();
  const id = uid();
  try {
    run(
      `INSERT INTO ca_connections (id, race_project_id, registration_id, race_id, user_id, ca_type, connector_id, ca_project_id, ingestion_status, authenticity_status, registered_at, last_handshake_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'connected', 'verified', ?, ?, ?, ?)`,
      [
        id,
        raceProjectId,
        rp.registration_id,
        rp.race_id,
        rp.user_id,
        caType || "codex",
        connectorId,
        caProjectId || null,
        t,
        t,
        t,
        t,
      ],
    );
    save();
    logger.info("ca", "CA connection registered", { id, raceProjectId });
    created(res, { id, ingestionStatus: "connected" });
  } catch (e) {
    throw new AppError("CAConnection 唯一键冲突: " + e.message, "CONFLICT", 409);
  }
});

// POST /api/ca-verify — CA message verification (legacy)
app.post("/api/ca-verify", (req, res) => {
  const { caConnectionId, message } = req.body;
  if (!caConnectionId || !message) return badRequest(res, "caConnectionId 和 message 必填");
  import("./ca-verifier.js").then(({ verifyMessage }) => {
    const result = verifyMessage({ ...message, caConnectionId });
    save();
    ok(res, result);
  }).catch((err) => {
    logger.error("ca", "CA verifier module load failed", err);
    internalError(res, "验签模块加载失败");
  });
});

// ==================== DEV-5: CA Message Ingestion ====================

// POST /api/ca/message — receive a riding signal message
app.post("/api/ca/message", (req, res) => {
  const { caConnectionId, signalType, signalKind, phase, taskStatus, progressPercent, tokensUsed, content } = req.body;
  if (!caConnectionId) return badRequest(res, "caConnectionId 必填");

  const caConn = get("SELECT * FROM ca_connections WHERE id = ?", [caConnectionId]);
  if (!caConn) return notFound(res, "CAConnection");
  if (caConn.disabled_at) return forbidden(res, "CAConnection 已禁用");

  const t = now();
  const id = uid();
  run(
    `INSERT INTO ca_messages (id, ca_connection_id, race_project_id, registration_id, race_id, signal_type, signal_kind, phase, task_status, progress_percent, tokens_used, content, received_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, caConnectionId, caConn.race_project_id, caConn.registration_id, caConn.race_id,
     signalType || "unknown", signalKind || "event", phase || "idle", taskStatus || "not_started",
     progressPercent || 0, tokensUsed || 0, content || "", t, t],
  );
  save();

  // Update projection
  updateProjection(caConn.race_project_id, caConn.race_id, caConn.registration_id, caConn.user_id, {
    signalType, progressPercent, tokensUsed, content, phase, taskStatus,
  });

  created(res, { id, status: "received" });
});

// GET /api/ca/messages?raceProjectId=X — query CA messages
app.get("/api/ca/messages", (req, res) => {
  const { raceProjectId, limit } = req.query;
  let sql = "SELECT * FROM ca_messages WHERE 1=1";
  const params = [];
  if (raceProjectId) { sql += " AND race_project_id = ?"; params.push(raceProjectId); }
  sql += " ORDER BY received_at DESC LIMIT " + (parseInt(limit) || 50);
  list(res, all(sql, params));
});

// ==================== DEV-5: Projection Engine ====================

function updateProjection(raceProjectId, raceId, registrationId, userId, event) {
  const existing = get("SELECT * FROM race_projections WHERE race_project_id = ?", [raceProjectId]);
  const t = now();

  // Calculate metrics from ca_messages
  const msgs = all("SELECT * FROM ca_messages WHERE race_project_id = ? ORDER BY received_at DESC", [raceProjectId]);
  const tokensUsed = msgs.reduce((sum, m) => sum + (m.tokens_used || 0), 0);
  const latestMsg = msgs[0];
  const progressPercent = latestMsg?.progress_percent || 0;
  const phase = latestMsg?.phase || "idle";

  // Detect risks
  const risks = [];
  if (phase === "blocked") risks.push("任务阻塞");
  if (tokensUsed > 100000) risks.push("成本过高");
  const recentMsgs = msgs.filter(m => new Date(m.received_at).getTime() > Date.now() - 30*60*1000);
  if (recentMsgs.length === 0 && msgs.length > 0) risks.push("长时间无进展");

  // Leaderboard rank: sort by progress
  const allProjections = all("SELECT * FROM race_projections WHERE race_id = ? ORDER BY json_extract(metrics, '$.progressPercent') DESC", [raceId]);
  const rank = allProjections.findIndex(p => p.race_project_id === raceProjectId) + 1;

  const metrics = JSON.stringify({ tokensUsed, progressPercent, sessionsCount: msgs.length, phase });
  const latestEventType = event?.signalType || latestMsg?.signal_type || "";
  const latestEventSummary = event?.content ? event.content.slice(0, 200) : (latestMsg?.content || "").slice(0, 200);

  if (existing) {
    run(
      `UPDATE race_projections SET metrics = ?, risks = ?, latest_event_type = ?, latest_event_summary = ?, latest_event_at = ?, leaderboard_rank = ?, last_updated_at = ?, updated_at = ? WHERE race_project_id = ?`,
      [metrics, JSON.stringify(risks), latestEventType, latestEventSummary, t, rank, t, t, raceProjectId],
    );
  } else {
    run(
      `INSERT INTO race_projections (id, race_project_id, race_id, registration_id, user_id, metrics, risks, latest_event_type, latest_event_summary, latest_event_at, leaderboard_rank, last_updated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid(), raceProjectId, raceId, registrationId, userId, metrics, JSON.stringify(risks), latestEventType, latestEventSummary, t, rank, t, t, t],
    );
  }
  save();
}

// GET /api/live-hall/:raceId — get live hall data for a race (supports both id and slug)
app.get("/api/live-hall/:raceId", (req, res) => {
  let race = get("SELECT * FROM races WHERE id = ?", [req.params.raceId]);
  if (!race) race = get("SELECT * FROM races WHERE slug = ?", [req.params.raceId]);
  if (!race) return notFound(res, "赛事");

  const projections = all("SELECT * FROM race_projections WHERE race_id = ? ORDER BY leaderboard_rank ASC", [race.id]);
  const recentEvents = all(
    "SELECT cm.*, u.display_name as rider_name FROM ca_messages cm JOIN users u ON (SELECT user_id FROM race_projects WHERE id = cm.race_project_id) = u.id WHERE cm.race_id = ? ORDER BY cm.received_at DESC LIMIT 20",
    [race.id],
  );

  // Get rider names for projections
  const rpIds = projections.map(p => p.race_project_id);
  const riderNames = rpIds.length > 0
    ? all(`SELECT rp.id as rp_id, u.display_name, u.slug FROM race_projects rp JOIN users u ON rp.user_id = u.id WHERE rp.id IN (${rpIds.map(() => '?').join(',')})`, rpIds)
    : [];

  // Get CA connection statuses
  const raceProjectIds = projections.map(p => p.race_project_id);
  const connStatuses = raceProjectIds.length > 0
    ? all(`SELECT race_project_id, ingestion_status, authenticity_status FROM ca_connections WHERE race_project_id IN (${raceProjectIds.map(() => '?').join(',')})`, raceProjectIds)
    : [];

  ok(res, {
    race: { id: race.id, title: race.title, slug: race.slug, status: race.status },
    projections: projections.map(p => {
      const rider = riderNames.find(r => r.rp_id === p.race_project_id);
      return {
        ...p,
        rider_name: rider?.display_name || "未知骑手",
        rider_slug: rider?.slug || "",
        metrics: JSON.parse(p.metrics || "{}"),
        risks: JSON.parse(p.risks || "[]"),
        connection: connStatuses.find(c => c.race_project_id === p.race_project_id) || {},
      };
    }),
    recentEvents: recentEvents.map(e => ({
      ...e,
      rider_name: e.rider_name || "未知",
      time: new Date(e.received_at).toLocaleTimeString('zh-CN'),
    })),
  });
});

// GET /api/projections/:raceProjectId — individual projection
app.get("/api/projections/:raceProjectId", (req, res) => {
  const p = get("SELECT * FROM race_projections WHERE race_project_id = ?", [req.params.raceProjectId]);
  if (!p) return notFound(res, "Projection");
  ok(res, { ...p, metrics: JSON.parse(p.metrics || "{}"), risks: JSON.parse(p.risks || "[]") });
});

// ==================== DEV-5: Session Management ====================

// POST /api/sessions — create a new session for a CA connection
app.post("/api/sessions", (req, res) => {
  const { caConnectionId, caSessionId } = req.body;
  if (!caConnectionId || !caSessionId) return badRequest(res, "caConnectionId 和 caSessionId 必填");

  const caConn = get("SELECT * FROM ca_connections WHERE id = ?", [caConnectionId]);
  if (!caConn) return notFound(res, "CAConnection");

  if (!req.user) return unauthorized(res);
  if (req.user.id !== caConn.user_id && !req.user.roles.includes("admin")) {
    return forbidden(res, "您只能为自己的 CA 连接管理 Session");
  }

  const t = now();
  const id = uid();
  try {
    run(
      `INSERT INTO sessions (id, ca_connection_id, race_project_id, registration_id, ca_session_id, status, started_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [id, caConnectionId, caConn.race_project_id, caConn.registration_id, caSessionId, t, t, t],
    );
    // Update CA connection status to active
    update("ca_connections", caConnectionId, { ingestion_status: "active", last_handshake_at: t, updated_at: t });
    save();
    created(res, { id, status: "active" });
  } catch (e) {
    throw new AppError("Session 创建失败: " + e.message, "CONFLICT", 409);
  }
});

// GET /api/sessions?raceProjectId=X — list sessions
app.get("/api/sessions", (req, res) => {
  const { raceProjectId, caConnectionId } = req.query;
  let sql = "SELECT * FROM sessions WHERE 1=1";
  const params = [];
  if (raceProjectId) { sql += " AND race_project_id = ?"; params.push(raceProjectId); }
  if (caConnectionId) { sql += " AND ca_connection_id = ?"; params.push(caConnectionId); }
  sql += " ORDER BY started_at DESC";
  list(res, all(sql, params).map(s => ({ ...s, metrics: JSON.parse(s.metrics || "{}") })));
});

// ==================== RaceProject Routes ====================

// GET /api/race-projects?registrationId=X
app.get("/api/race-projects", (req, res) => {
  const { registrationId, userId } = req.query;
  let sql = "SELECT * FROM race_projects WHERE 1=1";
  const params = [];
  if (registrationId) { sql += " AND registration_id = ?"; params.push(registrationId); }
  if (userId) { sql += " AND user_id = ?"; params.push(userId); }
  list(res, all(sql, params).map((rp) => ({
    ...rp,
    authenticity_summary: JSON.parse(rp.authenticity_summary || "{}"),
    review_flags: JSON.parse(rp.review_flags || "[]"),
  })));
});

// ==================== Judge Assignment Routes ====================

// POST /api/judge-assignments — assign a judge to a work
app.post("/api/judge-assignments", requireAuth, (req, res) => {
  const { raceId, workId, judgeUserId, assignedByUserId } = req.body;
  if (!raceId || !workId || !judgeUserId) return badRequest(res, "raceId, workId, judgeUserId 必填");

  if (!isOrganizerOfRace(req.user, raceId)) {
    return forbidden(res, "您不是该赛事的主办方");
  }

  const t = now();
  const id = uid();
  try {
    run(
      `INSERT INTO judge_assignments (id, race_id, work_id, judge_user_id, assigned_by_user_id, status, assigned_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?, ?)`,
      [id, raceId, workId, judgeUserId, assignedByUserId || req.user?.id || "system", t, t, t],
    );
    save();
    logger.info("judge", "Judge assigned", { id, workId, judgeUserId });
    created(res, { id, status: "assigned" });
  } catch (e) {
    throw new AppError("分配冲突: " + e.message, "CONFLICT", 409);
  }
});

// GET /api/judge-assignments?judgeUserId=X&raceId=X
app.get("/api/judge-assignments", (req, res) => {
  const { judgeUserId, raceId } = req.query;
  let sql = "SELECT ja.*, w.title as work_title, w.summary as work_summary FROM judge_assignments ja JOIN works w ON ja.work_id = w.id WHERE 1=1";
  const params = [];
  if (judgeUserId) { sql += " AND ja.judge_user_id = ?"; params.push(judgeUserId); }
  if (raceId) { sql += " AND ja.race_id = ?"; params.push(raceId); }
  sql += " ORDER BY ja.created_at DESC";
  list(res, all(sql, params));
});

// DELETE /api/judge-assignments/:id — remove a judge assignment
app.delete("/api/judge-assignments/:id", requireAuth, (req, res) => {
  run("DELETE FROM judge_assignments WHERE id = ?", [req.params.id]);
  save();
  ok(res, {});
});

// ==================== Judging Record Routes ====================

// POST /api/judging-records — submit a judging record
app.post("/api/judging-records", requireAuth, (req, res) => {
  const { judgeAssignmentId, workId, judgeUserId, scoreResult, scoreRiding, comments } = req.body;
  if (!judgeAssignmentId || !workId || !judgeUserId) return badRequest(res, "必填字段缺失 (judgeAssignmentId, workId, judgeUserId)");

  if (req.user.id !== judgeUserId && !req.user.roles.includes("admin")) {
    return forbidden(res, "您只能以本人的身份提交评审");
  }

  const assignment = get("SELECT * FROM judge_assignments WHERE id = ?", [judgeAssignmentId]);
  if (!assignment) return notFound(res, "评委分配");
  if (assignment.judge_user_id !== judgeUserId) {
    return badRequest(res, "分配对应的评委不符");
  }

  const t = now();
  const id = uid();
  try {
    run(
      `INSERT INTO judging_records (id, judge_assignment_id, work_id, judge_user_id, score_result, score_riding, comments, status, submitted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
      [id, judgeAssignmentId, workId, judgeUserId, JSON.stringify(scoreResult || {}), JSON.stringify(scoreRiding || {}), comments || "", t, t, t],
    );
    // Mark assignment as completed
    run("UPDATE judge_assignments SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?", [t, t, judgeAssignmentId]);
    save();
    logger.info("judge", "Judging record submitted", { id, workId, judgeUserId });
    created(res, { id, status: "submitted" });
  } catch (e) {
    throw new AppError("评审记录冲突: " + e.message, "CONFLICT", 409);
  }
});

// GET /api/judging-records?judgeUserId=X&workId=X
app.get("/api/judging-records", (req, res) => {
  const { judgeUserId, workId } = req.query;
  let sql = "SELECT jr.*, w.title as work_title FROM judging_records jr JOIN works w ON jr.work_id = w.id WHERE 1=1";
  const params = [];
  if (judgeUserId) { sql += " AND jr.judge_user_id = ?"; params.push(judgeUserId); }
  if (workId) { sql += " AND jr.work_id = ?"; params.push(workId); }
  sql += " ORDER BY jr.created_at DESC";
  list(res, all(sql, params).map(r => ({
    ...r,
    score_result: JSON.parse(r.score_result || "{}"),
    score_riding: JSON.parse(r.score_riding || "{}"),
  })));
});

// ==================== Award Routes ====================

// GET /api/awards — list all awards
app.get("/api/awards", (_req, res) => {
  const awards = all("SELECT * FROM awards ORDER BY created_at DESC");
  list(res, awards);
});

// POST /api/awards — create an award for a registration
app.post("/api/awards", requireAuth, (req, res) => {
  const { raceId, registrationId, awardName, rank, workId, decisionReason } = req.body;
  if (!raceId || !registrationId || !awardName) return badRequest(res, "raceId, registrationId, awardName 必填");

  if (!isOrganizerOfRace(req.user, raceId)) {
    return forbidden(res, "您不是该赛事的主办方");
  }

  const t = now();
  const id = uid();
  try {
    run(
      `INSERT INTO awards (id, race_id, registration_id, work_id, award_name, rank, decision_reason, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [id, raceId, registrationId, workId || null, awardName, rank || 1, decisionReason || "", t, t],
    );
    save();
    logger.info("award", "Award created", { id, raceId, awardName });
    created(res, { id, status: "draft" });
  } catch (e) {
    throw new AppError("奖项创建冲突: " + e.message, "CONFLICT", 409);
  }
});

// PUT /api/awards/:id/publish — publish an award
app.put("/api/awards/:id/publish", requireAuth, (req, res) => {
  const award = get("SELECT * FROM awards WHERE id = ?", [req.params.id]);
  if (!award) return notFound(res, "奖项");

  // State-machine guard
  const { ok: valid, reason } = awardCanTransition(award.status, "published");
  if (!valid) return conflictErr(res, `无法发布: ${reason}`);

  if (!isOrganizerOfRace(req.user, award.race_id)) {
    return forbidden(res, "您不是该赛事的主办方");
  }

  const transition = awardCanTransition(award.status, "published");
  if (!transition.ok) {
    return badRequest(res, `无法发布奖项: ${transition.reason}`);
  }

  const t = now();
  update("awards", award.id, { status: "published", published_at: t, updated_at: t });
  save();
  logger.info("award", "Award published", { id: award.id, awardName: award.award_name });
  ok(res, { id: award.id, status: "published" });
});

// PUT /api/awards/:id — update award
app.put("/api/awards/:id", requireAuth, (req, res) => {
  const award = get("SELECT * FROM awards WHERE id = ?", [req.params.id]);
  if (!award) return notFound(res, "奖项");

  if (!isOrganizerOfRace(req.user, award.race_id)) {
    return forbidden(res, "您不是该赛事的主办方");
  }

  const { awardName, rank, decisionReason } = req.body;
  const patch = {};
  if (awardName !== undefined) patch.award_name = awardName;
  if (rank !== undefined) patch.rank = rank;
  if (decisionReason !== undefined) patch.decision_reason = decisionReason;
  patch.updated_at = now();
  update("awards", award.id, patch);
  save();
  ok(res, { id: award.id });
});

// ==================== DEV-7: Report Generator ====================

// GET /api/health — health check endpoint
app.get("/api/health", async (_req, res, next) => {
  try {
    const raceCount = all("SELECT COUNT(*) as count FROM races")[0]?.count || 0;
    const userCount = all("SELECT COUNT(*) as count FROM users")[0]?.count || 0;
    const dbStats = fs.existsSync(config.dbPath) ? fs.statSync(config.dbPath) : null;
    ok(res, {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: { sizeBytes: dbStats?.size || 0, races: raceCount, users: userCount },
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/reports/generate — generate a report for a race
app.post("/api/reports/generate", requireAuth, (req, res) => {
  const { raceId, reportType, subjectRegistrationId } = req.body;
  if (!raceId || !reportType) return badRequest(res, "raceId 和 reportType 必填");

  if (reportType === "race_report" || reportType === "review_summary") {
    if (!isOrganizerOfRace(req.user, raceId)) {
      return forbidden(res, "不是该赛事的主办方");
    }
  } else if (reportType === "rider_report") {
    if (!subjectRegistrationId) return badRequest(res, "rider_report 需要 subjectRegistrationId");
    const reg = get("SELECT * FROM registrations WHERE id = ?", [subjectRegistrationId]);
    if (!reg) return notFound(res, "报名");
    if (req.user.id !== reg.user_id && !isOrganizerOfRace(req.user, raceId)) {
      return forbidden(res, "只能生成自己的或主办赛事的骑手报告");
    }
  }

  const race = get("SELECT * FROM races WHERE id = ?", [raceId]);
  if (!race) return notFound(res, "赛事");

  const t = now();
  const reportId = uid();
  let title = "";
  let content = "";

  if (reportType === "race_report") {
    const registrations = all("SELECT * FROM registrations WHERE race_id = ?", [raceId]);
    const awards = all("SELECT a.*, u.display_name as rider_name FROM awards a LEFT JOIN users u ON (SELECT user_id FROM registrations WHERE id = a.registration_id) = u.id WHERE a.race_id = ? AND a.status = 'published' ORDER BY a.rank", [raceId]);
    const works = all("SELECT COUNT(*) as count FROM works WHERE race_id = ? AND status = 'submitted'", [raceId]);

    title = `${race.title} — 赛事报告`;
    content = JSON.stringify({
      raceTitle: race.title,
      status: race.status,
      totalRegistrations: registrations.length,
      totalWorks: works[0]?.count || 0,
      awards: awards.map(a => ({ rank: a.rank, awardName: a.award_name, riderName: a.rider_name })),
      generatedAt: t,
    }, null, 2);

  } else if (reportType === "rider_report") {
    if (!subjectRegistrationId) return badRequest(res, "rider_report 需要 subjectRegistrationId");
    const reg = get("SELECT * FROM registrations WHERE id = ?", [subjectRegistrationId]);
    if (!reg) return notFound(res, "报名");
    const user = get("SELECT * FROM users WHERE id = ?", [reg.user_id]);
    const rp = get("SELECT * FROM race_projects WHERE registration_id = ?", [subjectRegistrationId]);
    const work = get("SELECT * FROM works WHERE registration_id = ?", [subjectRegistrationId]);
    const projections = all("SELECT * FROM race_projections WHERE race_project_id = ?", [rp?.id]);
    const awards = all("SELECT * FROM awards WHERE registration_id = ? AND status = 'published'", [subjectRegistrationId]);

    title = `${user?.display_name||'选手'} — 骑行报告`;
    content = JSON.stringify({
      riderName: user?.display_name,
      raceTitle: race.title,
      registrationStatus: reg.status,
      raceProjectStatus: rp?.aggregate_ingestion_status,
      workTitle: work?.title,
      workStatus: work?.status,
      awards: awards.map(a => ({ awardName: a.award_name, rank: a.rank })),
      metrics: projections[0] ? JSON.parse(projections[0].metrics || "{}") : {},
      generatedAt: t,
    }, null, 2);

  } else if (reportType === "review_summary") {
    const awards = all("SELECT a.*, u.display_name as rider_name FROM awards a LEFT JOIN users u ON (SELECT user_id FROM registrations WHERE id = a.registration_id) = u.id WHERE a.race_id = ? AND a.status = 'published' ORDER BY a.rank", [raceId]);
    title = `${race.title} — 评审总结`;
    content = JSON.stringify({
      raceTitle: race.title,
      awards: awards.map(a => ({ rank: a.rank, awardName: a.award_name, riderName: a.rider_name, decisionReason: a.decision_reason })),
      generatedAt: t,
    }, null, 2);
  }

  try {
    run(
      `INSERT INTO reports (id, race_id, report_type, subject_registration_id, title, content, status, generated_from, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'generated', '{}', ?, ?)`,
      [reportId, raceId, reportType, subjectRegistrationId || null, title, content, t, t],
    );
    save();
    logger.info("report", "Report generated", { id: reportId, reportType, raceId });
    created(res, { id: reportId, title, reportType, status: "generated" });
  } catch (e) {
    throw new AppError("报告生成失败: " + e.message, "CONFLICT", 409);
  }
});

// GET /api/reports?raceId=X — list reports
app.get("/api/reports", (req, res) => {
  const { raceId, reportType } = req.query;
  let sql = "SELECT * FROM reports WHERE 1=1";
  const params = [];
  if (raceId) { sql += " AND race_id = ?"; params.push(raceId); }
  if (reportType) { sql += " AND report_type = ?"; params.push(reportType); }
  sql += " ORDER BY created_at DESC";
  list(res, all(sql, params).map(r => ({ ...r, generated_from: JSON.parse(r.generated_from || "{}") })));
});

// PUT /api/reports/:id/publish — publish a report
app.put("/api/reports/:id/publish", requireAuth, (req, res) => {
  const report = get("SELECT * FROM reports WHERE id = ?", [req.params.id]);
  if (!report) return notFound(res, "报告");

  if (!isOrganizerOfRace(req.user, report.race_id)) {
    return forbidden(res, "您不是该赛事的主办方");
  }

  const t = now();
  update("reports", report.id, { status: "published", published_at: t, updated_at: t, visibility: "public" });
  save();
  logger.info("report", "Report published", { id: report.id });
  ok(res, { id: report.id, status: "published" });
});

// ==================== Dashboard / Stats ====================

// GET /api/stats — aggregate stats for homepage
app.get("/api/stats", (_req, res) => {
  const raceCount = all("SELECT COUNT(*) as count FROM races")[0]?.count || 0;
  const liveRace = get("SELECT * FROM races WHERE status IN ('running','submitting','judging') ORDER BY created_at DESC LIMIT 1");
  const completedRaceCount = all("SELECT COUNT(*) as count FROM races WHERE status = 'completed'")[0]?.count || 0;
  const riderCount = all("SELECT COUNT(DISTINCT user_id) as count FROM registrations")[0]?.count || 0;
  const workCount = all("SELECT COUNT(*) as count FROM works WHERE status = 'submitted'")[0]?.count || 0;

  ok(res, {
    total_races: raceCount,
    live_race: liveRace ? { slug: liveRace.slug, title: liveRace.title, status: liveRace.status } : null,
    completed_races: completedRaceCount,
    total_riders: riderCount,
    total_works: workCount,
  });
});

// ==================== Global Error Handler ====================
// Must be registered AFTER all routes.
app.use(errorHandler);

// ==================== Helpers ====================

function parseUser(u) {
  return { ...u, roles: JSON.parse(u.roles || "[]"), profile: JSON.parse(u.profile || "{}") };
}

function parseWork(w) {
  return w;
}

function parseAward(a) {
  return a;
}

// ==================== Init & Start ====================

async function start() {
  await initDB();

  // Auto-seed demo data if empty
  const raceCount = all("SELECT COUNT(*) as count FROM races")[0]?.count || 0;
  if (raceCount === 0) {
    seedDemo();
  }

  app.listen(config.port, () => {
    logger.info("app", "ARY MVP — API Server Ready", {
      port: config.port,
      env: config.nodeEnv,
      logLevel: config.logLevel,
    });
    console.log(`\n  ARY MVP — API Server Ready`);
    console.log(`  → http://localhost:${config.port}`);
    console.log(`  → API:   http://localhost:${config.port}/api/races`);
    console.log(`  → Stats: http://localhost:${config.port}/api/stats\n`);
  });
}

export { app, start };
