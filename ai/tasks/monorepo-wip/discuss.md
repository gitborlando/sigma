# Monorepo 讨论总结

## 来源文件

- `monorepo/monorepo.md`：提出最初的 monorepo 迁移路线，强调小步迁移、保留旧入口、先低风险后高风险。
- `monorepo/monorepo.override.md`：补充公共 math 包和 Sigma headless SDK 的边界，要求 math、schema、SDK、Yjs、renderer、React 绑定拆清楚。
- `monorepo/source-reuse-vs-sdk.md`：进一步收敛判断：当前不优先做正式 SDK，也不急着发布公共 math 包，优先按真实复用概率做内部包或源码级复用。
- `monorepo/yjs-source-of-truth-session.md`：讨论状态层重构，建议让 `Y.Doc` 成为运行时唯一权威源，`Immut` 只作为渲染投影。

## 总体结论

后续目标不是一次性把 `apps/web/src` 拆成很多包，也不是立刻做一个稳定对外的 Sigma SDK。更合理的方向是先把仓库边界、运行时状态源和复用策略理清，再按风险从低到高迁移。

最终原则可以收敛为三条：

1. 稳定优先：每次迁移都保留旧路径 shim，保持 `pnpm --filter @sigma/web build` 或等价校验可通过。
2. 复用分层：确定会原样复用的能力做 package；大概率要魔改的能力做 registry source copy；只服务 Sigma 的能力留在 app 或 Sigma private package。
3. 状态收敛：编辑器运行时以 `Y.Doc` 为唯一权威源，JSON 只做持久化快照，`Immut` 只做不可变渲染投影。

## 阶段 0：建立迁移基线

目标是先固定当前行为，后续每一步都能回归验证。

主要动作：

- 在根 `package.json` 记录 `packageManager`。
- 保留现有 `dev` / `build` / `preview`，新增 `dev:web`、`build:web`、`typecheck` 这类转发脚本。
- 给 `@sigma/web` 增加 `typecheck`。
- 记录 `pnpm install --frozen-lockfile`、`pnpm --filter @sigma/web build`、`pnpm --filter @sigma/web typecheck` 的当前结果。

验收重点：

- 当前前端仍可启动、构建。
- 如果 typecheck 已经失败，只记录现状，不把修类型和迁移混在一个 PR。

## 阶段 1：整理 workspace 基础设施

目标是让后续新增包有统一格式，但不移动业务代码。

主要动作：

- 新建 `packages/`。
- 新增根 `tsconfig.base.json`，只放跨包通用配置。
- 约定内部包统一使用 `private: true`、`type: module`、明确 `exports` 和 `typecheck`。
- 初期使用源码 package，不急着引入 tsup、rollup、Turborepo 或 Nx。

验收重点：

- `pnpm -r --if-present typecheck` 可运行。
- `pnpm --filter @sigma/web build` 结果不变。

## 阶段 2：先迁低风险类型和工具

目标是用低风险内容验证 workspace 依赖链。

优先顺序：

1. `@sigma/api-types`
   - 把 `types/supabase.ts` 迁到 `packages/api-types/src/supabase.ts`。
   - web 侧依赖 `@sigma/api-types`。
   - 迁移期保留旧 `types/supabase.ts` re-export。

2. `@sigma/utils`
   - 只作为 Sigma 内部过渡包，放项目策略或暂时无法判断公共归属的工具。
   - 不把跨项目通用能力长期塞进 `@sigma/utils`，避免形成新的大杂烩。
   - `defuOverrideArray` 这类项目配置策略可以先留在 Sigma 侧；`signal-react.ts`、`global.ts`、和 UI 主题耦合的 `color.ts` 先暂缓。
   - 每次只迁一个文件或小目录，旧位置保留 shim。

验收重点：

- 新包不能依赖 `apps/web`、React、DOM、Vite。
- 每迁一批都跑 web build。

## 阶段 3：先收敛 Yjs / Immut 状态源

这个阶段不是单纯目录迁移，但它会影响后续 `editor-core`、`sdk-yjs`、协同和 undo 的边界，应该尽早做小步修正。

目标状态：

```txt
JSON/mock/database snapshot -> import once into Y.Doc
Y.Doc -> observeDeep event -> Immut projection -> render subscribers
业务操作 -> YState.set/insert/delete -> directly write Y.Doc
保存 -> Y.Doc.toJSON() -> JSON 入库
```

主要动作：

- 保存并释放 `bind()` 返回的 disposer。
- 初始化时先等远端同步；远端 `Y.Doc` 已有内容时，不强行灌本地 JSON。
- 去掉或禁用 `Immut -> Yjs` 的订阅链路，写入统一走 `YState.set/insert/delete`。
- 修正 `Y.Array.insert` 未走 `toYValue` 的问题。
- 修正数组 import 过滤 `null` 导致下标语义变化的问题。
- 把 `immut-y.ts` 拆成 `json-to-y.ts` 和 `y-to-immut.ts`。
- 最终封装 `YState.transact()`，统一处理 `doc.transact`、Yjs 写入、Immut 投影、undo capture 和 patch flush。

验收重点：

