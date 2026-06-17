# Monorepo WIP Log

## 2026-05-26

### 范围

- 建立阶段 0 / 阶段 1 的迁移基线和 workspace 基础设施。
- 随后继续完成阶段 2 的 `@sigma/api-types`，当前仓库实际状态以已落地代码为准。

### 阶段 0 / 阶段 1 已完成

- 根 `package.json` 增加 `packageManager: pnpm@9.12.2`。
- 保留原有 `dev` / `build` / `preview`，新增：
  - `dev:web`
  - `build:web`
  - `preview:web`
  - `typecheck`
  - `typecheck:web`
- `@sigma/web` 增加 `typecheck` 脚本。
- 新增根 `tsconfig.base.json`，承载后续 packages 可复用的 TypeScript 配置。
- `apps/web/tsconfig.json` 继承根 `tsconfig.base.json`，web 侧只保留 DOM/React、路径别名、decorator 和 no-emit 等应用专属配置。
- `apps/web/tsconfig.json` 移除 `baseUrl` 和显式 `esModuleInterop: false`，避免 TypeScript 6 弃用预警；`paths` 里的 `src/*` 目标改为显式相对路径 `./src/*`。
- 新增 `packages/README.md`，记录内部包基础约定。

### 阶段 0 / 阶段 1 验证记录

- `pnpm install --frozen-lockfile`：通过。
  - 仍有 Supabase CLI bin 链接警告，属于当前依赖安装现状。
- `pnpm --filter @sigma/web build`：通过。
  - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。
- `pnpm exec prettier --check package.json apps/web/package.json apps/web/tsconfig.json tsconfig.base.json packages/README.md`：通过。
- `pnpm -r --if-present typecheck`：120 秒超时，无诊断输出。
- `pnpm --filter @sigma/web typecheck`：曾 300 秒超时，无诊断输出；后续一次复测被人工中断。

### 阶段 2 / `@sigma/api-types` 已完成

- 新增 `packages/api-types` 私有源码包。
- 新增 `@sigma/api-types` 的显式 `exports`：
  - `.`
  - `./supabase`
- 将原 `types/supabase.ts` 内容迁到 `packages/api-types/src/supabase.ts`。
- 删除旧 `types/supabase.ts` 入口。
- `@sigma/web` 增加 `@sigma/api-types: workspace:*` 依赖。
- web 内部 Supabase 类型 import 改为 `import type` 并指向 `@sigma/api-types/supabase`。
- `gen:supabase-types` 输出位置改为 `../../packages/api-types/src/supabase.ts`，避免后续生成覆盖旧入口。

### 阶段 2 / `@sigma/api-types` 验证记录

- `pnpm install --lockfile-only`：通过。
- `pnpm install --frozen-lockfile`：通过。
  - 仍有 Supabase CLI bin 链接警告，属于当前依赖安装现状。
- `pnpm exec prettier --write packages/api-types/package.json packages/api-types/tsconfig.json packages/api-types/src/index.ts packages/api-types/src/supabase.ts apps/web/package.json apps/web/src/global/service/file.ts apps/web/src/global/sdk/supabase.ts apps/web/src/view/pages/home/files.tsx`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `pnpm exec prettier --write pnpm-lock.yaml`：通过，用于消除 pnpm 写锁文件产生的 YAML 格式噪音。
- `pnpm --filter @sigma/api-types typecheck`：通过。
- `pnpm --filter @sigma/web build`：通过。
  - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。
- `pnpm -r --if-present typecheck`：约 120 秒超时，无诊断输出。

### 修正记录

- 曾短暂将 `types/supabase.ts` 旧 shim 改为相对转发，修复根 `types/` 位置无法解析 `@sigma/api-types/supabase` 的问题。
- 确认仓库业务代码不再引用 `types/supabase` 后，按当前决策删除旧入口。
- 2026-05-27 复核实际仓库状态：`packages/api-types` 已存在，`types/supabase.ts` 已删除，业务代码只引用 `@sigma/api-types/supabase`。
- 2026-05-27 复核验证：
  - `pnpm --filter @sigma/api-types typecheck`：通过。
  - `pnpm --filter @sigma/web build`：通过。

### 暂不处理

- 本轮不修 web 现有 typecheck 长耗时问题。
- 本轮不引入 Turborepo / Nx。
- 本轮不承诺正式 Sigma SDK 或稳定对外 API。

## 2026-05-27

### 范围

- 按实际仓库状态修正 WIP log，消除“阶段 2 已撤回”和“阶段 2 已完成”的口径冲突。
- 继续阶段 2，新增 `@sigma/utils` 第一批低风险工具迁移。
- 第一批迁移无 DOM / React / Vite / 业务服务依赖的 `disposer`、`defuOverrideArray` 和 `common` 纯工具。

### 已完成

- 新增 `packages/utils` 私有源码包，包名为 `@sigma/utils`。
- 新增 `@sigma/utils` 的显式 `exports`：
  - `.`
  - `./common`
  - `./defu`
- 将 `apps/web/src/utils/common.ts` 实现迁到 `packages/utils/src/common.ts`。
- 将 `apps/web/src/utils/disposer.ts` 实现迁到 `@gitborlando/toolkit/disposer`。
- 将 `apps/web/src/utils/defu.ts` 实现迁到 `packages/utils/src/defu.ts`。
- 旧 `apps/web/src/utils/common.ts`、`apps/web/src/utils/disposer.ts` 和 `apps/web/src/utils/defu.ts` 保留为 re-export shim。
- `logTime()` 在 shared 包内通过结构化 `globalThis` 访问 `performance` / `console`，避免为纯工具包引入 DOM lib。
- `@sigma/web` 增加 `@sigma/utils: workspace:*` 依赖。
- `@sigma/web` 移除不再直接使用的 `defu` 依赖，由 `@sigma/utils` 持有。
- web 内部当前引用改为指向 `@sigma/utils/common`、`@sigma/utils/defu` 和 `@gitborlando/toolkit/disposer`。
- `apps/web/auto-import.ts` 中的 `Disposer` 自动导入入口改为 `@gitborlando/toolkit/disposer`。

### 验证记录

- `pnpm install --lockfile-only`：通过。
  - 仍有既有 deprecated subdependencies 和 peer dependency 警告。
- `pnpm install --frozen-lockfile`：通过。
  - 仍有 Supabase CLI bin 链接警告，属于当前依赖安装现状。
- `pnpm exec prettier --write ... pnpm-lock.yaml`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `pnpm --filter @sigma/utils typecheck`：通过。
- `pnpm --filter @sigma/api-types typecheck`：通过。
- `pnpm --filter @sigma/web build`：通过。
  - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。
- `pnpm -r --if-present typecheck`：约 120 秒超时，无诊断输出。

### 暂不处理

- 本轮不迁移 `signal-react.ts`、`global.ts`、`color.ts`。
- 本轮不迁移 `immut/*`，后续应结合 Yjs / Immut 状态源收敛单独处理。
- 本轮不修 web 现有 typecheck 长耗时问题。

