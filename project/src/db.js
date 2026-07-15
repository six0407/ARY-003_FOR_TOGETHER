// SQLite persistence layer using sql.js (pure JS, no native deps).
// Provides a thin wrapper with run/get/all helpers.
// Data is persisted to project/db/ary.sqlite on save().

import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, "..", "db");
const DB_PATH = path.join(DB_DIR, "ary.sqlite");

let db = null;

function uid() {
  return crypto.randomUUID();
}
function now() {
  return new Date().toISOString();
}

// --- Init ---
export async function initDB() {
  const SQL = await initSqlJs();

  // Ensure db directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Load existing or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  runMigrations();
  return db;
}

// --- Helpers ---
export function run(sql, params = []) {
  db.run(sql, params);
}

export function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function all(sql, params = []) {
  const rows = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Auto-generate id for insert if not provided
export function insert(table, obj) {
  const id = obj.id || uid();
  const keys = Object.keys(obj);
  const placeholders = keys.map(() => "?").join(", ");
  const values = keys.map((k) => obj[k]);
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;
  run(sql, values);
  return id;
}

export function update(table, id, patch) {
  const sets = Object.keys(patch)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = Object.keys(patch).map((k) => patch[k]);
  const sql = `UPDATE ${table} SET ${sets} WHERE id = ?`;
  run(sql, [...values, id]);
}

// Persist to disk
export function save() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Close DB
export function close() {
  if (db) {
    save();
    db.close();
    db = null;
  }
}

// --- Migrations ---
function runMigrations() {
  db.run(`
    CREATE TABLE IF NOT EXISTS races (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      challenge_brief TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      time_windows TEXT DEFAULT '{}',
      rules TEXT DEFAULT '',
      submission_requirements TEXT DEFAULT '',
      award_settings TEXT DEFAULT '[]',
      organizer_user_ids TEXT DEFAULT '[]',
      created_by_user_id TEXT DEFAULT '',
      visibility TEXT DEFAULT 'public',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      github_account_id TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      profile TEXT DEFAULT '{}',
      roles TEXT DEFAULT '[]',
      profile_completion_status TEXT DEFAULT 'complete',
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      race_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'submitted',
      submitted_at TEXT,
      approved_at TEXT,
      approved_by_user_id TEXT,
      rejected_at TEXT,
      rejected_reason TEXT,
      withdrawn_at TEXT,
      review_flags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      UNIQUE(race_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS race_projects (
      id TEXT PRIMARY KEY,
      registration_id TEXT UNIQUE NOT NULL,
      race_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      repo_url TEXT,
      aggregate_ingestion_status TEXT DEFAULT 'not_configured',
      connection_health TEXT DEFAULT 'no_signal',
      authenticity_summary TEXT DEFAULT '{}',
      review_flags TEXT DEFAULT '[]',
      current_primary_work_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ca_connections (
      id TEXT PRIMARY KEY,
      race_project_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      race_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ca_type TEXT DEFAULT 'codex',
      connector_id TEXT NOT NULL,
      connector_version TEXT DEFAULT '1.0',
      ca_project_id TEXT,
      ingestion_status TEXT DEFAULT 'not_configured',
      authenticity_status TEXT DEFAULT 'verified',
      authenticity_reason TEXT,
      app_instance_id TEXT,
      device_key_id TEXT,
      device_key_fingerprint TEXT,
      registered_at TEXT,
      last_handshake_at TEXT,
      last_verified_at TEXT,
      disabled_at TEXT,
      disabled_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      UNIQUE(race_project_id, connector_id, ca_project_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      ca_connection_id TEXT NOT NULL,
      race_project_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      ca_session_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_ms INTEGER,
      task_count INTEGER DEFAULT 0,
      metrics TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      UNIQUE(ca_connection_id, ca_session_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      registration_id TEXT UNIQUE NOT NULL,
      race_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      description TEXT,
      demo_url TEXT,
      video_url TEXT,
      repo_url TEXT,
      status TEXT DEFAULT 'draft',
      visibility TEXT DEFAULT 'public',
      submitted_at TEXT,
      locked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS judge_assignments (
      id TEXT PRIMARY KEY,
      race_id TEXT NOT NULL,
      work_id TEXT NOT NULL,
      judge_user_id TEXT NOT NULL,
      assigned_by_user_id TEXT NOT NULL,
      status TEXT DEFAULT 'assigned',
      assigned_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      UNIQUE(work_id, judge_user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS judging_records (
      id TEXT PRIMARY KEY,
      judge_assignment_id TEXT UNIQUE NOT NULL,
      work_id TEXT NOT NULL,
      judge_user_id TEXT NOT NULL,
      score_result TEXT DEFAULT '{}',
      score_riding TEXT DEFAULT '{}',
      comments TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      submitted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS awards (
      id TEXT PRIMARY KEY,
      race_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      work_id TEXT,
      award_name TEXT NOT NULL,
      rank INTEGER DEFAULT 1,
      decision_reason TEXT,
      status TEXT DEFAULT 'draft',
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      UNIQUE(race_id, award_name, rank),
      UNIQUE(race_id, registration_id, award_name)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS evidences (
      id TEXT PRIMARY KEY,
      registration_id TEXT NOT NULL,
      race_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_ref TEXT DEFAULT '{}',
      visibility TEXT DEFAULT 'public',
      summary TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      race_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      subject_registration_id TEXT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      generated_from TEXT DEFAULT '{}',
      status TEXT DEFAULT 'draft',
      visibility TEXT DEFAULT 'organizer_internal',
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      UNIQUE(race_id, report_type, subject_registration_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      race_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      visibility TEXT DEFAULT 'internal',
      published_at TEXT,
      created_by_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ca_message_receipts (
      id TEXT PRIMARY KEY,
      ca_connection_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      schema_version TEXT DEFAULT 'ary.ca.riding_signal.v0.1',
      timestamp TEXT NOT NULL,
      nonce TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      signature_algorithm TEXT DEFAULT 'ecdsa-p256',
      signature_body_hash TEXT DEFAULT '',
      verification_result TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(ca_connection_id, sequence)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ca_quarantine_audits (
      id TEXT PRIMARY KEY,
      receipt_id TEXT UNIQUE NOT NULL,
      ca_connection_id TEXT NOT NULL,
      race_project_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      failure_reason TEXT NOT NULL,
      quarantine_status TEXT DEFAULT 'pending_review',
      quarantined_at TEXT NOT NULL,
      reviewed_by_user_id TEXT,
      reviewed_at TEXT,
      disposition_note TEXT,
      raw_message_metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS session_summaries (
      id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      ca_connection_id TEXT NOT NULL,
      race_project_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      summary_type TEXT DEFAULT 'auto_generated',
      content TEXT DEFAULT '',
      metrics TEXT DEFAULT '{}',
      capability_tags TEXT DEFAULT '[]',
      generated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // DEV-5: CA raw messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS ca_messages (
      id TEXT PRIMARY KEY,
      ca_connection_id TEXT NOT NULL,
      race_project_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      race_id TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      signal_kind TEXT DEFAULT 'event',
      phase TEXT DEFAULT 'idle',
      task_status TEXT DEFAULT 'not_started',
      progress_percent REAL DEFAULT 0,
      tokens_used INTEGER DEFAULT 0,
      session_count INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 0,
      tool_call_count INTEGER DEFAULT 0,
      content TEXT DEFAULT '',
      received_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(ca_connection_id, id)
    )
  `);

  // DEV-5: Projections table for Live Hall
  db.run(`
    CREATE TABLE IF NOT EXISTS race_projections (
      id TEXT PRIMARY KEY,
      race_project_id TEXT UNIQUE NOT NULL,
      race_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      metrics TEXT DEFAULT '{}',
      risks TEXT DEFAULT '[]',
      latest_event_type TEXT DEFAULT '',
      latest_event_summary TEXT DEFAULT '',
      latest_event_at TEXT,
      leaderboard_rank INTEGER DEFAULT 0,
      last_updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  save();
  console.log("[db] Migrations complete, database ready.");
}

// --- Seed demo data ---
export function seedDemo(overrides = {}) {
  const t = now();

  // Organizer user
  const orgId = uid();
  run(
    `INSERT OR IGNORE INTO users (id, github_account_id, slug, display_name, roles, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [orgId, "gh-organizer", "organizer", "赛事主办方", '["organizer","admin"]', t, t],
  );

  // Rider user
  const riderId = uid();
  run(
    `INSERT OR IGNORE INTO users (id, github_account_id, slug, display_name, roles, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [riderId, "gh-rider", "rider-001", "骑手小明", '["rider"]', t, t],
  );

  // Judge user
  const judgeId = uid();
  run(
    `INSERT OR IGNORE INTO users (id, github_account_id, slug, display_name, roles, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [judgeId, "gh-judge", "judge-001", "评委老张", '["judge"]', t, t],
  );

  // Race 1 — live
  const race1Id = uid();
  run(
    `INSERT OR IGNORE INTO races (id, slug, title, challenge_brief, status, time_windows, organizer_user_ids, created_by_user_id, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      race1Id,
      "first-agent-race",
      "第一届 Agent 骑行挑战赛",
      "使用任意 Coding Agent，在 48 小时内完成一个开源工具或产品原型。",
      "running",
      JSON.stringify({
        registration_start: "2026-06-01T00:00:00.000Z",
        registration_end: "2026-06-15T00:00:00.000Z",
        race_start: "2026-06-16T00:00:00.000Z",
        race_end: "2026-06-22T00:00:00.000Z",
        submission_deadline: "2026-06-22T12:00:00.000Z",
      }),
      JSON.stringify([orgId]),
      orgId,
      "public",
      t,
      t,
    ],
  );

  // Race 2 — registration
  const race2Id = uid();
  run(
    `INSERT OR IGNORE INTO races (id, slug, title, challenge_brief, status, time_windows, organizer_user_ids, created_by_user_id, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      race2Id,
      "speed-build-challenge",
      "极速构建挑战赛",
      "4 小时内使用 AI Agent 构建一个可部署的全栈应用。",
      "registration",
      JSON.stringify({
        registration_start: "2026-06-20T00:00:00.000Z",
        registration_end: "2026-07-01T00:00:00.000Z",
        race_start: "2026-07-02T00:00:00.000Z",
        race_end: "2026-07-03T00:00:00.000Z",
        submission_deadline: "2026-07-03T04:00:00.000Z",
      }),
      JSON.stringify([orgId]),
      orgId,
      "public",
      t,
      t,
    ],
  );

  // Race 3 — completed
  const race3Id = uid();
  run(
    `INSERT OR IGNORE INTO races (id, slug, title, challenge_brief, status, time_windows, organizer_user_ids, created_by_user_id, visibility, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      race3Id,
      "architecture-master",
      "架构大师赛",
      "设计并实现一个高可用的微服务架构方案。",
      "completed",
      JSON.stringify({
        registration_start: "2026-05-01T00:00:00.000Z",
        registration_end: "2026-05-10T00:00:00.000Z",
        race_start: "2026-05-11T00:00:00.000Z",
        race_end: "2026-05-20T00:00:00.000Z",
      }),
      JSON.stringify([orgId]),
      orgId,
      "public",
      t,
      t,
    ],
  );

  // Registration for rider in race1
  const reg1Id = uid();
  run(
    `INSERT OR IGNORE INTO registrations (id, race_id, user_id, status, submitted_at, approved_at, approved_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [reg1Id, race1Id, riderId, "approved", t, t, orgId, t, t],
  );

  // RaceProject for reg1
  const rp1Id = uid();
  run(
    `INSERT OR IGNORE INTO race_projects (id, registration_id, race_id, user_id, aggregate_ingestion_status, connection_health, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [rp1Id, reg1Id, race1Id, riderId, "active", "ok", t, t],
  );

  // Work for reg1
  const work1Id = uid();
  run(
    `INSERT OR IGNORE INTO works (id, registration_id, race_id, owner_user_id, title, summary, description, status, submitted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      work1Id,
      reg1Id,
      race1Id,
      riderId,
      "AI 代码审查助手",
      "一个基于 LLM 的自动化代码审查工具，支持 GitHub PR 评论。",
      "## 功能\n- 自动审查 PR 代码\n- 生成改进建议\n- 支持多种语言",
      "submitted",
      t,
      t,
      t,
    ],
  );

  // Award for race3
  const awardId = uid();
  run(
    `INSERT OR IGNORE INTO awards (id, race_id, registration_id, award_name, rank, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [awardId, race3Id, reg1Id, "最佳架构设计", 1, "published", t, t, t],
  );

  save();
  console.log("[db] Demo data seeded.");

  return {
    organizerId: orgId,
    riderId,
    judgeId,
    race1Id,
    race2Id,
    race3Id,
    reg1Id,
    rp1Id,
    work1Id,
  };
}

export { uid, now };
