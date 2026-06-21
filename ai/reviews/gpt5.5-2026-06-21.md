# Sigma 项目整体 Review

日期：2026-06-21

## 结论

Sigma 现在已经不是 5 月 review 里的单应用状态，而是进入了 monorepo 化和状态源收敛后的新阶段。`packages/*` 的边界已经开始建立，旧 `Schema` 运行时服务被删除了一批，`YState + Y.Doc + Immut 投影 + Undo` 的主线也比之前清楚。

但从当前仓库状态看，它仍然是“内核能力强、工程闭环还没完全收口”的编辑器项目。最值得继续投入的是三块：矩阵几何模型、自研 Canvas 渲染树、Yjs/Immut 状态桥接。最需要优先处理的是生命周期副作用释放、完整 typecheck 可用性、协作能力事实化、几何事实来源统一。

综合评价：架构潜力约 7.5/10，当前工程稳定性约 6.7/10。

## 本次范围

本次以静态阅读为主，没有启动本地服务，也没有执行 build / typecheck / test。原因是仓库指示明确要求不要在没有必要时频繁验证，且历史日志已经记录 `@sigma/web typecheck` 存在长耗时超时问题。

主要阅读范围：

- 根配置：`package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json`
- Web 应用：`apps/web/src`
- 内部包：`packages/*`
- 全局类型：`types/schema/*`
- 历史记录：`ai/reviews/*`、`ai/tasks/monorepo-wip/*`、`ai/notes/*`

## 相比旧 Review 的改善

### 1. Monorepo 基础已经成形

当前仓库已经有 `apps/web` 和多个内部包：

- `@sigma/api-types`
- `@sigma/utils`
- `@gitborlando/toolkit`
- `@gitborlando/mobx-undo`
- `@gitborlando/vite-plugin-nested-assets`

这些包大多有独立 `package.json`、`exports`、`tsconfig.json` 和 `typecheck` 脚本。`packages/README.md` 也明确了内部包默认保持 private、源代码包优先、不要反向依赖 app。

这是一个实质进步：后续继续拆 math、schema、runtime 时，不需要再先处理 workspace 基础设施。

### 2. 旧 Schema 运行时服务已明显收敛

历史日志显示，旧的 `schema.ts`、`history.ts`、`operate/node.ts`、`operate/page.ts`、旧 SVG/drop/vector-edit/adsorption 等运行残留已经删除。当前 `apps/web/src/editor/schema` 只剩：

- `creator.ts`
- `helper.ts`
- `migration.ts`
- `traverse.ts`

这比旧 review 里“新旧状态系统并存”的情况清爽很多。

### 3. YState 主线更清楚

`YState` 现在有更明确的写入 API：

- `YState.transact()`
- `YState.set()`
- `YState.insert()`
- `YState.delete()`
- `YState.applyImmerPatches()`

并且 `ai/notes/y-state-mirror-sync.md` 已经记录了当前语义：平时由 `Yjs -> observer -> Immut` 投影，事务内为了保证后续读取一致，会提前同步本地 Immut，并依赖 observer 幂等兜底。

这份 note 很关键，建议继续保留并随着实现变化更新。

### 4. Undo 已修掉旧的空栈风险

旧 review 提到的 `Undo.undo()` / `redo()` 空栈访问问题当前已经改善。现在内部有 `canUndo` / `canRedo` guard，`replayInfo()` 也能处理空值。

历史日志还记录了删除节点 undo/redo 顺序问题的修复，这说明 undo 主线已经从“能跑”进入“处理真实编辑器边界”的阶段。

### 5. 部分旧问题已经修复

几个旧 review 里的问题当前已经不是事实：

- `HandleNode.wrapInFrame()` 已经实现，不再直接 throw。
- 首页文件列表 key 已改为稳定的 `file.id`。
- `migrationSchema()` 里旧的完整 schema 调试输出已经移除。
- `packages/mobx-undo` 已有单元测试，不再是完全无测试状态。

## 核心问题

### P0：生命周期副作用释放不完整