### 分层修正

- `Disposer` 不应归入 `@sigma/utils`。它是零业务语义的通用清理能力，但当前也不需要 `lifecycle` 上层。
- 新增 `packages/toolkit` workspace package，包名为 `@gitborlando/toolkit`。
- `Disposer` 当前放在 `@gitborlando/toolkit/disposer`，实现保持零依赖，不再通过 `@gitborlando/utils` 引入 `flushFuncs` / `NoopFunc`。
- `@sigma/utils` 只保留当前尚未进一步分层的 `common` / `defu`。
- `@sigma/web` 增加 `@gitborlando/toolkit: workspace:*` 依赖，`Disposer` 引用与 auto import 改为 `@gitborlando/toolkit/disposer`。
- 修正后验证：
  - `pnpm --filter @gitborlando/toolkit typecheck`：通过。
  - `pnpm --filter @sigma/utils typecheck`：通过。
  - `pnpm --filter @sigma/api-types typecheck`：通过。
  - `pnpm --filter @sigma/web build`：通过，仍有既有 baseline-browser-mapping、字体解析、大 chunk 警告。
  - `pnpm -r --if-present typecheck`：约 120 秒超时，无诊断输出。

### 阶段 2 / `@gitborlando/toolkit/traverser` 已完成

- 将 `apps/web/src/editor/utils/traverser.ts` 实现迁到 `packages/toolkit/src/traverser.ts`。
- `@gitborlando/toolkit` 新增显式 `exports`：
  - `./traverser`
- `packages/toolkit/src/index.ts` 转发 `traverser`。
- 旧 `apps/web/src/editor/utils/traverser.ts` 入口已删除，不再保留 shim。
- 当前唯一业务引用 `apps/web/src/editor/render/surface.ts` 改为直接引用 `@gitborlando/toolkit/traverser`。
- 本次不修改 traverser 的 stop / skip / bubble 等语义，只做低风险目录归属迁移；发布前仍需单独明确遍历控制语义。

### 阶段 2 / `@gitborlando/toolkit/traverser` 验证记录

- `pnpm exec prettier --write packages/toolkit/package.json packages/toolkit/src/index.ts packages/toolkit/src/traverser.ts apps/web/src/editor/render/surface.ts ai/tasks/monorepo-wip/log.md`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `pnpm --filter @gitborlando/toolkit typecheck`：通过。
- `pnpm --filter @sigma/utils typecheck`：通过。
- `pnpm --filter @sigma/api-types typecheck`：通过。
- `pnpm --filter @sigma/web build`：通过。
  - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。

### 最新讨论收敛

- 当前有跨项目复用需要，但这些通用能力主要仍靠 Sigma 编辑器验证和迭代；立即搬到外部仓库会增加成本。
- 不倾向把所有通用能力继续塞进 `@gitborlando/utils`，因为生命周期、树遍历、浏览器拖拽、状态等领域差异较大。
- 也不倾向为十几行小工具单独发 npm 包，发布和版本维护成本不匹配。
- 更合理的后续方向是：在 Sigma 仓库内孵化 `@gitborlando/toolkit` workspace package，以单包多 subpath 的形式组织通用能力。
- 推荐子路径：
  - `@gitborlando/toolkit/disposer`
  - `@gitborlando/toolkit/traverser`
  - `@gitborlando/toolkit/browser`
  - `@gitborlando/toolkit/number`
  - `@gitborlando/toolkit/object`
  - `@gitborlando/toolkit/state`
- `disposer` 和 `traverser` 当前都不需要额外上层；等某个上层领域确实承载多个稳定能力后，再新增 `lifecycle` / `tree` 这类聚合入口。
- 如其他项目现在就需要复用，可以先发布 `@gitborlando/toolkit@0.x`；Sigma 继续使用 workspace 版本做主验证场。
- 等某个领域 API 稳定、代码量和复用项目增加后，再考虑从 toolkit 拆成独立包或迁入正式 `gitborlando` 工具 monorepo。
- 当前归属判断：
  - `Disposer`：归入 `@gitborlando/toolkit/disposer`，不长期放 `@sigma/utils`，也不单独发包。
  - `Traverser`：归入 `@gitborlando/toolkit/traverser`，发布前先明确 stop / skip / bubble 语义。
  - `DragHelper`：归入 browser 领域；`StageDrag` 依赖 Sigma viewport，继续留在 Sigma。
  - `twoDecimal` / `omitMut` / `memorized`：按 number / object / function 归属，避免继续扩张 `common` 大桶。
  - `defuOverrideArray`：偏项目配置策略，暂留 Sigma 侧。

## 2026-05-28

### 范围

- 开始阶段 3 的 Yjs / Immut 状态源收敛，先处理低风险、可单独验证的问题。
- 本轮只修正现有绑定生命周期和数组同步语义，不做目录迁移，不拆 `immut-y.ts`。

### 阶段 3 / Yjs-Immut 小步修正已完成

- `YState.initSchema()` 在新建 `Y.Doc` 前先释放上一轮状态绑定和订阅，避免重复打开文件或重新初始化时遗留旧 `observeDeep` / Immut 订阅。
- `YState` 新增 `dispose()`，统一释放：
  - `bind()` 返回的 disposer。
  - `flushPatch()` 的 Immut 订阅。
  - 当前 `Y.Doc`。
- `Editor.dispose()` 改为调用 `YState.dispose()`，避免只重置 `inited$` 但不释放 Yjs / Immut 绑定。
- 修正 `immut-y.ts` 中普通数组转 `Y.Array` 时过滤 `null` 的问题；现在只过滤 `undefined`，保留 `null` 下标语义。
- 修正 Immut -> Yjs 的数组 add / replace 分支，使 `Y.Array.insert` 写入前走 `toYValue()`，支持对象和数组嵌套值，而不是直接插入普通对象。

### 阶段 3 / Yjs-Immut 小步修正验证记录

- `pnpm exec prettier --write apps/web/src/editor/y-state/y-state.ts apps/web/src/editor/editor/editor.ts apps/web/src/utils/immut/immut-y.ts`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `pnpm --filter @sigma/web build`：通过。
  - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。
- `pnpm --filter @sigma/web typecheck`：约 120 秒超时，无诊断输出，延续既有 typecheck 长耗时问题。

### 暂不处理

- 本轮不启用或恢复 `YSync.init()`。
- 本轮不拆分 `immut-y.ts` 为 `json-to-y.ts` / `y-to-immut.ts`。
- 本轮不修改 `Immut -> Yjs` 订阅链路整体策略；后续仍需继续向“业务写入统一走 `YState.set/insert/delete`，`Immut` 只做渲染投影”的目标收敛。

## 2026-06-06

### 范围

- 继续阶段 3 的 Yjs / Immut 状态源收敛。
- 本轮先做 `immut-y.ts` 的职责拆分，再新增 `YState.transact()` 作为后续统一写入入口。
- 本轮不改变现有双向同步策略。

### 阶段 3 / `immut-y.ts` 拆分已完成

