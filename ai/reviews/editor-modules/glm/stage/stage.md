# stage 模块评价

评分：**7.0 / 10** —— interact 状态机思路对、transformer 数学扎实、viewport 坐标转换完整；select 偏厚、create 里夹着注释掉的旧逻辑、grid/guide/ruler 三件套残缺。

涉及文件：`viewport.ts`(231) / `cursor.ts`(110) / `interact/interact.ts` / `interact/select.ts`(195) / `interact/create.ts`(133) / `interact/move.ts`(37) / `tools/transformer.ts`(195) / `tools/grid.ts`(66) / `tools/guide.ts`(0, 空) / `tools/ruler.ts`(0, 空)

---

## 1. 意图

这一层是 **「画布交互」层**：把指针/滚轮/键盘的原始输入，翻译成对 schema 的结构化操作（选择、创建、移动、缩放、旋转、平移视口）。它坐在 `render`（画出来）和 `handle/operate`（改数据）之间，是用户感知最强的层。

它的设计目标可以拆成三块：

1. **视口管理**（viewport）：client/canvas/stage/scene 四套坐标转换 + 缩放/平移；
2. **交互模式状态机**（interact）：select/move/create 三种模式互斥切换；
3. **画布工具**（tools）：transformer（变换手柄）、grid（网格）、cursor（光标）、guide/ruler（未实现）。

---

## 2. 架构画像

- **`StageViewport`**（`viewport.ts`）：sceneMatrix（observable）+ bound + zoom/offset 派生 + sceneAABB。提供 `toCanvasXY/toStageXY/toSceneXY/sceneXYToClientXY` 坐标转换、`updateZoom/zoomToFit`。监听 wheel 做缩放/平移，监听 bound resize。
- **`StageInteract`**（`interact/interact.ts`）：observable `interaction` 状态，autorun 切换 select/move/create 模式，每次切换 disposer 上一个、startInteract 下一个。
- **`StageSelect`/`StageCreate`/`StageMove`**：三种交互模式。各自 `startInteract()` 返回 disposer，内部用 `StageDrag`（全局拖拽抽象）的 onStart/onMove/onDestroy 拼拖拽手势。
- **`StageTransformer`**（`tools/transformer.ts`）：move/resize/rotate 三种变换，基于 MRect + diffMatrix。
- **`StageToolGrid`**：高倍率下画像素网格。
- **`StageCursor`**：SVG data URL 光标，带 lock/unlock 优先级。
- **`guide.ts`/`ruler.ts`**：**0 字节空文件**。

---

## 3. 成立的部分

### 3.1 `StageInteract` 的「interaction 状态机 + autorun 切换」是最干净的交互模式管理

```ts
@observable interaction: IStageInteraction = 'select'
private onInteract() {
  return autorun(() => {
    this.offInteract?.()                  // 先卸载上一个模式
    const interact = matchCase(this.interaction, {
      select: () => StageSelect.startInteract(),
      move: () => StageMove.startInteract(),
      create: () => StageCreate.startInteract(),
    })
    this.offInteract = interact()         // 再启动新模式
  })
}
```

把「当前是什么交互模式」做成 observable，用 autorun 自动切换并保证「同时只有一个模式激活」。UI 层只需 `StageInteract.interaction = 'create'`，模式互斥、disposer 生命周期都自动管。这是处理「工具切换」的正确范式，比手写 `if (mode === ...) { setup... }` 干净得多。

每个模式 `startInteract()` 返回 disposer 也一致，让 interact 这层是个统一的协议。

### 3.2 `StageDrag` 的 onStart/onMove/onDestroy 三段式是好的拖拽抽象

三个交互模式（select 的 marquee、create 的拖拽创建、transformer 的 move/resize/rotate）都基于同一个 `StageDrag.onStart().onMove().onDestroy().start()` 协议。这让「按下→移动→抬起」的手势生命周期被抽象一次，业务只关心三段回调。`onDestroy` 还能拿到 `{ moved }` 判断「是真拖拽还是点一下」，用于决定要不要 track。

### 3.3 `StageTransformer` 的数学是这一层最扎实的

`move/resize/rotate` 三个动作的核心都是「算 diffMatrix，apply 到每个节点的 MRect」：

