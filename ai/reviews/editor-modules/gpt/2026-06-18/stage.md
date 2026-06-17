# stage 模块 review

范围：`apps/web/src/editor/stage`

## 模块意图

`stage` 是画布交互层，负责：

- `viewport.ts`：视口尺寸、缩放、平移、scene/client 坐标转换。
- `cursor.ts`：画布 cursor 管理。
- `interact/*`：选择、移动、创建三种交互模式。
- `tools/transformer.ts`：选中节点的移动、resize、rotate。
- `tools/grid.ts`：顶层网格绘制。
- `tools/guide.ts` / `tools/ruler.ts`：预留辅助工具。

它的理想定位是“把鼠标/键盘/视口事件转成领域操作”，尽量不要直接承担 schema 结构维护和 render tree 维护。

## 架构评价

### 优点

- `StageInteract` 以 mode 管理 `select / move / create`，这是工具型编辑器的正确抽象。
- `StageViewport` 集中了坐标转换，这是必须要有的模块。
- `StageTransformer` 独立出来处理 move/resize/rotate，方向正确，避免把变换逻辑塞在 select 里。
- `StageCreate` 使用拖拽过程创建节点，并在结束时归档 undo，交互流程完整。
- `StageCursor` 有 lock/upReset 概念，能处理拖动过程中的 cursor 状态。
- `StageToolGrid` 走 top canvas 绘制，不污染主 canvas，方向对。

### 主要问题

#### 1. `StageViewport` 的 bound 硬编码了 UI 布局尺寸

```ts
left: 240,
top: 48,
right: 240,
bottom: 0
```

这让 editor 内核知道了左右面板和 header 的尺寸。视口模块应该由 view/layout 传入容器尺寸，而不是自己推导浏览器窗口和 UI chrome。

建议：`StageSurface.setContainer()` 后由 DOM bound 或 ResizeObserver 传入 viewport bound。这样左/右 panel resize、隐藏面板、响应式布局都不会污染 stage 内核。

#### 2. `StageViewport.init()` 调用 `onObserving()` 但丢弃 disposer

```ts
init() {
  this.onObserving()
}
```

`onObserving()` 返回 `Disposer.combine(...)`，但没有保存。这会造成 autorun 泄漏。

建议把它纳入 `subscribe()` 的 disposer，或 `this.disposer.add(this.onObserving())`。

#### 3. viewport matrix 假设只有平移和等比缩放

`zoom = this.sceneMatrix.a`，`offset = tx/ty`。这对当前场景可能足够，但要明确 `sceneMatrix` 不允许旋转/非等比缩放。否则 `toSceneXY/toSceneShift/zoomToFit` 都会不可靠。

建议把 viewport transform 类型收窄为 `{ zoom, offset }`，matrix 只是派生值；或者明确 matrix 允许范围。

#### 4. `StageCreate` 的 line 创建没有完成

`onCreateMove()` 里 line 分支计算了 `rotation` 和 `width`，但实际更新被注释：

```ts
// OperateGeometry.setActiveGeometries(...)
```

所以 line 拖拽创建基本是半成品。

建议先把 line 从 `createTypes` 暂时移出，或完成局部 points + matrix 的创建逻辑。

#### 5. `StageCreate` 找 parent 只看直接 parent matrix，不看完整祖先 matrix

`calcNodeMRect()` 里：

```ts
const forwardMatrix =
  this.parent.type === 'page' ? Matrix.identity() : Matrix.of(this.parent.matrix)
```

如果 parent 是嵌套 frame/group，仅用 parent local matrix 不等于 parent scene matrix。新节点放进嵌套 parent 时 local matrix 会错。

建议使用 `SchemaHelper.getSceneMatrix(parent)` 或专门的 parent scene matrix helper，再 invert。

#### 6. `StageCreate.createNode()` 会重复生成 name

`SchemaCreator[this.currentType]()` 内部已经创建 name，随后又：