- 新增 `apps/web/src/utils/immut/json-to-y.ts`。
  - 承担 Immut / JSON 写入 Yjs 的转换、初始化和订阅逻辑。
  - 保留原有 `toYValue()`、`initializeYFromI()`、`subscribeI()` 等行为。
- 新增 `apps/web/src/utils/immut/y-to-immut.ts`。
  - 承担 Yjs 内容和 `observeDeep` 事件投影回 Immut 的逻辑。
  - 保留原有 `initializeIFromY()`、`subscribeY()` 行为。
- `apps/web/src/utils/immut/immut-y.ts` 缩小为 `bind()` 编排入口，只负责初始化顺序和 disposer 聚合。
- 同步顺序保持为：
  - 先 `Y -> Immut`
  - 再 `Immut -> Y`
  - 然后同时订阅 `Immut -> Y` 与 `Y -> Immut`
- `initializeIFromY()` 初始化投影改为直接写入 `i.state`，不再使用 `i.set()` 产生 Immut patch，避免远端 Yjs 内容初始化时的 patch 混入后续业务提交。

### 阶段 3 / `YState.transact()` 小步接入已完成

- `YState` 新增 `transact(callback, origin?)`。
  - 当前实现仍执行既有 Immut 写入，再统一调用 `immut.next()` flush patch。
  - 如果 `Y.Doc` 已存在，外层通过 `doc.transact()` 包裹提交。
  - 这一步先收口提交边界，尚未改成直接写 Yjs。
- 以下简单写入点已从手动 `YState.next()` 迁到 `YState.transact()`：
  - `HandlePage.addPage()` / `HandlePage.removePage()`
  - `HandleNode.deleteSelectedNodes()` / `HandleNode.pasteNodes()` / `HandleNode.reHierarchySelectedNode()`
  - `OperateFill.applyChangeToYState()`
  - `DesignGeometry.setGeometries()`
  - `StageTransformer.transform()`
  - `StageCreate.onCreateMove()` / `StageCreate.onCreateEnd()`
- `StageCreate.onCreateMove()` 保留线段创建时的空提交语义，确保 `onCreateStart()` 中已加入的节点仍会被 flush。
- `HandleNode.deleteSelectedNodes()` 保留原有顺序：删除节点、清空选择、派发 `afterSelect`，最后由 `YState.transact()` 统一 flush。
- `handle/node.ts` 中只剩 `wrapInFrame()` 的 `YState.next()` 暂未迁移；该方法当前开头直接 `throw new Error('Not implemented')`，属于不可达路径。

### 验证记录

- `pnpm exec prettier --write apps/web/src/utils/immut/immut-y.ts apps/web/src/utils/immut/json-to-y.ts apps/web/src/utils/immut/y-to-immut.ts`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `pnpm exec prettier --write apps/web/src/editor/y-state/y-state.ts apps/web/src/editor/handle/page.ts apps/web/src/editor/operate/fill.ts apps/web/src/editor/operate/geometry.ts apps/web/src/editor/stage/tools/transformer.ts apps/web/src/editor/stage/interact/create.ts`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `pnpm exec prettier --write apps/web/src/editor/handle/node.ts`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `pnpm exec tsc --noEmit --pretty false --target ESNext --module ESNext --moduleResolution bundler --skipLibCheck --strict --isolatedModules apps/web/src/utils/immut/immut-y.ts apps/web/src/utils/immut/json-to-y.ts apps/web/src/utils/immut/y-to-immut.ts`：通过。
- `apps/web` 目录下执行 `pnpm exec tsc --noEmit --pretty false --target ESNext --module ESNext --moduleResolution bundler --skipLibCheck --strict --isolatedModules src/utils/immut/immut-y.ts src/utils/immut/json-to-y.ts src/utils/immut/y-to-immut.ts`：通过。
- 针对编辑器文件的 root-files 局部 `tsc` 未作为有效验证记录：这类指定文件编译会拉入编辑器依赖图并长时间无输出，和既有 web typecheck 长耗时问题一致。
- 本轮未运行 `@sigma/web build` 或 `@sigma/web typecheck`。
  - 原因：本次是低风险拆分和提交入口收口；且 `@sigma/web typecheck` 已记录存在长耗时超时问题。

### 控制台错误补充排查

- 页面控制台报多个模块 500，build 复现为 `@gitborlando/toolkit/disposer` 无法解析。
- 根因是当前 `node_modules` 缺少 `@sigma/web -> @gitborlando/toolkit` workspace link；`package.json` 和 `pnpm-lock.yaml` 已有依赖记录。
- 执行 `pnpm install --frozen-lockfile` 后，`apps/web/node_modules/@gitborlando/toolkit` 正确链接到 `packages/toolkit`。
- 重新验证：
  - `http://localhost:5173/src/editor/editor/editor.ts`：从 500 恢复为 200。
  - `http://localhost:5173/src/editor/stage/interact/create.ts`：返回 200。
  - `pnpm --filter @sigma/web build`：通过。
- 当前运行中的旧 Vite 进程仍对根路径返回 500，需要用户重启本地 dev server 以加载新的 workspace link。

### auto-import 声明问题补充修正

- 发现仓库根目录误生成过一份旧的 `auto-imports.d.ts`。
  - 其中 `Disposer` 仍指向 `src/utils/disposer`。
  - 其中还保留过期的 `getNodeMrect` 声明。
- `apps/web/auto-import.ts` 显式设置 `dts: path.resolve(dirname, 'auto-imports.d.ts')`，确保无论从根目录还是 `apps/web` 启动 Vite，声明文件都只生成到 `apps/web/auto-imports.d.ts`。
- `.gitignore` 从忽略所有 `auto-imports.d.ts` 改为只忽略根目录 `/auto-imports.d.ts`，让 `apps/web/auto-imports.d.ts` 可以纳入版本控制，避免新环境或 TS Server 没有全局声明。
- 删除根目录错误生成的 `auto-imports.d.ts`。
- Vite transform 已确认会为使用 `YState` 的模块注入 `import { YState } from "/src/editor/y-state/y-state.ts"`。
- `pnpm --filter @sigma/web build`：通过。

### 暂不处理

- 本轮不移除 `Immut -> Yjs` 订阅链路。
- 本轮不改 `YState.set/insert/delete` 的写入实现。
- 本轮不启用或恢复 `YSync.init()`。

## 2026-06-08

### 范围

- 继续阶段 3 的 Yjs / Immut 状态源收敛。
- 本轮按“一次做 3 小步”推进，集中迁移右侧属性操作里仍走旧 `Schema.nextSchema()` 的相邻写入点。
- 本轮不改旧 `Schema` 服务本身，不移除 `Immut -> Yjs` 订阅链路。

### 阶段 3 / 属性操作写入收口已完成

- `OperateStroke` 从旧 `OperateNode` / `Schema.onMatchPatch()` / `Schema.applyPatches()` 迁到：
  - 选区来源：`YClients.afterSelect` 与 `getSelectedNodes()`。
  - 状态变更监听：`YState.subscribe()` 中匹配 `strokes` patch。
  - 写入入口：`YState.transact()` + `YState.set()`。
  - 历史记录：`Undo.track()`。