这是当前最值得优先修的问题。

`EditorService` 已经有统一 `Disposer`，但不是所有 service 都真正把副作用交回 disposer。

明确风险点：

- `apps/web/src/editor/editor/command.ts`
  - `EditorCommand.subscribe()` 调用 `bindHotkeys()` 后返回 `noopFunc`。
  - `hotkeys(shortcut, ...)` 没有 unbind。
  - `listen('keyup'...)` 和 `listen('keydown'...)` 的 disposer 没有保存。
  - 编辑器卸载再进入时，快捷键和全局 key listener 可能重复注册。

- `apps/web/src/editor/render/scene.ts`
  - `StageScene.hookRenderNode()` 内部把 `autorun()` 和 `hookPatchRender()` 加进了 `this.disposer`。
  - 但 `StageScene.subscribe()` 返回值没有释放 `this.disposer`。
  - 编辑器反复进入后，渲染订阅和 autorun 可能残留。

- `apps/web/src/editor/y-state/y-sync.ts`
  - 当前远程协作未启用，所以问题暂时不显性。
  - 一旦恢复 `YSync.init()`，需要明确 `provider.destroy()`、awareness 清理、连接状态监听的释放边界。

建议先按 `ai/notes/editor-lifecycle-effects.md` 里的原则落地一轮小修：

```txt
谁注册副作用，谁返回 disposer。
service 可以继续是 singleton，但 subscribe/init 不能吞掉 disposer。
```

### P0：协作能力仍不是默认事实

README 里描述“通过 Yjs 支持多人实时协作”，但当前默认初始化路径里远程同步仍然被注释：

- `apps/web/src/editor/editor/editor.ts`
  - `// this.disposer.add(YSync.init(fileId, YState.doc))`

- `apps/web/src/editor/y-state/y-state.ts`
  - `// YSync.init(fileId, this.doc)`

这意味着默认路径是本地 `Y.Doc` 加本地 client 状态，不是远程多人协作。

此外协作 UI 也有未闭环点：

- `apps/web/src/view/editor/header/cooperate.tsx` 中 avatar 是字面量字符串 `'createUrlFromSvgString(other.userAvatar)'`。
- `YSync` 没有连接状态、错误状态、重连提示或 provider 销毁逻辑。
- `YClients.syncSelf()` / `syncOthers()` 依赖 `YSync.awareness`，但只有启用 provider 后才成立。

建议二选一：

1. 短期不打协作能力：README 和 UI 文案降级为“协作链路预留/实验中”。
2. 恢复协作：补 provider 生命周期、连接状态、断线提示、最小双端验证和 awareness 清理。

### P0：完整 Typecheck 仍不可作为质量门禁

历史日志多次记录：

- `pnpm -r --if-present typecheck` 约 120 秒超时。
- `pnpm --filter @sigma/web typecheck` 曾 120 秒或 300 秒超时。

本次静态阅读还发现了几处会直接阻塞类型健康的文件：

- `apps/web/src/editor/handle/picker.ts`
  - `ImmuiPatch` 未定义。
  - `immui` 是空 class 实例，却调用 `reset()` / `next()`。
  - 当前看起来是不再接入主流程的旧 picker 残留。

- `apps/web/src/editor/math/bezier/bezier.ts`
  - 引用不存在的 `../xy`。
  - `bezierMidpoint()` 调用 `bezierParametricEquation(p1x, p1x, ...)`，第二个参数疑似应为 `p1y`。
  - 当前未发现真实运行引用，更像旧实验文件。

- `types/schema/schema-v2.d.ts`
  - 仍有 `type FillKeys = AllKeys<IFill> | number`。
  - 当前仓库没有找到 `AllKeys` 或 `IFill` 定义。

- `types/schema/schema-v2.d.ts`
  - schema 类型通过 `import('src/editor/math/matrix')` / `import('src/editor/math/mrect')` 引用 app 内 math。
  - `Stroke` 依赖 `CanvasRenderingContext2D`，让 schema 类型天然需要 DOM lib。

