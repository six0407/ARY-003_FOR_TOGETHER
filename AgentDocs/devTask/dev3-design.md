# DEV-3：登录 / 角色 / Race Console 前端设计

> 最后更新：2026-06-20  
> 当前阶段：方案设计  
> 前置依赖：DEV-1（架构基线已就绪）、DEV-2（Public Site 静态闭环可并行）  
> 任务定义入口：`docs/ary.plan.md` → DEV-3  

---

## 一、任务要求（来自 ary.plan.md）

### 交付范围
1. **GitHub 登录** — 用户通过 GitHub OAuth 登录 ARY
2. **资料补全** — 首次登录后引导用户补充个人资料
3. **Admin Console 基础版** — 用户列表、资料状态、角色维护
4. **`User.roles` 维护** — Admin 可为用户添加/移除角色
5. **Race Console 框架** — Organizer / Rider / Judge 三个视图的统一入口和框架

### 不做事项
- 不做完整赛事执行（留给 DEV-4）
- 不做 Screen Console（留给 DEV-6）

### 验收标准
- 用户可登录并补全资料
- Admin 可维护 `User.roles`
- 不同 role 看到不同 Console 入口

---

## 二、当前形势分析

### 已有资产

| 类别 | 内容 | 位置 | 可用于 DEV-3 的程度 |
| --- | --- | --- | --- |
| **后端 API** | Express + SQLite，已有登录、用户列表、赛事接口 | `project/src/app.js` | ✅ 可直接使用 |
| **后端鉴权** | `auth.js` 含五类作用域判定函数 | `project/src/auth.js` | ✅ 可直接使用 |
| **数据库** | SQLite，含 users/races/registrations 等表 | `project/db/ary.sqlite` | ✅ 可直接使用 |
| **Demo 前端** | SPA `app.html`，含登录页、赛事广场、报名、参赛状态页 | `project/public/app.html`+`.js` | ⚠️ 需重构，页面结构和路由不能满足 Console 框架需求 |
| **高保真原型** | `index.html` 含 Console 页(Organizer/Rider/Judge/Admin)的视觉设计 | `project/public/index.html` | ✅ 视觉参考，但原型是静态的 |
| **权限矩阵** | 14 个资源的动作级鉴权策略 | `docs/ary-permission-matrix.md` | ✅ 权限规则已明确 |
| **架构基线** | 聚合边界、存储归属、作用域定义 | `docs/dev-1-architecture-baseline.md` | ✅ 架构约束已固定 |
| **鉴权策略** | 接口鉴权策略表，含判定函数 | `docs/dev-1-auth-policy.md` | ✅ 可直接映射到前端 |

### 当前缺口

| 模块 | 状态 | 具体缺失 |
| --- | --- | --- |
| **Race Console 框架** | ❌ 缺失 | 没有一个统一的 Console 入口，不同 role 在同一赛事下切换视图 |
| **Organizer View** | ❌ 缺失 | 主办方工作台完全未实现（app.html 的 Admin 只是一个用户列表） |
| **Rider View** | ⚠️ 部分 | app.html 有"我的参赛"页，但它是独立页面而非 Console 内的 Rider View |
| **Judge View** | ❌ 缺失 | 评委评审工作台完全未实现 |
| **Admin Console** | ⚠️ 基础 | app.html 有 Admin 标签页，只展示用户列表，无 roles 编辑 |
| **角色感知导航** | ❌ 缺失 | 当前导航不根据 `User.roles` 动态展示 Console 入口 |
| **GitHub OAuth** | ❌ 缺失 | 当前是 Demo 选人登录，无真实 OAuth 流程 |

---

## 三、设计方案

### 3.1 总体架构

```
用户访问 ary.example.com
    │
    ├─ 未登录 → Public Site（DEV-2 范围）
    │              └─ 点击 Login → GitHub OAuth 流程
    │
    └─ 已登录 → 根据 User.roles 重定向
                    │
                    ├─ Console Home（所有登录用户的统一入口）
                    │       ├─ 展示当前用户可访问的所有赛事
                    │       ├─ 按 role 展示不同的操作入口
                    │       └─ 进入具体赛事的 Workspace
                    │
                    └─ 赛事 Workspace（单场赛事上下文）
                            ├─ Organizer View（organizer role）
                            ├─ Rider View（rider role）
                            └─ Judge View（judge role）
```

### 3.2 页面路由设计

采用 Express 路由 + SPA 前端，新增/改造以下页面：

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/console` | `console.html` | Console Home — 登录用户的管理入口 |
| `/console/race/:slug/organizer` | `console.html` (#organizer) | Organizer View — 主办方工作台 |
| `/console/race/:slug/rider` | `console.html` (#rider) | Rider View — 选手工作台 |
| `/console/race/:slug/judge` | `console.html` (#judge) | Judge View — 评委工作台 |
| `/admin` | `admin.html` | Admin Console — 独立管理页 |
| `/auth/github` | — | GitHub OAuth 回调处理 |

### 3.3 Console Home 设计

```
Console Home
├─ 顶部：当前用户信息 + 角色标签 + 退出
├─ 主体：
│   ├─ 我主办的赛事（organizer role）→ 点击进入 Organizer View
│   ├─ 我报名的赛事（rider role）   → 点击进入 Rider View
│   ├─ 我评审的赛事（judge role）   → 点击进入 Judge View
│   └─ 管理入口（admin role）       → 进入 Admin Console
└─ 底部：返回 Public Site 的链接
```

### 3.4 Organizer View 设计（本次只做框架，具体功能在 DEV-4）

```
Organizer View（单场赛事）
├─ 顶部：赛事名 + 状态标签 + 返回 Console Home
├─ 侧边栏：Overview / Settings / Registrations / Riders / Works / Judges / Awards
└─ 主区域：根据侧边栏切换内容面板（DEV-4 实现具体功能）
```

### 3.5 Rider View 设计（整合现有"我的参赛"）

```
Rider View（单场赛事）
├─ 顶部：赛事名 + 状态标签 + 返回 Console Home
├─ 信息卡：
│   ├─ Registration 状态（submitted / approved / rejected）
│   ├─ RaceProject 状态（聚合接入健康度）
│   ├─ CA Connection 数量与状态
│   └─ Work 状态（draft / submitted / locked）
└─ 操作区：CA 配置入口 / 作品提交入口（DEV-4 实现）
```

### 3.6 Judge View 设计（本次只做框架，具体评审功能在 DEV-4）

```
Judge View（单场赛事）
├─ 顶部：赛事名 + 状态标签 + 返回 Console Home
├─ 待评审作品列表
└─ 已提交评审记录（DEV-4 实现）
```

### 3.7 Admin Console 设计

```
Admin Console（独立页面）
├─ 顶部：Admin Console 标题 + 返回 Public Site
├─ 用户表格：GitHub ID / 显示名 / 角色标签 / 资料状态 / 操作
└─ 操作：点击用户 → 弹出角色编辑面板
    ├─ 勾选/取消 rider / judge / organizer / admin
    └─ 保存
