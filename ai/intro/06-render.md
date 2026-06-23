# 06 · Canvas 渲染管线

这一篇讲 Sigma 如何把 Schema 数据画到屏幕上。Sigma 用的是**原生 Canvas 2D**（不是 SVG、不是 WebGL、不是 Fabric.js），自己实现了一整套渲染管线。

---

## 渲染管线的四个角色

```
Schema（数据）
   │
   ▼
StageScene  ── 维护 ──→  Elem 树（渲染节点，带缓存）
   │                          │
   │                          ▼ traverseDraw
StageSurface  ──────────→  Canvas 2D 上下文（ctx）
   │
   ▼
ElemDrawer  ──→ 实际的 ctx.fillRect / ctx.fill / ctx.stroke
```

| 角色             | 文件                       | 职责                                   |
| ---------------- | -------------------------- | -------------------------------------- |
| **StageScene**   | `editor/render/scene.ts`   | 把 Schema patch 翻译成 Elem 树的增删改 |
| **Elem**         | `editor/render/elem.ts`    | 单个渲染节点，缓存派生几何量           |
| **ElemDrawer**   | `editor/render/draw.ts`    | 把一个 Elem 真正画到 ctx               |
| **StageSurface** | `editor/render/surface.ts` | Canvas / ctx 管理、脏矩形、rAF 调度    |

---

## StageScene：从 Schema 到 Elem 树

### 两棵 Elem 树

Scene 维护两个根：

```ts
class StageSceneService {
  sceneRoot!: Elem // ★ 主场景树（所有设计内容）
  widgetRoot!: Elem // 装饰树（选择框、变换手柄、光标、参考线）
  elements = new Map<string, Elem>() // id → Elem 索引
}
```

- `sceneRoot` 对应当前页面的所有节点，是设计内容本身。
- `widgetRoot` 是「叠加层」，放交互装饰（选择描边、变换 8 个手柄、框选矩形、他人光标）。它由一个**自定义 React Reconciler** 管理（后面讲）。

### patch 驱动的增量更新

Scene 订阅 `YState.flushPatch$`，根据 patch 类型更新 Elem 树：

```ts
private hookPatchRender() {
  return Signal.merge(YState.inited$, StageSurface.inited).hook(() => {
    this.disposer.add(
      autorun(() => {
        if (HandleSelect.selectPageId) this.firstRenderPage()   // 切页/首次：全量构建
      }),
      this.hookPatchRender(),                                    // 后续：增量 patch
    )
  })
}
```

- **首次渲染 / 切换页面**：`firstRenderPage()` 清空 sceneRoot，深度遍历整页 Schema 重建 Elem。
- **后续变更**：根据每个 patch 的 `type` 和 `keys`，定位到受影响的 Elem，做对应操作：
  - 新增节点 → 创建 Elem 并挂到父 Elem
  - 属性变化 → 更新 `elem.node`（setter 自动 collectDirty）
  - 删除节点 → 销毁 Elem

### 命中测试也走 Elem

`StageScene.elemsFromPoint(xy)` 返回某坐标下的 Elem，用于点击选中。它调用 `StageSurface.getElemsFromPoint`，后者用 `Path2D` + `ctx.isPointInPath` 做精确命中（在离屏 bufferCanvas 上判断）。

---

## Elem：渲染节点

`Elem` 是渲染层的核心数据结构。它和 Schema 节点一一对应，但**额外缓存了大量派生量**，避免每帧重算。

```ts
class Elem {
  id: string
  type: 'sceneElem' | 'widgetElem'
  node: S.Node // 对应的 Schema 节点
  parent: Elem
  children: Elem[]
  clip: boolean // 是否裁剪子节点（frame）
  hidden: boolean

  // ★ 派生量（全部 memoize）
  get mrect(): MRect // 矩阵矩形
  get aabb(): AABB // 世界坐标轴对齐包围盒
  get globalMatrix(): IMatrix // 世界变换矩阵
  get visible(): boolean // 是否在视口内（视口剔除）
}
```

### 派生量的 memoize

每个派生量都用 `memorized`（来自 `@sigma/utils/common`）做了依赖追踪缓存：

```ts
private memoGlobalMatrix = memorized(() => {
  return Matrix.of(this.parent.globalMatrix).append(this.node.matrix)
})
get globalMatrix() {
  if (!this.parent) return this._globalMatrix
  return this.memoGlobalMatrix([this.node.matrix, this.parent.globalMatrix])
}
```

意思是：只有当 `node.matrix` 或 `parent.globalMatrix` 变化时才重算。这对性能至关重要——一帧里有几百个 Elem，每个的 globalMatrix 都依赖父级链，不缓存会 O(n²)。

### `node` setter 触发标脏

```ts
set node(node: S.Node) {
  StageSurface.collectDirty(this)   // 旧区域标脏
  this._node = node
  StageSurface.collectDirty(this)   // 新区域标脏
}
```

