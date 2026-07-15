// Express API server — the real application backbone.
// Replaces the static-only server.js. Connects sql.js DB, mounts REST routes,
// serves the public/ directory as static frontend.

import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDB, seedDemo, all, get, run, insert, update, save, uid, now } from "./db.js";
import { raceCanTransition, registrationCanTransition, workCanTransition, awardCanTransition } from "./state-machine.js";

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

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  if (!req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "权限不足，需要管理员角色" });
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
  const user = get("SELECT * FROM users WHERE github_account_id = ?", [githubAccountId]);
  if (!user) {
    return res.status(404).json({ error: "用户不存在" });
  }
  // Parse JSON fields
  user.roles = JSON.parse(user.roles || "[]");
  user.profile = JSON.parse(user.profile || "{}");
  res.json({ user, token: `demo-token-${user.id}` });
});

// GET /api/auth/users — list all users
app.get("/api/auth/users", requireAdmin, (_req, res) => {
  const users = all("SELECT * FROM users ORDER BY created_at DESC");
  res.json(users.map(parseUser));
});

// GET /api/users/me — current user detail (by demo token)
app.get("/api/users/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer demo-token-", "");
  if (!token) return res.status(401).json({ error: "未登录" });
  const user = get("SELECT * FROM users WHERE id = ?", [token]);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  res.json(parseUser(user));
});

// PUT /api/auth/users/:id/roles — update user roles (admin only)
app.put("/api/auth/users/:id/roles", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;
  if (!Array.isArray(roles)) return res.status(400).json({ error: "roles 必须是数组" });

  const user = get("SELECT * FROM users WHERE id = ?", [id]);
  if (!user) return res.status(404).json({ error: "用户不存在" });

  const validRoles = ["rider", "judge", "organizer", "admin"];
  const invalid = roles.filter((r) => !validRoles.includes(r));
  if (invalid.length > 0) return res.status(400).json({ error: `无效角色: ${invalid.join(", ")}` });

  update("users", id, { roles: JSON.stringify(roles), updated_at: now() });
  save();
  res.json({ ok: true, id, roles });
});

// ==================== Race Routes ====================

// GET /api/races — public race list
app.get("/api/races", (_req, res) => {
  const races = all("SELECT * FROM races ORDER BY created_at DESC");
  res.json(
    races.map((r) => ({
      ...r,
      time_windows: JSON.parse(r.time_windows || "{}"),
      award_settings: JSON.parse(r.award_settings || "[]"),
      organizer_user_ids: JSON.parse(r.organizer_user_ids || "[]"),
      // Count registrations
      registration_count: all(
        "SELECT COUNT(*) as count FROM registrations WHERE race_id = ?",
        [r.id],
      )[0]?.count || 0,
    })),
  );
});