建议先不做大规模类型重构，先处理“明显无入口且破坏 typecheck 的残留文件”。目标是让 `pnpm --filter @sigma/web typecheck` 至少能稳定完成并输出真实诊断。

### P0：几何事实来源还未统一

Schema v2 已经明显向 `width / height / matrix / flip` 和 `MRect` 收敛，但业务操作里仍有旧 `x / y / rotation / OBB` 口径。

典型位置：

- `apps/web/src/editor/schema/creator.ts`
  - `createNodeBase()` 仍写入 `x`、`y`、`rotation`。
  - `line()` 通过 `nodeBase.x` / `nodeBase.y` 计算 points。

- `apps/web/src/editor/operate/align.ts`
  - 对齐直接写节点的 `x` / `y` 字段。
  - 这会绕开当前渲染实际依赖的 `matrix`。

- `apps/web/src/editor/handle/node.ts`
  - `getNodesMergedOBB()`、`getNodeCenterXY()`、`getDatum()` 仍使用 `OBB.fromRect(node, node.rotation)`。

- `apps/web/src/editor/operate/geometry.ts`
  - UI 暴露 `x/y/rotation` 是合理的，但内部需要明确这些是 `MRect` 派生值，而不是 schema 事实字段。

建议明确唯一原则：

```txt
schema 写入事实：width / height / matrix / flip
UI 几何展示：x / y / rotation 只作为 MRect 派生值
```

短期最该修的是 `OperateAlign`，它应改成通过 `MRect` 修改 `matrix`，而不是写 `node.x/y`。

### P1：Render tree reparent 逻辑有重复挂载风险

`StageScene.reHierarchy()` 当前只处理 childIds 的 `add` patch：

- 找到新 parent。
- 找到 elem。
- 如果 elem 已在新 parent 中，则先移除。
- 插入到新 parent 的 `children`。

但它没有从旧 parent 的 `children` 里移除该 elem。`Elem.addChild()` 也只是设置 `elem.parent = this` 并插入当前 children，没有自动从旧 parent 移除。

这会影响：

- `wrapInFrame()`：先从旧 parent 移出选中节点，再插入新 frame。
- 未来图层拖拽跨 parent。
- 任意 reparent 命令。

风险是 schema 树正确，但 render tree 里同一个 `Elem` 还残留在旧 parent 的 children 数组中，导致绘制、命中测试或 dirty rect 异常。

建议让 render tree 的 reparent 使用统一方法：

```txt
oldParent?.removeChild(elem)
newParent.addChild(elem, index)
```

并给 `StageScene` 补一个最小测试或调试断言：同一个 elem 不应同时出现在多个 parent.children 中。

### P1：一些功能 UI 已出现，但领域命令未闭环

当前有几类“界面/入口已在，但行为还没闭合”的功能：

- `apps/web/src/editor/stage/interact/create.ts`
  - 创建 line 时计算了 `rotation` 和 `width`，但实际写入被注释。
  - 拖拽创建线条可能不会得到用户预期的长度和角度。

- `apps/web/src/view/editor/left-panel/panels/layer/node/index.tsx`
  - 已接入 dnd-kit。
  - `handleDragEnd()` 目前只做 active/over 判断，没有调用 schema 重排。

- `apps/web/src/view/editor/right-panel/operate/stroke.tsx`
  - 面板只有 header 和加号按钮，占位明显。

- `apps/web/src/view/editor/right-panel/operate/shadows.tsx`
  - 文件内容基本全是旧代码注释。

- `apps/web/src/editor/operate/points.ts`
  - 只有空 service。

- `apps/web/src/editor/stage/tools/guide.ts` / `ruler.ts`
  - 空文件。

- `apps/web/src/editor/render/react/reconciler.ts`
  - 自研 React renderer 很有价值，但多个 HostConfig 方法仍直接 `throw new Error('Function not implemented.')`。

建议给这类模块标记状态：`active` / `experimental` / `legacy` / `stub`。如果短期不做，最好不要让它们留在正式入口或 typecheck 范围里制造噪音。

