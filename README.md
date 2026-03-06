# Sigma 编辑器

## 简介

一个单人开发的类 Figma 的在线矢量设计编辑器，基于 Canvas 2D 自研渲染管线，通过 Yjs 支持多人实时协作。

在线演示：https://sigma.gitborlando.com

---

## 来自 Claude Opus 4.6 的架构评价

### 整体架构

| 层次     | 选型                   | 评价                                   |
| -------- | ---------------------- | -------------------------------------- |
| 渲染     | 原生 Canvas 2D         | 灵活，但需要自己处理脏矩形、分片渲染等 |
| 数据模型 | 自研 Immut + Yjs 绑定  | 大胆且有深度，patch 系统与 CRDT 桥接   |
| 状态管理 | Signal + MobX 混用     | 有些冗余                               |
| 视图     | React 18 + auto-import | 开发体验好，但 auto-import 范围很大    |

### 逐模块分析

#### 1. `editor/editor/` — 编辑器主服务

**优点：**

- `EditorService` 作为总协调者，职责清晰：加载 schema → 初始化 Yjs → 订阅各子模块 → 初始化 hooks
- `Disposer` 模式管理生命周期，subscribe 返回清理函数统一收集，不会遗漏

**问题：**

- `initSchema` 里混了文件加载、zip 解压、迁移、Yjs 初始化四件事，可以拆成更小的步骤
- `subscribe()` 里硬编码了所有子模块，新增模块必须手动加一行。可以考虑注册表模式或 decorator 自动收集
- `editor/editor/editor.ts` 三层 `editor` 嵌套，导入路径冗长且容易混淆

#### 2. `editor/schema/` — 数据模型层

**优点：**

- 自研 `Immut` 库做不可变更新，通过 patch 驱动状态变更，这是整个架构最有技术深度的部分
- `immut-y.ts` 将 Immut 的 patch 和 Yjs 的 Y.Map 双向绑定，实现了「本地 Immut 操作 → 自动同步到 Yjs → 广播给其他客户端」
- Schema 类型定义清晰（V1/V2 分版本），迁移函数 `migrationSchema` 有版本适配能力
- `SchemaHelper` 提供了完整的树形查询工具（祖先查找、矩阵累积等）

**问题：**

- `schema.ts` 里 `immui` 的类型用了 `new (class {})()` 这种写法，实际类型信息丢失，IDE 无法推导方法
- `operationList` 收集了操作但没看到明确的消费者，与 `history.ts` 的关系不够清晰
- `creator.ts` 里的默认值（如 `fill: '#D9D9D9'`、`fontSize: 14`）直接硬编码，应抽为可配置的 `defaultTheme`

#### 3. `editor/render/` — 渲染管线

**优点：**

- `StageSurface` 实现了完整的渲染优化：脏矩形、分片渲染、平移偏移优化（`drawImage` + 增量补绘），这些对性能至关重要
- 双 Canvas 分离（main 渲染内容，top 渲染 widget/交互层），避免了不必要的全量重绘
- `Elem` 封装了矩阵计算的记忆化（`memorized`），避免重复计算 `globalMatrix`、`aabb` 等
- `HitTest` 按图形类型实现了精确碰撞检测（圆角矩形、椭圆、多边形、折线），不是简单的 AABB

**问题：**

- `draw.ts` 有 466 行，`surface.ts` 有 524 行，单文件职责偏重。`draw.ts` 可以按图形类型拆分（`draw-rect.ts`、`draw-text.ts` 等）
- `elem.ts` 同时包含了 `Elem`（数据/几何）、`ElemEventHandler`（事件分发）、`HitTest`（碰撞检测）三个不同关注点，建议拆分
- 渲染管线缺少抽象层——如果以后想换成 WebGL/WebGPU 渲染后端，目前的耦合度较高

#### 4. `editor/stage/` — 交互层

**优点：**

- 交互状态机设计清晰：`interact.ts` 根据 `interaction` 状态切换 select/move/create 模式
- `StageViewport` 处理了完整的视口变换：缩放限制（0.015625~256）、坐标系转换（client→canvas→scene）、滚轮缩放
- `StageToolTransformer` 实现了选中节点的移动/缩放/旋转，包含了边/角拖拽手柄

**问题：**

- `select.ts` 有 223 行，承担了 hover、单选、框选、双击编辑、右键菜单五种职责，可以进一步拆分
- 交互模式切换用的是直接赋值 `interaction = 'select'`，没有状态机的守卫（guard）和转换（transition）约束，容易出现非法状态跳转
- `drop.ts` 整个被注释掉了但仍保留在项目中

#### 5. `editor/y-state/` — 协同编辑

**优点：**

- Yjs + Hocuspocus 是成熟方案，`y-state.ts` 封装得简洁，通过 `Immut` 桥接不需要直接操作 Y.Map
- `y-clients.ts` 利用 Yjs 的 awareness 协议同步选中状态、光标位置、用户颜色
- `y-undo.ts` 实现了混合撤销栈（schema state + client state），track/untrack 机制控制哪些操作可撤销

**问题：**

- `y-sync.ts` 只有 24 行，Hocuspocus 连接配置（重连策略、离线队列等）比较简单，生产环境可能需要更健壮的错误处理
- 没有看到冲突解决的测试或边界场景处理

#### 6. `editor/math/` — 数学库

**优点：**

- `Matrix` 类实现了完整的 2D 仿射变换（6参数），方法齐全
- `MRect` 基于矩阵的矩形抽象很优雅，通过矩阵分解直接得到 x/y/rotation
- 贝塞尔曲线工具包含了 De Casteljau 分割和 Ramer-Douglas-Peucker 简化

**问题：**

