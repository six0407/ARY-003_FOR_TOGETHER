# ARY 项目全局梳理 — Agent 导读

> 本文为 Agent 快速理解项目提供导读。详细定义以 `docs/` 下权威文档为准。
> 本文不替代 `docs/`，只做索引和上下文摘要。

---

## 1. 核心背景

ARY (Agent Racing Yard) 是一个**展示、记录、评审人类如何与 Coding Agent 协同工作**的赛事平台。选手使用 Agent 开发系统，平台追踪记录其成本、进度、风险等指标。

见 `docs/ary-mvp.prd.md` — 产品定位与 MVP 范围。

## 2. 领域概念速览

完整定义见 `docs/ary-domain-analysis.v0.3.md`，以下是关键对象：

| 概念 | 一句话 |
| --- | --- |
| **Race** | 赛事，有报名→进行→评审→结束生命周期 |
| **User / Roles** | 用户持有 rider/judge/organizer/admin 角色集合 |
| **Registration** | 选手报名后生成的记录 |
| **RaceProject** | Registration approved 后自动生成的工作区，CAConnection 的容器 |
| **CAConnection** | 选手接入的每个 Coding Agent 实例（通过 DCR Desktop App） |
| **Session / Evidence** | CA 交互日志与动作数据，骑行能力的核心证据 |
| **Projection** | 原始日志转化为实时进度/风险模型，用于 Live Hall 和 Screen |
| **Work / Award** | 最终交付代码与评委评价结果 |

## 3. MVP 模块

详细定义见 `docs/ary-mvp.prd.md`：

| 模块 | 说明 |
| --- | --- |
| **Public Site** | 首页/Race/Live Hall/Works/Results/Rider/Review/Cooperation |
| **Race Console** | Organizer/Rider/Judge 三视图工作台 |
| **Screen Console** | 大屏展示（Jumbotron/Billboard/Live/榜单/Works） |
| **Riding Intelligence** | DCR Desktop App 对接 + 验签 + Projection 引擎 |

## 4. 课程目标

见 `docs/ary.plan.md` — 完整任务定义。

评审标准：**完成进度 + 项目质量 + 骑行能力**。开发过程本身也是"Agent Riding"能力的证明。

## 5. Definition of Done

| 维度 | 要求 |
| --- | --- |
| 前端还原度 | 对齐高保真原型视觉，支持状态兜底 |
| 后端健壮性 | 稳定数据模型 + 鉴权体系 + CA 校验 + Projection |
| 安全闭环 | DCR App 对接 + 防重放/防篡改 |
| 资产沉淀 | Rider Profile + 赛事复盘 |
