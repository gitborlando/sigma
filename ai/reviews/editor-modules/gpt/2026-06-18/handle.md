# handle 模块 review

范围：`apps/web/src/editor/handle`

## 模块意图

`handle` 模块像是文档和选区的领域动作层：

- `select.ts` 管理当前选区和当前 page。
- `page.ts` 管理 page 增删和 page viewport 缓存。
- `node.ts` 管理 node 增删、复制粘贴、层级、wrap frame、datum。
- `picker.ts` 管理颜色/渐变/图片 picker 的临时操作状态。

从意图上看，`handle` 应该比 `operate` 更偏“结构性动作”，比 `stage` 更少关心鼠标事件，比 `schema` 更接近运行时。

## 架构评价

### 优点

- `HandleSelect` 把 selection 纳入 `ClientUndo`，这是非常正确的。选择状态是用户可 undo 的 client state，但不应该进入文档 schema。
- `HandleNode` 提供了 add/remove/insertChild/removeChild/reHierarchy 等基础动作，避免 stage 或 command 到处拼 YState path。
- `HandlePage` 记住每个 page 的 scene matrix，符合多页编辑器的用户预期。
- 删除节点使用 bubble traversal，能避免先删父导致找不到子节点。
- 复制粘贴使用 schema traversal 克隆 subtree，方向正确。

### 主要问题

#### 1. `HandleNode` 仍大量依赖旧 OBB / rotation 模型

`getNodesMergedOBB()`、`getNodeCenterXY()`、`getDatum()` 都使用：

```ts
OBB.fromRect(node, node.rotation)
```

但当前 v2 几何核心应该是 `MRect + matrix`。这会导致 wrap frame、datum、ruler 等能力在矩阵节点上不可靠。

建议改成统一使用：

- 单节点：`MRect.fromRect(node, SchemaHelper.getSceneMatrix(node))`
- 多节点：合并这些 scene AABB。

#### 2. `wrapInFrame()` 没有处理子节点坐标系重基

当前流程是：

- 根据 selected merged OBB 创建 frame。
- 把 frame 插入 old parent。
- 从 old parent 移除 selected。
- 把 selected 插入 frame。

但被选节点的 `matrix` 没有从 old parent local space 转换到 new frame local space。对于 matrix 模型，换 parent 必须重算 local matrix，否则视觉位置会变。

这是结构操作层最重要的问题之一。建议所有 reparent 操作都走统一 helper：

```ts
reparentNode(nodeId, newParentId, index, { keepSceneTransform: true })
```

内部用 old scene matrix 和 new parent inverse matrix 计算新 local matrix。

#### 3. `removePage()` 只删除 page，不删除 page 子树

`removePage()` 删除了 page item 和 `meta.pageIds`，但没有删除 page 下的所有 child nodes。这样 schema 里会留下孤儿节点。

建议删除 page 时遍历 page child subtree，把所有 descendants 从 schema 中删除。

#### 4. copy 只保存 id，不保存快照

`copySelectedNodes()` 只是 `this.copiedIds = getSelectIdList()`。如果用户复制后修改原节点，再 paste，粘贴的是修改后的节点；如果原节点被删除，paste 可能失败。

这不一定错，但要明确产品语义。大多数编辑器复制时保存的是当时的快照。

建议 `copiedNodes` 保存 schema snapshot，并在 paste 时生成新 id。协同场景下尤其不建议只保存 id。

#### 5. multi selected reorder 的顺序可能不稳定

`reHierarchySelectedNode()` 对 selected 顺序逐个移动。多个同 parent 节点一起上移/下移时，前一个移动会影响后一个 index，容易出现顺序反转或移动距离不符合预期。

建议按 parent 分组，并根据移动方向决定遍历顺序：

- move up：从小 index 到大 index。
- move down：从大 index 到小 index。
- top/bottom：保持原相对顺序。

#### 6. `HandlePage.DEV_logPageSchema()` 不是完整递归

它只对子节点做一层 `map(YState.find)`，没有继续递归更深层 childIds。作为 dev 工具可以，但名字叫 page schema，容易误以为完整。

#### 7. `picker.ts` 放在 handle 里边界不自然，且实现明显未完成

`UIPickerService` 关心 fill/stroke/shadow picker UI 状态，和 node/page/select 这种结构 handle 不同。更重要的是：

- `private immui = new (class {})()` 但后面调用 `reset/next/applyPatches/add/delete`。
- `ImmuiPatch` 类型未看到定义。
- `from`、`index`、`fill` 都是可变共享状态。

如果这个路径被使用，会是运行时错误。建议把它标为 experimental，或迁移到 `operate/picker` 并接入真实 patch 工具。

## 文件级评价

### `select.ts`

职责清晰，和 client undo 集成得很好。后续可以考虑 selection 是否应 page-scoped，避免跨 page 残留 id。

### `page.ts`

page matrix 缓存思路对。需要补删除子树、初始化 page matrix、以及 page 切换时和 StageScene 的一致性。

### `node.ts`

是结构操作核心，值得继续强化。当前最大问题是 reparent/geometry 仍不适配 matrix 模型。建议先抽 `moveNodeToParentKeepSceneTransform()`，它会成为 wrap、paste into frame、drag into frame 的共同基础。

### `picker.ts`

当前不适合放在 active 路径。建议先明确它是否还要保留；如果要保留，需要补真实 immut patch 实现、类型和生命周期。

## 建议优先级

1. 将 `HandleNode` 的 OBB/rotation 全部迁到 `MRect/matrix`。
2. 实现统一 reparent 并保持 scene transform。
3. 删除 page 时删除子树。
4. copy 改为保存 schema snapshot。
5. 隔离或修复 `picker.ts`。