```ts
node.name = SchemaCreator.createNodeName(this.currentType)
```

这会让命名计数跳号。建议只在 creator 中生成一次。

#### 7. `StageSelect` 与 command/context menu/transformer 耦合偏重

`select.ts` 同时处理：

- hover。
- click select。
- marquee。
- text edit。
- context menu。
- 调用 `StageTransformer.move()`。
- 调用 `EditorCommand` 取菜单。

选择交互天然复杂，但这里已经接近“交互总控”。建议把 context menu 构造独立出去，select 只负责决定当前 hover/selection。

#### 8. `StageSelect.onDeepSelect()` 未使用

这是小问题，但说明交互语义还没完全收敛。double click text edit 目前由 `onDoubleClick()` 处理。

#### 9. `StageTransformer` 没有明确处理负尺寸、flip、最小尺寸

resize 时可以把 width/height 算到负数或 0。当前 schema v2 有 `flip` 字段，但 transformer 没看到 flip 策略。

建议先定义：

- resize 穿过对边时是否允许翻转。
- 翻转写入 matrix determinant，还是写 `node.flip`。
- 最小尺寸是多少。

然后再实现 transformer。

#### 10. multi-select transform 的数学复杂度需要测试支撑

`StageTransformer.applyToNode()` 对多选通过：

```ts
localDiff = forwardMatrix.invert().append(diffMatrix).append(forwardMatrix)
```

把 scene diff 转回 local。方向对，但这里很容易因为 append/prepend 顺序出错。没有测试的话，嵌套旋转 frame 下多选 resize/rotate 会很难自信。

建议给以下场景补最小测试或可视化 fixture：

- 单节点 rotate frame 内 resize。
- 多节点跨不同 parent move。
- 多节点在旋转 parent 内 resize。
- flip 后继续 resize。

#### 11. `StageToolGrid` 可能在超大视野下绘制过多线

网格在 zoom > 10.96 时每 1 scene unit 绘制线。高 zoom 视野较小一般没问题，但最好仍有 max tick cap，防止极端 bound 或 zoom 状态卡顿。

#### 12. guide/ruler 是空模块

如果是规划中的模块，建议标注 todo。否则空文件会让读者误判功能状态。

## 文件级评价

### `viewport.ts`

坐标转换集中是正确的。最大问题是 layout bound 硬编码和 `onObserving()` disposer 泄漏。建议优先修。

### `cursor.ts`

实现直接有效。建议补 `URL.revokeObjectURL` 策略，避免大量旋转 resize cursor 创建 blob URL 后不释放。

### `interact/interact.ts`

mode 管理清楚。需要注意 `StageCreate` 又 import `StageInteract`，形成模式管理和具体模式之间的反向依赖。创建完成后切回 select 可以由回调或上层控制，减少循环。

### `interact/move.ts`

职责清楚。注意 disable pointer event 与 cursor lock 的恢复路径要确保异常时也能释放。

### `interact/create.ts`

交互流程完整，但 line、嵌套 parent matrix、重复命名是主要问题。

### `interact/select.ts`

功能覆盖比较多，是后续最容易膨胀的文件。建议拆 context menu、marquee hit test、double click edit 这些子逻辑。

### `tools/transformer.ts`

是 stage 的关键模块。方向正确，但必须由数学测试托底。建议先解决 flip/min-size/parent matrix 语义。

### `tools/grid.ts`

简单有效。建议给 tick 数量加保护。

### `tools/guide.ts` / `tools/ruler.ts`

空模块。建议补状态说明，或等实现时再建文件。

## 建议优先级

1. 修 `StageViewport.onObserving()` disposer 泄漏。
2. 去掉 viewport bound 硬编码，改由 layout/container 驱动。
3. 完成或禁用 line 创建。
4. 修 create/transformer 在嵌套 parent 下的 matrix 计算。
5. 定义并实现 resize flip/min-size 语义。