```

### 3.8 登录流程

```
当前阶段：保持 Demo 登录模式（选择预置账号）
未来阶段：替换为真实 GitHub OAuth

Demo 登录流程：
1. 用户点击 Login
2. 展示预置账号卡片（Alice Rider / Bob Judge / Carol Organizer / Dave Admin）
3. 选择账号 → 前端设置 App.currentUser → 重定向到 Console Home
```

### 3.9 技术实现方案

**前端组织方式**：
- 新建 `project/public/console.html` — Console 主页面（SPA）
- 新建 `project/public/console.js` — Console 逻辑
- 新建 `project/public/admin.html` — Admin 独立页面
- 新建 `project/public/admin.js` — Admin 逻辑
- 复用现有 `styles.css`，补充 Console 专属样式

**API 调用**：
- 现有后端 API 已覆盖 DEV-3 需要的大部分接口
- 需新增：`PUT /api/auth/users/:id/roles`（更新用户角色）
- 需新增：`GET /api/users/me`（获取当前登录用户详情）

**权限感知**：
- 前端在渲染页面时根据 `App.currentUser.roles` 判断按钮/入口的显隐
- 侧边栏和导航项按 role 过滤
- 后端通过 `auth.js` 的作用域函数做二次校验

---

## 四、任务拆解

| 子任务 | 说明 | 估算工作量 | 可并行 |
| --- | --- | --- | --- |
| **3.1 Console Home** | 新建 console.html + console.js，展示用户可操作的赛事列表，按 role 区分入口 | 2h | 否（基础框架） |
| **3.2 Console 框架** | Organizer/Rider/Judge 三个视图的模板框架 + 侧边栏 + 页面切换 | 2h | 否（基础框架） |
| **3.3 Organizer View 骨架** | 赛事选择 → Organizer 工作台（仅面板框架，具体功能留 DEV-4） | 1h | 可 |
| **3.4 Rider View 整合** | 将现有 app.html 的"我的参赛"功能移植到 Console 框架内 | 2h | 可 |
| **3.5 Judge View 骨架** | 评审列表框架（仅面板，具体评审留 DEV-4） | 1h | 可 | ✅ DEV-4 已实现
| **3.6 Admin Console** | 独立 admin.html：用户列表 + roles 编辑面板 + 资料状态 | 2h | 可 |
| **3.7 登录页改造** | 将登录页整合到 Console 框架，支持 Demo 登录和角色感知跳转 | 1h | 可 |
| **3.8 后端补充** | 新增 `PUT /api/auth/users/:id/roles` 和 `GET /api/users/me` | 1h | 可 |
| **3.9 导航重构** | Public Header 根据登录态显示 Console Entry，Console 内显示返回 Public | 1h | 可 |

**总计估算：约 13h（单人） / 若 2 人并行约 7h**

---

## 五、与高保真原型的映射

高保真原型 `index.html` 中已有 Console 相关页面的视觉设计：

| 原型页面 | 对应 DEV-3 模块 | 可直接复用程度 |
| --- | --- | --- |
| `#console`（Organizer View） | 3.3 Organizer View | ⚠️ 视觉风格参考，需要适配真实数据 |
| `#rider-view` | 3.4 Rider View | ⚠️ 同上 |
| `#judge-view` | 3.5 Judge View | ⚠️ 同上 |
| `#admin` | 3.6 Admin Console | ⚠️ 同上 |

Console 的视觉方向参考原型中的蓝白竞赛风格 + 高密度赛事控制台布局，但作为功能性页面，优先保证可用性。

---

## 六、验收标准自检

| 标准 | 验证方式 |
| --- | --- |
| 用户可选择 Demo 账号登录 | 打开 `/console` → 点击 Login → 选择账号 |
| 登录后显示用户角色标签 | Header 显示用户名和角色列表 |
| 不同 role 看到不同 Console 入口 | Organizer 看到"我主办的赛事"，Rider 看到"我报名的赛事" |
| Admin 可进入 Admin Console | Admin 用户看到"管理入口"按钮 |
| Admin 可编辑用户角色 | 进入 Admin Console → 点击用户 → 编辑 roles → 保存 |
| 资料补全状态可查看 | 用户列表显示各用户的资料状态 |
| Console 内可切换不同赛事 | Console Home 展示多个赛事，点击后进入对应 Workspace |
| 从 Console 可返回 Public Site | Header 或底部有返回链接 |