- `OperateShadow` 按同样模式从旧 `Schema` 写入迁到 `YState.transact()`。
- `OperateText` 的文本样式和内容写入迁到 `YState.transact()`：
  - `setTextStyle()` / `toggleTextStyle()` 只写入变更的 style key，避免多选混合值覆盖其他样式字段。
  - `setTextContent()` 直接写入 `${textNode.id}.content`。
  - 文本操作监听改为 `YClients.afterSelect` 与 `YState.subscribe()`。
- `stroke` / `shadow` 多选写入时为每个节点单独 `clone()` 当前属性数组，避免多个节点共享同一个数组引用。

### 验证记录

- `pnpm exec prettier --write apps/web/src/editor/operate/stroke.ts apps/web/src/editor/operate/shadow.ts apps/web/src/editor/operate/text.ts`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `git diff` 已复核，本轮只涉及上述 3 个 operate 文件和本日志。
- 本轮未运行 `@sigma/web build` 或 `@sigma/web typecheck`。
  - 原因：本次是局部写入入口迁移；仓库指示默认不要频繁 build/test，且既有记录中 `@sigma/web typecheck` 存在长耗时问题。

### 暂不处理

- 本轮不迁移 `OperateAlign` / `OperatePage` / 旧 `OperateNode`。
- 本轮不改 `YState.set/insert/delete` 为直接写 Yjs。
- 本轮不启用或恢复 `YSync.init()`。

### 阶段 3 / 实际使用优先规则补充

- `discuss.md` 补充规则：迁移某个文件或模块前，先确认是否被实际运行路径引用。
- 只有注释引用、仅自身导出、或没有被入口链路导入的旧文件，当前不迁移、不删除，直接跳过。
- 本轮复核发现 `apps/web/src/editor/operate/page.ts` 只有注释引用和自身导出，没有实际导入使用，因此本轮不迁移它。

### 阶段 3 / 操作层选择与对齐写入收口已完成

- 按“一次做 3 小步”继续推进，并只处理已确认实际使用的入口：
  - `OperateNode` 被 `StageSelect`、`OperateAlign`、`vector-edit` 等实际引用，本轮将选择状态桥接从旧 `Schema.onMatchPatch()` / `Schema.schemaChanged` 改为跟随 `YClients.afterSelect` 和 `YState.subscribe()`。
  - `OperateAlign` 被 editor 初始化和右侧对齐面板实际引用，本轮将对齐写入从 `Schema.itemReset()` / `Schema.finalOperation()` 改为 `YState.transact()` / `YState.set()` / `Undo.track()`。
  - `YClients.selectPage()` 被 `HandlePage` 实际使用，本轮在清空选择后派发 `afterSelect`，确保页面切换时 `OperateNode` 的选择缓存同步清空。
- `OperateAlign` 的多选对齐边界从原先注释掉的旧路径改为使用当前待对齐节点的合并 AABB。
- `OperateNode` 本轮只迁选择缓存与选中节点派发；旧增删节点方法仍保留旧 `Schema` 写入，后续必须先确认具体方法是否仍被实际入口调用。

### 验证记录

- `pnpm exec prettier --write ai/tasks/monorepo-wip/discuss.md ai/tasks/monorepo-wip/log.md apps/web/src/editor/operate/node.ts apps/web/src/editor/operate/align.ts apps/web/src/editor/y-state/y-clients.ts`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `git diff --check`：通过。
- 本轮未运行 `@sigma/web build` 或 `@sigma/web typecheck`。
  - 原因：本次仍是局部写入入口迁移；仓库指示默认不要频繁 build/test，且既有记录中 `@sigma/web typecheck` 存在长耗时问题。

### 暂不处理

- 本轮不迁移 `OperatePage`，因为未发现实际运行引用。
- 本轮不迁移 `OperateNode` 的旧增删节点 / paste / wrapInFrame 写入方法。
- 本轮不迁移 `Schema` 服务本身。
- 本轮不改 `YState.set/insert/delete` 为直接写 Yjs。

### 阶段 3 / 实际使用读路径收口已完成

- 继续按“迁移前先确认实际使用”推进。
- 复核发现 `apps/web/src/view/editor/stage/vector-edit.tsx` 虽然仍有旧 `Schema` 写入，但当前没有被 `StageComp` 或其他运行入口实际渲染，本轮不迁移、不删除。
- 复核确认 `SchemaHelper.isById()` / `getChildren()` / `findAncestor()` / `findParent()` 被当前舞台选择、创建和右侧对齐面板实际使用：
  - 这些 helper 内部读源从 `Schema.find()` 改为 `YState.find()`。
  - 清理 `SchemaHelper` 中不再使用的 `Schema` import。
- 复核确认 `HandleNode.getDatum()` 通过 `HandleNode.subscribe()` 实际接入编辑器订阅：
  - 基准父节点读取从 `Schema.find()` 改为 `YState.find()`。

### 验证记录

- `pnpm exec prettier --write apps/web/src/editor/schema/helper.ts apps/web/src/editor/handle/node.ts ai/tasks/monorepo-wip/log.md`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `git diff --check`：通过。
- 本轮未运行 `@sigma/web build` 或 `@sigma/web typecheck`。
  - 原因：本次是实际使用读路径的局部迁移；仓库指示默认不要频繁 build/test，且既有记录中 `@sigma/web typecheck` 存在长耗时问题。

### 暂不处理

- 本轮不迁移 `vector-edit.tsx`，因为未发现实际运行入口渲染它。
- 本轮不迁移 `operate/page.ts`，因为未发现实际运行引用。
- 本轮不迁移 `OperateNode` 的旧增删节点 / paste / wrapInFrame 写入方法，后续需先确认具体方法是否仍由实际入口调用。

### 阶段 3 / YState 直写与 Immut 写回链路收口已完成

- 按“后续 5 步”继续推进，并先复核真实调用链：
  - `HandleNode` 是当前复制、粘贴、删除、层级调整和包裹画板的命令入口。
  - 旧 `OperateNode.addNodes()` / `removeNodes()` / `insertAt()` / `splice()` / `reHierarchy()` / `paste()` / `wrapInFrame()` 未发现真实调用，只剩注释引用或未接入旧模块调用，本轮不迁移、不删除。
  - `OperateNode.clearSelect()` 仍被实际路径调用，但只桥接选择状态，不涉及旧 `Schema` 写入。
- `HandleNode.wrapInFrame()` 从不可达实现恢复为 `YState.transact()` 写入：
  - 新增 frame 节点。
  - 在原父级当前位置插入 frame。
  - 将原选中节点从旧父级移入 frame。
  - 更新选择到新 frame，并派发 `YClients.afterSelect`。
  - 保留 `Undo.track({ type: 'all' })` 记录。