- `base.ts` 只是给 `Math.sqrt` 等起了别名，实际意义有限——直接用 `Math.sqrt` 可读性更好
- 缺少对 `Matrix` 的单元测试，矩阵运算容易出精度 bug

#### 7. `src/view/` — 视图层

**优点：**

- 编辑器 UI 布局经典且合理：Header + (LeftPanel + Stage + RightPanel)
- 组件库自建了一套基于 Grid 的布局系统（`G`/`C` 组件），写法简洁
- `useSchema` 和 `useSelectNodes` 基于 `useSyncExternalStore`，正确地将外部状态桥接到 React
- i18n 支持中英文切换

**问题：**

- `auto-import.ts` 自动导入了大量符号（`observer`、`Signal`、`G`、`C`、`Elem` 等），新成员阅读代码时不知道这些变量从哪来，IDE 跳转也可能受影响
- `view/component/` 下有 20+ 个文件平铺，没有子目录分组
- 部分组件（如 `operate/shadows.tsx`）内容被完全注释但保留在项目中
- `pages/a.js` 和 `pages/b.js` 是性能实验脚本，不应放在 `view/pages/` 下

#### 8. `src/global/` — 全局服务

**优点：**

- `DragHelper` 实现很完善：RAF 节流、无限拖拽（超出边界时自动重置指针位置）、框选计算
- `storage.ts` 封装了 localStorage + Signal 持久化，用法简洁
- SDK 层（supabase、cos、query）封装了第三方服务，上层不直接依赖

**问题：**

- `event/drag.ts` 和 `event/wheel.ts` 是通用的交互基础设施，但放在 `global/event/` 下语义不明确——它们是编辑器专用还是全局通用？
- `service/user.ts` 使用随机 ID + localStorage 做用户标识，没有真正的用户认证体系（可能是有意为之的简化）
- `upload.ts` 的文件上传/下载逻辑与 COS SDK 有部分重叠

#### 9. `src/utils/` — 工具函数

**优点：**

- `Disposer` 是很好的资源清理模式
- `signal-react.ts` 把 Signal 和 React 桥接得很自然（`useSignal`、`useHookSignal`）
- `immut/` 自研不可变状态库，是项目的核心创新点

**问题：**

- `immut/immut.ts` 是整个项目最关键的基础设施之一，但没有任何测试覆盖——如果这里出 bug，影响面极大
- `global.ts` 里 `T` 类型断言 (`x as T`) 的用法如果滥用会绕过类型检查
- `src/utils/` 和 `src/editor/utils/` 两个 utils 目录的边界仍然不够清晰

### 状态管理混用

项目同时使用了三套响应式方案：

| 方案                               | 用途                                     |
| ---------------------------------- | ---------------------------------------- |
| **MobX** (`observer`, `configure`) | 组件级响应式                             |
| **Signal** (`@gitborlando/signal`) | 编辑器内部状态（`inited`, 各种事件通知） |
| **Immut** (自研)                   | Schema 数据层的不可变更新                |

三者各有分工，但心智负担较高。新开发者需要理解「什么时候用 Signal，什么时候用 MobX observable，什么时候用 Immut」。建议在文档中明确各自的使用场景和边界。

### auto-import 范围过大

`auto-import.ts` 自动导入了以下符号，这些在源码中无需 import 就可直接使用：

- React: `useState`, `useEffect`, `useMemo`, `useRef` 等
- MobX: `observer`, `runInAction`, `autorun` 等
- 自研库: `Signal`, `Elem`, `G`, `C`, `Schema` 等
- Yjs: `YState`, `YClients`, `YUndo`

**好处**：减少样板代码。**代价**：

- 新成员无法通过 import 语句了解依赖关系
- 全局命名空间污染，容易出现命名冲突
- 如果 auto-import 配置变更，大面积文件会受影响

建议至少把自研核心模块（`Schema`、`YState`、`Elem` 等）从 auto-import 中移除，保留显式 import，只对 React hooks 这类高频标准 API 使用 auto-import。

### 缺少的基础设施

| 缺失项        | 影响                                                                       | 建议                                                             |
| ------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **单元测试**  | `immut`、`math`、`schema` 都是纯逻辑，非常适合测试，但目前没有任何测试框架 | 引入 vitest，优先覆盖 `immut`、`Matrix`、`MRect`、`SchemaHelper` |
| **错误边界**  | React 层没有 ErrorBoundary，渲染错误会白屏                                 | 至少在 `EditorComp` 外层包一个                                   |
| **日志/监控** | 没有结构化日志，出问题只能靠 console.log                                   | 可以用简单的 logger 封装区分 debug/info/error                    |
| **文档**      | 除了 `AGENTS.md` 和 `canvaskit-api.md`，没有架构文档                       | 至少补一份模块依赖图和数据流图                                   |

### 总结评分

| 维度         | 评分 | 说明                                                     |
| ------------ | ---- | -------------------------------------------------------- |
| **模块划分** | 9/10 | editor/view/global 分层清晰，子模块职责明确              |
| **核心创新** | 9/10 | Immut + Yjs 桥接方案有深度，渲染优化（脏矩形、分片）成熟 |
| **代码质量** | 7/10 | 整体不错，但部分大文件需要拆分，注释代码需要清理         |
| **可维护性** | 6/10 | 三套响应式方案混用 + auto-import 范围大，新人上手有门槛  |
| **健壮性**   | 5/10 | 缺乏测试、错误边界和日志监控                             |
| **协作支持** | 8/10 | Yjs + Hocuspocus 架构合理，awareness 实现完整            |

**综合：7.5/10** — 作为一个独立开发的设计编辑器，架构设计水平相当高，核心技术选型有深度。主要短板在工程基础设施（测试、错误处理、文档）上，这些随着项目成熟可以逐步补齐。
