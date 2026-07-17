# PLAN

本文是 ARY 近期任务窗口，记录近期要推进的任务和里程碑。长期任务定义见 `docs/ary.plan.md`；任务瞬时状态见 `STATUS.md`。

## 当前阶段

**004 已启动**（PR #6 `feat/github-oauth-login` 准备合并到 master）。

## 004 已完成

| 任务 | 说明 | 状态 |
| --- | --- | --- |
| **GitHub OAuth 登录** | 后端路由 + 回调 + 自动建号 + Demo 模式兼容 | ✅ |
| **API 响应格式统一** | 全部 ~60 处路由改用 response.js helpers | ✅ |
| **公开页 OAuth 适配** | 共享 auth.js，10 个页面全部适配登录态 + admin.html 等效 safeJson | ✅ |
| **跨标签页登录同步** | localStorage 共享 token（localStorage + sessionStorage 双策略） | ✅ |
| **Console/Admin OAuth 适配** | console.html/admin.html 改用 safeJson + 跨标签登录检测 | ✅ |
| **CI/CD 自动测试** | GitHub Actions — push/PR 自动跑 62 条测试 | ✅ |
| **种子数据增强** | 5 用户（3 rider、organizer、judge）、多选手注册、投影、award | ✅ |
| **文档清理** | 删 2 重复文件，精简 Agent 导读 | ✅ |
| **API 测试修复** | 修复 requireAuth 重复声明 + 响应格式适配 | ✅ |
| **Live Hall 赛道动画** | Canvas 赛道渲染（速度线/曲线/骑手标记/Time Gate/Signal）从设计原型提取集成 | ✅ |
| **前端响应格式对齐** | 全部公开页使用 safeFetch/safeJson 消费统一 `{ success, data }` 格式 | ✅ |
| **赛事仓库关联** | races 表 repo_url 字段，创建赛事支持从 GitHub 仓库导入 | ✅ |
| **Live Hall 语法修复** | 修复游离反引号导致 JS 整块不执行的问题 | ✅ |

## 004 待办方向（待团队决策）
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