### P1：核心测试覆盖仍不足

当前只发现 `packages/mobx-undo/src/index.test.ts` 一个真正的单测文件。它是好的开始，但还没有覆盖项目最核心的风险面。

最应该补测试的模块：

- `apps/web/src/utils/immut/*`
- `apps/web/src/editor/y-state/y-state.ts`
- `apps/web/src/editor/math/matrix.ts`
- `apps/web/src/editor/math/mrect.ts`
- `apps/web/src/editor/schema/migration.ts`
- `apps/web/src/editor/schema/traverse.ts`
- `apps/web/src/editor/render/elem.ts` 中的 hit-test 与 parent/child 操作
- `apps/web/src/editor/render/scene.ts` 的 mount/update/remove/reparent
- `apps/web/src/editor/editor/undo.ts`

建议不要一开始追求覆盖率。先围绕“最容易被重构破坏、且不依赖 DOM 的纯逻辑”补一批 vitest。

### P1：小而硬的交互 bug

`apps/web/src/view/component/input-num.tsx` 里仍有 truthy 判断问题：

- `getFinalValue()` 使用 `if (currentValue.current)`。
- `handleEnd()` 使用 `if (!finalValue) return`。

因此用户把值改成 `0` 时不会触发 `onEnd`。对几何面板来说，`x = 0`、`y = 0`、`rotation = 0`、`radius = 0` 都是合法值。

建议改为显式判断 `undefined` / `null` / `Number.isNaN()`。

### P1：正式入口和开发入口边界不清

当前 `/test` 进入正式 router，并且首页 header 有“测试页”按钮：

- `apps/web/src/view/router.tsx`
- `apps/web/src/view/pages/home/header.tsx`

`dev-snapshot` 已经用 `isDEV` 包住，这是合理的；但 `/test` 和 mock/applyRecord 入口是否应在 production 暴露，需要明确。

建议：

- `/test` 只在 DEV 注册。
- 首页测试按钮只在 DEV 显示。
- `Mock页`、`applyRecord=true` 也按 DEV 边界处理。

### P2：Auto-import 范围仍偏大

`apps/web/auto-import.ts` 自动导入了 React、MobX、Signal、YState、YClients、Undo、Schema/Math/UI helpers 等大量符号。

好处是写起来快，坏处也明显：

- 依赖方向不容易从文件顶部看出来。
- 核心服务被全局化，模块边界更隐蔽。
- 类型迁移和 package 拆分时更难发现真实依赖。

建议先不一次性移除。更温和的路线是：

1. 保留 React hooks、MobX 常用 API、`css/cx`。
2. 对 `YState`、`YClients`、`Undo`、`Stage*`、`SchemaHelper`、`Matrix/MRect` 等核心业务符号逐步恢复显式 import。
3. 每次只改一个目录，避免大 diff。

### P2：规范债仍在

当前仍有几处与项目约定不一致：

- 项目约定不要用 Tailwind，但当前仍有：
  - `apps/web/vite.config.ts` 中 `tailwindcss()`
  - `apps/web/src/view/app.css` 中 `@import 'tailwindcss'`
  - `tailwind-merge`
  - `className='text-[14px]'`
  - shadcn avatar 组件里的 Tailwind class

- 文件/目录命名不完全 kebab-case：
  - `GraphemeBreak.ts`
  - `LineBreaker.ts`
  - `UnicodeTrie.ts`
  - `unicodeData.ts`
  - `immut copy 2.ts`
  - `assets/editor/RP`

- `apps/web/vite.config.ts` 设置了 `server.open: true`。这不是代码 bug，但和“本地服务通常由用户自行启动，动作保持克制”的协作习惯不太一致。

建议这些放在 P2，不要和 P0 生命周期/typecheck 混在一起。

### P2：包体和懒加载还有空间

历史构建记录里已有大 chunk 警告。当前静态结构也支持这个判断：

