# render 模块评价

评分：**7.5 / 10** —— 渲染调度和脏矩形/分片是真实功夫，但 `surface` 把太多职责揽在身上，`elem` 的 memo 与 dirty 收集耦合得偏紧。

涉及文件：`surface.ts`(524) / `draw.ts`(465) / `elem.ts`(410) / `scene.ts`(156) / `react/reconciler.ts`(150) / `text-break/*`

---

## 1. 意图

这一层要做的是：**用一个自研 Canvas 2D 渲染内核，支撑一个可旋转/嵌套/多类型的矢量画布**，并且在大画布 + 多节点场景下保持流畅。它不是「拿到数据全量重绘」，而是要解决设计工具特有的性能问题：脏矩形、平移复用、分片渐进渲染、以及一套「像 DOM 一样」的事件分发。

这是 Sigma 区别于普通 Canvas demo 的核心战力所在，也是它最该被认真对待的一层。

---

## 2. 架构画像

整套渲染是 **「schema patch → scene 重建 elem 树 → surface 调度重绘」** 的拉模型：

- **`scene.ts`**：订阅 `YState.flushPatch$`，把 schema 增删改翻译成 `Elem` 树的 mount/unmount/update，并维护 `createObjCache<Elem>` 的 id→elem 索引。
- **`elem.ts`**：`Elem` 是「Canvas 上的虚拟节点」，持有 `node/mrect/globalMatrix/aabb/visible`（全部 memo 化）、children、eventHandle、hitTest。`ElemDrawer` 负责把它画出来。
- **`draw.ts`**：`ElemDrawerService` 按 node.type 分派 path 构造（rect/ellipse/polygon/text/line/irregular），再做 fill/stroke/shadow，并同步更新 hitTest。
- **`surface.ts`**：渲染调度器。管理 mainCanvas + topCanvas + bufferCanvas，实现 firstFullRender / nextFullRender / partialRender / 平移 translate 复用 / 顶层 widget 渲染 / 指针事件分发 / dirty rect 收集。
- **`text-break/`**：基于 Unicode trie 的 line break + grapheme break，自己实现文字测量与换行（含省略号）。
- **`react/reconciler.ts`**：用 `react-reconciler` 把 React 子树挂到 `Elem` 上，让「选择框、变换手柄」这类 widget 能用 JSX 写。

---

## 3. 成立的部分

### 3.1 渲染调度的工程意识是真的

`surface.ts` 里这套调度不是玩具：

- **mainCanvas + topCanvas 分离**：scene 元素画在 main，widget（选择框/手柄）画在 top，避免 widget 频繁变化拖累 scene 重绘。
- **partialRender（脏矩形）**：`collectDirty` 收集脏 AABB，合并后只 clear + 重绘碰撞到的 elem，并用 traverser 做「脏区扩大需要重测」的迭代收敛（`needReTest` 循环）。这是脏矩形算法里很容易漏的一环——脏区扩大后原本不碰的 elem 可能新碰上，作者处理了。
- **平移 translate 复用**：`translate()` 不重绘整个画布，而是把当前 canvas 内容 `drawImage` 到 buffer 再贴回（带 dpr 累积误差修正 `accumulatedErrorX/Y`），只补绘进入视口的新区域。这是专业画布工具的标配优化。
- **分片渐进渲染（sliceRender）**：`fullRender` 里用 min-heap（按 layer + 到鼠标距离排序）分帧绘制，每帧 `performance.now() - startTime <= 15` 就让出，未画完的 `requestRender('nextFullRender')` 接力。这让「切到一页有几千节点」时不会卡死主线程。
- **DEV_showDirtyRect**：能可视化脏区，是调试这类系统的正确工具。

这些加在一起，说明作者真的在解决「大画布流畅」这个问题，而不是画完就完。

### 3.2 `Elem` 的 memo 化方向对，和 schema patch 模型契合

`elem.ts` 里 `mrect/aabb/globalMatrix/visible` 都用 `memorized(deps => value)`，deps 是相关字段数组。因为 `scene.ts` 在每次 patch 时会 `elem.node = clone(node)` 重新赋值，memo 的 deps 自然失效，派生量重算。这套机制把「schema 变了哪些字段」和「哪些派生量要重算」用 deps 数组显式连接，比手写 `if (changed.width) invalidate(...)` 更紧凑。

### 3.3 命中测试（HitTest）覆盖了真实图形

`HitTest` 不是只用 AABB 兜底，而是为 roundRect / polygon / ellipse（含内环、扇形角度）/ polyline（带 stroke 宽度的「带宽折线」）分别实现了精确命中。`hitPolyline` 把每段折线扩成四边形再判点在内，是处理「细线好点不中」的正确做法。`hitEllipse` 还考虑了 `innerRate`（环形）和起止角度（扇形）。

对一个设计工具，命中测试准不准直接决定可用性，这一块做得很扎实。

