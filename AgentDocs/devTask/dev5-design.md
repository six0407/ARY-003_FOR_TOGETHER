# DEV-5：CA 接入 / Projection / Live Hall 设计

> 最后更新：2026-06-21
> 当前阶段：方案设计
> 前置依赖：DEV-1（ca-verifier.js 就绪）、DEV-3（Console 框架就绪）、DEV-4（CAConnection API 就绪）
> 任务定义入口：`docs/ary.plan.md` → DEV-5

---

## 一、当前形势

### 已有资产
| 资产 | 位置 | 可用于 DEV-5 的程度 |
| --- | --- | --- |
| **ca-verifier.js** | `project/src/ca-verifier.js` | ✅ 完整验签管道（7 道校验：appInstance→deviceKey→bodyHash→signature→timestamp→nonce→sequence） |
| **CAConnection API** | `project/src/app.js` | ✅ POST/GET 已实现 |
| **CA Verify API** | `project/src/app.js` POST /api/ca-verify | ✅ 对接 ca-verifier.js |
| **Console CA 标签页** | `console.html` Rider → CA 接入 | ✅ 登记连接表单 |
| **RidingSignalMessage 规范** | `docs/ary-ca-integration-spec.md` §5 | ✅ 消息字段已定义 |
| **DCR 安全架构** | `docs/ary-ca-integration-spec.md` §2.1 | ✅ 受信边界已定义 |
| **46 条验收测试** | `project/test/acceptance.test.js` | ✅ 含 AC-4（7 种安全失败路径） |

### 当前缺口
| 模块 | 缺失 |
| --- | --- |
| **Live Hall** | ❌ 完全缺失 — 无实时赛况展示页面 |
| **Projection 引擎** | ❌ 完全缺失 — 无信号→投影的聚合计算 |
| **Riding Metrics** | ❌ 完全缺失 — 成本/进度/风险指标 |
| **Session 管理** | ❌ 完全缺失 — 无生成/管理 Session 的流程 |
| **Event Stream** | ❌ 完全缺失 — 无骑行事件流展示 |

---

## 二、设计方案

### 2.1 系统架构

```
DCR Desktop App / 模拟 CA
  → POST /api/ca/message (骑行信号)
    → ca-verifier.js (验签管道)
      → 通过 → stores.caMessages.insert()
        → Projection Worker (聚合计算)
          → 写入 Projection 存储 (race_projections)
      → 失败 → 隔离审计 (ca_message_receipts.verdict=quarantined)

Live Hall 前端
  → GET /api/live-hall/:raceId (读取 Projection)
  → WebSocket / Polling 轮询更新
  → 渲染骑手卡片、事件流、指标面板
```

### 2.2 新增 API

| 端点 | 说明 |
| --- | --- |
| `POST /api/ca/message` | 接收骑行信号（替代旧的 /api/ca-verify） |
| `GET /api/ca/messages?raceProjectId=X` | 查询骑行消息记录 |
| `GET /api/live-hall/:raceId` | 获取赛事实况投影数据 |
| `GET /api/projections/:raceProjectId` | 获取单个选手的投影指标 |
| `POST /api/sessions` | 创建 Session |
| `GET /api/sessions?raceProjectId=X` | 查询 Session 列表 |

### 2.3 Live Hall 页面设计

```
Live Hall (public /console)
├─ 顶部：赛事名 + 状态标签 + Live 指示器
├─ 骑手卡片网格：
│   ├─ 骑手名 + 角色标签
│   ├─ CA 连接状态 (connected/active/failed)
│   ├─ 成本指标 (tokens 消耗)
│   ├─ 进度指标 (完成百分比)
│   └─ 风险指标 (风险标签)
├─ 事件流：最新骑行事件滚动列表
└─ 过程榜单：当前排名（读取 Projection）
```

### 2.4 Projection 数据结构

```json
{
  "raceProjectId": "...",
  "registrationId": "...",
  "metrics": {
    "tokensUsed": 15000,
    "sessionsCount": 3,
    "tasksCompleted": 5,
    "progressPercent": 42,
    "activeDuration": 3600000
  },
  "risks": ["长时间无进展"],
  "latestEvent": { "type": "task_completed", "timestamp": "...", "summary": "完成了用户模块" },
  "currentLeaderboardRank": 2
}
```

---

## 三、实现计划

| 步骤 | 内容 | 估算 |
| --- | --- | --- |
| 1. 新增 CA message 表 + 投影表 | SQLite schema 迁移 | 15min |
| 2. 新 API: POST /api/ca/message | 接收信号 + 验签 + 存储 | 20min |
| 3. Projection Worker | 聚合计算 + 更新投影 | 30min |
| 4. API: GET /api/live-hall/:raceId | 读取投影数据 | 15min |
| 5. API: POST/GET /api/sessions | Session 管理 | 15min |
| 6. Live Hall 前端页面 | 骑手卡片 + 事件流 + 指标面板 | 45min |
| 7. Console 整合 | Console 内嵌入 Live Hall 入口 | 15min |
| 8. 测试 + 兼容性检查 | npm test + 页面验证 | 15min |

## 四、验收标准
- ✅ 骑行信号可通过 API 提交并验签
- ✅ 验签通过的消息生成投影数据
- ✅ Live Hall 页面展示骑手状态、指标、事件流
- ✅ 验签失败的消息进入隔离审计
- ✅ 与 DEV-1~4 无冲突
