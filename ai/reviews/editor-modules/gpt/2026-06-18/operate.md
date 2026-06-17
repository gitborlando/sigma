# operate 模块 review

范围：`apps/web/src/editor/operate`

## 模块意图

`operate` 是属性操作层，主要承接右侧属性面板或工具栏对当前选区的操作：

- 对齐：`align.ts`
- 几何属性：`geometry.ts`
- 填充：`fill.ts`
- 描边：`stroke.ts`
- 阴影：`shadow.ts`
- 文本：`text.ts`
- 点编辑：`points.ts`

它的理想边界是：读取当前选区的可编辑属性，维护面板展示态，把用户输入转成一组文档事务。

## 架构评价

### 优点

- `OperateFill` 使用 Immer patches 再映射到 YState，这是很好的模式。UI 层可以操作本地 draft，再把 patch 应用到多个节点。
- `geometry.ts` 有“当前属性值 / 多选 mixed value / start cache / delta or absolute”这些概念，说明你在按真实属性面板模型设计。
- `text.ts` 能从多选 text nodes 中归并 mixed value，这个方向对。
- `align.ts` 把单选 parent 对齐和多选对齐区分开，符合编辑器交互常见语义。

### 主要问题

#### 1. `align.ts` 当前不适配现有 render/schema

它调用：

```ts
StageScene.findElem(node.id).obb
```

但 `Elem` 当前没有 `obb` 属性，只有 `mrect` 和 `aabb`。并且对齐时写：

```ts
YState.set(`${node.id}.x`, node.x + shift)
YState.set(`${node.id}.y`, node.y + shift)
```

这又回到了旧的 `x/y` 模型。对当前 matrix schema 来说，对齐应该修改 `node.matrix.tx/ty` 或通过 `MRect` 计算后写回 matrix。

这是 operate 层最严重的问题之一。建议先停用或修正 align，否则对齐能力会破坏几何模型。

#### 2. `geometry.ts` 有 v2 意图，但仍混用旧字段

`getGeometryValue()` 对 `x/y/width/height/rotation` 走 `HandleNode.getMRect(node)`，这很好；但 `delta()` 在 absolute 模式下用 `T<any>(node)[key]`，对于 `x/y/rotation` 仍会读旧字段。

另外 `applyChangeToNode()` 里处理 star 的 `pointCount/innerRate` 时，没有使用当前 changing value 或 delta：

```ts
pointCount = max(3, floor(pointCount))
innerRate = min(1, max(0, innerRate))
```

这里看起来只是把原值 clamp 后写回，用户输入不会生效。

建议：

- 对所有 OBB key 都通过 cached start mrect 计算 delta。
- 非 OBB key 也统一处理 absolute/delta。
- polygon/star points 生成使用更新后的 width/height 和属性值。

#### 3. `stroke.ts` / `shadow.ts` / `text.ts` 使用未实现的 `immui`

这些文件都有：

```ts
private immui = new (class {})()
```

后面调用 `add/delete/reset/next/applyPatches`。如果当前路径实际被触发，会直接运行时错误。

`OperateFill` 已经用 Immer patches 实现了一套更清楚的路径。建议 stroke/shadow/text 不要保留 placeholder patch 工具，直接迁移到和 fill 一致的 `produceWithPatches` 模式。

#### 4. stroke/shadow 与 fill 高度重复

`stroke.ts` 和 `shadow.ts` 结构几乎相同：

- setup list。
- 判断多选 same。
- add/delete/set/toggle/change。
- picker onChange。
- apply list 到选中节点。

这类重复已经到了可以抽象的程度。不是为了少几行代码，而是为了让“列表型外观属性”的行为一致：mixed value、undo、picker patch、多选应用、visible toggle。

建议抽一个轻量内部 helper，例如 `createListOperateService<T>()`，但前提是先把 immui placeholder 替换掉。

#### 5. operate 层的 undo track 分散且不一致

有些方法立即 `Undo.track()`，有些依赖 `afterOperate`，有些如 `setTextContent()` 没有 track。属性面板操作通常有三类：

- 连续拖动/输入中：只更新 state，不立即归档。
- 操作结束：归档一次。
- toggle/add/delete：立即归档。

建议为 operate 层统一命名：

- `beginChange()`
- `updateChange()`
- `commitChange(description)`
- `cancelChange()`

否则后续 slider、input number、color picker 很容易产生过多或过少 undo 记录。

#### 6. mixed value 的表示方式不统一

`geometry.ts` 用 `MULTI_VALUE`，`text.ts` 用 `-1` 或 `'multi'`。这会让 UI 层不得不理解每个 operate 的不同约定。

建议统一 mixed value 表达，例如：

```ts
type Mixed<T> = T | typeof MULTI_VALUE
```

并避免用 `-1` 这种可能和合法值冲突的 sentinel。

#### 7. `points.ts` 是空模块

点编辑对矢量编辑器很重要，但当前只有空 service。建议标注为 todo/experimental，避免让读者误以为已经有点编辑能力。

## 文件级评价

### `align.ts`

设计意图合理，但当前实现与 matrix schema 和 Elem API 不一致。建议优先重写。对齐应该基于 scene AABB 计算，再转换回节点 local matrix。

### `geometry.ts`

是 operate 模块中最值得保留和继续打磨的方向。需要把 absolute/delta、matrix、shape-specific 属性彻底统一。

### `fill.ts`

相对成熟。Immer patch 路线建议作为 stroke/shadow/text 的参考。需要补空选区保护和多选 mixed fills 的更明确语义。

### `stroke.ts`

结构方向可以，但实现依赖未完成 immui。建议迁移到 fill 的 patch 模式，并考虑和 shadow 抽公共列表操作。

### `shadow.ts`

同 stroke。还需要注意 shadow dirty rect 在 render 层是否真正扩展，否则修改 shadow 可能清不干净旧区域。

### `text.ts`

文本属性归并方向对，但 patch 工具未完成。`letterSpacing` 默认值和 creator 中默认值不一致，也需要统一。文本编辑 undo 边界需要明确。

### `points.ts`

占位模块。建议移动到 `experimental` 或写文件头说明计划。

## 建议优先级

1. 修正或禁用 `align.ts` 的旧几何写入。
2. 用 `produceWithPatches` 替换 stroke/shadow/text 的 immui placeholder。
3. 统一 operate 层 undo commit 模型。
4. 统一 mixed value 表示。
5. 在 geometry 里修正 star/polygon/text 相关属性更新。
