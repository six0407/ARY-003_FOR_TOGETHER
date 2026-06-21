# PLAN

本文是 ARY 近期任务窗口，记录近期要推进的任务和里程碑。长期任务定义见 `docs/ary.plan.md`；任务瞬时状态见 `STATUS.md`。

## 近期窗口

| 窗口 | 目标 |
| --- | --- |
| UX 高保真原型评审 | `UX-1` 已完成收口，当前目标转为把已确认的设计输入消费进 `M2` / `DEV-1` 架构设计。 |
| 报名 / CA 参赛语义整改 | 确认 Registration approved 自动生成 RaceProject、CAConnection 参赛中动态接入、CA 接入状态不再作为参赛资格硬门禁，并完成文档一致性整改。 |

## 近期任务

| 任务 | 目标 | 下一入口 |
| --- | --- | --- |
| `PRD-1` 文档基线与范围确认 | 已完成首轮文档一致性检查并确认可作为架构入口；`PRD-TEMP-1` 复审结论已并入基线。 | `docs/prd-temp-1-baseline-delivery.md` |
| `PRD-TEMP-1` 报名 / RaceProject / CA 参赛语义整改 | 已完成复审并建议并入 `PRD-1` 基线：PRD、领域、CA 契约、IA、UX / 高保真原型、权限、QA、OPS 和计划文档已同步新口径，术语已统一为 `Review Flag` / `Review Flag Check`。 | `docs/registration-ca-rules-alignment.taskbook.md` |
| `UX-1` UX/UI 高保真原型与设计基线 | 已完成收口：页面级标注产物、`State Samples` 样张页、网页端与移动端单态证据、正式收口记录与 `M2` 输入最终清单均已形成。 | `docs/ux-1-closure-delivery.md`、`docs/m2-input-final-checklist.md`、`docs/ux-1-annotation-matrix.md`、`design-prototype/index.html` |
| `DEV-1` 领域模型 + 权限 + 数据模型 | 已启动：第一批正式产物已形成，当前已落下聚合边界、存储边界和接口鉴权规则基线；下一步进入字段级数据模型和接口草案。 | `docs/dev-1-architecture-baseline.md`、`docs/dev-1-delivery.md`、`docs/m2-input-final-checklist.md` |
| `DEV-5` CA 接入 / Projection / Live Hall | 已按新口径整改 CA 原始骑行状态消息草案：CAConnection 可在参赛过程中登记和握手，合法连接数据进入证据链，接入异常进入评审前风险提示；继续收敛投影规则、字段必填性、push / fetch 边界和幂等规则。 | `docs/ary-ca-integration-spec.md` |
| `REL-1` 赛事彩排 / 灰度发布 / 正式发布 | ✅ 已完成：部署脚本 deploy.sh、健康检查 API、健康检查脚本 health-check.sh 已实现。 | `project/deploy.sh`、`project/health-check.sh` |
| `OPS-1` 赛事值守 / 回滚 / 赛后归档 | ✅ 已完成：备份脚本 backup.sh、操作检查清单 OPS_CHECKLIST.md 已实现。 | `project/backup.sh`、`project/OPS_CHECKLIST.md` |

## 近期里程碑

| 里程碑 | 完成口径 |
| --- | --- |
| `M1` 文档基线可作为架构入口 | 已满足：PRD、领域、IA、权限、QA、计划、OPS、CA 草案无高优先级冲突。 |
| `M2` 架构设计输入就绪 | 已满足：`UX-1` 收口记录与 `M2` 输入最终清单已形成，页面边界、权限规则、状态模型和关键证据可直接消费。 |

## 下一步

1. ✅ REL-1 + OPS-1 已完成，MVP 所有核心任务已实现。
2. 后续工作方向：
   - 赛事彩排验证（按 OPS_CHECKLIST.md 执行）
   - 各页面的微调和 bug 修复
   - 准备 M3 交付评审

## 执行纪律

* 开工前读取对应任务在 `docs/ary.plan.md` 中的定义。
* 近期窗口变化时更新本文；任务状态变化时更新 `STATUS.md`。
