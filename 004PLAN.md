# 004 更新计划

> 基线：003 全部完成（2026-06-21），三位同学合入 3 个 PR（7月15日）
> 当前代码：46 条架构测试全绿，API 测试待修复
> 上游入口：`docs/ary.plan.md`、`AgentDocs/03-open-questions.md`、`AgentDocs/01-ary-project-analysis.md`

---

## 一、003 当前状态

| 维度 | 003 交付 | 当前实际 |
| --- | --- | --- |
| **后端 API** | Express 5 + SQLite，~45 个端点 | ✅ 六次元已加中间件架构（auth-guard/error-handler/response/validate/logger） |
| **前端页面** | 15 个原生 HTML 页面 | ✅ 何争霖已做 UI 全面重构（HSL 玻璃拟态 + Outfit 字体） |
| **架构测试** | 46 条验收测试 | ✅ 全部通过 |
| **API 测试** | 无 | ⚠️ 六次元新加 `api.test.js`（231 行）存在 `requireAuth` 重复声明错误 |
| **权限修复** | 基础鉴权 | ✅ 何争霖已修复鉴权缺陷和状态机强规则 |
| **运维脚本** | deploy/backup/health-check/ops-checklist | ✅ 就绪 |

---

## 二、三位同学 PR 成果

### PR #1 — 何争霖：权限安全修复

```
b6b6b6f  fix(security): 修复 API 鉴权缺陷、状态机流转强规则及控制台交互 Bug
```

| 变更 | 影响 |
| --- | --- |
| `app.js` +210 行 | 状态机强规则、鉴权缺陷修复 |
| `console.html` +104 行 | 控制台交互 Bug 修复 |
| `admin.html` +56 行 | 管理后台增强 |
| `live-hall.html` +43 行 | 实况页修复 |
| `work.html` / `works.html` | 作品页修复 |

### PR #2 — six0407：后端架构优化

```
cad4af8  004第一次后端优化
```

| 新增文件 | 说明 |
| --- | --- |
| `project/src/config.js` | 🆕 配置管理模块 |
| `project/src/logger.js` | 🆕 结构化日志模块 |
| `project/src/response.js` | 🆕 统一响应格式 |
| `project/src/validate.js` | 🆕 参数校验模块 |
| `project/src/middleware/auth-guard.js` | 🆕 鉴权中间件 |
| `project/src/middleware/error-handler.js` | 🆕 错误处理中间件 |
| `project/.env.example` | 🆕 环境变量模板 |
| `project/test/api.test.js` | 🆕 API 集成测试（231 行，当前有冲突） |
| `app.js` 重构 | +237/-208 行，引入中间件架构 |
| `db.js` / `package.json` | 小优化 |

### PR #3 — 何争霖：UI 视觉重构

```
c82d89b  feat(ui): 全面重构前端页面样式，引入 HSL 玻璃拟态设计与 Outfit 字体字重排版
3f229f0  feat(ui): 优化日期时间格式、空状态样式及数据卡片布局
6983279  小修复
```

| 文件 | 幅度 | 变化 |
| --- | --- | --- |
| `app.css` | +594 行 | HSL 玻璃拟态主题系统、Outfit 字体排版 |
| `console.html` | +763/-301 行 | 大幅重构：日期格式、数据卡片、空状态 |
| `live-hall.html` | +190 行 | 深色主题实况页样式增强 |
| `race.html` | +82 行 | 赛事详情页样式梳理 |
| `home.html` / `works.html` / `work.html` | 样式优化 | 整体视觉升级 |

---

## 三、004 待办方向

### 3.1 🔴 P0 — 阻塞问题修复

| 问题 | 说明 | 负责人 |
| --- | --- | --- |
| **API 测试修复** | `api.test.js` 中 `requireAuth` 重复声明，导致测试无法运行 | 六次元 |
| **中间件兼容** | 新中间件架构与旧代码的兼容性验证 | 六次元 |
| **前端回归** | UI 重构后各页面功能是否正常（特别是 Live Hall、Screen） | 何争霖 |

### 3.2 🟡 P1 — 技术升级（需团队决策）

参考 `AgentDocs/03-open-questions.md` 的技术选型议题：