- `Y.Doc` 是运行时唯一权威源。
- `Immut` 只做渲染投影，不再和 `Y.Doc` 互相抢写。
- JSON 仍然作为导入、导出、持久化格式保留。

## 阶段 4：确定复用策略，不急着正式 SDK

早期方案倾向拆出 `@sigma/editor-math`，补充方案又进一步提出 `@gitborlando/math` 和 `@sigma/sdk-core`。后续讨论收敛为：现在不优先做正式 SDK，也不优先发布独立 math 包。

判断规则：

```txt
新项目大概率只是用、不改：
  package

新项目大概率要改：
  registry source copy

只服务当前产品：
  app / Sigma private package
```

推荐分层：

```txt
nano/
  data/
  object/
  lifecycle/
  event/

toolkit/
  state/
  spatial/
  text/

packages/
  sigma-schema-core/
  sigma-editor-core/
  sigma-renderer/
  sigma-viewport-runtime/

registry/
  items/

apps/
  web/
```

含义：

- `nano`：极小、零依赖或低依赖工具，例如 tree traverser、path accessor、disposable、emitter。
- `toolkit`：成套能力，例如 patch-store、Yjs object bind、history、viewport-core、browser text layout。
- `packages/sigma-*`：Sigma 专属 private workspace package。
- `registry/items`：shadcn 式源码级复用，用于未来项目复制后魔改。
- `apps/web`：产品壳，保留页面、路由、资源、Supabase/COS、UI 编排。

## 阶段 5：通用能力按真实复用再抽

不要因为某段代码“看起来通用”就立刻发包。当前更适合沉淀的通用底座是：

- `Immut / patch store`
- `Immut <-> Yjs plain object binding`
- `tree traverser`
- `browser text layout`
- `viewport-core` 的纯逻辑
- `hit-test`，前提是第二个真实项目确实需要

关于 math 的最终判断：

- 暂时不优先创建 `@gitborlando/math`。
- `matrix` / `mrect` 先留在 Sigma 内部。
- `hit-test` / `polyline` 等如果被新项目真实需要，可以先做 registry item。
- 多项目稳定复用后，再考虑升成 `@gitborlando/*` package。

如果未来确实发布通用包，约束是：

- 使用 TypeScript 和 ESM。
- 明确 `exports`，可设置 `sideEffects: false`。
- 不依赖 Sigma schema、`apps/web`、DOM、React、MobX、i18n、产品资源。
- 只处理 plain data / generic types。

### 通用小能力的现实策略

最新讨论进一步收敛为：当前已经有跨项目复用需要，但这些通用能力主要还要靠 Sigma 编辑器验证和迭代；放到外部仓库会增加协作成本，放在 `@sigma/*` 又会误导语义。

因此不在“全部塞进 `@gitborlando/utils`”和“每个十几行工具单独发包”之间二选一。更合理的折中是：

```txt
packages/
  toolkit/
    package.json   # name: @gitborlando/toolkit
    src/
      disposer.ts
      traverser.ts
      browser/
      number/
      object/
      state/
```

原则：

- Sigma 仓库暂时作为 `@gitborlando/toolkit` 的孵化和验证场。
- `@gitborlando/toolkit` 可以是一个 workspace source package，必要时以 `0.x` 形式发布给其他项目使用。
- 包内部按领域或能力用 subpath exports 拆边界，例如 `@gitborlando/toolkit/disposer`、`@gitborlando/toolkit/traverser`、`@gitborlando/toolkit/browser`。
- 只有当上层领域能承载多个稳定能力时才加上层；当前 `disposer` 和 `traverser` 都不需要额外的 `lifecycle` / `tree` 上层。
- 不为十几行小工具单独发 npm 包；等某个领域稳定、变大、跨项目验证充分后，再考虑从 toolkit 拆成独立包。
- `@gitborlando/utils` 继续适合放低层纯函数和历史兼容，不再无限吸收所有领域能力。
- `@sigma/utils` 不作为跨项目通用能力的长期归宿。

当前归属判断：

- `Disposer`：生命周期清理能力，但当前不需要 `lifecycle` 上层，适合 `@gitborlando/toolkit/disposer`。
- `tree traverser`：树遍历能力，但当前不需要 `tree` 上层，适合 `@gitborlando/toolkit/traverser`；发布前需要先明确 stop / skip / bubble 等遍历语义。
- `DragHelper`：浏览器交互领域，适合 `@gitborlando/toolkit/browser`；`StageDrag` 依赖 Sigma viewport，必须留在 Sigma app/runtime。
- `twoDecimal` / `omitMut` / `memorized`：按 number / object / function 归入 toolkit 或保留在低层 utils，不能整体当作 `common` 大桶继续扩张。
- `defuOverrideArray`：偏项目配置策略，先留 Sigma 侧，不急着公共化。

边界约束：

- `toolkit/*` 不能 import `apps/web`、`src/*`、Sigma schema、StageViewport、文件服务、Supabase、COS。
- `browser/*` 可以依赖 DOM / browser API；`tree`、`lifecycle`、`number`、`object` 等纯领域不依赖 DOM / React。
- React 绑定必须单独隔离，避免污染纯工具包。
- Sigma 适配层保留在 app 或 Sigma runtime 包中。