// POST /api/races — create a new race (organizer only)
app.post("/api/races", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  if (!req.user.roles.includes("organizer") && !req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "权限不足，需要主办方或管理员角色" });
  }

  const { title, slug, challengeBrief, status, organizerUserIds } = req.body;
  if (!title) return res.status(400).json({ error: "title 必填" });

  const id = uid();
  const t = now();
  const raceSlug = slug || `race-${id.slice(0, 8)}`;

  // Check slug uniqueness
  const existing = get("SELECT * FROM races WHERE slug = ?", [raceSlug]);
  if (existing) return res.status(409).json({ error: `slug "${raceSlug}" 已存在` });

  run(
    `INSERT INTO races (id, slug, title, challenge_brief, status, time_windows, award_settings, organizer_user_ids, created_by_user_id, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, raceSlug, title, challengeBrief || "", status || "draft",
      JSON.stringify({}), JSON.stringify([]),
      JSON.stringify(organizerUserIds || []),
      organizerUserIds?.[0] || req.user.id,
      "public", t, t,
    ],
  );
  save();
  res.status(201).json({ id, slug: raceSlug, title, status: status || "draft" });
});

// PUT /api/races/:id — update race settings
app.put("/api/races/:id", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  if (!isOrganizerOfRace(req.user, req.params.id)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
  }

  const race = get("SELECT * FROM races WHERE id = ?", [req.params.id]);
  if (!race) return res.status(404).json({ error: "赛事不存在" });

  const { title, challengeBrief, status, rules, timeWindows } = req.body;

  if (status !== undefined && status !== race.status) {
    const transition = raceCanTransition(race.status, status);
    if (!transition.ok) {
      return res.status(400).json({ error: `无法将赛事状态变更为 "${status}": ${transition.reason}` });
    }
  }

  const patch = { updated_at: now() };
  if (title !== undefined) patch.title = title;
  if (challengeBrief !== undefined) patch.challenge_brief = challengeBrief;
  if (status !== undefined) patch.status = status;
  if (rules !== undefined) patch.rules = rules;
  if (timeWindows !== undefined) patch.time_windows = JSON.stringify(timeWindows);

  update("races", race.id, patch);
  save();
  res.json({ ok: true, id: race.id });
});

// GET /api/races/:slug — single race detail
app.get("/api/races/:slug", (req, res) => {
  const race = get("SELECT * FROM races WHERE slug = ?", [req.params.slug]);
  if (!race) return res.status(404).json({ error: "赛事不存在" });
  race.time_windows = JSON.parse(race.time_windows || "{}");
  race.award_settings = JSON.parse(race.award_settings || "[]");
  race.organizer_user_ids = JSON.parse(race.organizer_user_ids || "[]");

  const registrations = all("SELECT * FROM registrations WHERE race_id = ?", [race.id]);
  const works = all("SELECT w.* FROM works w JOIN registrations r ON w.registration_id = r.id WHERE r.race_id = ?", [race.id]);
  const awards = all("SELECT * FROM awards WHERE race_id = ? AND status = 'published'", [race.id]);

  res.json({
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
  if (!race) return res.status(404).json({ error: "赛事不存在" });

  const works = all(
    `SELECT w.*, u.display_name as author_name, u.slug as author_slug
     FROM works w
     JOIN registrations r ON w.registration_id = r.id
     JOIN users u ON w.owner_user_id = u.id
     WHERE r.race_id = ?
     ORDER BY w.submitted_at DESC`,
    [race.id],
  );
  res.json(works.map(parseWork));
});

// GET /api/races/:slug/results — race results
app.get("/api/races/:slug/results", (req, res) => {
  const race = get("SELECT * FROM races WHERE slug = ?", [req.params.slug]);
  if (!race) return res.status(404).json({ error: "赛事不存在" });

  const awards = all(
    `SELECT a.*, u.display_name as rider_name, w.title as work_title
     FROM awards a
     LEFT JOIN users u ON (SELECT user_id FROM registrations WHERE id = a.registration_id) = u.id
     LEFT JOIN works w ON a.work_id = w.id
     WHERE a.race_id = ? AND a.status = 'published'
     ORDER BY a.rank ASC`,
    [race.id],
  );
  res.json(awards.map(parseAward));
});

// ==================== Registration Routes ====================

// POST /api/registrations — submit registration
app.post("/api/registrations", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const { raceId, userId } = req.body;
  if (!raceId || !userId) return res.status(400).json({ error: "raceId 和 userId 必填" });

  if (req.user.id !== userId && !req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "权限不足，您只能为自己报名" });
  }

  const race = get("SELECT * FROM races WHERE id = ?", [raceId]);
  if (!race) return res.status(404).json({ error: "赛事不存在" });

  // Check unique constraint
  const existing = get("SELECT * FROM registrations WHERE race_id = ? AND user_id = ?", [
    raceId,
    userId,
  ]);
  if (existing) {
    return res.status(409).json({ error: "您已报名此赛事", constraintKey: `${raceId}::${userId}` });
  }

  const t = now();
  const id = uid();
  run(
    `INSERT INTO registrations (id, race_id, user_id, status, submitted_at, review_flags, created_at, updated_at)
     VALUES (?, ?, ?, 'submitted', ?, '[]', ?, ?)`,
    [id, raceId, userId, t, t, t],
  );
  save();

  res.status(201).json({ id, status: "submitted" });
});

// PUT /api/registrations/:id/approve — approve registration
app.put("/api/registrations/:id/approve", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const reg = get("SELECT * FROM registrations WHERE id = ?", [req.params.id]);
  if (!reg) return res.status(404).json({ error: "报名不存在" });

  if (!isOrganizerOfRace(req.user, reg.race_id)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
  }

  const transition = registrationCanTransition(reg.status, "approved");
  if (!transition.ok) {
    return res.status(400).json({ error: `无法批准报名: ${transition.reason}` });
  }

  if (reg.status === "approved") {
    // Idempotent: ensure RaceProject exists
    const rp = get("SELECT * FROM race_projects WHERE registration_id = ?", [reg.id]);
    return res.json({
      ok: true,
      registration_id: reg.id,
      race_project_id: rp?.id,
      reason: "RaceProject 已存在（幂等跳过）",
    });
  }

  const t = now();
  const approvedBy = req.body.approvedByUserId || req.user.id;

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

  res.json({
    ok: true,
    registration_id: reg.id,
    race_project_id: rpId,
  });
});

// PUT /api/registrations/:id/reject — reject registration
app.put("/api/registrations/:id/reject", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const reg = get("SELECT * FROM registrations WHERE id = ?", [req.params.id]);
  if (!reg) return res.status(404).json({ error: "报名不存在" });

  if (!isOrganizerOfRace(req.user, reg.race_id)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
  }

  const transition = registrationCanTransition(reg.status, "rejected");
  if (!transition.ok) {
    return res.status(400).json({ error: `无法拒绝报名: ${transition.reason}` });
  }

  const t = now();
  update("registrations", reg.id, {
    status: "rejected",
    rejected_at: t,
    rejected_reason: req.body.reason || "主办方拒绝了报名",
    updated_at: t,
  });
  save();
  res.json({ ok: true, id: reg.id, status: "rejected" });
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
  res.json(regs.map((r) => ({ ...r, review_flags: JSON.parse(r.review_flags || "[]") })));
});

// ==================== Work Routes ====================

// POST /api/works — create/submit work
app.post("/api/works", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const { registrationId, title, summary, description, repoUrl } = req.body;
  if (!registrationId || !title) return res.status(400).json({ error: "registrationId 和 title 必填" });

  const reg = get("SELECT * FROM registrations WHERE id = ?", [registrationId]);
  if (!reg) return res.status(404).json({ error: "报名不存在" });

  if (req.user.id !== reg.user_id && !req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "权限不足，您只能为自己的报名提交作品" });
  }

  // Check unique constraint (MVP: 1 work per registration)
  const existing = get("SELECT * FROM works WHERE registration_id = ?", [registrationId]);
  if (existing) return res.status(409).json({ error: "该报名已有作品（MVP 限制一个作品）" });

  const t = now();
  const workId = uid();
  run(
    `INSERT INTO works (id, registration_id, race_id, owner_user_id, title, summary, description, repo_url, status, submitted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
    [workId, registrationId, reg.race_id, reg.user_id, title, summary || "", description || "", repoUrl || null, t, t, t],
  );
  save();

  res.status(201).json({ id: workId, status: "submitted" });
});

