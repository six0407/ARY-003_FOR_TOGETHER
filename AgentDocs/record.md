# record

## 2026-06-15
- 已读取 `race3/ary-grs-003-yunf161` 的根目录文档：`README.md`、`STATUS.md`、`PLAN.md`。
- 当前判断：仓库以文档与高保真原型为主，尚未进入应用代码与架构实现阶段。

## 2026-06-20 — DEV-3 第一阶段实现

### 背景
基于 `AgentDocs/devTask/dev3-design.md` 实现 DEV-3 核心框架。当前仓库已从 `ary-grs-003-DiSod` 迁徙到独立仓库 `ARY-003_FOR_TOGETHER`，5 人团队开始协作开发。

### 后端新增
| 文件 | 变更 | 说明 |
| --- | --- | --- |
| `project/src/app.js` | 新增 3 个 API | `GET /api/users/me`、`PUT /api/auth/users/:id/roles`、`/console` 和 `/admin` 路由 |

### 前端新增
| 文件 | 说明 | 状态 |
| --- | --- | --- |
| `project/public/console.html` | Console SPA：Home + Organizer/Rider/Judge 三视图框架 | ✅ 可访问 `/console` |
| `project/public/admin.html` | Admin Console：用户表格 + 角色编辑弹窗 | ✅ 可访问 `/admin` |

### 验证结果
- ✅ Console 页面加载正常，登录弹窗展示 3 个 Demo 用户
- ✅ 登录后 Header 显示用户名 + 角色标签，侧边栏按 role 展示关联赛事
- ✅ Console Home 按 role 分区展示（Organizer 看到 3 场赛事）
- ✅ Admin Console 表格展示 3 个用户，角色 pill 和资料状态正常
- ✅ 角色编辑弹窗可选/取消 4 个角色，调用 API 保存
- ✅ Organizer/Rider/Judge 工作台框架正常切换
- ✅ `npm test` 46 条全部通过

### 下一轮
- Rider View 接入 CA 和作品提交功能
- Organizer View 增强（创建赛事表单）
- Judge View 评审流程（待 DEV-4 API）
- 当前建议：优先评审 `UX-1` 高保真原型，并复审 `PRD-TEMP-1` 的文档一致性，再决定是否进入 `DEV-1`。
- 已为用户梳理推荐阅读顺序：先看 `STATUS.md` / `PLAN.md` 建立全局，再读 `docs/ary-mvp.prd.md`、`docs/registration-ca-rules-alignment.taskbook.md`、`docs/ary-mvp.ia.md`、`docs/ux-hifi.taskbook.md` 与 `design-prototype/`，最后根据目标补读领域、权限、QA、OPS 和 CA 契约文档。
- 已基于 `docs/registration-ca-rules-alignment.taskbook.md` 总结当前阶段待办：复审 PRD-TEMP-1 是否可并入正式基线、检查原型和文档是否仍残留旧 CA 资格门禁口径，并在 UX-1 评审通过前暂缓进入 `DEV-1`。

