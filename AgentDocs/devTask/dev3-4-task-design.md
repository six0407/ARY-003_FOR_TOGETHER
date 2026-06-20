# DEV-3 / DEV-4 前端任务设计

> 最后更新：2026-06-20  
> 当前阶段：已完成 DEV-1（架构验证），正式进入 DEV-3（登录/角色/Console）+ DEV-4（报名/作品/评审）前端实现  
> 前置依赖：`project/` 已有 Express + SQLite 后端，API 接口已就绪

---

## 一、当前形势

### 已有资产

| 类别 | 内容 | 位置 |
| --- | --- | --- |
| **后端 API** | Express 5 + SQLite，已实现 12+ 个 REST 接口 | `project/src/app.js` |
| **数据库** | SQLite 文件，含完整 schema 迁移 | `project/db/ary.sqlite` |
| **前端 DEMO** | 单页应用 `app.html`，含登录/报名/参赛/CA/Admin 基础页面 | `project/public/app.html` |
| **高保真原型** | 16 页 HTML 原型，覆盖 Public / Console / Screen 三类体验面 | `project/public/index.html` |
| **DEV-1 验证** | 46 条验收测试全部通过 | `project/test/acceptance.test.js` |
| **架构文档** | 数据模型、鉴权策略、状态迁移已落盘 | `docs/dev-1-*.md` |

### 当前缺口

| 模块 | 状态 | 缺失内容 |
| --- | --- | --- |
| Race Console 框架 | ❌ 缺失 | Organizer / Rider / Judge 三合一工作台入口 |
| Organizer View | ❌ 缺失 | 创建赛事、报名审核、评委分配、发布赛果 |
| Rider View | ⚠️ 部分 | My Races 有基础状态，缺 Work 提交和 CA 配置表单 |
| Judge View | ❌ 缺失 | 查看分配作品、评分评语提交 |
| Admin Console | ⚠️ 基础 | 有用户列表，缺 roles 编辑功能 |
| GitHub OAuth | ❌ 缺失 | 当前为 Demo 登录 |

---

## 二、任务拆解

### 2.1 DEV-3：登录 / 角色 / Race Console

| 子任务 | 说明 | 前端页面 | 依赖的后端 API |
| --- | --- | --- | --- |
| **3.1 Race Console 框架** | Console Home 入口页，按 role 展示可操作赛事列表 | `console.html` → Console Home | `GET /api/races`<br>`GET /api/registrations?userId=` |
| **3.2 Organizer View** | 主办方工作台：赛事列表 → 进入单场 → 管理面板 | `console.html` → Organizer View | `GET /api/races/:slug`<br>`PUT /api/races/:id` |
| **3.3 Rider View** | 选手工作台：参赛状态 → CA 接入 → 作品提交 → 结果查看 | `console.html` → Rider View | 已有（报名/作品/CA 接口） |
| **3.4 Judge View** | 评委工作台：待评审列表 → 评审页面 → 已提交评审 | `console.html` → Judge View | `GET /api/judge-assignments`<br>`POST /api/judging-records` |
| **3.5 Admin Console** | 用户列表 + roles 编辑 + 资料补全状态 | `admin.html` | `GET /api/auth/users`<br>`PUT /api/auth/users/:id/roles` |
| **3.6 GitHub OAuth** | GitHub 登录 → 用户注册 → 资料补全 | `auth.html` | `POST /api/auth/github-login` |

### 2.2 DEV-4：报名 / RaceProject / Work / Judge 流程

| 子任务 | 说明 | 前端页面 | 依赖的后端 API |
| --- | --- | --- | --- |
| **4.1 创建赛事** | 主办方填写赛事信息表单 → 发布 | Organizer View 内表单 | `POST /api/races` |
| **4.2 报名审核** | 查看报名列表 → approve / reject | Organizer View 内面板 | `GET /api/registrations?raceId=`<br>`PUT /api/registrations/:id/approve`<br>`PUT /api/registrations/:id/reject` |
| **4.3 评委分配** | 为赛事添加/移除 Judge | Organizer View 内面板 | `POST /api/judge-assignments`<br>`DELETE /api/judge-assignments/:id` |
| **4.4 Work 提交** | Rider 填写作品标题/描述/Demo/代码链接 → 提交 | Rider View 内表单 | `POST /api/works`<br>`GET /api/works?raceId=` |
| **4.5 评审打分** | Judge 查看作品详情 → 评分(作品分+骑行分) → 评语 | Judge View 内表单 | `POST /api/judging-records` |
| **4.6 发布赛果** | Organizer 确认榜单 → 发布 Award | Organizer View 内面板 | `PUT /api/awards`<br>`POST /api/awards/publish` |

---

## 三、页面路由设计

采用 SPA 哈希路由，所有 Console 页面集中在 `console.html`：

```
/console#home              → Console Home（角色入口选择）
/console#organizer         → Organizer View（赛事列表）
/console#organizer/:slug   → 单场赛事 Organizer 工作台
/console#rider             → Rider View（参赛列表）
/console#rider/:slug       → 单场赛事 Rider 工作台
/console#judge             → Judge View（评审列表）
/console#judge/:slug       → 单场赛事 Judge 评审台
/admin                     → Admin Console（独立页面）
```

---

## 四、UI 设计原则

1. **Console 与 Public Site 视觉分离** — Console 使用更紧凑的高密度布局，不照搬 Public 的蓝白竞赛风格
2. **角色视图切换清晰** — 同一赛事下，Organizer / Rider / Judge 通过 Tab 或侧边栏切换
3. **权限感知** — 按钮/入口根据 `User.roles` 和当前赛事关系显隐
4. **状态可视化** — 赛事、报名、作品、CA 接入状态用颜色标签清晰表达
5. **响应式兜底** — Console 至少保证 1280px 以上桌面端可用

---

## 五、验收标准

| 维度 | 标准 |
| --- | --- |
| **DEV-3 验收** | 用户可登录并补全资料；Admin 可维护 `User.roles`；不同 role 看到不同 Console 入口 |
| **DEV-4 验收** | Organizer 可创建/发布 Race 并审核报名；Rider 可提交 Work；Organizer 可分配 Judge；Judge 可评分评语 |