改 node 前后各 collectDirty 一次，保证新旧位置都会重绘（处理移动的情况）。

### `visible` 做视口剔除

```ts
get visible() {
  if (this.hidden) return false
  if (this.id === 'sceneRoot') return true
  return AABB.collide(this.aabb, StageViewport.sceneAABB)  // 和视口 AABB 求交
}
```

不在视口内的 Elem，`traverseDraw` 直接跳过。这是大文件不卡的关键。

---

## Elem.traverseDraw：遍历绘制

绘制入口是 `sceneRoot.traverseDraw()`，递归画整棵树：

```ts
traverseDraw() {
  if (!this.visible) return                              // 视口剔除

  // 太小的元素跳过（优化）
  if (getSetting().ignoreUnVisible && this.optimize) {
    const size = StageSurface.getVisualSize(this.aabb)
    if (size.x < 2 && size.y < 2) return
  }

  const resetCtx = StageSurface.setCurrentCtxType(...)    // 选 main 还是 top canvas
  StageSurface.ctxSaveRestore((ctx) => {
    const path2d = new Path2D()

    if (this.node) {
      resetTransform = StageSurface.setTransform(this.node.matrix)  // 应用节点矩阵
      StageSurface.ctxSaveRestore(() => ElemDrawer.draw(this, ctx, path2d))
    }

    if (this.children.length) {
      if (this.clip) ctx.clip(path2d)                     // frame 裁剪
      this.children.forEach((child) => child.traverseDraw())  // 递归
    }

    resetTransform()
  })
}
```

几个要点：

1. **矩阵是栈式的**：`setTransform(node.matrix)` 把 ctx 变换到节点的本地坐标系，子节点再叠加自己的 matrix。所以每个节点都在自己的 `(0,0)~(width,height)` 空间里画。
2. **clip**：frame 节点设 `clip = true`，子节点超出 frame 边界的部分被裁掉。
3. **两块画布**：sceneElem 画到 mainCanvas，widgetElem 画到 topCanvas（避免重绘装饰时影响主图层）。

---

## ElemDrawer：实际绘制

`ElemDrawer.draw(elem, ctx, path2d)` 是把一个 Elem 画出来的核心。流程：

```ts
draw = (elem, ctx, path2d) => {
  this.drawShapePath() // 1. 构建形状路径（往 path2d 里加命令）

  this.node.fills.forEach((fill, i) => {
    ctx.save()
    this.drawShadow(this.node.shadows[i]) // 阴影（用同一形状做投影）
    this.drawFill(fill) // 填充
    ctx.restore()
  })

  this.node.strokes.forEach((stroke, i) => {
    ctx.save()
    this.drawShadow(this.node.shadows[i])
    this.drawStroke(stroke) // 描边
    ctx.restore()
  })

  this.drawTextDecoration() // 文字下划线等
  this.updateHitTest() // 把 path2d 存起来供命中测试
}
```

### 形状路径构建

按节点类型走不同分支：

```ts
private drawShapePath = () => {
  switch (node.type) {
    case 'frame':
    case 'rect':       this.drawRoundRect(width, height, radius); break
    case 'ellipse':    this.drawEllipse(); break
    case 'polygon':
    case 'star':
    case 'irregular':
    case 'line':       this.drawPath(node.points); break
    case 'text':       this.breakText(); /* 文字断行 */ break
  }
}
```

- 矩形：`path2d.rect()` 或 `path2d.roundRect()`
- 椭圆：`path2d.ellipse()`（处理 innerRate 环形、startAngle/endAngle 扇形）
- 自由路径：用贝塞尔曲线连接 `node.points`

### 填充的三种类型

```ts
private drawFill = (fill: S.Fill) => {
  switch (fill.type) {
    case 'color':
      ctx.fillStyle = rgba(fill.color, fill.alpha); break
    case 'linearGradient':
      const grad = ctx.createLinearGradient(...)
      fill.stops.forEach(s => grad.addColorStop(s.offset, s.color))
      ctx.fillStyle = grad; break
    case 'image':
      const pattern = ctx.createPattern(Image.get(fill.url), matrix)
      ctx.fillStyle = pattern; break
  }
  if (fill.visible) ctx.fill(this.path2d)
}
```

### 文字断行（重活）

文字节点会调用 `Surface.textBreaker`（在 `initTextBreaker` 时加载的 Unicode 断行器）做 grapheme / line break，把 content 拆成行再逐行 `ctx.fillText`。这块代码在 `editor/render/text-break/`，包含完整的 Unicode grapheme cluster 和 line break 算法实现（带预编译的 trie 数据）。

---

## StageSurface：画布管理 + 脏矩形

Surface 是最底层的画布管家。

### 三块画布