- `YState.set()` / `insert()` / `delete()` 改为有 `Y.Doc` 时先直接写 `doc.getMap('schema')`，再同步更新本地 `Immut` 镜像：
  - 支持顶层 map set/delete。
  - 支持嵌套 map set/delete。
  - 支持数组 insert/delete/replace，并对数组索引做边界保护。
  - 保留本地 Immut 同步更新，避免同一 transaction 内依赖刚写入的 `childIds` / `parentId` 读写顺序被破坏。
- `YState.applyImmerPatches()` 不再直接调用 `Immut.applyImmerPatches()`，改为逐条转发到新的 `YState.set()` / `insert()` / `delete()`，确保 fill 等 Immer patch 写入也走 Yjs。
- `immut-y.bind()` 禁用 `subscribeI()`，不再让 Immut patch 订阅链路写回 Yjs：
  - 初始化仍保留 `initializeIFromY()` 与 `initializeYFromI()`。
  - 运行期保留 `subscribeY()`，让 Yjs 变更投影回 Immut。
- `json-to-y.ts` 导出 `toYValue()`，供 `YState` 直接写 Yjs 时复用原 plain JSON -> Yjs 转换语义。
- 实际使用读路径继续收口：
  - `StageWidgetAdsorption` 中 datum 节点读取从 `Schema.find()` 改为 `YState.find()`。
  - 右侧文本编辑浮层中当前文本节点读取从 `Schema.find()` 改为 `YState.find()`。
- 剩余旧 `Schema` 调用复核：
  - `vector-edit.tsx` 仍未发现实际运行入口渲染，本轮继续跳过。
  - `operate/page.ts` 仍未发现实际运行引用，本轮继续跳过。
  - `SchemaHistory.replay()` 中旧 `Schema.applyPatches()` / `Schema.nextSchema()` 位于 `undo()` / `redo()` 早返回之后，当前不可达，本轮不迁移。
  - 旧 `OperateNode` 写入方法未发现真实调用，本轮只记录判断，不迁移、不删除。

### 验证记录

- `pnpm exec prettier --write apps/web/src/editor/y-state/y-state.ts apps/web/src/utils/immut/json-to-y.ts apps/web/src/utils/immut/immut-y.ts apps/web/src/editor/handle/node.ts apps/web/src/editor/render/widget/adsorption.ts apps/web/src/view/editor/right-panel/operate/text.tsx`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `git diff --check`：通过。
- 本轮未运行 `@sigma/web build` 或 `@sigma/web typecheck`。
  - 原因：仓库指示默认不要频繁 build/test；本轮以 diff check 和调用链复核为主。

### 暂不处理

- 本轮不删除旧 `OperateNode` 写入方法，避免把未接入口判断和清理重构混在一起。
- 本轮不迁移未实际接入的 `vector-edit.tsx` / `operate/page.ts`。
- 本轮不恢复 `YSync.init()`。
- 本轮不做完整 `Schema` 服务删除或目录迁移。

## 2026-06-09

### 范围

- 继续阶段 3 的 Yjs / Immut 状态源收敛。
- 按“接下来 5 步”复核剩余旧 `Schema` 调用、`YState` 写入边界和撤销/重做链路。
- 本轮只修状态入口边界问题，不迁移旧未接入文件，不做完整 `Schema` 清理。

### 阶段 3 / 状态写入边界复核已完成

- 复核剩余旧 `Schema` 调用：
  - `vector-edit.tsx` 仍未发现被 `StageComp` 或其他运行入口渲染，本轮继续跳过。
  - `operate/page.ts` 仍未发现实际运行引用，本轮继续跳过。
  - 旧 `OperateNode.addNodes()` / `removeNodes()` / `insertAt()` / `splice()` / `reHierarchy()` / `deleteSelectNodes()` / `pasteNodes()` / `paste()` / `wrapInFrame()` 未发现真实运行调用，只剩注释引用、未接入旧模块或未渲染的 `vector-edit.tsx` 引用。
  - `OperateNode.clearSelect()` 仍由舞台选择路径调用，但只桥接选择状态，不涉及旧 `Schema` 写入。
  - 当前真实节点命令入口继续确认为 `HandleNode.deleteSelectedNodes()` / `pasteNodes()` / `reHierarchySelectedNode()` / `wrapInFrame()`。
- `YState.insert()` / `set()` / `delete()` 新增本地路径校验和数组索引归一化：
  - 非法数组删除路径直接跳过，避免 Yjs 侧忽略非法索引但 Immut 侧 `splice(-1, 1)` 删除最后一项。
  - 数组插入路径先归一化到 `0..length`，确保 Yjs 和 Immut 使用同一索引。
  - 数组 set 只允许替换已存在下标，避免 Yjs 插入尾部而 Immut 产生稀疏数组。
  - 对象 delete 只在 key 存在时执行，避免产生无意义 remove patch。
  - `set(..., undefined)` 收敛为 `delete()`，保持和 Yjs 不存储 `undefined` 的语义一致。
- `Undo.initStateUndo()` 在新 `Y.Doc` 初始化时重置本地 undo stack 和指针，避免跨文件残留撤销记录。
- `Undo.undo()` / `redo()` 增加 `canUndo` / `canRedo` guard，避免快捷键或直接调用在空栈时读取不存在的历史项。

### 验证记录

- `pnpm exec prettier --write apps/web/src/editor/y-state/y-state.ts apps/web/src/editor/editor/undo-service.ts`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `git diff --check`：通过。
- 本轮未运行 `@sigma/web build` 或 `@sigma/web typecheck`。
  - 原因：仓库指示默认不要频繁 build/test；本轮是状态入口边界修正和调用链复核，以 diff check 为主。

### 暂不处理

- 本轮不删除旧 `OperateNode` 写入方法。
- 本轮不迁移未实际接入的 `vector-edit.tsx` / `operate/page.ts`。
- 本轮不恢复 `YSync.init()`。
- 本轮不做完整 `Schema` 服务删除或目录迁移。

### 阶段 3 / 选择状态与 undo client 边界收口已完成

- 继续按“5 小步”复核选择状态派发和撤销/重做 client 状态恢复链路。
- 保留当前选择 API 的批量语义：
  - `YClients.select()` / `unSelect()` / `clearSelect()` 仍只修改 client selection。
  - 调用方在一次批量选择完成后统一派发 `YClients.afterSelect`，避免 marquee 这类路径在循环中频繁触发订阅者。
- 修正 `HandleNode.pasteNodes()`：
  - 批量选中新复制节点后派发一次 `YClients.afterSelect`。
  - 确保粘贴后 `OperateNode.selectedNodes$`、右侧面板和吸附等订阅者能同步到新选区。
- 修正 `Undo.applyClientState()`：
  - 恢复 client selection / page 后派发 `YClients.afterSelect`。
  - 恢复 selection map 时 clone 历史快照，避免后续选择操作原地修改 undo 栈里的旧快照。
- 修正 `Undo.redo()` 的 `all` 类型顺序：
  - 先 redo Yjs state，再恢复 client selection。
  - 避免订阅者在节点尚未由 state redo 恢复时读取新选区。