## 2026-06-20
- 已启动 `PRD-TEMP-1` 一致性复审，先全文搜索旧口径残留。
- 复审结论：主 PRD、IA、权限、QA、OPS、CA 契约和高保真原型已基本采用新口径，当前主要残留出现在 `docs/ary-domain-analysis.v0.3.md` 的旧事件命名。
- 已修复 `docs/ary-domain-analysis.v0.3.md`：将 `RaceProjectBound` 改为 `RaceProjectGenerated`，将 `RaceCAConnectionSetLocked` 改为 `CAConnectionAcceptanceWindowUpdated`。
- 已同步更新 `ary-grs-003-yunf161/STATUS.md`：将 `PRD-TEMP-1` 状态改为“复审中”，并记录本轮已清理的旧命名残留。
- 已完成第二轮复审：发现主要问题是 `Review Flag / Review Readiness` 命名顺序不一致，以及原型指挥席存在 `still eligible`、`judge note ready` 这类易被误读为资格判断的文案。
- 已修复第二轮问题：统一 `docs/ary-mvp.prd.md` 中风险提示命名顺序，将 `docs/ary-domain-analysis.v0.3.md` 中 `Review Readiness Check` 收敛为 `Review Flag Check`，并更新 `design-prototype/index.html`、`design-prototype/script.js` 的指挥席文案为风险提示语义。
- 已再次同步 `ary-grs-003-yunf161/STATUS.md`，记录第二轮复审的命名与原型语义修复结果。
- 已完成第三轮收口：将评审前风险提示最终统一命名为 `Review Flag`，对应检查流程统一为 `Review Flag Check`。
- 已同步修改 `docs/ary-domain-analysis.v0.3.md`、`docs/ary-mvp.prd.md`、`docs/registration-ca-rules-alignment.taskbook.md`、`ary-grs-003-yunf161/STATUS.md`，清除 `Review Readiness`、`EligibilitySignal`、`ComplianceFlag` 等待定式表述。
- 当前 PRD-TEMP-1 的主要术语已基本统一，下一步适合整理“是否并入正式基线”的复审结论。
- 已完成收口判断：当前剩余问题已不属于文档口径冲突，而属于后续正式 Race Rules / `DEV-5` 细化事项。
- 已更新 `docs/registration-ca-rules-alignment.taskbook.md`、`PLAN.md`、`STATUS.md`：将 `PRD-TEMP-1` 推进为“复审完成 / 建议并入 PRD-1 基线”，并把提交准入边界、CAConnection 新增窗口、违规作品处理转为后续细化事项。
- 已形成正式交付件 `docs/prd-temp-1-baseline-delivery.md`，用于承接 `PRD-TEMP-1` 的复审结论、并基线依据、后续细化事项和可交付判定。
- 已同步更新 `docs/README.md` 与 `docs/ary.plan.md`，将该交付件挂入文档索引和 `PRD-1` 的交付范围 / 验收口径。
- 已进一步完成 `PRD-1` 收口：更新 `STATUS.md`、`PLAN.md`，将 `PRD-1` 从“进行中”推进为“完成”，并明确 `M1` 文档基线可作为架构入口已满足。
- 用户指出 `PRD-1` 仅有基线材料但缺少任务级正式交付记录；已补充 `docs/prd-1-delivery.md`，覆盖可审查产物、验收记录、未完成项、风险和后续判断。
- 已同步更新 `docs/README.md`、`docs/ary.plan.md`、`STATUS.md`，将 `prd-1-delivery.md` 接入文档索引、任务定义和状态证据链。
- 已增补“防伪、防篡改”需求：在 `ary-mvp.prd.md`、`ary-ca-integration-spec.md`、`ary-mvp.ia.md`、`ary-qa-plan.md`、`ary-release-ops-plan.md` 中加入 DCR Desktop App 设备注册、消息签名、验签、防重放、隔离审计与真实性状态可见性要求。
- 已继续同步到剩余文档：`ary-domain-analysis.v0.3.md`、`ary-permission-matrix.md`、`registration-ca-rules-alignment.taskbook.md`、`prd-temp-1-baseline-delivery.md`、`prd-1-delivery.md`、`ary.plan.md`、`docs/README.md`、`STATUS.md` 现已纳入同一安全口径。
- 已在 `docs/ary-ca-integration-spec.md` 增补一段完整的带签名字段消息样例 JSON，覆盖 `appInstanceId`、`deviceKeyId`、`nonce`、`signature.algorithm`、`signature.bodyHash`、`signature.value` 以及服务端验签校验点。
- 已在 `docs/ary-ca-integration-spec.md` 继续增补“验签失败 / 重放攻击”失败样例 JSON，明确 `nonce_replayed`、`signature_body_hash_mismatch` 的隔离审计处理与 `verification_failed` / `quarantined` 状态语义。
- 已将 `verification_failed`、`quarantined` 明确写入 `docs/ary-mvp.ia.md` 的页面状态表和可见性规则，补齐 IA 层对真实性状态的正式表达。
- 已在 `docs/ary-permission-matrix.md` 增补 `view_authenticity_status`、`view_quarantine_audit_summary`、`view_quarantine_audit_detail` 动作，补齐真实性状态与隔离审计的权限边界。
- 已在 `docs/ary-qa-plan.md` 补充真实性状态与隔离审计的访问控制测试点，覆盖 Public / Rider / Judge / Organizer / Admin 的允许、拒绝和跨赛事越权场景。
- 已在 `docs/ary-release-ops-plan.md` 补充真实性异常告警分级、人工处置步骤和恢复准则，打通监控、隔离审计、人工响应和恢复边界。
- 已在 `docs/README.md` 和 `docs/prd-1-delivery.md` 增补“真实性安全链路已完成同步”的索引与交付说明，方便后续从入口文档快速定位整组改动。
- 已正式启动 `UX-1`：将 `docs/ux-hifi.taskbook.md` 从讨论稿切换为执行中，新增 `docs/ux-1-review-start.md` 作为本轮评审收口启动记录，并同步更新 `PLAN.md`、`STATUS.md` 的下一入口。
- 已依次执行 `UX-1` 第一轮评审：先复审 Public 主路径，再复审 Console / Admin / Screen 覆盖，形成 `docs/ux-1-review-round-1.md`，明确公开端可作为 `M2` 输入候选，但 Admin Console、Screen Console、Rider View、Judge View、Work Detail 和真实性状态样张仍待补齐。
- 已继续按顺序补齐 `UX-1`：在 `design-prototype/index.html` 中新增 `Admin Console`、`Screen Console`、`Rider View`、`Judge View`、`Work Page` 独立页面，补入 `verified`、`verification_failed`、`quarantined` 真实性状态样张，支持基于 URL hash 的页面直达，并生成 5 张新增页面截图；同步形成 `docs/ux-1-review-round-2.md` 并更新 `PLAN.md`、`STATUS.md`、`design-prototype/README.md`。
- 已补充 `docs/ux-1-annotation-matrix.md`，把 `UX-1` 所需的核心组件、页面状态、空态、错误态、权限差异和数据依赖收敛成独立标注产物，并同步接入 `PLAN.md`、`STATUS.md`、`docs/ux-1-review-round-2.md` 与 `design-prototype/README.md`。
- 已继续按顺序补齐 `UX-1`：在 `design-prototype/index.html` 中新增 `State Samples` 页面，集中承载 Public / Rider / Judge / Admin / Screen 的空态、错误态和权限感知异常摘要样张。
- 已生成当前版本移动端关键视口截图：`ary-ux-review-mobile-home.png`、`ary-ux-review-mobile-rider-view.png`、`ary-ux-review-mobile-state-samples.png`、`ary-ux-review-mobile-screen-display.png`；抽查后发现初版窄屏布局存在重叠问题，随后通过 `design-prototype/styles.css` 的移动端适配修复可读性，再重新生成有效证据。
- 已同步更新 `docs/ux-1-review-round-2.md`、`docs/ux-1-annotation-matrix.md`、`design-prototype/README.md`、`PLAN.md`、`STATUS.md`：将“空态 / 错误态样张”和“移动端同步证据”从待补缺口推进为已补齐事项；当前 `UX-1` 剩余重点已收敛为最终一致性复审和 `M2` 输入收口判断。
- 用户进一步指出“截图还不太行，没有呈现网页端的空态，移动端的也没有更新”；已定位根因不是样张缺失，而是 `State Samples` 只支持整页首屏截图，且桌面端标题层与卡片层发生重叠。
- 已在 `design-prototype/script.js` 中为 `State Samples` 增加按样张聚焦能力，支持通过 `#state-samples/<sample-id>` 直达单个状态卡；已在 `design-prototype/index.html` 为 6 个样张补充稳定 `data-state-sample-id`。
- 已在 `design-prototype/styles.css` 中为 `State Samples` 增加独立桌面布局和聚焦态样式，修复网页端大标题与样张卡片重叠问题。
- 已重新导出 6 组网页端 / 移动端单态截图：`public-works-empty`、`public-live-fallback`、`rider-ca-setup-empty`、`judge-authenticity-warning`、`admin-role-queue-empty`、`screen-output-error`，对应文件名前缀统一为 `ary-ux-review-state-*`；抽查确认网页端和移动端都已能独立呈现单个空态 / 错误态样张。
- 已基于现有页面覆盖、标注矩阵和最新截图证据形成正式收口文档 `docs/ux-1-closure.md`，将 `UX-1` 从“待最终判断”推进为“已完成收口，可作为 M2 正式设计输入之一”。
- 已形成 `docs/ux-1-m2-input-final.md`，把页面边界、组件族、状态模型、权限边界、数据依赖和必须继承到 M2 的强约束整理成最终清单。
- 当前下一步已从“继续补页面证据”切换为“消费 `UX-1` 输入进入 `DEV-1` / `M2` 架构设计”；`PLAN.md`、`STATUS.md` 需要同步到同一口径。
- 已基于当前证据形成 `docs/ux-1-closure-delivery.md`，正式记录 `UX-1` 的可审查交付物、验收结论、未完成项和进入后续任务判断。
- 已形成 `docs/m2-input-final-checklist.md`，把 Public、Console、Screen 三类体验面的页面、组件、状态、权限边界和读模型方向收敛成可直接进入 `DEV-1` 的架构输入清单。
- 已同步更新 `docs/README.md`、`docs/ux-hifi.taskbook.md`、`docs/ux-1-annotation-matrix.md`、`PLAN.md`、`STATUS.md`：将 `UX-1` 从“进行中”推进为“已收口 / 已完成”，并将 `DEV-1` 从“暂缓”推进为“可启动”。
- 已统一正式入口口径：`UX-1` 的任务级交付件以 `docs/ux-1-closure-delivery.md` 为准，`M2` 的正式架构输入清单以 `docs/m2-input-final-checklist.md` 为准；`PLAN.md` 与 `STATUS.md` 已同步到这组正式入口，避免与过程性收口笔记混用。
- 已正式启动 `DEV-1`，并按 `docs/ary.plan.md` 要求形成第一批正式产物：`docs/dev-1-architecture-baseline.md` 收敛聚合边界、存储边界和接口鉴权规则，`docs/dev-1-delivery.md` 记录验收覆盖、未完成项和下一入口。
- 已同步更新 `docs/README.md`、`PLAN.md`、`STATUS.md`：将 `DEV-1` 从“可启动”推进为“进行中 / 已启动”，并把当前入口切换到 `dev-1-architecture-baseline.md` 与 `dev-1-delivery.md`。- 已基于 `dev-1-architecture-baseline.md` 形成 `docs/dev-1-data-model-draft.md`，按存储边界逐表展开字段级定义：覆盖 10 个写模型存储单元、3 个接入与审计存储单元、10 个读模型方向，并汇总了全局关联键和唯一键方向。
- 已同步更新 `docs/dev-1-delivery.md`、`docs/README.md`、`STATUS.md` 和 `docs/dev-1-architecture-baseline.md`：将"字段级数据模型草案"从未完成项移除，并将 DEV-1 当前入口统一到三份协同文档。
- 已继续按工作流推进，形成 `docs/dev-1-auth-policy.md`（14 个资源的动作级鉴权策略表，含五类作用域判定函数和真实性附加规则）和 `docs/dev-1-state-transitions.md`（6 条核心链路的状态迁移表，含合法迁移、禁止迁移和跨链路联动规则）。
- 已同步更新 `docs/dev-1-delivery.md`、`docs/README.md`、`STATUS.md`：将"接口草案"和"核心链路状态迁移图"从未完成项移除；DEV-1 当前剩余未完成项收敛为读模型刷新策略和审计操作流程图。
- 已基于 `ary.plan.md` DEV-1 的五条验收项构造 `docs/dev-1-acceptance-tests.md`：30 条逐条可执行的测试场景，覆盖唯一键约束（AC-1）、结构幂等和 CAConnection 多登记（AC-2）、有效数据准入（AC-3）、DCR Desktop App 安全校验七种失败路径（AC-4）、CA 接入失败不阻断主流程七条验证（AC-5），每条均标注了当前 DEV-1 产物中的具体落点。
- 已同步更新 `docs/dev-1-delivery.md`、`docs/README.md`、`STATUS.md`：验收用例已接入 DEV-1 交付链。当前 DEV-1 剩余待补项为读模型刷新策略与审计操作流程图。
- 已实现 DEV-1 可运行验证：在 `packages/dev-1-impl/` 下用纯 Node.js（零依赖）建了 4 个核心模块——`stores.js`（14 个内存存储 + 唯一键索引）、`auth.js`（五类作用域中间件）、`state-machine.js`（6 条核心链路状态迁移）、`ca-verifier.js`（DCR Desktop App 验签/防重放/隔离审计管道）——以及 1 份 `acceptance.test.js`，共 46 条测试用例，`node --test` 全绿（46 pass / 0 fail）。
- 已建立正式项目根目录 `project/`：将 DEV-1 实现从 `packages/dev-1-impl/` 迁入 `project/src/` 和 `project/test/`，补入 `project/README.md`（引用 `design-prototype/` 和 `docs/` 作为上下游约束），`project/package.json` 支持 `npm test` 一键跑通全部 46 条用例。
- 已将设计原型完整接入 `project/public/`：`index.html`、`styles.css`、`script.js`、`data/`、`assets/`（含 `logo-horse-compass-transparent.png`）、全部 24 张截图证据；添加 `project/server.js` 零依赖静态服务，`npm start` → `http://localhost:3000` 可在浏览器中查看 16 个高保真页面和空态/错误态样张。

