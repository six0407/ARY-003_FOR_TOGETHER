# STATUS

本文是 ARY 任务瞬时看板，记录当前任务状态、证据和风险。不记录历史流水。

## 最新同步

* `UX-1` 已完成最终收口，并已形成正式交付件 `docs/ux-1-closure-delivery.md` 与 `docs/m2-input-final-checklist.md`。
* 当前 `UX-1` 已可作为 `M2` 的正式设计输入之一，不再因缺少页面、样张或截图证据而阻断 `DEV-1`。
* `DEV-1` 已启动，项目根目录 `project/` 已整合 UX/UI 原型（`public/`）+ 架构实现（`src/`）+ 46 条全绿验收测试（`test/`）。

## 当前结论

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
| `PRD-1` 文档基线与范围确认 | 完成 | 文档基线已完成收口：PRD、领域、IA、权限、QA、计划、OPS 与 CA 草案已形成首轮一致性基线，`PRD-TEMP-1` 复审交付件已并入基线依据，并已补齐 `PRD-1` 正式交付件，当前可作为架构入口。 | `docs/ary.plan.md`、`docs/prd-1-delivery.md`、`docs/prd-temp-1-baseline-delivery.md` |
| `PRD-TEMP-1` 报名 / RaceProject / CA 参赛语义整改 | 复审完成 | 已完成三轮一致性复审与术语收口：主文档、计划文档和高保真原型均采用新口径；评审前风险提示统一命名为 `Review Flag`，对应检查流程统一命名为 `Review Flag Check`。建议将该临时任务并入正式 `PRD-1` 基线。 | `docs/registration-ca-rules-alignment.taskbook.md`、`docs/ary-mvp.prd.md`、`docs/ary-domain-analysis.v0.3.md`、`design-prototype/` |
| `UX-1` UX/UI 高保真原型与设计基线 | 完成 | 已形成正式收口记录与 `M2` 输入最终清单；Public、Console、Screen 三类体验面、状态样张、桌面端 / 移动端 / 单态证据均已纳入同一交付链。 | `docs/ux-1-closure-delivery.md`、`docs/m2-input-final-checklist.md`、`docs/ux-1-annotation-matrix.md`、`design-prototype/index.html` |
| `DEV-1` 领域模型 + 权限 + 数据模型 | 进行中 | 六类核心产物已形成，验收用例已在 `project/` 下通过 46 条可运行代码验证；下一步进入读模型刷新策略和审计操作流程图。 | `project/`、`docs/dev-1-architecture-baseline.md`、`docs/dev-1-data-model-draft.md`、`docs/dev-1-auth-policy.md`、`docs/dev-1-state-transitions.md`、`docs/dev-1-acceptance-tests.md` |
| `DEV-5` CA 接入 / Projection / Live Hall | 细化中 | 已将 CA 作为 Agent Race 工具、比赛信号源和评审参考的口径落盘；CAConnection 可在参赛过程中登记和握手，合法连接数据进入证据链，接入异常进入评审前风险提示；`task_progress` 仅用于 unblock / 说明，不做定期推送，且不设 `session_progress` push。 | `docs/ary-ca-integration-spec.md` |
| `REL-1` 赛事彩排 / 灰度发布 / 正式发布 | ✅ 完成 | 部署脚本 deploy.sh、健康检查 API /api/health、健康检查脚本 health-check.sh 已实现。 | `project/deploy.sh`、`project/health-check.sh`、`project/src/app.js` |
| `OPS-1` 赛事值守 / 回滚 / 赛后归档 | ✅ 完成 | 备份脚本 backup.sh、操作检查清单 OPS_CHECKLIST.md 已实现。 | `project/backup.sh`、`project/OPS_CHECKLIST.md` |

## 证据索引

