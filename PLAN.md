# PLAN

本文是 ARY 近期任务窗口，记录近期要推进的任务和里程碑。长期任务定义见 `docs/ary.plan.md`；任务瞬时状态见 `STATUS.md`。

## 当前阶段

003 最终提交已全部完成（PRD-1 / UX-1 / DEV-1~7 / REL-1 / OPS-1 ✅）。当前等待进入 **004**（在 003 代码基础上优化升级）。

## 003 交付物总览

| 层面 | 内容 | 状态 |
| --- | --- | --- |
| **文档基线** | PRD、领域模型、IA、权限矩阵、QA Plan、Release & Ops Plan | ✅ |
| **高保真原型** | 16 个页面 + 状态样张 + 桌面/移动端截图证据 | ✅ |
| **后端 API** | Express 5 + SQLite，45 个端点 | ✅ |
| **前端页面** | 15 个 HTML 页面（Public Site + Console + Admin + Live Hall + Screen） | ✅ |
| **架构验证** | 46 条验收测试全绿（AC-1~AC-5 + 状态机 + 鉴权） | ✅ |
| **运维脚本** | deploy.sh / backup.sh / health-check.sh / OPS_CHECKLIST.md | ✅ |

## 004 待办方向

根据 `AgentDocs/03-open-questions.md` 和 `AgentDocs/01-ary-project-analysis.md` 的 DoD 标准，004 预期在以下方向进行优化：

### 技术升级

| 方向 | 003 现状 | 004 目标（待决策） |
| --- | --- | --- |
| **前端框架** | 原生 HTML/CSS/JS | React/Vue 组件化，对齐高保真原型 |
| **后端框架** | Express 5 + SQLite | 评估 NestJS/Spring Boot |
| **数据库** | SQLite（sql.js 内存加载） | 评估 PostgreSQL + Redis |
| **实时通讯** | HTTP 轮询（10 秒） | 评估 WebSocket 长连接 |
| **登录鉴权** | Demo 模式（免密选用户） | 真实 GitHub OAuth |

### 功能完善

| 方向 | 003 现状 | 004 目标 |
| --- | --- | --- |
| **DCR 验签** | 代码框架已有，算法待确认 | 与老师确认后正式实现 |
| **CA 密钥展示** | 基础实现 | 决定策略（只显示一次 vs 随时查看） |
| **验签失败展示** | 无 | Judge 视角打红标或独立 Risk Audit 面板 |
| **Rider Profile** | 基础页面 | 完善骑手能力档案 |
| **前端还原度** | 基本还原 | 全面提升至高保真原型标准 |

### 工程化

| 方向 | 003 现状 | 004 目标 |
| --- | --- | --- |
| **测试覆盖** | 46 条架构层测试 | 补充 API 集成测试 + 前端 E2E |
| **错误处理** | 基础 try-catch | 统一错误码 + 全局异常处理 |
| **日志系统** | console.log | 结构化日志 |
| **CI/CD** | 无 | 评估 GitHub Actions |

## 近期里程碑

| 里程碑 | 完成口径 |
| --- | --- |
| `M1` 文档基线可作为架构入口 | ✅ 已满足（003） |
| `M2` 架构设计输入就绪 | ✅ 已满足（003） |
| `M3` 003 全部任务完成 | ✅ 已满足（2026-06-21） |
| `M4` 004 技术选型决策完成 | 待团队对齐 `03-open-questions.md` |

## 下一步

1. **必做**：团队阅读 `AgentDocs/03-open-questions.md`，开会敲定 004 的技术选型和分工。
2. **必做**：查看 GitHub Classroom 作业链接（README.md 顶部）确认 004 的具体要求和截止日期。
3. **建议**：确认 DCR 验签算法细节（与老师/助教沟通）。
4. **建议**：以 `AgentDocs/02-ary-global-design.md` 中的目标架构为蓝图，按优先级逐项升级。

## 执行纪律

* 开工前读取对应任务在 `docs/ary.plan.md` 中的定义。
* 近期窗口变化时更新本文；任务状态变化时更新 `STATUS.md`。
* 实施前确认目标、产出、验收口径和不做事项。
* 重要结论必须能追溯到用户指令、仓库文件或验证结果。
