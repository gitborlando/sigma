# Monorepo WIP 结论

## 当前结论

本轮 monorepo 迁移已经证明基础 workspace 路线可行，但后续不应继续按“看到可复用就拆包”的方式推进。当前更稳妥的策略是：先把真实运行边界、状态写入边界和 schema 边界收口，再按低风险、小批量、可验证的方式迁移。

核心判断：

1. `apps/web/src` 不做一次性大拆分。
2. 当前不承诺正式 Sigma SDK，也不急着发布公共 math 包。
3. 编辑器运行时状态以 `Y.Doc` 为权威源，`Immut` 只作为渲染投影。
4. `SchemaHelper` 保留为 app/editor 内部 helper，不作为 `sigma-schema-core` 候选整体迁移。
5. 通用小能力先在 `@gitborlando/toolkit` 中按 subpath 孵化，稳定后再考虑独立发布或迁入正式工具仓库。

## 已落地

- 阶段 0 / 1 已完成：根脚本、`packageManager`、`tsconfig.base.json`、`packages/README.md` 和 workspace 基础设施已建立。
- 阶段 2 已完成第一批低风险迁移：
  - `@sigma/api-types` 承载 Supabase 类型。
  - `@sigma/utils` 承载仍偏 Sigma 侧的过渡工具。
  - `@gitborlando/toolkit/disposer` 和 `@gitborlando/toolkit/traverser` 承载更通用的小能力。
- 阶段 3 已完成一轮状态层收口：
  - `immut-y.ts` 拆分为 `json-to-y.ts`、`y-to-immut.ts` 和薄入口。
  - 新增并逐步接入 `YState.transact()`。
  - 修正 Yjs / Immut 绑定释放、数组 `null` 语义、嵌套对象写入和删除 undo / redo 问题。
  - 清理未接入真实运行路径的旧模块。
  - 2026-06-17 人工验收通过复制粘贴、undo / redo、移动、属性编辑、多选对齐、页面操作和 mock 刷新等场景。
- 阶段 6 已完成 schema-core 前置审计与低风险收口：
  - 删除旧 `schema/type` 引用。
  - `migrationSchema()` 和 `SchemaCreator` 的自动导入依赖已部分显式化。
  - 明确不把现有 `SchemaHelper` 整体迁入 core。

## 后续优先级

1. 继续完成阶段 3 的状态写入收敛。
   - 业务写入逐步统一到 `YState.set/insert/delete/transact`。
   - 继续减少 `Immut -> Yjs` 的反向订阅写回语义。
   - undo capture、patch flush 和 Yjs transact 的边界继续集中到 `YState`。

2. 推进 `SchemaCreator` defaults 注入设计。
   - 将 `t()`、`Assets`、主题色、默认图片、默认命名和 `createId` 等产品默认值改为注入。
   - 先在 app 内收口，不急着移动文件。

3. 审计 `types/schema/*.d.ts` 的模块化边界。
   - 处理对 app 内 math 的类型引用。
   - 处理 `CanvasRenderingContext2D` 带来的 DOM lib 耦合。
   - 等类型边界清楚后，再评估是否新增 `packages/sigma-schema-core`。

4. 继续按真实复用迁移 toolkit 能力。
   - `DragHelper` 可考虑进入 `@gitborlando/toolkit/browser`。
   - `twoDecimal`、`omitMut`、`memorized` 按 number / object / function 等领域归属评估。
   - `StageDrag`、Sigma viewport 适配和产品运行态继续留在 Sigma 内部。

## 暂时不要做

- 不引入 Turborepo / Nx。
- 不大规模重命名或迁移 `apps/web/src`。
- 不在迁移 PR 中混入业务重构、视觉调整或测试框架引入。
- 不把 renderer、runtime、viewport、React UI 过早迁出。
- 不把 `@sigma/utils` 变成长期大杂烩。
- 不恢复已经确认无真实运行入口的旧模块；如果未来需要，应按当前 `YState` / `YClients` / `Undo` 边界重建。

## 验证口径

默认遵守仓库约定，不频繁执行 build / test。文档、审计和小范围类型引用收口优先使用 `git diff --check`、引用搜索和必要的局部格式化确认。

涉及运行入口、import 图、包边界或删除旧模块时，优先验证：

- `git diff --check`
- 相关文件 `prettier --write`
- 必要时 `pnpm --filter @sigma/web build`

`@sigma/web typecheck` 已多次记录存在长耗时或超时问题，不作为每个小步的默认验证项。