- **move**：`diffMatrix = newMatrix.divide(startMatrix)`，纯平移；
- **resize**：按 directions（top/right/bottom/left）算 scaleX/scaleY + tx/ty，支持 shiftKey 等比；
- **rotate**：基于 center 算旋转矩阵。

`applyToNode` 里区分「单选 resize 在局部空间 apply（local=true）」和「多选/其他在场景空间 apply（先 invert forward，apply diff，再 append forward）」，这是「局部变换 vs 世界变换」的正确处理。配合 `mrectCache` 缓存每个节点初始 MRect，整套变换是矩阵驱动的、数学自洽的。

这也直接证明了 `math/MRect` 抽象的价值（见 math 评价）。

### 3.4 `StageViewport` 的四套坐标转换是完整的

`toCanvasXY`（去掉面板偏移）/ `toStageXY`（再减 offset）/ `toSceneXY`（再除 zoom）/ `sceneXYToClientXY`（反向），覆盖了「屏幕像素 ↔ 画布逻辑坐标」的全部转换方向。`zoomToFit` 算合并 AABB + padding + 缩放限制，是「适应选区/适应全部」的标准实现。

`limitZoom` clamp 到 `[0.015625, 256]`（即 1/64 到 256），范围合理。滚轮缩放用 `deltaYToZoomStep`（对数曲线）让缩放手感平滑。

### 3.5 `StageCursor` 的 lock/unlock 优先级解决了光标抢占

```ts
setCursor(type, rotation) { if (this.locked) return this; ... }
lock() { this.locked = true; return this }
unlock() { this.locked = false; return this }
```

创建模式下 `setCursor('add').lock()` 锁住光标，避免鼠标移到画布上又被 select 模式改成别的光标。`upReset()` 在 mouseup 时解锁并重置。链式 API + 优先级锁，是处理「多个交互都想设光标」的正确方式。

光标用 SVG → Blob URL，按 `type-rotation` 缓存，避免重复 createObjectURL 泄漏。

---

## 4. 问题与风险

### 4.1 `StageSelect` 承担过多，195 行里塞了「点击选择/框选/双击进入文字/右键菜单/悬浮高亮」五件事 ⚠️

`select.ts` 一个类里同时处理：

- 单击选节点（onSceneRootMouseDown → onStageSelect）；
- 框选（onMarqueeSelect，含一整套 marquee AABB 命中遍历）；
- 双击进入文字编辑或下钻（onDoubleClick）；
- 右键打开上下文菜单（onContextMenu，组装菜单组）；
- 鼠标悬浮高亮（onHover）。

这五件事的耦合点在于它们都监听 sceneRoot/surface 的事件，但语义完全独立。框选的 `onMarqueeSelect` 单独就有 60 行（含 traverse2 命中逻辑），右键菜单的组装和「选择」无关。

> 应该拆成 `SelectClickHandler` / `SelectMarqueeHandler` / `SelectMenuHandler` / `SelectHoverHandler`，StageSelect 只做组合和事件路由。这也符合项目约定「优先拆小组件放同文件夹」。

### 4.2 `onMarqueeSelect` 里直接 import 并使用 `traverse2`，和 select 文件其他地方的隐式 traverse1 不一致

```ts
const traverser = SchemaHelper.createTraverse2<{ matrix: IMatrix }>({
  schema: YState.schema,
  enter: (ctx) => { ... 框选命中 ... }
})
```

这是 schema 评价里提到的「两套 traverse 并存」在 stage 层的体现。select 自己内部用 traverse2（纯函数），但 `handle/node.ts` 的 delete/paste 用 traverse1（依赖 YState.find）。读代码的人要同时理解两套 ctx 形状。

### 4.3 `create.ts` 里有大量注释掉的旧逻辑，是未清理的实验痕迹 ⚠️

```ts
private onCreateMove({ marquee, current, start }) {
  YState.transact(() => {
    if (this.node.type === 'line') {
      // ... 一整段 snap/rotation/width 计算被注释掉
      // OperateGeometry.setActiveGeometries({ ...start, width, rotation }, false)
    } else { ... }
  })
}
```

line 类型的创建逻辑基本被注释光了，意味着 **当前创建 line 是坏的/未完成的**（onCreateMove 里 line 分支什么都不做，节点尺寸停留在初始的 0.01）。`createTypes` 里却还包含 `'line'`。这是「半成品暴露在选项里」。

