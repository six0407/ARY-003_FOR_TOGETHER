# REL-1 + OPS-1：发布与运维方案

> 最后更新：2026-06-21
> 当前阶段：✅ 实现完成
> 前置依赖：DEV-1~7（全部就绪）、4 个 IA 页面（全部就绪）
> 任务定义入口：`docs/ary.plan.md` → REL-1、OPS-1

---

## 一、当前形势

### 已有资产
| 资产 | 位置 | 说明 |
| --- | --- | --- |
| Express + SQLite 后端 | `project/src/app.js` | 零外部依赖即可运行 |
| 静态前端 | `project/public/` | 纯 HTML/CSS/JS，无构建步骤 |
| 46 条验收测试 | `project/test/acceptance.test.js` | P0 回归 |
| 种子数据 | `project/src/db.js` seedDemo() | 自动填充演示数据 |
| Release & Ops Plan | `docs/ary-release-ops-plan.md` | 备份/监控/值守要求已定义 |

### 当前缺口
| 模块 | 缺失 |
| --- | --- |
| 部署脚本 | ❌ 无部署/启动脚本 |
| 备份脚本 | ❌ 无数据备份能力 |
| 监控 | ❌ 无健康检查和日志 |
| 值守方案 | ❌ 无值守手册 |

---

## 二、设计方案

### 2.1 部署架构

```
单服务器部署（MVP 阶段适用）

nginx (反向代理 / 静态资源缓存)
  └─ node server.js (:3000)
      └─ SQLite (ary.sqlite)

部署步骤:
1. git pull
2. cd project && npm install
3. npm test (回归验证)
4. node server.js (通过 PM2 或 systemd 管理)
```

### 2.2 部署脚本

`deploy.sh` — 一键部署
`backup.sh` — 数据备份与恢复
`health-check.sh` — 健康检查

### 2.3 监控方案

- 健康检查端点: `GET /api/health` → { status, uptime, dbSize }
- 日志: `project/logs/` 目录，按日期轮转
- 告警: 简单邮件/Webhook 通知

### 2.4 备份方案

- 赛前全量备份: `backup.sh --full` → 导出 SQLite + 静态文件
- 赛中增量: `backup.sh --data` → 仅导出 SQLite
- 赛后归档: `backup.sh --archive` → 全量 + 时间戳标记

### 2.5 值守检查表

```text
开赛前 24h:
  □ npm test 全绿
  □ Staging 彩排通过
  □ 数据备份完成
  □ 值守人员确认

开赛日:
  □ 08:00 服务器状态检查
  □ 08:30 Live Hall 可用性确认
  □ 09:00 Screen Console 联调确认
  □ 每小时: 日志检查 + 备份

赛后:
  □ 数据归档
  □ 事故记录
  □ 复盘总结
```

### 2.6 回滚方案

```text
回滚触发条件:
  - Public Site 不可用超过 5 分钟
  - Live Hall 持续报错
  - API 大面积 5xx

回滚步骤:
  1. git revert 到上一个稳定版本
  2. npm install && npm test
  3. 恢复备份的 SQLite (如有数据变更)
  4. 重启服务
```

---

## 三、实现计划

| 步骤 | 内容 |
| --- | --- |
| 1. 健康检查 API | GET /api/health |
| 2. 部署脚本 | deploy.sh（安装依赖+测试+启动） |
| 3. 备份脚本 | backup.sh（全量/数据/归档） |
| 4. 值守手册 | 操作检查表 |
| 5. 验证 | staging 部署测试 |