### 3.4 text-break 自己实现，是必要的重投入

`text-breaker.ts` + `LineBreaker` + `GraphemeBreak` + unicodeData/trie，是一整套基于 UAX#14/UAX#29 的文本换行实现。这看起来「重」，但对矢量设计工具是**必须**的——Canvas 原生 `measureText` 不懂 grapheme cluster（emoji、组合字符），浏览器换行算法也不可控。作者选择「带 unicode trie 进 bundle、自己 break」，是正确的取舍。

`createMeasureText` 还按 fontStyle memo 化测量函数，避免重复设置 canvas font。

### 3.5 react-reconciler 挂载 widget 是一个聪明的选择

把「选择框、resize 手柄、旋转手柄」这类**高频变化、强声明式**的 UI 用 React 写，再用 `react-reconciler` 桥接到 `Elem` 树（`widgetRoot`），是合理的：这类 widget 用命令式 canvas 画会很繁琐，用 React 写既能复用组件生态，又能让它们自然参与 topCanvas 渲染。`hostConfig` 里 `applyProps` 把 events 正确地 add/remove diff，方向对。

---

## 4. 问题与风险

### 4.1 `surface.ts` 是一个 524 行的「上帝服务」，职责严重过载 ⚠️（最大问题）

`StageSurface` 同时承担了至少 7 类职责：

1. canvas/ctx 容器管理（main/top/buffer）
2. 渲染调度（renderType 状态机 + raf + 任务队列）
3. 三种渲染策略（full/partial/translate）
4. **DOM 事件监听与指针分发**（`onPointerEvents` + `traverseLayerList` + capture/bubble）
5. **命中测试入口**（`getElemsFromPoint` + `elemsFromPoint` 状态）
6. dirty rect 收集（`collectDirty` + `dirtyRects`）
7. 坐标系工具（`getVisualSize` + `transformCanvas`）
8. 指针开关（`disablePointEvent/enablePointEvent`）

这违反了「service 不该同时是状态能力 + 运行时接线容器」的方向（见 `editor-lifecycle-effects.md`）。`eventXY` / `elemsFromPoint` 这种**带状态的成员变量**藏在 surface 里，让事件分发和渲染调度共享 mutable state，是非常容易出 race 的设计（比如 partialRender 进行中来了 pointerdown）。

> 拆分建议（按 `editor-lifecycle-effects` 的 effect 思路）：
>
> - `SurfaceCanvas`：只管 canvas/ctx/dpr/transform；
> - `RenderScheduler`：只管 renderType + raf + 三策略；
> - `DirtyRectCollector`：只管 dirty 收集与合并；
> - `PointerEventBus`：只管 DOM 事件 → elem 树的 capture/bubble 分发（含 hit test 入口）。
>   surface 退化成它们的组合入口。

### 4.2 `Elem` 的 dirty 收集耦合在 setter 里，且 node 用 clone 赋值，存在双重写

```ts
// elem.ts
set node(node) {
  StageSurface.collectDirty(this)   // 旧 aabb
  this._node = node
  StageSurface.collectDirty(this)   // 新 aabb
}
```

```ts
// scene.ts
updateNode(node) {
  elem.node = clone(node)   // 整节点 clone 赋值
}
```

这里有两个隐含契约：

1. **每次 node 变都要 collectDirty 两次**（旧区+新区），漏一次就会出现「残影」。
2. **scene 每次 patch 都 clone 整个 node**，即使只改了一个 `width`。

clone 整节点的代价在 fill/stroke/shadow 数组大时会很明显（每次都 deep copy）。更合理的是让 `Elem` 直接持有 node 引用，dirty 收集由 scene 在 patch 时显式调一次（基于旧 aabb + 新 aabb），而不是埋在 setter 里靠「set 必然触发两次」兜底。当前写法能 work，但它依赖一个**没人能从类型上保证的不变量**：「node 永远通过 setter 赋值，不能直接改字段」。

### 4.3 `draw.ts` 用「共享可变成员」当临时变量，是不可重入的

```ts
class ElemDrawerService {
  private node!: S.Node
  private elem!: Elem
  private ctx!: CanvasRenderingContext2D
  private path2d!: Path2D
  private dirtyRects: AABB[] = []
  draw = (elem, ctx, path2d) => { this.node = elem.node; ... }
}
```

`ElemDrawer` 是单例，`draw` 把入参存到 `this.node/this.elem/this.ctx`，后续所有 `drawFill/drawStroke` 都读 `this.xxx`。这意味着 `draw` **不能被递归/并发调用**（比如未来要在子线程或嵌套 clip 里画）。当前 `traverseDraw` 是同步串行的所以没炸，但这是把「函数局部状态」错误地提升成了「对象成员」，纯粹是单例习惯带来的坏味道。应该把 `node/elem/ctx/path2d` 作为参数在内部函数间传递，或者每次 draw new 一个临时 context 对象。

