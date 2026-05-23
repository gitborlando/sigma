# Monorepo 迁移方案

## 迁移原则

- 稳定优先：任何阶段都必须保持 `pnpm build` 或等价校验可通过。
- 小步迁移：一次 PR 只做一种事，例如只补脚本、只抽一个包、只改一组 import。
- 先低风险后高风险：先抽类型和纯函数，再抽编辑器核心，最后再抽 UI、渲染和服务端。
- 保留旧入口：迁移期间优先用 re-export shim 兼容旧路径，确认稳定后再删除旧文件。
- 不做顺手重构：目录迁移和代码重构分开，避免问题来源不清。
- 不引入重型工具：先用已有 pnpm workspace，等包数量和构建耗时确实需要时再考虑 Turborepo / Nx。

## 当前仓库判断

- 根目录已经有 `pnpm-workspace.yaml`，包含 `apps/*` 和 `packages/*`。
- 当前只有一个 workspace 应用：`apps/web`，包名为 `@sigma/web`。
- 根目录脚本已经通过 `pnpm --filter @sigma/web ...` 转发到 web 应用。
- `packages/` 目录目前不存在，可以作为后续抽包目标。
- `types/supabase.ts` 由 `apps/web` 使用，生成脚本写入根目录 `types/`。
- `server/index.ts` 还不是 workspace package，且 web 里协同连接目前看起来不是强依赖启动项。
- `apps/web/src` 内部存在大量 `src/*` alias 和 auto-import 配置，直接整体搬目录风险高。

## 目标结构

最终目标不是一次性拆完，而是让仓库逐渐形成清晰边界：

```txt
apps/
  web/                  # 现有 React/Vite 前端
  collab-server/         # 可选：Hocuspocus 服务，后期迁移
packages/
  api-types/             # Supabase 等生成类型，无运行时代码
  shared-utils/          # 无业务状态、无 DOM 依赖的通用工具
  editor-math/           # Matrix、MRect、bezier、几何计算等纯逻辑
  schema-core/           # schema 类型、迁移、创建、纯查询逻辑
  editor-runtime/        # 渲染、stage、y-state 等浏览器运行时，后期迁移
  ui/                    # 通用 UI 组件，最后迁移
```

推荐依赖方向：

```txt
apps/web
  -> @sigma/ui
  -> @sigma/editor-runtime
  -> @sigma/api-types

@sigma/editor-runtime
  -> @sigma/schema-core
  -> @sigma/editor-math
  -> @sigma/shared-utils

@sigma/schema-core
  -> @sigma/editor-math
  -> @sigma/shared-utils
```

禁止依赖方向：

- `packages/*` 不允许 import `apps/web/*`。
- 底层包不允许反向依赖上层包，例如 `editor-math` 不应依赖 `schema-core`。
- 包内不使用 `src/*` alias 指向应用源码。

## 阶段 0：建立基线

目标：先确认迁移前的可运行状态，后续每一步都能对比。

动作：

1. 记录当前 pnpm 版本，建议在根 `package.json` 增加 `packageManager`，例如 `pnpm@9.14.4`。
2. 保留现有 `dev` / `build` / `preview` 脚本，不改变默认工作流。
3. 增加只转发、不改变行为的脚本：
   - `dev:web`: `pnpm --filter @sigma/web dev`
   - `build:web`: `pnpm --filter @sigma/web build`
   - `typecheck`: `pnpm -r --if-present typecheck`
4. 给 `@sigma/web` 增加 `typecheck`: `tsc -p tsconfig.json --noEmit`。
5. 运行并记录结果：
   - `pnpm install --frozen-lockfile`
   - `pnpm --filter @sigma/web build`
   - `pnpm --filter @sigma/web typecheck`

验收：

- 现有前端可以启动和构建。
- 如果 typecheck 当前失败，先记录现有错误，不在迁移 PR 中混入大修。

回滚：

- 只需要回滚脚本和 `packageManager` 字段，不影响业务代码。

## 阶段 1：整理 workspace 基础设施

目标：让后续新增 package 有统一格式，但不移动业务代码。

动作：

1. 新建 `packages/` 目录。
2. 新增根 `tsconfig.base.json`，只放跨包通用配置，不强制改 `apps/web/tsconfig.json`。
3. 约定内部包格式：