// PUT /api/works/:id — update work
app.put("/api/works/:id", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });

  const work = get("SELECT * FROM works WHERE id = ?", [req.params.id]);
  if (!work) return res.status(404).json({ error: "作品不存在" });

  if (req.user.id !== work.owner_user_id && !req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "权限不足，您只能修改自己的作品" });
  }

  if (work.status === "locked") {
    return res.status(400).json({ error: "作品已被锁定，无法修改" });
  }

  const { title, summary, description, repoUrl } = req.body;
  if (!title) return res.status(400).json({ error: "作品标题必填" });

  const t = now();
  update("works", work.id, {
    title,
    summary: summary || "",
    description: description || "",
    repo_url: repoUrl || null,
    updated_at: t
  });
  save();

  res.json({ ok: true, id: work.id, status: work.status });
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
  res.json(all(sql, params).map(parseWork));
});

// ==================== CA Routes ====================

// GET /api/ca-connections?raceProjectId=X
app.get("/api/ca-connections", (req, res) => {
  const { raceProjectId } = req.query;
  const conns = raceProjectId
    ? all("SELECT * FROM ca_connections WHERE race_project_id = ?", [raceProjectId])
    : all("SELECT * FROM ca_connections ORDER BY created_at DESC");
  res.json(conns);
});