- `Undo.untrack()` 增加 `try/finally`，避免 callback 异常导致后续 undo track 永久关闭。

### 验证记录

- `pnpm exec prettier --write apps/web/src/editor/handle/node.ts apps/web/src/editor/editor/undo-service.ts ai/tasks/monorepo-wip/log.md`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `git diff --check`：通过。
- 本轮未运行 `@sigma/web build` 或 `@sigma/web typecheck`。
  - 原因：仓库指示默认不要频繁 build/test；本轮是选择状态和 undo client 边界的小范围修正。

### 暂不处理

- 本轮不把 `YClients.afterSelect` 自动塞入每个 `select()` / `unSelect()` / `clearSelect()`。
- 本轮不迁移未实际接入的 `vector-edit.tsx` / `operate/page.ts`。
- 本轮不恢复 `YSync.init()`。
- 本轮不做完整 `Schema` 服务删除或目录迁移。

### 阶段 3 / 主题 A：旧运行残留清理已完成

- 本轮按主题推进阶段 3 收口清理，不再拆成零散小步。
- 主题目标：
  - 清掉真实运行路径里仍可见的旧 `Schema` 写入残留。
  - 明确未接入旧模块策略。
  - 补充 `YState` 写入 API 语义，作为后续调用约束。
- 再次复核真实引用：
  - `OperateNode.clearSelect()` 仍由 `StageSelect` 的 vector edit 退出路径调用。
  - 旧 `OperateNode.addNodes()` / `removeNodes()` / `insertAt()` / `splice()` / `reHierarchy()` / `deleteSelectNodes()` / `pasteNodes()` / `paste()` / `wrapInFrame()` 未发现真实运行入口调用。
  - `operate/page.ts` 未发现真实运行引用。
  - `vector-edit.tsx` 未发现被 `StageComp` 或其他运行入口渲染。
- `OperateNode` 收口：
  - 移除对旧 `Schema` / `SchemaHistory` 的依赖。
  - 保留旧方法名，避免未接入模块或后续恢复功能时直接断类型。
  - 方法内部改为使用 `YState.set()` / `insert()` / `delete()` / `transact()` 和 `Undo.track()`。
  - `pasteNodes()` 改为通过 `SchemaHelper.createTraverse()` 克隆子树并写入 `YState`，批量选择新节点后统一派发 `YClients.afterSelect`。
  - `wrapInFrame()` 改为通过 `YState.transact()` 新增 frame、移动原选中节点、更新选择并记录 `Undo`。
- `SchemaHistory` 收口：
  - 移除 `undo()` / `redo()` 中早返回之后不可达的旧 `Schema.applyPatches()` / `Schema.nextSchema()` replay 分支。
  - `SchemaHistory.undo()` / `redo()` 现在只作为旧入口转发到 `Undo`。
- `YState` 写入 API 语义记录：
  - `YState.transact(callback, origin?)` 是业务写入提交边界；有 `Y.Doc` 时外层用 `doc.transact()` 包裹，并在 callback 后 flush Immut patch。
  - `YState.set(path, value)` 用于对象字段写入和数组已存在下标替换；`value === undefined` 等价于 `delete(path)`。
  - `YState.insert(path, value)` 用于数组插入；如果 path 结尾不是数字，则表示追加到目标数组。
  - `YState.delete(path)` 用于对象 key 删除和数组合法下标删除。
  - 非法路径、数组越界 set/delete、非数组 insert 都直接跳过，避免 Yjs 和 Immut 镜像行为分叉。
  - 写入入口会先写 Yjs，再同步本地 Immut 镜像；运行期不再依赖 `Immut -> Yjs` 订阅链路。
- 未接入模块策略：
  - `operate/page.ts` 和 `vector-edit.tsx` 当前不作为阶段 3 阻塞项。
  - 本轮不迁移、不删除它们；后续如果重新接入真实运行入口，再按入口链路单独迁移。
  - 它们保留旧 `Schema` 调用不代表运行时状态源仍依赖旧 `Schema`。

### 验证记录

- `pnpm exec prettier --write apps/web/src/editor/operate/node.ts apps/web/src/editor/schema/history.ts ai/tasks/monorepo-wip/log.md`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `git diff --check`：通过。
- 本轮未运行 `@sigma/web build` 或 `@sigma/web typecheck`。
  - 原因：仓库指示默认不要频繁 build/test；主题 A 聚焦旧运行残留清理和日志语义记录。后续主题 B 再做编辑器状态链路验收。

### 暂不处理

- 本轮不迁移未实际接入的 `vector-edit.tsx` / `operate/page.ts`。
- 本轮不恢复 `YSync.init()`。
- 本轮不做完整 `Schema` 服务删除或目录迁移。

### 阶段 3 / 策略切换：旧模块直接清理已完成

- 用户调整策略：对已经确认没有真实 UI / 运行入口引用的旧模块，不再保留兼容壳或反复记录“暂不迁移”，直接删除或迁走真实引用。
- 本轮按实际 UI 引用重新复核：
  - `StageComp` 没有渲染 `VectorEditComp`。
  - `operate/page.ts` 没有实际 import。
  - `StageWidgetAdsorption` 没有实际 import / 初始化，并且内部引用了不存在的旧 `operate/meta`。
  - `StageDrop` 和 `parse/svg` 当前是全注释旧模块，没有实际运行入口。
  - `OperateNode.initHook()` 没有被 editor 调用；真实运行路径只在 `StageSelect` 中使用它的选择桥接字段。
- 清理结果：
  - `StageSelect` 直接改用 `YClients.selectIdList` / `getSelectIdMap()`，不再依赖 `OperateNode`。
  - 删除 `apps/web/src/editor/operate/node.ts`。
  - 删除 `apps/web/src/editor/operate/page.ts`。
  - 删除 `apps/web/src/editor/schema/schema.ts`。
  - 删除 `apps/web/src/editor/schema/history.ts`。
  - 删除 `apps/web/src/view/editor/stage/vector-edit.tsx`。
  - 删除 `apps/web/src/editor/render/widget/adsorption.ts`。
  - 删除 `apps/web/src/editor/stage/drop.ts`。
  - 删除 `apps/web/src/editor/parse/svg/index.ts` 和 `apps/web/src/editor/parse/svg/irregular.ts`。
  - 清理页面列表里旧 `Schema.commitHistory` 注释。
- 当前全局复核：
  - 不再存在 `OperateNode` / `OperatePage` / `VectorEditComp` / `SchemaHistory` / `SchemaService` / `Schema.` 旧运行引用。
  - 剩余 `SchemaCreator` 和 `schema/migration.ts` 属于 schema 数据创建 / migration，不是旧运行时写入服务。
- 后续策略：
  - 继续以“真实入口是否引用”为准；未接入旧模块不再作为迁移对象保留。
  - 如果后续需要恢复 SVG drop、vector edit 或吸附能力，应按当前 `YState` / `YClients` / `Undo` 入口重新实现，而不是恢复旧 `Schema` 服务。

### 验证记录

