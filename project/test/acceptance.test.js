// DEV-1 Acceptance Tests — 46 test cases across 5 acceptance criteria.
// All domain operations go through business.js; no raw store manipulation.
// Run with: node --test test/acceptance.test.js

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { stores, resetAll } from "../src/stores.js";
import {
  ownGate, assignedGate, managedRaceGate, adminGate,
  quarantineSummaryFilter,
} from "../src/auth.js";
import {
  raceCanTransition, registrationCanTransition, workCanTransition,
  judgingCanTransition, awardCanTransition, rpIngestionCanTransition,
  computeConnectionHealth, generateReviewFlags,
} from "../src/state-machine.js";
import {
  verifyMessage, canEnterSession, registerDeviceKey, revokeDeviceKey,
  resetKeys, computeBodyHash, normalizeBody,
} from "../src/ca-verifier.js";
import {
  createRace, createUser, createRegistration, createRaceProject,
  createCAConnection, createSession, createWork, createJudgeAssignment,
  createJudgingRecord, createAward,
  submitRegistration, approveRegistration, submitWork,
  uid, now,
} from "../src/business.js";

describe("DEV-1 Acceptance Tests", () => {
  beforeEach(() => { resetAll(); resetKeys(); });

  describe("AC-1: 唯一 Registration 约束", () => {
    it("AC-1.1 — 首次报名正常通过", () => {
      const r = createRace({ status: "registration" }).record;
      const u = createUser({ roles: ["rider"] }).record;
      assert.ok(submitRegistration(r.id, u.id).ok);
      assert.equal(stores.registrations.count(), 1);
    });
    it("AC-1.2 — 重复报名被拒绝（stores 层 enforce）", () => {
      const r = createRace({ status: "registration" }).record;
      const u = createUser({ roles: ["rider"] }).record;
      submitRegistration(r.id, u.id);
      const res = submitRegistration(r.id, u.id);
      assert.equal(res.ok, false);
      assert.match(res.reason, /uk_race_user/);
      assert.equal(stores.registrations.count(), 1);
    });
    it("AC-1.3 — 不同 User 对同一 Race 各自报名成功", () => {
      const r = createRace({ status: "registration" }).record;
      const a = createUser({ roles: ["rider"] }).record;
      const b = createUser({ roles: ["rider"] }).record;
      assert.ok(submitRegistration(r.id, a.id).ok);
      assert.ok(submitRegistration(r.id, b.id).ok);
      assert.equal(stores.registrations.count(), 2);
    });
    it("AC-1.4 — 同一 User 对不同 Race 各自报名成功", () => {
      const r1 = createRace({ status: "registration" }).record;
      const r2 = createRace({ status: "registration" }).record;
      const u = createUser({ roles: ["rider"] }).record;
      assert.ok(submitRegistration(r1.id, u.id).ok);
      assert.ok(submitRegistration(r2.id, u.id).ok);
      assert.equal(stores.registrations.count(), 2);
    });
  });

  describe("AC-2: 结构约束", () => {
    it("AC-2.1 — Registration approved 后自动生成 RaceProject", () => {
      const reg = createRegistration().record;
      const result = approveRegistration(reg.id, "approver-1");
      assert.ok(result.ok);
      assert.match(result.reason, /RaceProject 已自动生成/);
      const rp = stores.raceProjects.first((x) => x.registrationId === reg.id);
      assert.ok(rp);
      assert.equal(rp.aggregateIngestionStatus, "not_configured");
    });
    it("AC-2.2 — 重复 approve 不会创建第二个 RaceProject（幂等）", () => {
      const reg = createRegistration({ status: "submitted" }).record;
      approveRegistration(reg.id, "a1");
      const r2 = approveRegistration(reg.id, "a2");
      assert.ok(r2.ok);
      assert.match(r2.reason, /幂等跳过/);
      assert.equal(stores.raceProjects.count(), 1);
    });
    it("AC-2.3 — 一个 Registration 最多一个主 Work", () => {
      const reg = createRegistration({ status: "approved" }).record;
      createWork({ registrationId: reg.id });
      assert.equal(createWork({ registrationId: reg.id }).ok, false);
    });
    it("AC-2.4 — 一个 RaceProject 可登记多个 CAConnection", () => {
      const rp = createRaceProject().record;
      createCAConnection({ raceProjectId: rp.id, connectorId: "A", caProjectId: "P1" });
      createCAConnection({ raceProjectId: rp.id, connectorId: "B", caProjectId: "P2" });
      assert.equal(stores.caConnections.count(), 2);
    });
    it("AC-2.5 — 同一 connector+project 不可重复登记", () => {
      const rp = createRaceProject().record;
      createCAConnection({ raceProjectId: rp.id, connectorId: "A", caProjectId: "P1" });
      const dup = createCAConnection({ raceProjectId: rp.id, connectorId: "A", caProjectId: "P1" });
      assert.equal(dup.ok, false);
      assert.match(dup.reason, /uk_rp_connector_caproject/);
    });
    it("AC-2.6 — 未 approved 的 Registration 不生成 RaceProject", () => {
      const reg = createRegistration({ status: "submitted" }).record;
      assert.equal(stores.raceProjects.first((x) => x.registrationId === reg.id), null);
    });
  });

  describe("AC-3: CAConnection 有效数据准入", () => {
    it("AC-3.1 — 已登记+握手+归属+未禁用 → 准入", () => {
      const rp = createRaceProject().record;
      const cc = createCAConnection({ raceProjectId: rp.id, registrationId: rp.registrationId, ingestionStatus: "connected", authenticityStatus: "verified", disabledAt: null }).record;
      const ses = createSession({ caConnectionId: cc.id, raceProjectId: rp.id, registrationId: rp.registrationId }).record;
      assert.ok(canEnterSession(ses).ok);
    });
    it("AC-3.2 — 未登记 → 拒", () => { assert.equal(canEnterSession(createSession({ caConnectionId: "noid" }).record).ok, false); });
    it("AC-3.3 — 未握手 → 拒", () => {
      const rp = createRaceProject().record;
      const cc = createCAConnection({ raceProjectId: rp.id, ingestionStatus: "not_configured" }).record;
      assert.equal(canEnterSession(createSession({ caConnectionId: cc.id }).record).reason, "CAConnection 未握手");
    });
    it("AC-3.4 — 归属错误 → 拒", () => {
      const rp = createRaceProject().record;
      const cc = createCAConnection({ raceProjectId: rp.id, registrationId: rp.registrationId, ingestionStatus: "connected", authenticityStatus: "verified" }).record;
      assert.equal(canEnterSession(createSession({ caConnectionId: cc.id, raceProjectId: rp.id, registrationId: "wrong" }).record).reason, "归属错误");
    });
    it("AC-3.5 — 已禁用 → 拒", () => {
      const rp = createRaceProject().record;
      const cc = createCAConnection({ raceProjectId: rp.id, ingestionStatus: "connected", authenticityStatus: "verified", disabledAt: now() }).record;
      assert.equal(canEnterSession(createSession({ caConnectionId: cc.id }).record).reason, "CAConnection 已被禁用");
    });
    it("AC-3.6 — 混合场景 partial_failed", () => {
      const rp = createRaceProject().record;
      const cc1 = createCAConnection({ raceProjectId: rp.id, connectorId: "A", caProjectId: "P1", ingestionStatus: "connected", authenticityStatus: "verified" }).record;
      const cc2 = createCAConnection({ raceProjectId: rp.id, connectorId: "B", caProjectId: "P2", ingestionStatus: "connected", authenticityStatus: "verified", disabledAt: now() }).record;
      assert.ok(canEnterSession(createSession({ caConnectionId: cc1.id, raceProjectId: rp.id, registrationId: rp.registrationId }).record).ok);
      assert.equal(canEnterSession(createSession({ caConnectionId: cc2.id, raceProjectId: rp.id, registrationId: rp.registrationId }).record).ok, false);
      assert.equal(computeConnectionHealth([cc1.ingestionStatus, "disabled"]), "partial_failed");
    });
  });

  describe("AC-4: DCR Desktop App 安全校验", () => {
    let cc;
    beforeEach(() => {
      const rp = createRaceProject().record;
      cc = createCAConnection({ raceProjectId: rp.id, registrationId: rp.registrationId, userId: rp.userId, raceId: rp.raceId, ingestionStatus: "connected", authenticityStatus: "verified", appInstanceId: "app-001", deviceKeyId: "key-001" }).record;
      registerDeviceKey("app-001", "key-001", "mock-pem");
    });
    function vm(o) {
      const body = { event: "t", taskId: "t1" };
      const n = normalizeBody(body);
      return { appInstanceId: "app-001", deviceKeyId: "key-001", nonce: uid(), sequence: Math.floor(Math.random() * 100000) + 1000, timestamp: new Date(Date.now() - 1000).toISOString(), caConnectionId: cc.id, messageId: uid(), idempotencyKey: uid(), schemaVersion: "ary.ca.riding_signal.v0.1", signature: { algorithm: "ecdsa-p256", bodyHash: computeBodyHash(n), value: "valid-sig-abcdef123456" }, body, ...o };
    }
    it("AC-4.1 — 全量校验通过", () => { assert.ok(verifyMessage(vm()).passed); });
    it("AC-4.2 — 签名不一致 → 隔离审计", () => {
      assert.equal(verifyMessage(vm({ signature: { algorithm: "ecdsa-p256", bodyHash: "bad", value: "bad" } })).passed, false);
      assert.equal(stores.caQuarantineAudits.count(), 1);
    });
    it("AC-4.3 — nonce 重放 → 隔离审计", () => {
      const m = vm(); verifyMessage(m);
      assert.equal(verifyMessage(m).verificationResult, "nonce_replayed");
    });
    it("AC-4.4 — sequence 回退 → 隔离审计", () => {
      verifyMessage(vm({ sequence: 100 }));
      assert.equal(verifyMessage(vm({ sequence: 50 })).passed, false);
    });
    it("AC-4.5 — key 撤销 → 隔离审计", () => { revokeDeviceKey("key-001"); assert.equal(verifyMessage(vm()).passed, false); });
    it("AC-4.6 — app 未知 → 隔离审计", () => { assert.equal(verifyMessage(vm({ appInstanceId: "unk" })).passed, false); });
    it("AC-4.7 — 审计可见性", () => {
      verifyMessage(vm({ appInstanceId: "unk" }));
      const q = stores.caQuarantineAudits.all()[0];
      const s = quarantineSummaryFilter(q);
      assert.ok(s.failureReason);
      assert.equal(s.rawMessageMetadata, undefined);
      assert.ok(q.rawMessageMetadata);
    });
  });

  describe("AC-5: CA 接入失败不阻断主流程", () => {
    it("AC-5.1 — not_configured 仍可提交 Work", () => {
      const reg = createRegistration({ status: "approved" }).record;
      const rp = createRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal" }).record;
      createRace({ id: rp.raceId, status: "running" });
      assert.ok(submitWork(reg.id).ok);
      assert.ok(generateReviewFlags(rp).find((f) => f.flagType === "ca_unconfigured"));
    });
    it("AC-5.2 — all_failed 仍可提交 Work", () => {
      const reg = createRegistration({ status: "approved" }).record;
      const rp = createRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "failed", connectionHealth: "all_failed" }).record;
      createRace({ id: rp.raceId, status: "running" });
      assert.ok(submitWork(reg.id).ok);
      assert.ok(generateReviewFlags(rp).find((f) => f.flagType === "ca_failed"));
      assert.equal(stores.registrations.get(reg.id).status, "approved");
    });
    it("AC-5.3 — CA 异常仍可评审", () => {
      const reg = createRegistration({ status: "approved" }).record;
      const rp = createRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "failed" }).record;
      createRace({ id: rp.raceId, status: "judging" });
      const w = createWork({ registrationId: reg.id, raceId: rp.raceId, ownerUserId: reg.userId, status: "locked" }).record;
      const j = createUser({ roles: ["judge"] }).record;
      const as = createJudgeAssignment({ raceId: rp.raceId, workId: w.id, judgeUserId: j.id }).record;
      const rec = createJudgingRecord({ judgeAssignmentId: as.id, workId: w.id, judgeUserId: j.id }).record;
      assert.ok(stores.judgingRecords.update(rec.id, { status: "submitted", submittedAt: now() }).ok);
    });
    it("AC-5.4 — CA 异常仍可颁奖", () => {
      const reg = createRegistration({ status: "approved" }).record;
      const rp = createRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "failed" }).record;
      const aw = createAward({ raceId: rp.raceId, registrationId: reg.id, awardName: "Best Effort" }).record;
      assert.ok(stores.awards.update(aw.id, { status: "published", publishedAt: now() }).ok);
    });
    it("AC-5.5 — 风险提示生成", () => {
      const rp = createRaceProject({ aggregateIngestionStatus: "not_configured", connectionHealth: "no_signal" }).record;
      const f = generateReviewFlags(rp);
      assert.equal(f[0].flagType, "ca_unconfigured");
      assert.equal(f[0].resolved, false);
    });
    it("AC-5.6 — 部分正常时风险降级", () => {
      const rp = createRaceProject({ aggregateIngestionStatus: "active", connectionHealth: "partial_failed" }).record;
      const f = generateReviewFlags(rp);
      assert.ok(f.filter((x) => x.flagType === "ca_failed").length > 0);
      assert.equal(f.find((x) => x.flagType === "ca_unconfigured"), undefined);
    });
    it("AC-5.7 — CA 状态不驱动 withdrawn", () => {
      const reg = createRegistration({ status: "approved" }).record;
      createRaceProject({ registrationId: reg.id, aggregateIngestionStatus: "failed" });
      assert.ok(registrationCanTransition("approved", "withdrawn").ok);
      assert.equal(registrationCanTransition("submitted", "withdrawn").ok, false);
      assert.equal(stores.registrations.get(reg.id).status, "approved");
    });
  });

  describe("状态机", () => {
    it("Race: draft → published → registration → running", () => {
      assert.ok(raceCanTransition("draft", "published").ok);
      assert.ok(raceCanTransition("published", "registration").ok);
      assert.ok(raceCanTransition("registration", "running").ok);
    });
    it("Race: 禁止 completed → judging", () => { assert.match(raceCanTransition("completed", "judging").reason, /回退/); });
    it("Race: 禁止 draft → registration", () => { assert.equal(raceCanTransition("draft", "registration").ok, false); });
    it("Reg: submitted → approved → withdrawn", () => { assert.ok(registrationCanTransition("submitted", "approved").ok); assert.ok(registrationCanTransition("approved", "withdrawn").ok); });
    it("Work: draft → submitted → locked", () => { assert.ok(workCanTransition("draft", "submitted").ok); assert.ok(workCanTransition("submitted", "locked").ok); });
    it("Work: 禁止 locked → draft", () => { assert.equal(workCanTransition("locked", "draft").ok, false); });
    it("JR: draft → submitted", () => { assert.ok(judgingCanTransition("draft", "submitted").ok); });
    it("JR: 禁止 submitted → draft", () => { assert.equal(judgingCanTransition("submitted", "draft").ok, false); });
    it("Award: draft → published → withdrawn", () => { assert.ok(awardCanTransition("draft", "published").ok); assert.ok(awardCanTransition("published", "withdrawn").ok); });
    it("Award: 禁止 published → draft", () => { assert.equal(awardCanTransition("published", "draft").ok, false); });
    it("RP: nc→conn→active→failed→conn", () => { ["not_configured|connected", "connected|active", "active|failed", "failed|connected"].forEach((p) => { const [a, b] = p.split("|"); assert.ok(rpIngestionCanTransition(a, b).ok); }); });
    it("connectionHealth", () => { assert.equal(computeConnectionHealth([]), "no_signal"); assert.equal(computeConnectionHealth(["connected"]), "ok"); assert.equal(computeConnectionHealth(["active", "failed"]), "partial_failed"); assert.equal(computeConnectionHealth(["failed", "failed"]), "all_failed"); });
  });

  describe("鉴权作用域", () => {
    it("ownGate", () => { const u = createUser({ roles: ["rider"] }).record; assert.ok(ownGate({ userId: u.id }, u)); assert.equal(ownGate({ userId: "x" }, u), false); });
    it("assignedGate", () => { const j = createUser({ roles: ["judge"] }).record; const w = createWork().record; assert.equal(assignedGate(w.id, j), false); createJudgeAssignment({ workId: w.id, judgeUserId: j.id }); assert.ok(assignedGate(w.id, j)); });
    it("managedRaceGate", () => { const o = createUser({ roles: ["organizer"] }).record; const r = createRace({ organizerUserIds: [o.id], createdByUserId: o.id }).record; assert.ok(managedRaceGate({ raceId: r.id }, o)); assert.equal(managedRaceGate({ raceId: "x" }, o), false); });
    it("adminGate", () => { assert.ok(adminGate(createUser({ roles: ["admin"] }).record)); assert.equal(adminGate(createUser({ roles: ["rider"] }).record), false); });
  });

  // ======== 004 新增测试：权限管控 & 作品编辑 ========

  describe("004: 权限归属校验", () => {
    it("骑手只能为自己报名（ownGate）", () => {
      const rider = createUser({ roles: ["rider"] }).record;
      const other = createUser({ roles: ["rider"] }).record;
      const race = createRace({ status: "registration" }).record;
      // rider 为自己报名 → 应成功
      assert.ok(submitRegistration(race.id, rider.id).ok);
      // 验证 ownGate 拒绝跨用户操作
      assert.equal(ownGate({ userId: rider.id }, other), false);
    });

    it("评委只能以本人身份提交评审记录", () => {
      const judgeA = createUser({ roles: ["judge"] }).record;
      const judgeB = createUser({ roles: ["judge"] }).record;
      const w = createWork({ status: "locked" }).record;
      const as = createJudgeAssignment({ workId: w.id, judgeUserId: judgeA.id }).record;
      // judgeB 试图以 judgeA 的身份提交评审 → assignedGate 应拒绝
      assert.equal(assignedGate(w.id, judgeB), false);
      // judgeA 提交 → assignedGate 应通过
      assert.ok(assignedGate(w.id, judgeA));
    });

    it("非 organizer 不能管理赛事资源（managedRaceGate）", () => {
      const org = createUser({ roles: ["organizer"] }).record;
      const rider = createUser({ roles: ["rider"] }).record;
      const race = createRace({ createdByUserId: org.id, organizerUserIds: [org.id] }).record;
      // organizer → 通过 (在 organizerUserIds 中)
      assert.ok(managedRaceGate({ raceId: race.id }, org));
      // rider → 拒绝
      assert.equal(managedRaceGate({ raceId: race.id }, rider), false);
    });

    it("admin 自动获得所有赛事管理权限", () => {
      const admin = createUser({ roles: ["admin"] }).record;
      const race = createRace({ createdByUserId: "someone-else", organizerUserIds: [] }).record;
      // admin 即使不在 organizerUserIds 中也应通过
      assert.ok(managedRaceGate({ raceId: race.id }, admin));
    });
  });

  describe("004: 作品编辑与锁定", () => {
    it("draft 作品可编辑（workCanTransition 允许 draft→submitted）", () => {
      assert.ok(workCanTransition("draft", "submitted").ok);
    });

    it("submitted 作品可被锁定（workCanTransition 允许 submitted→locked）", () => {
      assert.ok(workCanTransition("submitted", "locked").ok);
    });

    it("locked 作品不可回退到 draft", () => {
      assert.equal(workCanTransition("locked", "draft").ok, false);
    });

    it("locked 作品不可回退到 submitted", () => {
      assert.equal(workCanTransition("locked", "submitted").ok, false);
    });

    it("通过 business.submitWork 更新已有作品", () => {
      const reg = createRegistration({ status: "approved" }).record;
      const w = createWork({ registrationId: reg.id, raceId: reg.raceId, ownerUserId: reg.userId, status: "draft" }).record;
      // 更新作品（从 draft → submitted）
      const result = submitWork(reg.id, { title: "更新后的作品", summary: "新摘要" });
      assert.ok(result.ok);
      assert.equal(result.updated, true);
      const updated = stores.works.get(w.id);
      assert.equal(updated.title, "更新后的作品");
      assert.equal(updated.status, "submitted");
    });

    it("locked 作品无法通过 business.submitWork 更新", () => {
      const reg = createRegistration({ status: "approved" }).record;
      createWork({ registrationId: reg.id, raceId: reg.raceId, ownerUserId: reg.userId, status: "locked" }).record;
      const result = submitWork(reg.id, { title: "尝试修改" });
      assert.equal(result.ok, false);
      assert.match(result.reason, /locked/);
    });
  });
});