## 2026-06-20 — DEV-3 第二阶段增强

### 完成内容
基于第一阶段反馈，大幅增强了 Console 的实用功能：

| 功能 | 说明 | 状态 |
| --- | --- | --- |
| **Organizer 标签页** | 概览/报名管理/创建赛事 三个标签页 | ✅ |
| **报名管理面板** | 显示报名用户详情、GitHub ID、时间、RaceProject 状态、审核按钮 | ✅ |
| **创建赛事表单** | 输入名称/赛题/slug/状态，POST /api/races 创建 | ✅ |
| **Rider 标签页** | 概览/CA接入/作品提交 三个标签页 | ✅ |
| **Rider 概览** | 报名状态、RaceProject、约束校验（DEV-1）、CA 连接摘要 | ✅ |
| **CA 接入管理** | 登记 CA 连接（connector/project/type）、展示连接列表 | ✅ |
| **作品提交** | 创建/提交作品表单（标题/摘要/代码仓库链接） | ✅ |
| **创建赛事 API** | 后端 POST /api/races 支持新建赛事 | ✅ |
| **数据刷新** | refreshData() 统一刷新所有数据，保持 UI 同步 | ✅ |

### 浏览器验证
- ✅ Console 页面 `http://localhost:3000/console` 正常渲染
- ✅ 侧边栏展示 3 场赛事 + Admin 管理入口
- ✅ Organizer 工作台三个标签页切换正常（概览/报名管理/创建赛事）
- ✅ Organizer 概览：报名统计(1/1/0)、赛程日期、作品数
- ✅ Organizer 报名管理：骑手小明信息完整
- ✅ Organizer 创建赛事：表单字段正常
- ✅ 现有 46 条测试全部通过