- `pnpm exec prettier --write apps/web/src/editor/stage/interact/select.ts apps/web/src/view/editor/left-panel/panels/layer/page/item.tsx ai/tasks/monorepo-wip/log.md`：通过。
  - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
- `git diff --check`：通过。
- `pnpm --filter @sigma/web build`：通过。
  - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。
- 本轮未运行 `@sigma/web typecheck`。
  - 原因：既有记录中 `@sigma/web typecheck` 存在长耗时问题；本轮用 build 验证删除范围内的 import / 打包入口。

### 阶段 3 / 主题 B：删除 undo/redo 问题修正

- 用户在步骤 3 验收中发现删除后的 undo / redo 有问题。
- 复现结果：
  - 删除节点后 undo / redo 会在某些顺序下让 UI 在节点不存在时仍读取选区节点，触发 `undefined.type` / `undefined.matrix` 运行错误。
- 根因：
  - `Undo` 的 `all` 历史同时包含 Yjs state 和 client selection。
  - 创建 undo 需要先清选区再删除 state。
  - 删除 undo 需要先恢复 state 再恢复选区。
  - 删除 redo 又需要先清选区再删除 state。
  - 固定一种顺序无法同时满足这些场景。
- 修正：
  - `Undo` 新增目标 client state 判断。
  - 对 `all` 类型 undo / redo，按目标选区是否已存在于当前 `YState.state` 动态决定顺序：
    - 目标选区当前都存在：先恢复 client，再执行 state undo / redo。
    - 目标选区当前有不存在节点：先执行 state undo / redo，再恢复 client。
- 补充修正：
  - `StageCreate.onCreateStart()` 的初始新增节点和插入父级改为包在 `YState.transact()` 中，避免创建开始阶段非 transaction 写入。
  - `StageSelect.onCreateSelect()` 改为 `Undo.untrack()` 选择新建节点，避免创建操作额外产生一条纯 client 历史。
  - `YState` 非 transaction 写入有 `Y.Doc` 时不再立即同步本地 Immut，交由 Yjs observer 投影，避免数组 insert 被 Yjs observer 和本地 Immut 双写导致重复 childIds。
- 验证记录：
  - 浏览器 mock 页运行时 API 复测步骤 3：通过。
    - 删除后：节点从 `childIds` 移除，选区清空。
    - undo 删除：节点恢复，选区恢复到该节点。
    - redo 删除：节点再次移除，选区清空。
  - 控制台只剩既有字体 warning，无 `undefined.type` / `undefined.matrix` 错误。
  - `pnpm --filter @sigma/web build`：通过。
    - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。

### 阶段 6 / `migrationSchema()` 显式依赖收口已完成

- 按 preflight 推荐顺序推进第三步的一部分，让 `apps/web/src/editor/schema/migration.ts` 更接近纯 schema migration。
- 本轮改动：
  - 显式 import `XY`、`MRect` 和 `T`，不再依赖这些符号的自动导入。
  - `SchemaTraverseContext` 改为 type import。
  - 移除 `console.log('newSchema:', newSchema)` 调试输出。
- 本轮不改 migration 行为，不迁移类型，不移动文件。
- 验证记录：
  - `pnpm exec prettier --write apps/web/src/editor/schema/migration.ts`：通过。
    - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
  - `git diff --check`：通过。
  - 本轮未重新运行 build / typecheck。
    - 原因：上一小步已经运行 `@sigma/web build` 验证 import 图；本轮只是显式 import 与调试输出收口。

### 阶段 6 / `SchemaCreator` 显式依赖收口已完成

- 继续做 defaults 注入前的低风险准备：先把 `SchemaCreator` 里依赖的运行时自动导入改为显式 import。
- 本轮新增显式依赖：
  - `XY`
  - `Matrix`
  - `COLOR`
  - `T`
  - `Assets`
  - `t`
- 本轮不改默认值策略，不改 `SchemaCreator` 方法签名，不迁移文件。
- 当前 `SchemaCreator` 仍不能进入 core：
  - 仍依赖产品资源 `Assets`。
  - 仍依赖 i18n `t()`。
  - 仍依赖产品主题色 `themeColor()`。
  - 仍依赖 app 内 `COLOR` 常量。
- 验证记录：
  - `pnpm exec prettier --write apps/web/src/editor/schema/creator.ts`：通过。
    - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
  - `git diff --check`：通过。
  - `pnpm --filter @sigma/web build`：通过。
    - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。

### 阶段 3 / 主题 B：人工验收通过

- 2026-06-17 用户按 `ai/temp/test.md` 完成人工验收，全部通过。
- 覆盖场景：
  - 复制粘贴。
  - 复制粘贴后的 undo / redo。
  - 移动节点。
  - 右侧属性编辑：x / y / width / height、fill、stroke、shadow、text 内容和样式。
  - 多选对齐。
  - 页面新增、切换和删除。
  - mock 页面刷新恢复。
- 验收结论：
  - 画布、图层、右侧面板和选区同步符合预期。
  - undo / redo 符合预期。
  - 未出现图层重复 key 警告。
  - 未出现 `undefined.matrix` / `undefined.type` / `undefined.width` 启动或运行错误。
  - mock 刷新可重新打开；mock 不持久化刚才操作属于预期行为。

## 2026-06-17

### 阶段 6 / `sigma-schema-core` preflight 已完成

- 本轮只做 schema-core 拆分前置审计和记录，不迁移文件，不改运行时代码。
- 当前 schema 相关源文件只有：
  - `apps/web/src/editor/schema/creator.ts`
  - `apps/web/src/editor/schema/helper.ts`
  - `apps/web/src/editor/schema/migration.ts`
- 当前 schema 类型位于全局声明：
  - `types/schema/schema.d.ts`
  - `types/schema/schema-v1.d.ts`
  - `types/schema/schema-v2.d.ts`
- 结论：当前不适合整文件迁移到 `@sigma/schema-core`，需要先拆出纯能力，再保留 app 适配层。

### preflight 发现

- `SchemaCreator` 当前不能原样进入 core：
  - 依赖 `src/view/styles/color` 的 `themeColor()`。
  - 依赖自动导入的 `COLOR`、`Assets`、`t()`、`Matrix`、`XY`、`T`。
  - 默认文本包含中文产品文案 `文本1`，meta 默认名依赖 i18n `t('untitled')`。
  - 默认图片 fill 依赖产品资源 `Assets.editor.RP.operate.picker.defaultImage`。
  - polygon / star / line 依赖 `src/editor/math/point`，这部分可以迁，但需要先明确 math 归属。
- `SchemaHelper` 需要拆分：
  - 纯能力：`isPageById()`、`is()`、`isNode()`、`isNodeParent()`、`createTraverse2()`。
  - 当前运行态适配：`isById()`、`getChildren()`、`findAncestor()`、`findParent()`、`getSceneMatrix()`、`createCurrentPageTraverse()` 等直接读取 `YState` 或 `getSelectPageId()`。
  - 可迁能力需要改成显式接收 `schema` / `getNode` / `pageId`，不能在 core 内读取 `YState`。
