# STATUS

本文是 ARY 任务瞬时看板，记录当前任务状态、证据和风险。不记录历史流水。

## 最新同步

* 全部 11 个正式任务（PRD-1 / UX-1 / DEV-1~7 / REL-1 / OPS-1）均已完成。
* `npm test` — **46 条全部通过**（覆盖 AC-1~AC-5 + 状态机 + 鉴权作用域）。
* 后端 45 个 API 端点已实现（Express + SQLite），前端 15 个 HTML 页面已交付。
* 仓库已从 `ary-grs-003-DiSod` 迁移到独立仓库 `ARY-003_FOR_TOGETHER`，5 人团队通过 Git 分支协作。
* 当前阶段：003 最终提交已完成，等待进入 004（在 003 基础上优化升级）。

## 当前结论

* 项目 MVP 全部任务已完成，形成"快速原型"级别的完整前后端系统。
* 技术栈：Express 5 + SQLite（sql.js）+ 原生 HTML/CSS/JS（零前端框架依赖）。
* 登录为 Demo 模式（免密选用户），未接入真实 GitHub OAuth。
* 实时通讯采用 HTTP 轮询（10 秒），未实现 WebSocket。
* `AgentDocs/03-open-questions.md` 中的技术选型与架构升级决策尚未落地。
* 004 作业预期在 003 代码基础上进行优化升级（详见 `PLAN.md` 下一步）。
* 项目已完成 MVP 文档基线收口，并已完成 DEV-1 的基础架构落地与验收。
* 业务文档已集中到 `docs/` 下。
* 当前正式项目任务定义入口是 `docs/ary.plan.md`。
* `PRD-TEMP-1` 已完成复审，报名、RaceProject 自动生成、CAConnection 动态接入和评审前风险提示的新口径已同步到主要文档和高保真原型，术语已完成统一。
* 新增“防伪、防篡改”需求已同步到 PRD、领域、IA、权限、QA、OPS 和 CA 契约：比赛中的实时 CA 消息必须通过已登记的 DCR Desktop App 上报，并经过设备身份、消息签名和防重放校验。
* `UX-1` 已完成收口：高保真原型、页面级标注产物、状态样张和跨视口截图证据已形成，并已转化为 `M2` 架构设计输入清单。
* 应用代码已在 `project/` 目录落地，包含后端架构实现与前端原型，并已通过 `npm test` 46 条核心验收用例，具备基本的测试和部署配置。

## 任务看板

| 任务 | 状态 | 当前判断 | 证据 / 下一入口 |
| --- | --- | --- | --- |
| `PRD-1` 文档基线与范围确认 | ✅ 完成 | 文档基线已完成收口，可作为架构入口。 | `docs/prd-1-delivery.md` |
| `PRD-TEMP-1` 报名 / RaceProject / CA 参赛语义整改 | ✅ 复审完成 | 已并入 PRD-1 基线，术语统一为 Review Flag / Review Flag Check。 | `docs/prd-temp-1-baseline-delivery.md` |
| `UX-1` UX/UI 高保真原型与设计基线 | ✅ 完成 | 已形成正式收口记录与 M2 输入最终清单。 | `docs/ux-1-closure-delivery.md`、`design-prototype/index.html` |
| `DEV-1` 领域模型 + 权限 + 数据模型 | ✅ 完成 | 46 条验收测试全绿；stores/auth/state-machine/ca-verifier 四个核心模块已实现。 | `project/src/`、`project/test/` |
| `DEV-2` Public Site 静态闭环 | ✅ 完成 | 8 个公开页面：home / race / works / work / results / review / cooperation / rider。 | `project/public/home.html` 等 |
| `DEV-3` 登录 / 角色 / Race Console | ✅ 完成 | Console SPA（Organizer/Rider/Judge 三视图）+ Admin Console 角色管理。 | `project/public/console.html`、`project/public/admin.html` |
| `DEV-4` 报名 / RaceProject / Work / Judge 结构流程 | ✅ 完成 | 10 个后端 API + 完整闭环：报名→审核→作品提交→评委分配→评审打分→奖项发布。 | `project/src/app.js` L600-L745 |
| `DEV-5` CA 接入 / Projection / Live Hall | ✅ 完成 | CA 消息接收+验签+投影引擎 + Live Hall 深色主题实况页。 | `project/public/live-hall.html`、`project/src/app.js` L422-L600 |
| `DEV-6` Screen Console / 大屏联调 | ✅ 完成 | 大屏控制台 5 种模式切换 + 全屏 + 10 秒轮询。 | `project/public/screen.html` |
| `DEV-7` Report / Review / Results | ✅ 完成 | 报告生成器：race_report / rider_report / review_summary 三种类型。 | `project/src/app.js` L753-L850 |
| `REL-1` 赛事彩排 / 灰度发布 / 正式发布 | ✅ 完成 | deploy.sh（staging/production）+ health-check.sh + /api/health。 | `project/deploy.sh`、`project/health-check.sh` |
| `OPS-1` 赛事值守 / 回滚 / 赛后归档 | ✅ 完成 | backup.sh（4 种模式）+ OPS_CHECKLIST.md（含冻结窗口/彩排/值守/回滚/归档）。 | `project/backup.sh`、`project/OPS_CHECKLIST.md` |

## 证据索引

| 结论 | 证据 |
| --- | --- |
| 全部 46 条测试通过 | `npm test` → 46 pass / 0 fail |
| 45 个后端 API 端点已实现 | `project/src/app.js` |
| 15 个前端页面已交付 | `project/public/*.html` |
| Express + SQLite 全栈可运行 | `project/package.json` → `npm install && npm start` |
| 文档集合存在且已集中到 `docs/` | `docs/*.md` |
| 长期任务定义入口为 `docs/ary.plan.md` | `docs/ary.plan.md` |
| Agent 协作规则 | `AGENTS.md` |
| 团队协作与版本更新指引 | `版本更新指引.md` |
| 高保真原型可浏览 | `design-prototype/index.html` |
| AgentDocs 指引文档 | `AgentDocs/`（01 项目分析 / 02 全局设计 / 03 待决策问题 / record 工作日志） |
| 任务设计文档 | `AgentDocs/devTask/`（dev3-4 / dev3 / dev5 / rel1-ops1） |

## 风险与阻塞

| 项目 | 状态 |
| --- | --- |
| Demo 登录模式，未接入真实 GitHub OAuth | 004 待升级 |
| SQLite 单文件数据库，不适合生产并发 | 004 待评估是否升级到 PostgreSQL |
| 前端原生 HTML/JS，未使用 React/Vue 框架 | 004 待决策前端工程化方案 |
| HTTP 轮询而非 WebSocket，Live Hall 实时性受限 | 004 待升级 |
| DCR 验签算法（HMAC-SHA256 vs RSA）尚未与老师确认 | 待外部确认 |
| `03-open-questions.md` 中技术选型与分工决策待落地 | 进入 004 前需团队对齐 |