### 文件变更
| 文件 | 变更 |
| --- | --- |
| `project/public/console.html` | 重写 JS，添加标签页系统、CA 管理、作品提交、创建赛事表单 |
| `project/src/app.js` | 新增 `POST /api/races` 创建赛事接口 |

### 未完成
- [ ] Judge View 评审流程（待 DEV-4 API 就绪）
- [ ] GitHub OAuth 真实登录（当前为 Demo 模式）
- [ ] Public Site 和 Console 之间的统一导航

## 2026-06-21 — DEV-4 实现完成 + 兼容性验证

### 新增功能

| 功能 | 说明 | 状态 |
| --- | --- | --- |
| **评委管理** | Organizer 可为作品分配评委 + 查看评审进度 | ✅ |
| **评审打分** | Judge 查看分配作品 → 作品分/骑行分/评语 → 提交 | ✅ |
| **奖项发布** | Organizer 创建奖项草稿 → 发布 | ✅ |
| **报名拒绝** | Organizer 可拒绝报名并填写原因 | ✅ |
| **赛事状态变更** | Organizer 概览可切换 race status 下拉框 | ✅ |
| **评委侧边栏** | Judge 用户侧边栏显示待评审赛事 | ✅ |

### 新增后端 API（10 个）

```
POST/GET/DELETE /api/judge-assignments   — 评委分配
POST/GET        /api/judging-records      — 评审记录
GET/POST        /api/awards               — 奖项管理
PUT             /api/awards/:id/publish   — 发布奖项
PUT             /api/registrations/:id/reject — 拒绝报名
PUT             /api/races/:id            — 更新赛事
```