// POST /api/ca-connections — register a CA connection
app.post("/api/ca-connections", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const { raceProjectId, connectorId, caProjectId, caType } = req.body;
  if (!raceProjectId || !connectorId) return res.status(400).json({ error: "raceProjectId 和 connectorId 必填" });

  const rp = get("SELECT * FROM race_projects WHERE id = ?", [raceProjectId]);
  if (!rp) return res.status(404).json({ error: "RaceProject 不存在" });

  if (req.user.id !== rp.user_id && !req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "权限不足，您只能为自己的 RaceProject 登记 CA 连接" });
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
    res.status(201).json({ id, ingestionStatus: "connected" });
  } catch (e) {
    res.status(409).json({ error: "CAConnection 唯一键冲突: " + e.message });
  }
});

// POST /api/ca-verify — CA message verification (legacy)
app.post("/api/ca-verify", (req, res) => {
  const { caConnectionId, message } = req.body;
  if (!caConnectionId || !message) return res.status(400).json({ error: "caConnectionId 和 message 必填" });
  import("./ca-verifier.js").then(({ verifyMessage }) => {
    const result = verifyMessage({ ...message, caConnectionId });
    save();
    res.json(result);
  }).catch((err) => {
    res.status(500).json({ error: "验签模块加载失败: " + err.message });
  });
});

// ==================== DEV-5: CA Message Ingestion ====================

// POST /api/ca/message — receive a riding signal message
app.post("/api/ca/message", (req, res) => {
  const { caConnectionId, signalType, signalKind, phase, taskStatus, progressPercent, tokensUsed, content } = req.body;
  if (!caConnectionId) return res.status(400).json({ error: "caConnectionId 必填" });

  const caConn = get("SELECT * FROM ca_connections WHERE id = ?", [caConnectionId]);
  if (!caConn) return res.status(404).json({ error: "CAConnection 不存在" });
  if (caConn.disabled_at) return res.status(403).json({ error: "CAConnection 已禁用" });

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

  res.status(201).json({ id, status: "received" });
});

