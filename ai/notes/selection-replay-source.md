# Selection Replay Source Note

## 背景

当前编辑器里的 `selection` 还是独立 client state，不在 `YState` / `Y.Doc` 内。

这会带来一个直接后果：undo / redo 回放时，schema state 和 selection state 不是同一个状态源，也不是同一个天然 transaction 单元。

这次删除节点的 undo / redo 问题，已经说明了这个边界的成本：

- 创建 undo 需要先清选区再删 state。
- 删除 undo 需要先恢复 state 再恢复选区。
- 删除 redo 又需要先清选区再删 state。

所以当前只能靠 `Undo` 的组合历史和动态回放顺序兜底。

## 当前结论

本轮不继续扩大改动面，不做统一状态源改造。

当前策略是：

- schema 继续走 `YState` / `Y.Doc`。
- selection 继续保留为 client state。
- `Undo` 用 `all` 历史把两者拼成一个可回放单元。
- 回放时按目标选区节点是否已存在，动态决定先回放 state 还是先回放 selection。

这个策略可以先保证行为正确，但它不是最终形态。

## 后续方向

后续可以再评估把 `selection` 纳入同一个“可回放状态源”。

这里的重点不是一定要把 selection 物理上塞进 `YState` / `Y.Doc`，而是至少满足下面这几个条件：

- schema 和 selection 共享同一套 transaction 边界。
- schema 和 selection 共享同一套 history entry 边界。
- schema 和 selection 共享同一套 replay 边界。

只要这三条成立，undo / redo 就不需要再按“目标节点当前是否存在”来动态决定顺序。

## 设计意图

目标不是把所有状态粗暴合并，而是让“一个用户可感知操作”对应“一个可回放状态单元”。

例如：

- 创建节点
- 删除节点
- paste
- wrap in frame
- re-hierarchy

这些操作里，selection 本质上是结果的一部分，不应该只是事后附着的 client 副作用。

## 暂不实施的原因

现在还不适合直接做这件事，原因很简单：

- 当前阶段的主目标还是清理旧 `Schema` 运行残留和收敛状态入口。
- selection 进入统一回放源，会牵动 `YClients`、`Undo`、创建/删除/粘贴等交互链路。
- 这类改造更适合在现有阶段稳定后，再单独开题处理。

## 一句话结论

后续真正更优雅的方向，不是继续给 `Undo all` 补更多顺序判断，而是让 selection 和 schema 至少共享同一套 transaction / history / replay 边界。
