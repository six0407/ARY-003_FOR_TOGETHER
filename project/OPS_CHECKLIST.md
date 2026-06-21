# ARY MVP — 操作检查清单 (Runbook)

> 适用场景：赛前准备 / 赛中值守 / 赛后归档

---

## 一、前置准备（赛前 24 小时）

### 1.1 环境验证
```bash
# 确认服务可正常启动
cd project
npm install
npm test           # 全部通过
node server.js &   # 启动后确认
curl http://localhost:3000/api/health   # → {"status":"ok"}
```

### 1.2 备份确认
```bash
cd project
mkdir -p backups
./backup.sh full   # 全量备份
ls -la backups/    # 确认备份文件生成
```

### 1.3 静态资源检查
| 页面 | URL | 负责人 |
| --- | --- | --- |
| 首页 | `/home.html` | |
| 作品列表 | `/works.html` | |
| 赛程详情 | `/race.html` | |
| 结果列表 | `/results.html` | |
| 合作页 | `/cooperation.html` | |
| 骑手资料页 | `/rider.html` | |
| 作品详情页 | `/work.html` | |
| 评审汇总页 | `/review.html` | |
| Console | `/console.html` | |
| Admin | `/admin.html` | |
| Live Hall | `/live-hall.html` | |
| Screen | `/screen.html` | |

### 1.4 完整彩排流程

按以下步骤进行 staging 全流程彩排验收：

```text
GitHub 登录
→ 资料补全
→ Admin 分配 roles
→ Organizer 创建并发布 Race
→ Rider 报名
→ Organizer 审核
→ ARY 自动生成 RaceProject
→ 实时 CA 接入
→ Live Hall 展示
→ Screen Console 展示
→ Work 提交
→ Judge 评审
→ Award / Leaderboard 发布
→ Report / Review 发布
→ 赛后归档
```

### 1.5 种子数据
```bash
# 如需要重置演示数据
curl -X POST http://localhost:3000/api/reset
```

---

## 二、冻结窗口

| 阶段 | 规则 |
| --- | --- |
| 开赛前 24h → 开赛前 4h | **功能冻结**：只允许修复阻断赛事的 P0 问题 |
| 开赛前 4h → 赛事结束 | **发布冻结**：不发布任何变更 |
| 赛事进行中 | 只允许修复：登录不可用、Public Site/Live Hall/Screen Console 不可用、权限高危漏洞、数据丢失或污染风险 |
| 赛事进行中 | 不允许：临时放宽 CA 校验、新增评审规则、新增后台功能、修改核心领域模型 |

## 三、开赛日流程

### 3.1 值守角色与职责

| 角色 | 职责 |
| --- | --- |
| 产品值守 | 判断业务规则、赛事流程、公开展示优先级 |
| 技术值守 | 登录、权限、CA 接入、Projection、Report、发布和回滚 |
| 数据值守 | 数据状态核对、Projection 重算、Report 重跑、异常数据标记 |
| 现场大屏值守 | Screen Console、投屏设备、全屏展示、fallback 切换 |
| 主办方值守 | 报名、选手沟通、评委协调、榜单和报告发布确认 |

> 要求：所有值守人员必须在赛前完成至少一次全流程演练；大屏值守必须熟悉 Jumbotron / Billboard / 公告 fallback；技术值守必须掌握回滚路径。

### 3.2 赛前 1 小时
- [ ] 启动生产服务器
- [ ] 运行 `./health-check.sh` 确认所有页面可达
- [ ] 运行 `./backup.sh data` 数据备份
- [ ] 开启日志记录

### 3.3 赛中值守（每小时）
- [ ] `curl http://localhost:3000/api/health` 确认存活
- [ ] 检查 log 目录有无异常报错
- [ ] 每 2 小时运行 `./backup.sh data`

### 3.4 CA 真实性异常告警与处置

#### 异常类型

| 异常类型 | 说明 |
| --- | --- |
| `device_identity_unknown` | appInstanceId 或 deviceKeyId 未登记/已撤销/归属不匹配 |
| `signature_verification_failed` | 签名验签失败或公钥校验不通过 |
| `signature_body_hash_mismatch` | signature.bodyHash 与消息体摘要不一致 |
| `nonce_replayed` | 同一有效窗口内重复使用 nonce |
| `sequence_rollback` | 同一 CAConnection 的 sequence 回退或异常乱序 |
| `timestamp_out_of_window` | 消息时间戳超出允许偏移窗口 |

#### 告警分级

