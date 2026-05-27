# Monorepo WIP Log

## 2026-05-26

### 本轮范围

- 只收口阶段 0 / 阶段 1 的迁移基线和 workspace 基础设施。
- 已撤回阶段 2 的 `@sigma/api-types` 试迁移，避免和本次提交混在一起。

### 已完成

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

### 验证记录

- `pnpm install --frozen-lockfile`：通过。
  - 仍有 Supabase CLI bin 链接警告，属于当前依赖安装现状。
- `pnpm --filter @sigma/web build`：通过。
  - 仍有 baseline-browser-mapping 过期、字体运行时解析、大 chunk 警告。
- `pnpm exec prettier --check package.json apps/web/package.json apps/web/tsconfig.json tsconfig.base.json packages/README.md`：通过。
- `pnpm -r --if-present typecheck`：120 秒超时，无诊断输出。
- `pnpm --filter @sigma/web typecheck`：曾 300 秒超时，无诊断输出；后续一次复测被人工中断。

### 暂不处理

- 本轮不迁移 `types/supabase.ts`。
- 本轮不创建 `@sigma/api-types`。
- 本轮不修 web 现有 typecheck 长耗时问题。

### 后续执行：阶段 2 / `@sigma/api-types`

#### 范围

- 只迁移 Supabase 生成类型，验证 workspace 内部类型包依赖链。
- 仓库内部直接依赖新包，不再保留旧 `types/supabase.ts` 入口。

#### 已完成

- 新增 `packages/api-types` 私有源码包。
- 新增 `@sigma/api-types` 的显式 `exports`：
  - `.`
  - `./supabase`
- 将原 `types/supabase.ts` 内容迁到 `packages/api-types/src/supabase.ts`。
- 删除旧 `types/supabase.ts` 入口。
- `@sigma/web` 增加 `@sigma/api-types: workspace:*` 依赖。
- web 内部 Supabase 类型 import 改为 `import type` 并指向 `@sigma/api-types/supabase`。
- `gen:supabase-types` 输出位置改为 `../../packages/api-types/src/supabase.ts`，避免后续生成覆盖旧 shim。

#### 验证记录

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

#### 修正记录

- 曾短暂将 `types/supabase.ts` 旧 shim 改为相对转发，修复根 `types/` 位置无法解析 `@sigma/api-types/supabase` 的问题。
- 确认仓库业务代码不再引用 `types/supabase` 后，按要求删除旧入口。
- `pnpm --filter @sigma/api-types typecheck`：通过。
- `pnpm --filter @sigma/web build`：通过。
