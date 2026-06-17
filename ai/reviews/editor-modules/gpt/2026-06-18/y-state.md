# y-state 模块 review

范围：`apps/web/src/editor/y-state`

## 模块意图

`y-state` 是编辑器状态层，目标是：

- 用 `YState` 封装文档 schema 的读写。
- 用 `Immut` 维护本地可响应状态和 patch。
- 用 `Y.Doc` 支持协同数据结构。
- 用 `YClients` 管理当前用户与其他用户的临时 client state。
- 用 `YSync` 接入 Hocuspocus provider 和 awareness。

这层的意图非常关键：上层不应直接知道 Y.Map / Y.Array 的细节，而是通过 `YState.set/insert/delete/transact` 表达领域变更。

## 架构评价

### 优点

- `YState` 把 path 操作、Yjs 写入、本地 Immut 写入封装起来，调用方 API 简单。
- `flushPatch$` 把底层 patch 转成渲染层可消费的事件，这是 render 增量更新的基础。
- `transact()` 同时包住 Y.Doc transaction 和 Immut.next，说明你已经在处理“多次 set 合并成一次变更”的问题。
- `applyImmerPatches()` 让 operate 层可以用 Immer 产出 patch，再映射回 YState，方向好。
- `YClients` 把 selection、cursor、sceneMatrix、用户信息抽成 client state，和文档 state 分开是正确的。

### 主要问题

#### 1. `YState` 的状态事实源不够明确

当前写入逻辑大致是：

- 有 `doc` 时，先写 Yjs。
- 如果没有 `doc` 或当前在 `transactionDepth > 0`，再写 Immut。

这意味着在有 doc 且不在 `YState.transact()` 里的情况下，`YState.set()` 只写 Yjs，不直接写 Immut，期望由 bind 同步回来。

这个行为很隐性。调用方如果忘记 `YState.transact()`，本地读模型的更新时机就可能和预期不同。

建议：

- 强制所有写操作必须在 `YState.transact()` 中执行；非事务写入在 dev 下 warning 或 throw。
- 或者保证 `set/insert/delete` 始终同步更新本地读模型，再由 bind 去避免重复。

#### 2. string keyPath 很方便，但长期不安全

`YState.set('nodeId.fills.0.color', value)` 这种方式开发很快，但风险也明显：

- id、field、array index 都是字符串拼接，缺少类型保护。
- 重命名字段时很难被 TypeScript 捕获。
- patch 的 keys 语义依赖字符串路径格式。

建议短期保留，但给高频操作补领域 command，例如：

- `setNodeProps(id, props)`
- `insertChild(parentId, index, childId)`
- `setFill(id, index, fill)`
- `deleteNode(id)`

这些 command 内部仍可走 keyPath，但上层不用到处拼路径。

#### 3. `initSchema()` 对 mockSchema 使用非空断言，失败路径不清晰

`this.immut.state = mockSchema!` 假设一定有 schema。`EditorService.initSchema()` 里如果文件加载失败或 parse 失败，最终只是不初始化，没有明确错误状态。

建议让 `initSchema()` 参数必须是 `S.Schema`，文件加载失败在 loader 层处理；`YState` 只负责“拿到 schema 后初始化运行时状态”。

#### 4. YSync 当前被注释，YClients 与 YSync 形成半接入状态

`YState.initSchema()` 里 `YSync.init(fileId, this.doc)` 被注释。`EditorService.initSchema()` 里也注释了 YSync init。结果是：

- `YClients.init()` 会设置本地 client state。
- 但 `syncSelf()` 和 `syncOthers()` 只有 `YSync.init()` 里会调用。
- `YClients.others` 实际不会被 awareness 更新。

如果协同暂时不用，建议把模块标为 disabled，并避免运行时误以为多人状态可用。如果要启用，需要把连接、断线、重连、provider destroy、awareness cleanup 补完整。

#### 5. `YSync` provider 生命周期不完整

`YSync.init()` 创建 `HocuspocusProvider`，但返回的 disposer 只组合了 `YClients.syncSelf()` 和 `YClients.syncOthers()`，没有看到 `provider.destroy()`。

这会导致离开编辑器后 websocket/provider 可能残留。

建议 disposer 至少包含：

- `provider.destroy()`
- `awareness.destroy()` 或等价清理
- syncSelf/syncOthers disposer

#### 6. `YClients` 和 `YSync` 循环依赖

`y-clients.ts` import `YSync`，`y-sync.ts` 通过 auto-import 使用 `YClients`。这是一组实际循环依赖。

短期可能能运行，但协同状态是高复杂度区域，循环依赖会增加初始化顺序问题。

建议让 `YSync` 只负责 provider，暴露 awareness；`YClients` 由上层传入 awareness 后启动同步。这样依赖方向变成：

`EditorRuntime -> YSync -> provider`

`EditorRuntime -> YClients.start(awareness)`

#### 7. `YClients.syncOthers()` 可能修改 awareness states

代码里：

```ts
const states = YSync.awareness.getStates()
states.delete(this.clientId)
```

如果 `getStates()` 返回的是内部 Map，这会直接删除 awareness 内部当前 client 状态。即便它返回副本，这个语义也不够明确。

建议改成 `Array.from(states.entries()).filter(([id]) => id !== this.clientId)`，避免修改来源集合。

#### 8. client state 与 undo 的边界需要更清楚

`YClients.init()` 里会：

- 监听 selection，同步到 client。
- 设置用户信息。
- `HandleSelect.selectPage(YState.state.meta.pageIds[0])`
- `ClientUndo.rebase()`

这让“进入文件时选择第一页”也成为 client undo 初始状态的一部分。方向可以，但最好由 Editor 初始化阶段显式表达：先初始化默认 selection，再 rebase client undo。

## 文件级评价

### `y-state.ts`

是状态层核心，API 简洁。最大问题是事务约束隐性、keyPath 太自由、状态事实源不够单一。建议优先强化事务边界和领域 command。

### `y-clients.ts`

意图清晰，但耦合了 selection、viewport、user service、awareness、client undo。建议拆成：

- local client state store。
- awareness adapter。
- selection/viewport binding。

不一定拆文件，但概念上要分清楚。

### `y-sync.ts`

目前像最小可用草稿。硬编码远程 URL、没有 provider destroy、没有错误/连接状态。建议在启用协同前补完整生命周期和连接状态。

## 建议优先级

1. 明确是否启用协同；如果暂不启用，给 YSync/YClients 协同部分加状态标记。
2. 强制或约定所有文档写入必须走 `YState.transact()`。
3. 给 provider / awareness 补 disposer。
4. 拆掉 YClients 与 YSync 的循环依赖。
5. 为高频 schema 操作增加领域 command，减少外部直接拼 keyPath。