| 方向 | 当前 (003) | 004 目标 | 依赖决策 |
| --- | --- | --- | --- |
| **前端框架** | 原生 HTML/CSS/JS | React/Vue/Next.js 组件化 | 需开会决定 |
| **后端框架** | Express 5 + SQLite (sql.js) | 评估 NestJS / Spring Boot | 需开会决定 |
| **数据库** | SQLite（内存加载） | PostgreSQL + JSONB / Prisma | 需开会决定 |
| **实时通讯** | HTTP 轮询（10s） | WebSocket 长连接 | 需开会决定 |
| **登录鉴权** | Demo 免密选用户 | 真实 GitHub OAuth | 需对接老师 |

### 3.3 🟡 P2 — 功能完善

| 方向 | 003 现状 | 004 目标 | 参考文档 |
| --- | --- | --- | --- |
| **DCR 验签算法** | HMAC-SHA256 框架已有 | 与老师确认后正式实现 | `ary-ca-integration-spec.md` |
| **CA 密钥展示策略** | 基础实现 | 决策：只显示一次 vs 随时查看 | `03-open-questions.md` Part 3 |
| **验签失败展示** | 无 | Judge 视角红标 / Risk Audit 面板 | `03-open-questions.md` Part 3 |
| **Rider Profile** | 基础页 | 完善骑手能力档案 | `ary-mvp.ia.md` |
| **前端还原度** | 基本还原（何争霖已升级） | 全面对齐高保真原型 | `design-prototype/index.html` |

### 3.4 🟢 P3 — 工程化

| 方向 | 003 现状 | 004 目标 | 参考 |
| --- | --- | --- | --- |
| **测试覆盖** | 46 条架构测试 | API 集成测试（六次元已加 231 行，待修复）+ 前端 E2E | `ary-qa-plan.md` |
| **错误处理** | 基础 try-catch | 统一错误码 + 全局异常处理（六次元已加 error-handler） | `ary-release-ops-plan.md` |
| **日志系统** | console.log | 结构化日志（六次元已加 logger） | `ary-release-ops-plan.md` |
| **CI/CD** | 无 | GitHub Actions 自动测试 | `ary-release-ops-plan.md` |

---

## 四、任务优先级建议

```
🔴 P0 阻塞修复（立即）
  ├─ 修复 api.test.js 重复声明错误
  ├─ 前端重构后功能回归测试
  └─ 中间件兼容性验证

🟡 P1 技术选型（本周内决策）
  ├─ 开会决定前后端框架 / 数据库 / 实时通讯 / OAuth
  └─ 选定后重构脚手架

🟡 P2 功能完善（并行推进）
  ├─ DCR 验签算法确认与实现
  ├─ CA 密钥展示策略落地
  ├─ Judge 验签失败红标
  └─ Rider Profile 增强

🟢 P3 工程化（持续改进）
  ├─ 补充 API 集成测试
  ├─ CI/CD 接入
  └─ 日志/错误监控完善
```

---

## 五、决策清单（需团队对齐）

| # | 议题 | 选项 | 截止时间 |
| --- | --- | --- | --- |
| 1 | 前端框架 | React+Vite / Next.js / 保持原生 | 本周 |
| 2 | 后端框架 | Express 继续增强 / NestJS / Spring Boot | 本周 |
| 3 | 数据库 | SQLite 继续 / PostgreSQL + Prisma | 本周 |
| 4 | 实时通讯 | HTTP 轮询 / WebSocket | 本周 |
| 5 | 登录 | Demo 模式 / GitHub OAuth | 本周 |
| 6 | CA 密钥展示 | 仅首次 / 随时可查 | 本周 |
| 7 | 验签失败展示 | 红标 / Risk Audit 面板 | 本周 |
| 8 | DCR 验签算法 | 需向老师确认 HMAC-SHA256 细节 | ASAP |

---

## 六、参考文档索引

| 文档 | 用途 |
| --- | --- |
| `docs/ary-mvp.prd.md` | 产品目标和 MVP 范围 |
| `docs/ary.plan.md` | 研发任务定义和验收标准 |
| `docs/ary-ca-integration-spec.md` | CA 接入契约 |
| `docs/ary-qa-plan.md` | 测试和质量门规则 |
| `docs/ary-permission-matrix.md` | 资源权限规则 |
| `AgentDocs/03-open-questions.md` | 技术选型待决策议题 |
| `AgentDocs/01-ary-project-analysis.md` | 项目全局分析和 DoD 定义 |