## 阶段 6：拆 Sigma 专属核心包

目标是把 Sigma 自己的模型和编辑行为从产品壳中沉淀出来，但先保持 private，不承诺外部稳定 API。

建议顺序：

1. `sigma-schema-core`
   - 先迁 schema 类型、migration、traverse/helper。
   - `SchemaCreator` 不能原样迁，必须先把 `COLOR`、`Assets`、`themeColor()`、`t()`、默认文案等产品默认值改成注入参数。
   - 不依赖 `StageViewport`、`YState`、`view/styles`、`global/service`。

2. `sigma-editor-core`
   - 放编辑行为能力，例如 insert、delete、move、resize、reorder、selection、undo/redo。
   - 不做正式 SDK，只作为内部共享源码包。
   - 不包含 Canvas、React、DOM event、文件服务、Supabase、COS。

3. `operation-core` 或 `toolkit/state/history`
   - 如果 operation / patch / transaction / history 能跨项目复用，可以优先沉淀为更通用的 toolkit 包。
   - Sigma 和地图等项目各自定义自己的 operation。

验收重点：

- `apps/web` 可以依赖这些包，包不能反向依赖 `apps/web`。
- 数据格式迁移不要和目录迁移放在同一个 PR。
- 打开旧文件、schema migration、撤销重做行为保持一致。

## 阶段 7：协同服务和 Yjs adapter

目标是把服务端和协同适配拆清楚，但不改变前端当前协同行为。

主要动作：

- 将 `server/index.ts` 迁成 `apps/collab-server/src/index.ts`。
- 新增 `@sigma/collab-server` package 和 `dev:server` / `start:server` 脚本。
- web 不启动 server 时仍保持当前行为。
- 把 `immut-y.ts`、Yjs bind、awareness、undo manager 适配逐步迁入 `sdk-yjs` 或 Sigma 内部协同包。
- `UserService`、鼠标位置、viewport 等由 app 注入，不打进核心包。

验收重点：

- server 可以单独启动。
- 协同相关改动单独做冒烟测试。
- Yjs、renderer、UI 不进入 core。

## 阶段 8：后迁 renderer、runtime、viewport 和 UI

这是最高风险阶段，必须等 schema、状态源和基础包稳定后再做。

推荐顺序：

1. `viewport-core`
   - 只保留 bound、matrix、zoom、pan、坐标转换、zoomToFit。
   - `wheel`、`resize`、DOM event 放到 browser adapter。
   - `StageSurface`、`StageScene`、`YClients`、`EditorSetting` 绑定留给 `sigma-viewport-runtime`。

2. `sigma-renderer`
   - 迁 Elem、StageScene、StageSurface、ElemDrawer、dirty rect、text breaker。
   - Canvas / Path2D / OffscreenCanvas 属于 renderer，不属于 core。

3. `stage` / 交互 runtime
   - 最后迁鼠标、键盘、选择、拖拽、缩放。
   - 不在同一 PR 中同时改交互逻辑和目录结构。

4. UI
   - 最后迁通用组件，例如 `btn.tsx`、`input-num.tsx`、`menu.tsx`、`segments.tsx`、`text.tsx`、`divider.tsx`。
   - `react`、`react-dom` 应作为 peer dependency。
   - Linaria 组件迁移时同步检查 `wywInJs.include`。
   - 不为了抽 UI 改视觉设计。

验收重点：

- 新建文件、打开文件、选择、移动、缩放、撤销重做、保存都正常。
- Canvas 渲染无明显差异。
- 页面样式和交互无明显变化。

## 阶段 9：发布与工具链再评估

发布策略：

- `@gitborlando/*`：只给真正通用、Sigma 无关的能力考虑发布。
- `@sigma/*`：先不发布，只做 monorepo 内部 private package。
- `registry/items`：用于源码级复用和魔改复制。

工具链策略：

- 暂时不引入 Turborepo / Nx。
- 等 workspace package 超过 5 个、全量 build/typecheck 明显变慢、CI 需要跨包缓存、依赖图稳定后再评估。
- 如确实需要，优先 Turborepo，因为对 pnpm workspace 侵入较小。

## 固定 PR 验收清单

每个迁移 PR 至少检查：

- `pnpm install --frozen-lockfile`
- `pnpm -r --if-present typecheck`
- `pnpm --filter @sigma/web build`
- 手动启动 `pnpm dev`，确认首页和编辑器可打开。
- 冒烟流程：打开文件列表、新建或打开设计文件、创建图形、选择/移动/缩放、修改填充或描边、撤销/重做、刷新后确认基础数据仍可加载。

## 暂时不要做

- 不要一次性拆完 `apps/web/src`。
- 不要在迁移 PR 中重命名大量文件。
- 不要同时引入测试框架、构建框架、目录迁移和业务重构。
- 不要把 `view`、`editor`、`global` 全部抽成一个巨大 shared 包。
- 不要让 package 反向依赖 `apps/web`。
- 不要现在就承诺正式 Sigma SDK 或稳定对外 API。