// GET /api/ca/messages?raceProjectId=X — query CA messages
app.get("/api/ca/messages", (req, res) => {
  const { raceProjectId, limit } = req.query;
  let sql = "SELECT * FROM ca_messages WHERE 1=1";
  const params = [];
  if (raceProjectId) { sql += " AND race_project_id = ?"; params.push(raceProjectId); }
  sql += " ORDER BY received_at DESC LIMIT " + (parseInt(limit) || 50);
  res.json(all(sql, params));
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
  if (!race) return res.status(404).json({ error: "赛事不存在" });

  const projections = all("SELECT * FROM race_projections WHERE race_id = ? ORDER BY leaderboard_rank ASC", [race.id]);
  const recentEvents = all(
    "SELECT cm.*, u.display_name as rider_name FROM ca_messages cm JOIN users u ON (SELECT user_id FROM race_projects WHERE id = cm.race_project_id) = u.id WHERE cm.race_id = ? ORDER BY cm.received_at DESC LIMIT 20",
    [race.id],
  );

  // Get CA connection statuses
  const raceProjectIds = projections.map(p => p.race_project_id);
  const connStatuses = raceProjectIds.length > 0
    ? all(`SELECT race_project_id, ingestion_status, authenticity_status FROM ca_connections WHERE race_project_id IN (${raceProjectIds.map(() => '?').join(',')})`, raceProjectIds)
    : [];

  res.json({
    race: { id: race.id, title: race.title, slug: race.slug, status: race.status },
    projections: projections.map(p => ({
      ...p,
      metrics: JSON.parse(p.metrics || "{}"),
      risks: JSON.parse(p.risks || "[]"),
      connection: connStatuses.find(c => c.race_project_id === p.race_project_id) || {},
    })),
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
  if (!p) return res.status(404).json({ error: "Projection 不存在" });
  res.json({ ...p, metrics: JSON.parse(p.metrics || "{}"), risks: JSON.parse(p.risks || "[]") });
});

// ==================== DEV-5: Session Management ====================

// POST /api/sessions — create a new session for a CA connection
app.post("/api/sessions", (req, res) => {
  const { caConnectionId, caSessionId } = req.body;
  if (!caConnectionId || !caSessionId) return res.status(400).json({ error: "caConnectionId 和 caSessionId 必填" });

  const caConn = get("SELECT * FROM ca_connections WHERE id = ?", [caConnectionId]);
  if (!caConn) return res.status(404).json({ error: "CAConnection 不存在" });

  if (!req.user) return res.status(401).json({ error: "未登录" });
  if (req.user.id !== caConn.user_id && !req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "权限不足，您只能为自己的 CA 连接管理 Session" });
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
    res.status(201).json({ id, status: "active" });
  } catch (e) {
    res.status(409).json({ error: "Session 创建失败: " + e.message });
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
  res.json(all(sql, params).map(s => ({ ...s, metrics: JSON.parse(s.metrics || "{}") })));
});

// ==================== RaceProject Routes ====================

// GET /api/race-projects?registrationId=X
app.get("/api/race-projects", (req, res) => {
  const { registrationId, userId } = req.query;
  let sql = "SELECT * FROM race_projects WHERE 1=1";
  const params = [];
  if (registrationId) { sql += " AND registration_id = ?"; params.push(registrationId); }
  if (userId) { sql += " AND user_id = ?"; params.push(userId); }
  res.json(all(sql, params).map((rp) => ({
    ...rp,
    authenticity_summary: JSON.parse(rp.authenticity_summary || "{}"),
    review_flags: JSON.parse(rp.review_flags || "[]"),
  })));
});

// ==================== Judge Assignment Routes ====================

// POST /api/judge-assignments — assign a judge to a work
app.post("/api/judge-assignments", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const { raceId, workId, judgeUserId, assignedByUserId } = req.body;
  if (!raceId || !workId || !judgeUserId) return res.status(400).json({ error: "raceId, workId, judgeUserId 必填" });

  if (!isOrganizerOfRace(req.user, raceId)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
  }

  const t = now();
  const id = uid();
  try {
    run(
      `INSERT INTO judge_assignments (id, race_id, work_id, judge_user_id, assigned_by_user_id, status, assigned_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?, ?)`,
      [id, raceId, workId, judgeUserId, assignedByUserId || req.user.id, t, t, t],
    );
    save();
    res.status(201).json({ id, status: "assigned" });
  } catch (e) {
    res.status(409).json({ error: "分配冲突: " + e.message });
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
  res.json(all(sql, params));
});

// DELETE /api/judge-assignments/:id — remove a judge assignment
app.delete("/api/judge-assignments/:id", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const assignment = get("SELECT * FROM judge_assignments WHERE id = ?", [req.params.id]);
  if (!assignment) return res.status(404).json({ error: "分配关系不存在" });

  if (!isOrganizerOfRace(req.user, assignment.race_id)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
  }

  run("DELETE FROM judge_assignments WHERE id = ?", [req.params.id]);
  save();
  res.json({ ok: true });
});

// ==================== Judging Record Routes ====================

