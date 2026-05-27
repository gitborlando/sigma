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