| 结论 | 证据 |
| --- | --- |
| 文档集合存在且已集中到 `docs/` | `docs/*.md` |
| 长期任务定义入口为 `docs/ary.plan.md` | `docs/ary.plan.md` |
| `PRD-1` 文档基线已完成收口并可作为架构入口 | `docs/ary.plan.md`、`docs/prd-temp-1-baseline-delivery.md` |
| `PRD-1` 已形成正式任务交付件 | `docs/prd-1-delivery.md` |
| 实时 CA 消息防伪、防篡改机制已同步到主文档链路 | `docs/ary-mvp.prd.md`、`docs/ary-domain-analysis.v0.3.md`、`docs/ary-permission-matrix.md`、`docs/ary-ca-integration-spec.md`、`docs/ary-qa-plan.md`、`docs/ary-release-ops-plan.md` |
| 近期窗口入口为 `PLAN.md` | `PLAN.md` |
| CA 接入契约已形成原始骑行状态消息草案，仍需继续讨论完善 | `docs/ary-ca-integration-spec.md` |
| 报名 / RaceProject / CA 参赛语义整改已形成临时任务书 | `docs/registration-ca-rules-alignment.taskbook.md` |
| PRD-TEMP-1 复审已启动，并已清理领域事件中的旧命名残留 | `docs/ary-domain-analysis.v0.3.md`、`docs/registration-ca-rules-alignment.taskbook.md` |
| PRD-TEMP-1 第三轮收口已统一风险提示最终命名为 `Review Flag` / `Review Flag Check`，并修正原型中可能引起资格误读的文案 | `docs/ary-mvp.prd.md`、`docs/ary-domain-analysis.v0.3.md`、`docs/registration-ca-rules-alignment.taskbook.md`、`design-prototype/index.html`、`design-prototype/script.js` |
| 当前仓库包含设计原型 | `design-prototype/` |
| UX/UI 高保真原型已作为 `M2` 前置验收任务进入看板 | `PLAN.md`、`docs/ary.plan.md` |
| UX-1 本轮评审收口已正式启动，并已形成启动记录 | `docs/ux-1-review-start.md`、`docs/ux-hifi.taskbook.md` |
| UX-1 第一轮顺序复审已完成，并已形成首批页面级结论和 `M2` 输入判断 | `docs/ux-1-review-round-1.md` |
| UX-1 第二轮顺序补齐已完成：缺失体验面、真实性状态样张和最新截图证据已补上 | `docs/ux-1-review-round-2.md`、`design-prototype/ary-ux-review-admin-1080p.png`、`design-prototype/ary-ux-review-screen-console-1080p.png`、`design-prototype/ary-ux-review-rider-view-1080p.png`、`design-prototype/ary-ux-review-judge-view-1080p.png`、`design-prototype/ary-ux-review-work-detail-1080p.png` |
| UX-1 页面级标注产物已形成：组件、状态、空态、错误态、权限差异和数据依赖已有集中入口 | `docs/ux-1-annotation-matrix.md` |
| UX-1 空态 / 错误态集中样张页已形成，并已补充移动端关键视口证据 | `design-prototype/index.html`、`design-prototype/ary-ux-review-mobile-home.png`、`design-prototype/ary-ux-review-mobile-rider-view.png`、`design-prototype/ary-ux-review-mobile-state-samples.png`、`design-prototype/ary-ux-review-mobile-screen-display.png`、`docs/ux-1-review-round-2.md` |
| UX-1 空态 / 错误态现已具备按样张导出的网页端与移动端单态证据，不再依赖 `State Samples` 首屏概览图判断 | `design-prototype/ary-ux-review-state-public-works-empty-1080p.png`、`design-prototype/ary-ux-review-state-public-works-empty-mobile.png`、`design-prototype/ary-ux-review-state-public-live-fallback-1080p.png`、`design-prototype/ary-ux-review-state-public-live-fallback-mobile.png`、`design-prototype/ary-ux-review-state-rider-ca-setup-empty-1080p.png`、`design-prototype/ary-ux-review-state-rider-ca-setup-empty-mobile.png`、`design-prototype/ary-ux-review-state-judge-authenticity-warning-1080p.png`、`design-prototype/ary-ux-review-state-judge-authenticity-warning-mobile.png`、`design-prototype/ary-ux-review-state-admin-role-queue-empty-1080p.png`、`design-prototype/ary-ux-review-state-admin-role-queue-empty-mobile.png`、`design-prototype/ary-ux-review-state-screen-output-error-1080p.png`、`design-prototype/ary-ux-review-state-screen-output-error-mobile.png` |
| UX-1 已形成正式收口记录，可作为任务级完成依据 | `docs/ux-1-closure-delivery.md` |
| M2 架构设计输入最终清单已形成，可直接进入 `DEV-1` | `docs/m2-input-final-checklist.md` |
| DEV-1 第一批正式架构产物已形成，可作为后续字段级模型和接口设计的共同基线 | `docs/dev-1-architecture-baseline.md`、`docs/dev-1-delivery.md` |
| DEV-1 字段级数据模型草案已形成，覆盖全部写模型、接入审计和读模型方向 | `docs/dev-1-data-model-draft.md` |
| DEV-1 接口鉴权策略表已形成，覆盖 14 个资源、五类作用域和真实性附加规则 | `docs/dev-1-auth-policy.md` |
| DEV-1 核心链路状态迁移图已形成，覆盖 6 条核心链路和跨链路联动规则 | `docs/dev-1-state-transitions.md` |
| DEV-1 验收用例已形成，按 5 条验收项拆分为 30 条可逐条执行的测试场景 | `docs/dev-1-acceptance-tests.md` |
| UX-1 高保真原型已按 IA 和 1080P 视口修订并通过本地截图验证 | `design-prototype/index.html`、`design-prototype/*.png` |
| UX-1 样例赛事数据已生成并接入原型渲染，用于支撑 IA 页面密度和状态差异 | `design-prototype/data/sample-races.json`、`design-prototype/data/sample-races.js`、`design-prototype/script.js` |
| UX-1 页面可见文案已去除 PRD、需求说明和实现术语口吻 | `design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/data/sample-races.json`、`design-prototype/README.md` |
| UX-1 二级页面口号式大标题已降级为对象名和状态摘要 | `design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/styles.css` |
| UX-1 本轮 IA 整改已完成：公开导航边界、Home Gallery 模块、单场 Results、Works 筛选/详情入口、Race Riders 入口、Review 下一场、Rider 能力证据、Screen 输出/控制边界，且静态兜底与动态渲染一致 | `design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/styles.css` |
| UX-1 首页 IA 复审标准已落地：顶层导航不放 Race 子页面，CTA 依附具体 Race / 作品 / 合作场景，首页不设置独立 Leaderboards 模块 | `docs/ary-mvp.ia.md`、`design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/README.md` |
| UX-1 外审意见已落实：Hero 直接承载 Featured Race 信息，Latest Results / Past Races 去重，Next Entry 改为开放报名 / 合作入口，Header 按未登录态只显示 Login | `design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/styles.css`、`design-prototype/README.md` |
| UX-1 首页 Leaderboards 已撤销：Live Skill Board 从首页移除，过程榜保留在 Live Hall，最终榜保留在 Results | `docs/ary-mvp.ia.md`、`docs/ary-mvp.prd.md`、`docs/ux-hifi.taskbook.md`、`design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/styles.css` |
| UX-1 首页视觉复审已处理：右侧首卡从重复 Race Card 改为 Open Registration，首页 page-label 横线已隐藏，避免与 Public Header 分隔线冲突 | `design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/styles.css` |
| UX-1 首页 Live Now 结构已修正：独立 Live Now 框已撤销，Hero / Featured Races 直接支持 live Race 切换 | `docs/ary-mvp.ia.md`、`docs/ux-hifi.taskbook.md`、`design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/README.md` |
| UX-1 首页 title 层级已修正：不在顶部额外强调 Series / Gallery title，当前 Live Race title 居中成为首屏主标题，下划线式 Live Race 切换器位于标题下方，赛题位于切换器下方 | `design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/styles.css`、`design-prototype/README.md` |
| UX-1 品牌区 logo 已修正：使用 ico 原图展示，移除额外圆形套框、描边和外圈光晕 | `design-prototype/index.html`、`design-prototype/styles.css` |
| UX-1 首页布局节奏已调整：Header 更轻，Hero 信息组上移并压缩，赛道视觉下沉，作品 / Rider 卡缩高并落在赛道下缘，右侧信息栈与主 Hero 保持错落间距 | `design-prototype/styles.css` |
| UX-1 首页 Live Race 切换器已简化：取消重复赛事文字，只保留下划线式选择指示，并加入自动轮播切换 | `design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/styles.css`、`design-prototype/README.md` |
| UX-1 首页 Live Race 未激活切换线已增强为浅蓝可见状态，active 状态仍保持深蓝加长 | `design-prototype/styles.css` |
| UX-1 右侧信息卡头部状态标签已降噪：从高饱和蓝色实心 pill 改为浅蓝描边淡底标签，避免抢主 Hero 注意力 | `design-prototype/styles.css` |
| UX-1 首页赛道 Riding Signal 角标已移到赛道容器左上，避免与轨迹节点产生关系误读 | `design-prototype/script.js` |
| UX-1 首页右侧辅助信息已改为 Drawer：默认只露出窄 Rail，点击后从右侧滑出 Open Registration、Latest Results、Past Races 和 Cooperation 四个模块 | `design-prototype/index.html`、`design-prototype/script.js`、`design-prototype/styles.css`、`design-prototype/README.md` |
| UX-1 首页 Live Title 已按 Drawer 默认收起态重新居中，Hero 信息组与赛道主画布中轴对齐 | `design-prototype/styles.css` |
| UX-1 品牌区 logo 已替换为马头罗盘 PNG，生成透明底裁切版并按竖向比例调整 Header 图标容器 | `design-prototype/assets/logo-horse-compass-transparent.png`、`design-prototype/index.html`、`design-prototype/styles.css` |
| UX-1 首页设计与交互短视频已录制，覆盖默认首页、Live Race 切换、右侧 Drawer 打开 / 收起，并内嵌字幕说明 | `design-prototype/recordings/ary-homepage-demo.mp4` |
| UX-1 首页整改经验已沉淀为通用高保真页面工作流 Skill，并在任务书和原型 README 中引用；后续页面需先审 IA、补领域样例数据、复用已通过页面视觉 / 交互惯例，再浏览器复审 | `.agents/skills/hifi-ui-page-workflow/SKILL.md`、`docs/ux-hifi.taskbook.md`、`design-prototype/README.md` |

## 风险与阻塞

| 项目 | 状态 |
| --- | --- |
| 架构、数据模型和接口契约尚未完成 | `DEV-1` 前置风险 |
| UX/UI 高保真原型和关键页面状态尚未评审验收 | 已解除 |
| 提交准入边界、CAConnection 新增窗口和违规作品处理仍待正式规则细化 | 不再属于口径冲突；后续转入正式 Race Rules / `DEV-5` 细化 |
| 尚未建立可运行应用和测试命令 | 进入实现阶段前需确认技术栈 |