// POST /api/judging-records — submit a judging record
app.post("/api/judging-records", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const { judgeAssignmentId, workId, judgeUserId, scoreResult, scoreRiding, comments } = req.body;
  if (!judgeAssignmentId || !workId || !judgeUserId) return res.status(400).json({ error: "必填字段缺失" });

  if (req.user.id !== judgeUserId && !req.user.roles.includes("admin")) {
    return res.status(403).json({ error: "权限不足，您只能以本人的身份提交评审" });
  }

  const assignment = get("SELECT * FROM judge_assignments WHERE id = ?", [judgeAssignmentId]);
  if (!assignment) return res.status(404).json({ error: "评委分配不存在" });
  if (assignment.judge_user_id !== judgeUserId) {
    return res.status(400).json({ error: "分配对应的评委不符" });
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
    res.status(201).json({ id, status: "submitted" });
  } catch (e) {
    res.status(409).json({ error: "评审记录冲突: " + e.message });
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
  res.json(all(sql, params).map(r => ({
    ...r,
    score_result: JSON.parse(r.score_result || "{}"),
    score_riding: JSON.parse(r.score_riding || "{}"),
  })));
});

// ==================== Award Routes ====================

// GET /api/awards — list all awards
app.get("/api/awards", (_req, res) => {
  const awards = all("SELECT * FROM awards ORDER BY created_at DESC");
  res.json(awards);
});

// POST /api/awards — create an award for a registration
app.post("/api/awards", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const { raceId, registrationId, awardName, rank, workId, decisionReason } = req.body;
  if (!raceId || !registrationId || !awardName) return res.status(400).json({ error: "raceId, registrationId, awardName 必填" });

  if (!isOrganizerOfRace(req.user, raceId)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
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
    res.status(201).json({ id, status: "draft" });
  } catch (e) {
    res.status(409).json({ error: "奖项创建冲突: " + e.message });
  }
});

// PUT /api/awards/:id/publish — publish an award
app.put("/api/awards/:id/publish", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const award = get("SELECT * FROM awards WHERE id = ?", [req.params.id]);
  if (!award) return res.status(404).json({ error: "奖项不存在" });

  if (!isOrganizerOfRace(req.user, award.race_id)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
  }

  const transition = awardCanTransition(award.status, "published");
  if (!transition.ok) {
    return res.status(400).json({ error: `无法发布奖项: ${transition.reason}` });
  }

  const t = now();
  update("awards", award.id, { status: "published", published_at: t, updated_at: t });
  save();
  res.json({ ok: true, id: award.id, status: "published" });
});

// PUT /api/awards/:id — update award
app.put("/api/awards/:id", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const award = get("SELECT * FROM awards WHERE id = ?", [req.params.id]);
  if (!award) return res.status(404).json({ error: "奖项不存在" });

  if (!isOrganizerOfRace(req.user, award.race_id)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
  }

  const { awardName, rank, decisionReason } = req.body;
  const patch = {};
  if (awardName !== undefined) patch.award_name = awardName;
  if (rank !== undefined) patch.rank = rank;
  if (decisionReason !== undefined) patch.decision_reason = decisionReason;
  patch.updated_at = now();
  update("awards", award.id, patch);
  save();
  res.json({ ok: true, id: award.id });
});

// ==================== DEV-7: Report Generator ====================

// GET /api/health — health check endpoint
app.get("/api/health", async (_req, res) => {
  try {
    const raceCount = all("SELECT COUNT(*) as count FROM races")[0]?.count || 0;
    const userCount = all("SELECT COUNT(*) as count FROM users")[0]?.count || 0;
    const dbPath = process.env.DB_PATH || "db/ary.sqlite";
    const fs = await import("node:fs");
    const dbStats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: { sizeBytes: dbStats?.size || 0, races: raceCount, users: userCount },
    });
  } catch (e) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

