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
  - 历史记录：`YUndo.track()`。
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
  - `OperateAlign` 被 editor 初始化和右侧对齐面板实际引用，本轮将对齐写入从 `Schema.itemReset()` / `Schema.finalOperation()` 改为 `YState.transact()` / `YState.set()` / `YUndo.track()`。
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
  - 保留 `YUndo.track({ type: 'all' })` 记录。
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