| 级别 | 条件 | 响应 |
| --- | --- | --- |
| 单条异常 | 单条消息校验失败 | 记录隔离审计，更新 CAConnection 状态为 `verification_failed` 或 `quarantined`，通知 Organizer 风险视图 |
| 选手连续异常 | 同一 RaceProject 短时间内多次真实性异常 | 升级为技术值守关注事件，通知主办方联系选手检查 DCR Desktop App/网络/设备密钥 |
| 多选手集中异常 | 多名选手同时出现真实性异常 | 按赛事级技术事故处理，优先排查证书轮换/时间同步/发布变更/接入网关/DCR Desktop App 版本兼容 |

#### 人工处置步骤

1. 确认异常类型、发生时间、涉及 Race/Registration/RaceProject/CAConnection/messageId
2. 确认异常消息已被隔离审计，未进入 Projection/Evidence/Report/评审摘要或公开展示
3. 检查是否为设备注册失效、密钥轮换遗漏、系统时钟漂移、重复重试或消息体被中间链路改写
4. 若属单设备问题，由 Organizer 通知选手重新连接/重新握手/更新 DCR Desktop App；必要时停用异常 deviceKeyId 并重新登记
5. 若属系统性问题，由技术值守暂停相关接入通道的新消息消费，保留隔离审计证据，回退到最近稳定 Projection 或静态展示
6. 问题修复后，仅允许后续新通过校验的消息恢复进入正式事实链路；**不得回填先前失败或被隔离的原始消息**

#### 恢复准则

- 真实性异常恢复不以"手工放行历史失败消息"为手段，而以"修复来源后重新产生新的有效消息"为准
- 恢复后必须确认 `view_authenticity_status` 已回到可解释状态，Organizer 可看到异常已关闭或转为已处理
- 若异常期间形成证据缺口，应保留 Review Flag 和事故记录，不因后续恢复而抹除历史异常事实

### 3.5 应急响应

**场景 A：Public Site 不可用**
```
1. curl -I http://localhost:3000/home.html
2. 查看日志: tail -50 logs/*.log
3. 重启: pkill node; node server.js &
4. 如 5 分钟内未恢复 → 执行回滚
```

**场景 B：Live Hall 报错**
```
1. 确认后端存活: curl http://localhost:3000/api/health
2. 确认 CA 服务在发送数据
3. 刷新 Live Hall 页面 (F5)
```

**场景 C：API 大面积 5xx**
```
1. tail -100 logs/*.log
2. 检查磁盘: df -h
3. 检查内存: free -h
4. 重启服务
```

### 3.6 回滚流程
```bash
# 1. 确认当前版本
git log --oneline -5

# 2. 回滚到上一個稳定版本
git revert HEAD --no-edit

# 3. 重启
npm install
node server.js &

# 4. 验证
./health-check.sh
```

---

## 四、赛后

### 4.1 数据归档
```bash
./backup.sh archive
```

### 4.2 事故记录
- 记录宕机/异常时间线
- 记录处理过程和结果
- 更新 STATUS.md

### 4.3 复盘
- 确认赛程数据完整
- 确认所有作品评审完成
- 检查 Award 分配正确
- 生成赛后报告

---

## 五、快速参考

### 启动命令
| 操作 | 命令 |
| --- | --- |
| 启动服务 | `cd project && node server.js` |
| 后台启动 | `nohup node server.js > logs/ary.log 2>&1 &` |
| 停止服务 | `pkill -f "node server.js"` |
| 查看日志 | `tail -f logs/ary.log` |
| 运行测试 | `cd project && npm test` |
| 健康检查 | `curl http://localhost:3000/api/health` |
| 全量备份 | `./backup.sh full` |
| 数据备份 | `./backup.sh data` |
| 赛后归档 | `./backup.sh archive` |
| 恢复备份 | `./backup.sh restore` |

### 端口
- 开发: `http://localhost:3000`
- 生产: `http://localhost:3000` (可通过 PORT 环境变量配置)

### 目录结构
```
project/
├── server.js         # 入口
├── src/app.js        # Express 应用
├── src/db.js         # 数据库初始化 + 种子数据
├── db/               # SQLite 数据文件 (自动创建)
├── logs/             # 日志文件
├── backups/          # 备份存档
├── public/           # 静态前端
├── test/             # 验收测试
├── deploy.sh         # 部署脚本
├── backup.sh         # 备份脚本
├── health-check.sh   # 健康检查脚本
└── OPS_CHECKLIST.md  # 本文件
```