### 4.4 `partialRender` 的脏区合并策略对「跨视口大节点」可能过度重绘

```ts
let dirtyArea = AABB.merge(this.dirtyRects)
// traverser 里：if (AABB.include(dirtyArea, elem.aabb) !== 1) { dirtyArea = merge(...); needReTest = true }
```

如果一个节点（比如全屏背景 frame）的 aabb 部分落在脏区里，`include !== 1` 会把整个节点 aabb 并进脏区，下一轮就可能把脏区扩到整个画布，退化为全量重绘。对「小改一处但有大背景」的场景，这个策略会放大重绘面积。

更稳的做法是 **clip 到脏区再重绘**（`ctx.save(); ctx.clip(dirtyRect); redraw matched elems; ctx.restore()`），而不是不断扩大脏区。当前 `partialRender` 里 `clearRect(dirtyArea)` 之后调 `patchRender(reRenderElems)` 时并没有 clip，所以重绘的 elem 内容可能画到 dirtyArea 之外（被下次 clear 覆盖前是脏的）。这是一个**正确性靠后续 clear 兜底**的隐患。

### 4.5 `react/reconciler.ts` 的 hostConfig 是半成品

大量方法直接 `throw new Error('Function not implemented.')`（`createTextInstance/preparePortalMount/scheduleTimeout/getCurrentEventPriority/...`），`isPrimaryRenderer: false`。这说明它只在「无文本节点、非主渲染器」的窄场景下能用。如果未来 widget 里出现 `<span>文字</span>` 或 portal，会直接抛错。属于「能用但边界很窄」，建议在文档/类型上标清楚「只支持无文本的 elem 子树」，或补齐 text instance。

### 4.6 `draw.ts` 的 fill/stroke 索引依赖 shadows 对齐

```ts
this.node.fills.forEach((fill, i) => {
  this.drawShadow(this.node.shadows[i])   // 用 fills 的下标去取 shadows
  this.drawFill(fill)
})
this.node.strokes.forEach((stroke, i) => {
  this.drawShadow(this.node.shadows[i])   // 同样
  ...
})
```

这里隐含了一个 schema 不变量：「第 i 个 fill 配第 i 个 shadow」「第 i 个 stroke 也配第 i 个 shadow」。但 schema 里 fills/strokes/shadows 是三个独立数组，长度未必相等，语义上也没有「配对」关系。当前能 work 是因为 creator 默认它们长度一致，一旦用户删了一个 shadow 没删 fill，阴影就会错位。这是一个**把 UI 约定当成 schema 不变量**的典型隐患。

### 4.7 text-break 的 `breakText` 签名与 `draw.ts` 调用不一致

`breakText` 第 4 个参数文档写的是 `maxLines`，但 `draw.ts` 调用时传的是 `letterSpacing`：

```ts
// draw.ts
this.splitTexts = this.splitTextsCache.getSet(
  this.node.id,
  () => StageSurface.textBreaker.breakText(content, width, style, letterSpacing),
  ...
)
```

而 `breakText(text, maxWidth, style, maxLines?)` 的第 4 参是 maxLines。这是签名漂移，会导致 letterSpacing 实际被当 maxLines 用（number 类型恰好不报错）。属于「类型系统能挡但没挡住」的 bug。

---

## 5. 方向建议

1. **拆 `surface.ts`**：按 canvas / scheduler / dirty-collector / pointer-bus 四件套拆，surface 只做组合。这是这一层收益最大的一步。
2. **重做 dirty 收集**：把它从 `Elem.node` setter 里拿出来，交给 scene 在 patch 时显式算（旧 aabb + 新 aabb），并去掉整 node clone。
3. **`draw.ts` 去单例状态**：把 `node/elem/ctx/path2d` 改成显式参数传递，让 `draw` 可重入。
4. **`partialRender` 加 clip**：重绘匹配 elem 时 clip 到 dirtyArea，避免脏区无限扩大和画到区外。
5. **修 fill/stroke/shadow 配对**：要么在 schema 里明确「shadow 索引语义」，要么 draw 时独立遍历 shadow 不与 fill/stroke 配对。
6. **修 `breakText` 调用签名漂移**，并给 text-break 补最小单测（emoji/组合字符/中英混排/省略号）。
7. **`reconciler` 标注边界**：明确「widget 子树不得含文本节点」，或补 createTextInstance。

---

## 小结

这一层是 Sigma 最该骄傲的部分：脏矩形、平移复用、分片渐进、精确命中、自研换行，每一项都是真做设计工具才会碰的硬骨头。它的债不在「方向错了」，而在 **surface 把调度、事件、脏区、坐标全揽在一起**，以及 **dirty 收集和单例状态埋了几个没人保证的隐式契约**。把 surface 拆开、把 dirty 收集显式化，这一层会从「能跑且快」变成「能跑、快、且可维护」。