- 首页和编辑器当前是静态 import，未做 route-level lazy。
- `unicodeData.ts` 约 1400 行。
- `nick-name.ts` 约 800 行。
- `dev-snapshot.tsx`、color picker、text breaker、React reconciler 都在主应用依赖图里有潜在成本。

设计工具可以接受比普通站点更大的包，但仍建议拆：

1. 首页 / 编辑器路由动态 import。
2. 文本换行 Unicode 数据按需加载。
3. 颜色选择器、图片 picker、dev snapshot 延迟加载。
4. 对 `react-reconciler` 使用面做一次确认。

### P2：服务安全边界需要文档化

`apps/web/src/global/sdk/supabase.ts` 直接包含 Supabase anon key。anon key 出现在前端不等于泄露密钥，但上线安全依赖 RLS。

`apps/web/src/global/sdk/cos.ts` 通过公开函数 URL 获取 COS 临时凭证。这里需要服务端保证：

- 鉴权或匿名策略明确。
- 限流。
- 最小权限。
- 文件大小和类型限制。
- 来源校验。

建议在 README 或 `ai/notes` 里单独记录“前端 public key / 临时凭证服务边界”，避免后续误把 anon key 当 secret，或反过来忽视 RLS。

## 推荐处理顺序

### 第一阶段：先修生命周期和 typecheck

目标：让编辑器重复进入/退出不会残留副作用，让 `@sigma/web typecheck` 能完成。

建议任务：

1. `EditorCommand.subscribe()` 返回完整 disposer，包含 hotkeys unbind 和 `listen()` 清理。
2. `StageScene.subscribe()` 释放内部 `this.disposer`。
3. 清理或隔离 `handle/picker.ts`、`math/bezier/bezier.ts`、空 stub 文件。
4. 修复 `types/schema` 中 `AllKeys<IFill>` 旧类型残留。
5. 重新记录一次 `pnpm --filter @sigma/web typecheck` 结果。

### 第二阶段：统一几何写入

目标：业务写入只改 `width / height / matrix / flip`，`x/y/rotation` 只作为 UI 派生值。

建议任务：

1. 改 `OperateAlign`，对齐写入 `matrix`。
2. 改 `HandleNode` 中 OBB 旧口径，优先用 `MRect` / `SchemaHelper.getSceneMatrix()`。
3. 修 `StageCreate` line 创建。
4. 给 `MRect` / `Matrix` 补测试。

### 第三阶段：修 render tree reparent

目标：schema tree 和 render tree 在 reparent / reorder / delete / undo 后保持一致。

建议任务：

1. 调整 `Elem.addChild()` 或 `StageScene.reHierarchy()`，保证移动前从旧 parent 移除。
2. 给 wrap frame、同 parent reorder、跨 parent reparent 做最小测试或 dev assert。
3. 再接入图层拖拽真实重排。

### 第四阶段：决定协作产品状态

目标：README、UI、默认运行行为一致。

如果暂不恢复远程协作：

- README 降级描述。
- 协作 UI 隐藏或标实验。

如果恢复远程协作：

- 恢复 `YSync.init()`。
- provider 生命周期纳入 disposer。
- 加连接状态和错误提示。
- 修 avatar。
- 做最小双客户端同步验证。

### 第五阶段：补核心测试

优先顺序：

1. `Immut` patch 语义。
2. `YState` set/insert/delete/transact 与本地投影。
3. `Matrix` / `MRect`。
4. `StageScene` mount/update/remove/reparent。
5. `Undo` all/client/state 回放顺序。
6. `HitTest`。

## 最后判断

Sigma 的技术方向仍然是值得继续推进的：它已经在做真实设计编辑器最难的东西，而不是普通 UI demo。当前最危险的不是“功能少”，而是一些基础设施还没完全闭环：副作用释放、typecheck、几何事实来源、协作事实状态。

如果下一阶段能先把 P0 收掉，再给 `Matrix/MRect + YState + StageScene` 加一层薄测试，项目的可信度会明显提升。到那时再继续拆 package、补协作、做包体优化，会稳很多。
