这个文件目前有几个明确的逻辑问题。第 149 行本身不是语法问题，但传入的 `ancestors` 内容不正确。

## 1. `ancestors` 实际不是祖先列表

[event.ts:148](F:/sigma/apps/web/src/editor/stage/event.ts:148) 传入的是：

```ts
ancestors: hitList || []
```

但 `hitList` 是当前父级遍历过程中共享的“已命中元素列表”：

```ts
const subHitList: Elem[] = []
reverseFor(elem.children, (child) =>
  traverse({ elem: child, hitList: subHitList, xy }),
)
```

它可能包含：

- 当前元素自己
- 当前元素的兄弟节点
- 重复元素
- 之前遍历过的其他命中元素

反而通常不包含真正的父节点，因为递归子节点时创建了新的 `subHitList`。

所以 `ancestors` 这个字段现在语义完全不成立。当前没有代码使用它，因此暂时没有暴露。

## 2. 命中元素会被重复加入

同一个节点会经历 capture 和 bubble 两次回调：

```ts
func({ capture: true, ... })

// 遍历子节点

func({ capture: false, ... })
```

而两次回调都会执行：

```ts
if (hit) hitList?.push(elem)
```

因此每个命中的 Elem 通常会在结果里出现两次。

这会导致：

- `getElemsFromPoint()` 返回重复元素
- 额外执行一次精确 HitTest
- `elemsFromPoint` 的顺序更难推断

如果暂时不要 capture/bubble，这里应该只进行一次命中收集。

## 3. `mousedown` 会派发给未命中的元素

[event.ts:139](F:/sigma/apps/web/src/editor/stage/event.ts:139) 虽然计算了 `hit`，但无论结果如何都会触发事件：

```ts
const hit = elem.hitTest(xy!)

if (!stopped) {
  elem.eventHandle.triggerMouseEvent({
    hit,
    // ...
  })
}
```

这对 `mousemove/hover` 尚且可以解释为需要发送 hover leave，但对 `mousedown` 是错误的。

当前所有带 `mousedown` 监听器的可见 Elem 都可能收到点击，即使没有命中。某个未命中的元素再调用 `stopPropagation()`，后面的真实目标反而收不到事件。

## 4. 全局命中顺序可能违反视觉层级

`elemsFromPoint` 不是按完整绘制顺序生成的，而是每遍历完一组子节点就立刻追加：

```ts
this.elemsFromPoint.push(...subHitList)
```

例如：

```text
A：较低的顶层节点
  └─ A1：命中的子节点

B：覆盖在 A 上面的顶层节点
```

反向遍历会先处理 B，再处理 A，但 B 的命中暂存在根节点的 `subHitList`，A1 却可能提前写进全局 `elemsFromPoint`。最终：

```ts
firstOne(this.elemsFromPoint)
```

可能得到被 B 遮挡的 A1，而不是视觉上最上层的 B。

这种分层编辑器不能只按深度聚合命中结果，需要严格按照最终绘制栈确定 topmost target。

## 5. Widget 层级处理顺序不合理

当前顺序是：

```ts
traverse(sceneRoot)
计算 hoverId
traverse(widgetRoot)
```

所以：

- Widget 不参与 `hoverId` 计算
- Scene 事件先于 Widget 派发
- Scene 元素调用 `stopPropagation()` 后，顶层 Widget 可能收不到事件

但从视觉层级来说，变换框、控制点等 Widget 通常覆盖在 Scene 之上，应该优先成为事件 target。

目前 Scene Elem 基本没有注册事件，所以问题还不明显；后面一旦给普通节点加事件，就容易出现冲突。

## 6. `getElemsFromPoint()` 是有副作用的查询

调用：

```ts
getElemsFromPoint(xy)
```

不仅查询元素，还会：

- 清空内部缓存
- 更新渲染优先点
- 更新 `hoverId`
- 遍历 Widget 并改变缓存内容

而不传参数时又直接返回内部可变数组：

```ts
if (!e) return this.elemsFromPoint
```

调用方甚至可以意外修改内部状态。命中查询、hover 更新和渲染优先级更新最好是三个独立职责。

## 7. Hover 状态可能残留

这里只监听：

```ts
mousedown
mousemove
```

没有处理：

- `mouseleave`
- `pointerleave`
- `pointercancel`
- 元素隐藏期间的 hover 清理

鼠标离开 Canvas 后，Elem 中记录的 `lastHit` 和 `hoverId` 可能继续保留。`isPointerEventNone` 或分片渲染期间直接跳过事件，也会导致 hover leave 丢失。

## 8. 禁用事件的恢复不够稳

[event.ts:49](F:/sigma/apps/web/src/editor/stage/event.ts:49) 依赖全局 `mouseup` 恢复：

```ts
listen('mouseup', { once: true }, this.enablePointEvent)
```

如果发生 Pointer Cancel、窗口失焦或触摸/手写笔交互，`mouseup` 不一定按预期出现，系统可能一直处于禁用状态。更适合统一使用 Pointer Events，并同时处理 `pointerup`、`pointercancel` 和 `blur`。

## 9. 性能上做了两遍不必要工作

目前每次 `mousemove`：

- 遍历所有可见 Elem
- capture 阶段 HitTest 一次
- bubble 阶段再 HitTest 一次
- 对 Path、Text 等执行精确几何命中

节点数量上来后开销会比较明显。

最优先需要解决的是前三项：`mousedown` 误派发、重复命中和错误的 `ancestors`。如果确定当前不做 capture/bubble，这个文件可以明显简化成“按视觉层级寻找 topmost target，然后只向 target 派发事件”，会比现在稳定很多。