```ts
class StageSurfaceService {
  private canvas!: HTMLCanvasElement       // mainCanvas：主图层（设计内容）
  private ctx!: CanvasRenderingContext2D
  private topCanvas!: HTMLCanvasElement    // topCanvas：顶层（装饰、光标）
  private topCtx!: CanvasRenderingContext2D
  private bufferCanvas = new OffscreenCanvas(0, 0)  // 离屏缓冲（命中测试、复用）
  private bufferCtx = ...
  textBreaker!: TextBreaker
}
```

### 脏矩形系统（性能关键）

不是每帧全屏重绘，而是**只重绘变化区域**：

```ts
private dirtyRects: AABB[] = []

collectDirty(elem: Elem) {
  this.dirtyRects.push(elem.getDirtyRect())
  this.requestRender()   // 调度一次 rAF（已调度则跳过）
}
```

rAF 回调里：

1. 合并 dirtyRects
2. `ctx.clearRect` 清掉脏区域
3. 从 sceneRoot `traverseDraw()`，但绘制时用脏区域做 clip
4. 清空 dirtyRects

这样改一个节点的颜色，只会重绘那一个节点的区域，而不是整个画布。

> 开 devMode 可以看到脏矩形（`DEV_showDirtyRect` 会把脏区域画成彩色框）。

### ctx 工具方法

Surface 提供几个高频工具：

- `ctxSaveRestore(fn)`：`ctx.save()` → fn() → `ctx.restore()` 的包装，保证状态不泄漏
- `setTransform(matrix)`：应用矩阵并返回 reset 函数
- `setCurrentCtxType('mainCanvas' | 'topCanvas')`：切换当前操作的 ctx
- `getElemsFromPoint(xy)`：命中测试

### 三种渲染类型

```ts
type SurfaceRenderType =
  | 'firstFullRender' // 首次全量渲染
  | 'nextFullRender' // 整屏变化（缩放、平移、切页）
  | 'partialRender' // 局部脏矩形重绘
```

缩放平移时会触发 `nextFullRender`（整个视口都变了）。

---

## widgetRoot：自定义 React Reconciler

这是项目里相当巧妙的设计。`widgetRoot`（选择框、变换手柄、光标等装饰）不是手写命令式代码维护的，而是**用 React 写**，通过一个**自定义 React Reconciler** 渲染到 Elem 树上。

`editor/render/react/reconciler.ts`：

```ts
const hostConfig: HostConfig<...> = {
  createInstance(_, props) {
    const elem = new Elem(props.node.id, 'widgetElem')
    applyProps(elem, props)
    return elem
  },
  appendChild(parent, child) { parent.addChild(child) },
  removeChild(_, child) { child.destroy() },
  commitUpdate(elem, oldProps, newProps) { applyProps(elem, newProps, oldProps) },
  // ...
}
const reconciler = Reconciler(hostConfig)

export function renderElem(jsx: ReactNode, widgetRoot: Elem) {
  const container = reconciler.createContainer(widgetRoot, ...)
  reconciler.updateContainer(jsx, container)
  return () => reconciler.updateContainer(null, container)
}
```

然后在 `view/editor/stage/stage.tsx` 里：

```tsx
useEffect(() => {
  return renderElem(
    <>
      <EditorStageOutlineComp /> {/* 选中描边 */}
      <EditorStageTransformComp /> {/* 变换手柄 */}
      <EditorStageMarqueeComp /> {/* 框选矩形 */}
      <EditorStageCursorsComp /> {/* 他人光标 */}
    </>,
    StageScene.widgetRoot,
  )
}, [])
```

好处：装饰元素的显示逻辑可以用 React 的声明式 + Hooks 写，但最终产物是 Elem（统一进渲染管线），而不是 DOM。这样装饰和主内容共用同一套 Canvas 绘制，缩放、脏矩形、命中测试都自然统一。

---

## 完整的一次重绘流程

把上面串起来，一次「改颜色 → 重绘」的渲染流程：

```
1. YState.set() 改了 node.fills[0].color
2. patch 派发 → Scene 收到 replace patch
3. Scene 找到对应 elem，赋值 elem.node = newNode
4. elem.node setter:
   ├─ collectDirty(elem)   ← 旧 AABB 进脏队列
   ├─ this._node = newNode
   └─ collectDirty(elem)   ← 新 AABB 进脏队列
5. Surface.requestRender() 调度 rAF
6. rAF 回调:
   ├─ 合并 dirtyRects
   ├─ ctx.clearRect(脏区域)
   ├─ sceneRoot.traverseDraw():
   │    └─ 跳过 !visible 的 elem
   │    └─ 命中脏区域的 elem 重画
   │         └─ ElemDrawer.draw(): 路径 → 填充 → 描边 → 阴影
   ├─ widgetRoot.traverseDraw(): 重画装饰
   └─ 清空 dirtyRects
7. 用户看到新颜色
```

---

## 下一站

→ [`07-collaboration.md`](./07-collaboration.md) 看协同是怎么叠加在这套渲染管线上的。