```json
{
  "name": "@sigma/shared-utils",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

4. 初期使用源码 package，不额外引入 tsup / rollup，降低工具链变量。
5. 如果 Vite 构建 workspace 源码 package 出问题，再给对应包补独立 build，而不是提前全仓统一打包。

验收：

- `pnpm -r --if-present typecheck` 可运行。
- `pnpm --filter @sigma/web build` 结果不变。

回滚：

- 删除新增基础配置即可，无业务代码迁移。

## 阶段 2：先抽 `@sigma/api-types`

目标：先迁移无运行时副作用的类型包，验证 workspace 依赖链。

动作：

1. 新建 `packages/api-types/src/`。
2. 将 Supabase 生成目标从 `types/supabase.ts` 调整到 `packages/api-types/src/supabase.ts`。
3. `packages/api-types/src/index.ts` 统一导出：

```ts
export type * from './supabase'
```

4. `apps/web/package.json` 增加依赖：

```json
"@sigma/api-types": "workspace:*"
```

5. 将 web 中的 `types/supabase` import 改成 `@sigma/api-types`。
6. 迁移期可以保留 `types/supabase.ts` re-export，避免遗漏旧路径：

```ts
export type * from '@sigma/api-types'
```

验收：

- `pnpm --filter @sigma/web gen:supabase-types` 能写到新位置。
- `pnpm --filter @sigma/web build` 通过。
- 搜索不到新增的 `types/supabase` 业务 import。

回滚：

- 还原生成路径和 import；因为只有类型迁移，运行时风险最低。

## 阶段 3：抽 `@sigma/shared-utils`

目标：抽离纯工具函数，为后续核心包打基础。

优先候选：

- `apps/web/src/utils/disposer.ts`
- `apps/web/src/utils/defu.ts`
- `apps/web/src/utils/common.ts` 中不依赖浏览器和业务状态的部分
- `apps/web/src/utils/immut/*`

暂缓候选：

- `signal-react.ts`：依赖 React，后续可放 `ui` 或单独包。
- `global.ts`：可能依赖 Vite 环境变量，先留在 web。
- `color.ts`：如果仅通用可迁移；如果和 UI 主题耦合，等 `ui` 阶段再处理。

迁移方式：

1. 一次只迁一个文件或一个小目录。
2. 先复制到 `packages/shared-utils/src/`，从 `src/index.ts` 导出。
3. 在旧位置保留 shim，例如：

```ts
export * from '@sigma/shared-utils'
```

4. 分批把业务 import 从 `src/utils/disposer` 改为 `@sigma/shared-utils`。
5. 全部切完并稳定一段时间后，再删除旧 shim。

验收：

- 每迁一个文件都运行 `pnpm --filter @sigma/web build`。
- `shared-utils` 不依赖 `apps/web`、React、DOM、Vite。

回滚：

- 将 import 改回旧路径，保留旧文件内容或 shim 即可快速恢复。

## 阶段 4：抽 `@sigma/editor-math`

目标：把几何和数学逻辑先独立出来，这是后续 schema、渲染、交互的底层依赖。

动作：

1. 抽包前先给关键纯逻辑补最小测试，优先覆盖：
   - `Matrix`
   - `MRect`
   - bezier 工具
   - 点、矩形、角度相关边界值
2. 新建 `packages/editor-math/src/`。
3. 先迁 `apps/web/src/editor/math` 中无上层依赖的文件。
4. 保留 `apps/web/src/editor/math/index.ts` shim：

```ts
export * from '@sigma/editor-math'
```

5. 待普通 import 稳定后，再修改 `apps/web/auto-import.ts` 中 `src/editor/math` 的来源。

验收：

- 数学包不依赖 `schema`、`render`、`stage`、`view`。
- `pnpm --filter @sigma/web build` 通过。
- 新增测试可单独运行，且不会要求浏览器环境。

回滚：

- auto-import 先不要急着改；如果出问题，先还原普通 import。

## 阶段 5：拆 `@sigma/schema-core`

目标：拆数据结构和 schema 纯逻辑，但不强行搬整个 `editor/schema`。

注意：

- 当前 schema 代码可能依赖 `EditorSetting`、选中状态、UI 主题等上层逻辑。
- 不要直接把 `apps/web/src/editor/schema` 整体搬进 package。
- 先拆纯类型、创建、迁移、查询；有运行时单例或 UI 依赖的部分继续留在 web。

建议顺序：

1. 先迁 schema 类型定义。
2. 再迁无副作用的 migration。
3. 再迁 creator，但要先把默认主题色等 UI 依赖变成参数或配置。
4. 最后再评估 `Schema`、`SchemaHistory` 是否适合迁移。

验收：

- `schema-core` 可以只依赖 `editor-math` 和 `shared-utils`。
- 不依赖 `StageViewport`、`YState`、`view/styles`、`global/service`。
- 迁移前后打开旧文件、schema migration、撤销重做行为一致。

回滚：

- 保留 `apps/web/src/editor/schema/*` shim。
- 数据格式迁移不要和目录迁移放在同一个 PR。

## 阶段 6：迁移服务端为 `apps/collab-server`

目标：把 `server/index.ts` 纳入 workspace，但不改变前端协同逻辑。

动作：

1. 新建 `apps/collab-server/package.json`。
2. 将 `server/index.ts` 移到 `apps/collab-server/src/index.ts`。
3. 增加脚本：
   - `dev:server`: `pnpm --filter @sigma/collab-server dev`
   - `start:server`: `pnpm --filter @sigma/collab-server start`
4. 服务端依赖独立放在 `apps/collab-server/package.json`。
5. 等服务端跑稳后，再决定是否让 `apps/web` 的 `YSync` 默认连接本地服务。

验收：

- web 不启动 server 也能保持当前行为。
- server 可以单独启动。
- 协同相关改动必须单独做冒烟测试。

回滚：

- 保留旧 `server/index.ts` 一个 PR 周期，确认部署脚本不再依赖后再删除。

## 阶段 7：后迁 `@sigma/editor-runtime`

目标：迁移渲染、stage、y-state 等浏览器运行时代码。

这是高风险阶段，必须等 `shared-utils`、`editor-math`、`schema-core` 稳定后再做。

建议顺序：

1. `y-state`：依赖 Yjs 和 schema，先检查协同状态和 undo 行为。
2. `render`：Canvas、文字分行、图片管理等，必须配合视觉冒烟测试。
3. `stage`：交互逻辑最后迁，涉及鼠标、键盘、缩放、选择、拖拽。

验收：

- 新建文件、打开文件、选择、移动、缩放、撤销重做、保存都正常。
- Canvas 渲染无明显差异。
- 不在同一 PR 中同时改交互逻辑和目录结构。

回滚：

- 每个子目录迁移都保留旧路径 shim。
- 一旦出现交互回归，先回滚 import，不做现场大修。

## 阶段 8：最后迁 `@sigma/ui`

目标：抽离通用组件和样式，但避免影响编辑器主流程。

优先候选：

- `view/component/btn.tsx`
- `view/component/input-num.tsx`
- `view/component/menu.tsx`
- `view/component/segments.tsx`
- `view/component/text.tsx`
- `view/component/divider.tsx`

暂缓候选：

- 与编辑器状态强耦合的面板组件。
- 依赖 Linaria 复杂样式、assets、i18n、业务 service 的组件。

注意：

- UI 包应把 `react`、`react-dom` 放在 peer dependency。
- 如果迁移 Linaria 组件，需要同步调整 `apps/web/vite.config.ts` 的 `wywInJs.include`。
- 不要为了抽 UI 改视觉设计。

验收：

- 页面样式和交互无明显变化。
- `pnpm --filter @sigma/web build` 通过。
- 组件迁移后仍保持 kebab-case 文件名。

回滚：

- UI 组件最容易出现样式差异，必须保留旧路径 shim。

## 工具链升级时机

暂时不引入 Turborepo / Nx。满足以下条件再评估：

- workspace package 超过 5 个。
- 全量 build 或 typecheck 明显变慢。
- CI 需要缓存跨包构建结果。
- 包之间依赖图已经稳定。

如果需要升级，优先 Turborepo，因为它对现有 pnpm workspace 侵入较小。

## 每个 PR 的固定验收清单

- `pnpm install --frozen-lockfile`
- `pnpm -r --if-present typecheck`
- `pnpm --filter @sigma/web build`
- 手动启动 `pnpm dev`，确认首页和编辑器可打开。
- 冒烟流程：
  - 打开首页文件列表
  - 新建或打开设计文件
  - 创建图形
  - 选择、移动、缩放
  - 修改填充或描边
  - 撤销 / 重做
  - 刷新后确认基础数据仍可加载

## 风险与处理

| 风险                            | 处理方式                                           |
| ------------------------------- | -------------------------------------------------- |
| auto-import 隐藏依赖            | 普通 import 先切完，再改 `auto-import.ts`          |
| `src/*` alias 过多              | 不做全局替换，只按包边界逐步替换                   |
| Linaria 处理 package 源码失败   | UI 包最后迁；必要时扩展 `wywInJs.include`          |
| Vite 处理 workspace TS 源码失败 | 先只给问题包加 build，不全仓引入打包工具           |
| schema 和 UI / editor 状态耦合  | 先做依赖反转，不整体搬目录                         |
| Supabase 生成路径变更           | 迁移期保留旧 `types/supabase.ts` re-export         |
| 协同编辑回归                    | server、y-state、前端连接分别迁移，避免混在一个 PR |

## 推荐 PR 顺序

1. PR 1：增加基线脚本、`packageManager`、`tsconfig.base.json`，不移动代码。
2. PR 2：新增 `@sigma/api-types`，迁移 Supabase 类型。
3. PR 3：新增 `@sigma/shared-utils`，只迁 `disposer` 或一个最小工具。
4. PR 4：迁 `immut` 到 `shared-utils`，补最小单元测试。
5. PR 5：给 `editor/math` 补测试，不移动代码。
6. PR 6：新增 `@sigma/editor-math`，迁数学模块并保留 shim。
7. PR 7：新增 `@sigma/schema-core`，先迁 schema 类型和 migration。
8. PR 8：将 `server/index.ts` 迁成 `apps/collab-server`。
9. PR 9：按子目录迁 `editor-runtime`，每次只迁一个子模块。
10. PR 10：最后迁通用 UI 组件。

## 暂时不要做的事

- 不要一次性把 `apps/web/src` 拆成多个包。
- 不要在迁移 PR 中重命名大量文件。
- 不要同时引入测试框架、构建框架、目录迁移和业务重构。
- 不要把 `view`、`editor`、`global` 全部抽成一个巨大 shared 包。
- 不要让 package 反向依赖 `apps/web` 来图省事。