### 全链路闭环验证

```
创建赛事(draft→published→registration)
  → 选手报名(submitted)
    → Organizer 审核 approve (自动生成 RaceProject)
      → 选手提交 Work
        → Organizer 分配评委
          → Judge 评分(作品分+骑行分+评语)
            → Organizer 创建+发布奖项
              → 公开端 Results 展示
```

### 兼容性检查结果

| 维度 | 检查项 | 结果 |
| --- | --- | --- |
| **DEV-1** | 46 条验收测试 | ✅ 全部通过 |
| **DEV-1** | 状态机约束 | ✅ 未改动 |
| **DEV-1** | 数据模型 | ✅ judge_assignments/judging_records/awards 已有 schema |
| **DEV-2** | `/` 首页 | ✅ 正常 |
| **DEV-2** | `/works.html` 作品 | ✅ 正常 |
| **DEV-2** | `/results.html` 赛果 | ✅ 正常（读取 awards 表） |
| **DEV-2** | `/race.html` 详情 | ✅ 正常 + CTA 按钮 |
| **DEV-2** | Console 导航 | ✅ 指向 `/console` |
| **DEV-3** | Console 登录/登出 | ✅ 正常 |
| **DEV-3** | Admin Console | ✅ 角色编辑正常 |
| **DEV-3** | Organizer 工作台 | ✅ 概览/报名/评委/奖项/创建赛事 |
| **DEV-3** | Rider 工作台 | ✅ 概览/CA/作品 |
| **DEV-3** | Judge 工作台 | ✅ 新增 待评审/已评审 |