- `migrationSchema()` 相对更接近 core：
  - 输入输出都是 schema 快照。
  - 但当前复用 `SchemaHelper`，并依赖自动导入的 `MRect`、`XY`、`T`。
  - 迁移前需要先把 `createTraverse2()` 和 `isNode()` 变成纯 schema helper，并显式 import math / cast helper。
- 类型层暂不适合直接搬：
  - `types/schema/schema-v2.d.ts` 仍通过 `import('src/editor/math/matrix')` 和 `import('src/editor/math/mrect')` 引用 app 内 math。
  - `Stroke` 类型依赖 `CanvasRenderingContext2D['lineCap']` / `lineJoin`，会让 schema 类型需要 DOM lib。
  - 当前类型是全局 namespace `S` / `S1` / `S2`，不是可由 package export 的模块类型。
- 发现一个旧类型入口残留：
  - `apps/web/src/editor/schema/type` 文件已不存在。
  - 仍有 `handle/picker.ts`、`operate/align.ts`、`operate/stroke.ts`、`operate/shadow.ts`、`operate/text.ts` 引用该入口。
  - 这些 import 当前大多只作为类型使用，build 不一定暴露问题，但后续 schema 拆分前应收口为 `S.*` 或正式类型入口。

### 推荐拆分顺序

- 第一步：先在 app 内拆 `schema/helper.ts`，新增纯 helper 和运行态 helper 边界：
  - 纯 helper 只接收 `schema` / `getNode` / plain node，不读取 `YState`。
  - 运行态 helper 继续留在 app，负责把 `YState.find()`、当前页面选择等注入进去。
- 第二步：收口缺失的 `schema/type` 旧 import：
  - 优先改为现有全局 `S.*` 类型。
  - 本步只改 type import，不改行为。
- 第三步：让 `migrationSchema()` 只依赖纯 helper 和显式 math import。
  - 去掉 `console.log('newSchema:', newSchema)` 这类迁移时调试输出。
  - 保持打开旧文件的 migration 行为不变。
- 第四步：给 `SchemaCreator` 增加 defaults 注入设计，但先不迁移：
  - `translate(type)` / `defaultName`。
  - `colors`。
  - `defaultImageUrl`。
  - `createId`。
  - 可选 `themeColor`。
- 第五步：等 helper / migration / 类型边界清楚后，再新增 `packages/sigma-schema-core` 私有包。

### 本轮验证

- `git status --short`：在 preflight 记录前只有上一轮日志改动，已提交为 `52e6a05 Update monorepo WIP validation notes`。
- 本轮未运行 build / typecheck / test。
  - 原因：本轮只做审计记录；仓库指示默认不要频繁 build/test。

### 阶段 6 / 旧 `schema/type` 类型入口收口已完成

- 按 preflight 发现继续做一个低风险小步：删除对已不存在 `apps/web/src/editor/schema/type` 入口的引用。
- 本轮只改类型引用，不改变运行逻辑：
  - `apps/web/src/editor/handle/picker.ts`
  - `apps/web/src/editor/operate/align.ts`
  - `apps/web/src/editor/operate/stroke.ts`
  - `apps/web/src/editor/operate/shadow.ts`
  - `apps/web/src/editor/operate/text.ts`
- 旧 `IText` / `INode` / `INodeParent` / `IStroke` / `IShadow` / `IFill` 等引用改为现有全局 `S.*` 类型。
- `IFillKeys` 改为局部 `string | number` 路径 key 类型，保持当前 picker patch 路径语义。
- 复核结果：
  - `rg "schema/type|../schema/type|src/editor/schema/type" apps/web/src -n`：无剩余引用。
- 补充发现：
  - `apps/web/src/editor/handle/picker.ts` 仍有既有旧 picker 类型债：`ImmuiPatch` 未定义，且 `immui` 当前是空类实例。
  - 本轮不扩大修复该旧 picker 链路；后续如果恢复 stroke / shadow picker，应先确认真实 UI 入口，再按当前 `OperateFill` / picker state 路径重建。
- 验证记录：
  - `pnpm exec prettier --write apps/web/src/editor/handle/picker.ts apps/web/src/editor/operate/align.ts apps/web/src/editor/operate/stroke.ts apps/web/src/editor/operate/shadow.ts apps/web/src/editor/operate/text.ts ai/tasks/monorepo-wip/log.md`：通过。
    - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。

### 阶段 6 / `SchemaHelper` 纯能力与运行态适配拆分已完成

- 按 preflight 推荐顺序推进第一步，在 app 内先拆边界，不迁 package。
- 新增 `apps/web/src/editor/schema/runtime-helper.ts`：
  - 承载依赖 `YState` / `getSelectPageId()` / 当前运行态的 helper。
  - 包含 `isById()`、`isFirstLayerFrame()`、`getChildren()`、`findAncestor()`、`findParent()`、`getSceneMatrix()`、`getForwardAccumulatedMatrix()`、`getPageChildIds()`、`createCurrentPageTraverse()` 和带默认 `YState.find()` 的 `createTraverse()`。
- `apps/web/src/editor/schema/helper.ts` 收口为更接近 core 的纯 helper：
  - 保留 `isPageById()`、`is()`、`isNode()`、`isNodeParent()`、`createTraverse()`、`createTraverse2()`。
  - 不再直接读取 `YState`。
  - 不再依赖 `getSelectPageId()`。
- 已更新运行态调用点：
  - `HandleNode.deleteSelectedNodes()` / `pasteNodes()` 的树遍历改走 `SchemaRuntimeHelper.createTraverse()`。
  - 对齐、创建、选择、变换、outline 和图层树中依赖当前状态读取的 helper 调用改走 `SchemaRuntimeHelper`。
  - `migrationSchema()`、渲染场景页判断、图层 node parent 判断等纯逻辑继续使用 `SchemaHelper`。
- 复核结果：
  - `rg "SchemaHelper\\.(isById|isFirstLayerFrame|getChildren|findAncestor|findParent|getForwardAccumulatedMatrix|getSceneMatrix|getPageChildIds|createCurrentPageTraverse)" apps/web/src -n`：无剩余调用。
  - `rg "YState|YClients|getSelectPageId|HandleSelect|Undo|Stage|Matrix" apps/web/src/editor/schema/helper.ts -n`：无结果。
- 验证记录：
  - `pnpm exec prettier --write apps/web/src/editor/schema/helper.ts apps/web/src/editor/schema/runtime-helper.ts apps/web/src/editor/handle/node.ts apps/web/src/editor/operate/align.ts apps/web/src/editor/stage/interact/create.ts apps/web/src/editor/stage/interact/select.ts apps/web/src/editor/stage/tools/transformer.ts apps/web/src/view/editor/stage/outline.tsx apps/web/src/view/editor/left-panel/panels/layer/node/state.ts`：通过。
    - 仍有 `jsxBracketSameLine` deprecated 警告，属于当前 Prettier 配置现状。
  - `git diff --check`：通过。
  - `pnpm --filter @sigma/web build`：通过。
    - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。