// POST /api/reports/generate — generate a report for a race
app.post("/api/reports/generate", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const { raceId, reportType, subjectRegistrationId } = req.body;
  if (!raceId || !reportType) return res.status(400).json({ error: "raceId 和 reportType 必填" });

  if (reportType === "race_report" || reportType === "review_summary") {
    if (!isOrganizerOfRace(req.user, raceId)) {
      return res.status(403).json({ error: "权限不足，不是该赛事的主办方" });
    }
  } else if (reportType === "rider_report") {
    if (!subjectRegistrationId) return res.status(400).json({ error: "rider_report 需要 subjectRegistrationId" });
    const reg = get("SELECT * FROM registrations WHERE id = ?", [subjectRegistrationId]);
    if (!reg) return res.status(404).json({ error: "报名不存在" });
    if (req.user.id !== reg.user_id && !isOrganizerOfRace(req.user, raceId)) {
      return res.status(403).json({ error: "权限不足，只能生成自己的或主办赛事的骑手报告" });
    }
  }

  const race = get("SELECT * FROM races WHERE id = ?", [raceId]);
  if (!race) return res.status(404).json({ error: "赛事不存在" });

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
    if (!subjectRegistrationId) return res.status(400).json({ error: "rider_report 需要 subjectRegistrationId" });
    const reg = get("SELECT * FROM registrations WHERE id = ?", [subjectRegistrationId]);
    if (!reg) return res.status(404).json({ error: "报名不存在" });
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
    res.status(201).json({ id: reportId, title, reportType, status: "generated" });
  } catch (e) {
    res.status(409).json({ error: "报告生成失败: " + e.message });
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
  res.json(all(sql, params).map(r => ({ ...r, generated_from: JSON.parse(r.generated_from || "{}") })));
});

// PUT /api/reports/:id/publish — publish a report
app.put("/api/reports/:id/publish", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "未登录" });
  const report = get("SELECT * FROM reports WHERE id = ?", [req.params.id]);
  if (!report) return res.status(404).json({ error: "报告不存在" });

  if (!isOrganizerOfRace(req.user, report.race_id)) {
    return res.status(403).json({ error: "权限不足，您不是该赛事的主办方" });
  }

  const t = now();
  update("reports", report.id, { status: "published", published_at: t, updated_at: t, visibility: "public" });
  save();
  res.json({ ok: true, id: report.id, status: "published" });
});

// ==================== Dashboard / Stats ====================

// GET /api/stats — aggregate stats for homepage
app.get("/api/stats", (_req, res) => {
  const raceCount = all("SELECT COUNT(*) as count FROM races")[0]?.count || 0;
  const liveRace = get("SELECT * FROM races WHERE status IN ('running','submitting','judging') ORDER BY created_at DESC LIMIT 1");
  const completedRaceCount = all("SELECT COUNT(*) as count FROM races WHERE status = 'completed'")[0]?.count || 0;
  const riderCount = all("SELECT COUNT(DISTINCT user_id) as count FROM registrations")[0]?.count || 0;
  const workCount = all("SELECT COUNT(*) as count FROM works WHERE status = 'submitted'")[0]?.count || 0;

  res.json({
    total_races: raceCount,
    live_race: liveRace ? { slug: liveRace.slug, title: liveRace.title, status: liveRace.status } : null,
    completed_races: completedRaceCount,
    total_riders: riderCount,
    total_works: workCount,
  });
});

// ==================== Helpers ====================

let _jsonFieldsCache = null;
function getJsonFields() {
  if (!_jsonFieldsCache) {
    _jsonFieldsCache = {
      user: ["roles", "profile"],
      race: ["time_windows", "award_settings", "organizer_user_ids"],
      registration: ["review_flags"],
      race_project: ["authenticity_summary", "review_flags"],
      session: ["metrics"],
      judging_record: ["score_result", "score_riding"],
      evidence: ["source_ref", "tags"],
      report: ["generated_from"],
      session_summary: ["metrics", "capability_tags"],
      award: [],
      ca_connection: [],
      work: [],
    };
  }
  return _jsonFieldsCache;
}

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

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n  ARY MVP — API Server Ready`);
    console.log(`  → http://localhost:${PORT}`);
    console.log(`  → API:   http://localhost:${PORT}/api/races`);
    console.log(`  → Stats: http://localhost:${PORT}/api/stats\n`);
  });
}

export { app, start };