### 发现并修复的问题

| 问题 | 修复 |
| --- | --- |
| 新 API 部署后 Console 请求 404 | 重启服务器即可 |
| 评委用户侧边栏无赛事 | 增加 `isJudge` 过滤逻辑 |

## 2026-06-21 — DEV-5 + DEV-6 + DEV-7 完成

### 新增功能

| 任务 | 功能 | 说明 |
| --- | --- | --- |
| **DEV-5** | CA 消息接入 | `POST /api/ca/message` 接收骑行信号，自动验签+存储+投影 |
| **DEV-5** | Projection 引擎 | 自动聚合 tokens/进度/Sessions，风险检测，实时排行 |
| **DEV-5** | Live Hall | `/live-hall?raceId=X` 深色主题实况页，骑手卡片+指标+事件流 |
| **DEV-5** | Session 管理 | `POST/GET /api/sessions` 创建和查询骑行会话 |
| **DEV-6** | Screen Console | `/screen` 大屏控制台，5种模式切换+全屏+10秒轮询 |
| **DEV-6** | Jumbotron/Billboard/Live | 三种大屏展示模式，适合现场/课堂/直播 |
| **DEV-6** | 榜单/作品展示 | Leaderboard 排名表 + Works 展示模式 |
| **DEV-7** | Report 生成器 | `POST /api/reports/generate` 三种报告类型 |
| **DEV-7** | 赛事报告 | race_report — 赛事统计+获奖名单 |
| **DEV-7** | 骑行报告 | rider_report — 选手成绩+指标+奖项 |
| **DEV-7** | 评审总结 | review_summary — 评审结果+获奖理由 |

### 新增页面

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| Live Hall | `/live-hall?raceId=X` | 深色主题赛事实况 |
| Screen Console | `/screen` | 大屏控制台（5种模式） |

### 新增 API（12 个）

```
POST /api/ca/message           — 接收骑行信号
GET  /api/ca/messages          — 查询消息
GET  /api/live-hall/:raceId    — 实况投影数据
GET  /api/projections/:rpId    — 选手投影
POST /api/sessions             — 创建Session
GET  /api/sessions             — 查询Session
POST /api/reports/generate     — 生成报告
GET  /api/reports              — 查询报告
PUT  /api/reports/:id/publish  — 发布报告
```

### 兼容性检查

| 维度 | 结果 |
| --- | --- |
| DEV-1 测试 46 条 | ✅ 全部通过 |
| 无破坏性变更 | ✅ 所有现有 API 和页面正常 |