类似地，`geometry.ts` 里有一大段 `patchChangeToVectorPoints` 被整体注释（70+ 行），说明 vector 节点的缩放点同步也是未完成功能。

> 这些注释代码应该要么删（如果决定不做），要么补 TODO + issue（如果要做）。当前状态是「读的人不知道这是废弃还是待续」。

### 4.4 `move.ts` 用的是 `Drag`，而 select/create 用的是 `StageDrag`，两个拖拽抽象并存

```ts
// move.ts
import { Drag } from 'src/global/event/drag'
private onMoveStage() {
  Drag.onStart(() => ...).onMove(({ delta }) => ...).onDestroy(...).start()
}

// select.ts / create.ts
import { StageDrag } from 'src/global/event/drag'
StageDrag.onMove(...).onDestroy(...).start()
```

`Drag` 和 `StageDrag` 都从 `src/global/event/drag` 来。要么是 `Drag` 被重构成了 `StageDrag` 但 move 没跟上，要么是两个并存。两种情况都是债——要么统一到 StageDrag，要么明确两者职责差异。

### 4.5 `viewport.ts` 的 `onObserving` 里有一个空的 autorun

```ts
private onObserving() {
  return Disposer.combine(
    autorun(() => { YClients.client.sceneMatrix = Matrix.of(this.sceneMatrix) }),
    autorun(() => {
      const client = YClients.observingClient
      if (!client) return   // ← 整个 autorun 拿到 client 后什么都不做
    }),
  )
}
```

第二个 autorun 拿到 `observingClient` 后直接 return，是个**未完成的功能**（应该是「跟随他人视口」）。占着 disposer 位但不做事，属于半成品残骸。

### 4.6 `grid.ts` 的缩放阈值 `zoom < 10.96` 是魔法数

```ts
const zoom = getZoom()
if (zoom < 10.96) return
```

`10.96` 没有注释解释（推测是「像素网格在某个缩放以下太密没意义」）。这类阈值应该是有名字的常量，比如 `const GRID_VISIBLE_MIN_ZOOM = 10.96`。

### 4.7 `guide.ts` / `ruler.ts` 是 0 字节空文件 ⚠️

两个文件存在但完全空。要么是「计划做但没做」，要么是「做了又删了」。空文件留在目录里会让读代码的人以为「这层有 guide/ruler 但实现很简单」，实际是根本没有。

> 应该删掉，或在 README/issue 里登记「智能参考线、标尺待实现」。

### 4.8 `cursor.ts` 把 7 段大 SVG 字符串硬编码在类里

`select/add/move/hand/grab/rotate/copy` 每个都是一长串内联 SVG path。这让 cursor.ts 200+ 行里大半是 SVG 字符串数据，可读性差。更合适的是把 SVG 放到独立的 `.ts` 数据文件或 `.svg` 资源，cursor 类只管状态机和缓存。

### 4.9 `transformer.ts` 的 `isSelectOnlyLine` 声明了但从未使用

```ts
isSelectOnlyLine = false // 声明，全文无赋值/读取
```

死字段，应删。

---

## 5. 方向建议

1. **拆 `StageSelect`**：按 click/marquee/menu/hover 拆四个 handler，select 只做组合。这是 stage 层可读性收益最大的一步。
2. **清理 `create.ts` 的注释代码**：line 创建要么实现要么从 createTypes 移除；`geometry.ts` 的注释段同理。
3. **统一 Drag 抽象**：move 改用 StageDrag，或明确两者职责。
4. **删空文件 guide.ts/ruler.ts**，或在 issue 登记待办。
5. **完成或移除 `onObserving` 的空 autorun**（跟随他人视口）。
6. **`cursor.ts` 的 SVG 外置**到数据文件。
7. **魔法数命名**：`GRID_VISIBLE_MIN_ZOOM` 等。
8. **`transformer.ts` 删死字段 `isSelectOnlyLine`**。

---

## 小结

这一层的「interact 状态机 + StageDrag 三段式 + transformer 矩阵驱动」是三个互相印证的好设计，加在一起让 Sigma 的画布交互「像个真正的设计工具」。它的债主要集中在 **select 过厚**、**create/geometry 夹着注释掉的半成品**、**guide/ruler 空文件**这些「未完成清理」上，而不是「方向错了」。把 select 拆开、把半成品要么做完要么删掉，这一层会很清爽。
