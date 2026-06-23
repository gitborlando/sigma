# 04 · 核心数据流 ⭐

> 这是全文档集合里**最重要**的一篇。改任何编辑器代码前，先理解这里描述的数据流。

---

## 全局心智模型

Sigma 的所有编辑行为，最终都归结为一个统一模式：

```
用户操作 → 改 YState（数据层）→ 派发 patch → Scene 改 Elem 树 → Surface 重绘
```

**核心原则：数据是唯一真相源（single source of truth）**。所有视觉表现、UI 状态，都从 Schema 数据派生。**绝不允许**「直接改 Canvas / 直接改 DOM 来反映编辑结果」——那样会和协同、撤销、重绘系统冲突。

---

## 用一个真实例子贯穿：改一个矩形的填充颜色

假设用户在右侧属性面板把选中矩形的填充从红色改成蓝色。完整链路如下：

### 第 1 步：UI 触发操作

`view/editor/right-panel/operate/fill.tsx` 的颜色选择器回调里调用：

```ts
OperateFill.setFills((draft) => {
  draft[0].color = '#0000ff'
})
```

### 第 2 步：OperateFill 产生 immer patch

`editor/operate/fill.ts`：

```ts
setFills(setter: (draft: S.Fill[]) => any) {
  const [nextFills, patches] = produceWithPatches(this.fills, setter)
  // patches = [{ op: 'replace', path: ['0', 'color'], value: '#0000ff' }]
  YState.applyImmerPatches(patches, `${nodeId}.fills`)
  Undo.track('all', 'change fill')
}
```

它用 Immer 的 `produceWithPatches` 算出新值 + patch，然后交给 YState。

### 第 3 步：YState 写入（核心）

`editor/y-state/y-state.ts` 的 `applyImmerPatches` → `set`：

```ts
set(keyPath, value) {
  // keyPath = "rect_xxx.fills.0.color"
  if (this.doc) this.setYValue(keyPath, value)   // ① 写 Y.Doc（协同权威源）
  if (!this.doc || this.transactionDepth > 0) {
    this.immut.set(keyPath, value)               // ② 同步本地镜像
  }
}
```

**这里是最关键的分支**，决定数据怎么流动。有两套规则，取决于是否在事务里：

#### 情况 A：不在事务里（平时）

```
set() 只写 Y.Doc
   │
   ▼
Y.Map 触发 observeDeep 回调
   │  （在 utils/immut/y-to-immut.ts 的 subscribeY）
   ▼
把变更投影到 Immut 镜像  ← 这里才真正更新本地状态
   │
   ▼
Immut 产生 patch，派发给订阅者
```

即：**平时让 Yjs observer 把变更同步回来**，本地写入是「触发式」的。

#### 情况 B：在事务里（`YState.transact(...)` 内）

```
set() 先写 Y.Doc，再立即写 Immut
   │
   ▼
Immut 立即更新（保证同事务后续读取一致）
   │
   ▼
Immut 产生 patch，派发给订阅者
   │
   ▼
稍后 Y.Map observer 也会触发，但做幂等判断，不再重复写
```

即：**事务内为了读写一致性，提前同步本地镜像**，observer 退化成幂等兜底。

> 📝 这个微妙的双轨语义非常重要，专门有一篇笔记：[`ai/notes/y-state-mirror-sync.md`](../notes/y-state-mirror-sync.md)。**修改 YState 相关代码前必读**。

### 第 4 步：patch 派发，Scene 响应

无论走 A 还是 B，Immut 都会派发 patch。`YState.flushPatch$` 这个 Signal 是统一的 patch 出口：

```ts
private flushPatch() {
  return this.immut.subscribe((patches) => {
    patches.forEach((patch) => this.flushPatch$.dispatch(patch))
  })
}
```

`StageScene` 订阅 `flushPatch$`（以及首次渲染用 `autorun`）：

```ts
// scene.ts 简化
private hookPatchRender() {
  return YState.flushPatch$.hook((patch) => {
    if (patch.type === 'add')    this.render('add', extractIds(patch))
    if (patch.type === 'replace') this.render('replace', extractIds(patch))
    if (patch.type === 'remove')  this.render('remove', extractIds(patch))
  })
}
```

根据 patch 的 `type` 和 `keys`，Scene 决定对 Elem 树做什么：

- `add`（新增节点）→ 创建对应 Elem 并挂到父 Elem 下
- `replace`（属性变化，如颜色、matrix）→ 更新对应 Elem 的 `node` 引用（setter 会自动 collectDirty）
- `remove`（删除节点）→ 销毁对应 Elem

### 第 5 步：Elem 标脏，Surface 重绘

`Elem` 的 `node` setter：

```ts
set node(node: S.Node) {
  StageSurface.collectDirty(this)   // 改之前先把旧区域标脏
  this._node = node
  StageSurface.collectDirty(this)   // 改之后把新区域也标脏
}
```

`StageSurface.collectDirty(elem)` 把 elem 的 AABB 加入脏矩形队列，然后调度一次 rAF 重绘。

### 第 6 步：rAF 回调，真正绘制

rAF 回调里，Surface 从 Elem 树根开始遍历：

```ts
sceneRoot.traverseDraw()
  └─ 每个 Elem:
       ├─ if (!visible) return        // 视口剔除
       ├─ ctx.save()
       ├─ setTransform(node.matrix)   // 应用变换
       ├─ ElemDrawer.draw(this, ctx)  // 画路径 + 填充 + 描边 + 阴影 + 文字
       ├─ if (clip) ctx.clip(path)    // frame 裁剪子元素
       ├─ children.forEach(traverseDraw)  // 递归子节点
       └─ ctx.restore()
```

注意 Surface 用了**脏矩形**优化：只重绘脏区域，而非整屏。详见 [`06-render.md`](./06-render.md)。

### 第 7 步：协同广播（如果开启了）

`Y.Doc` 的变更会通过 `YSync` 的 HocuspocusProvider 自动通过 WebSocket 广播给其他在线用户。其他用户的 Y.Doc 收到更新 → 触发他们本地的 observer → 投影到 Immut → 走同样的 patch → Scene → Surface 流程。

详见 [`07-collaboration.md`](./07-collaboration.md)。

---

## 完整时序图

把上面的步骤画成一张时序图：

```
 用户        UI 层        OperateFill      YState              Immut         Scene        Surface      Canvas
  │            │              │              │                   │             │            │           │
  │─选蓝色──→│              │              │                   │             │            │           │
  │            │─setFills()─→│              │                   │             │            │           │
  │            │              │─produceWithPatches              │             │            │           │
  │            │              │─applyImmerPatches()             │             │            │           │
  │            │              │              │─set()             │             │            │           │
  │            │              │              │  ├─写 Y.Doc ───────────────────→(协同广播)   │           │
  │            │              │              │  └─immut.set()──→│             │            │           │
  │            │              │              │                   │─产生 patch  │            │           │
  │            │              │              │                   │─dispatch──→│            │           │
  │            │              │              │                   │             │─更新 Elem.node        │
  │            │              │              │                   │             │            │─collectDirty
  │            │              │              │                   │             │            │─rAF       │
  │            │              │              │                   │             │            │─traverseDraw→绘制
  │←───────────────────────────────────────────────────────────────────────────────────────────出现蓝色矩形
```

---

## 另一个例子：从左侧面板删除一个节点

```
用户点删除
   │
   ▼
命令 EditorCommand.nodeGroup 的 'delete' → HandleNode.deleteSelectedNodes()
   │
   ▼
YState.transact(() => {           ← 注意：整个删除是事务
  createSchemaTraverse 遍历选中节点
    └─ deleteChild(parent, node)
         ├─ YState.delete(`${parent.id}.childIds.${i}`)
         └─ YState.delete(`${node.id}`)
  HandleSelect.clearSelect()
})
Undo.track('all', 'delete nodes')
   │
   ▼
（事务内每一步都立即同步 Immut，保证父子关系一致）
   │
   ▼
Scene 收到 remove patch → 销毁对应 Elem
   │
   ▼
Surface 重绘，节点消失
```

**为什么删除要包在 `transact` 里**：因为删除涉及「从父级 childIds 移除」+「删除节点本身」+「清除选中」多个关联写入。如果不在事务里，每一步只写 Y.Doc 等 observer 回投，中间状态会不一致（比如刚移除 childIds 但节点还在，后续逻辑读到错乱数据）。事务内的提前同步保证了整个删除操作对本地而言是原子的。

---

## 数据流的几条关键不变量

记住这几条，避免踩坑：

### 1. 不要绕过 YState 直接改数据

❌ 错误：`node.fills[0].color = '#fff'`（直接改对象）
✅ 正确：`YState.set('nodeId.fills.0.color', '#fff')`

直接改对象不会触发任何 patch，Scene 不知道要重绘，协同也不会广播。

### 2. 多步关联写入要包在 `transact` 里

```ts
YState.transact(() => {
  YState.set(`${node.id}.parentId`, newParent.id)
  YState.insert(`${newParent.id}.childIds.0`, node.id)
})
Undo.track('all', 'reparent')
```

### 3. 修改后要 `Undo.track`

```ts
Undo.track('all', t('change fill'))
```

这是把这次操作登记到撤销栈。不调的话，这次变更无法被 undo。

### 4. UI 永远订阅状态，不要缓存

```tsx
// ✅ 正确：observer 会自动响应
const Comp = observer(() => {
  const fills = OperateFill.fills // 响应式读取
  return <div>...</div>
})

// ❌ 错误：缓存了快照
const [fills, setFills] = useState(OperateFill.fills)
```

---

## 三种 patch 系统的对应关系

你会在代码里看到三种 patch 概念，别混淆：

| Patch 类型      | 来源                 | 形状                              | 用途                                            |
| --------------- | -------------------- | --------------------------------- | ----------------------------------------------- |
| **Immer Patch** | `produceWithPatches` | `{ op, path, value }`             | 业务层计算变更，喂给 `YState.applyImmerPatches` |
| **ImmutPatch**  | `Immut._track`       | `{ type, keys, value, oldValue }` | 本地状态变更记录，驱动 Scene 重绘               |
| **Yjs 事件**    | `Y.Map.observeDeep`  | Delta / action                    | 协同同步，被 `subscribeY` 翻译成 Immut 操作     |

它们的关系：

```
Immer Patch  ──→ YState ──→ Yjs 事件（协同） + ImmutPatch（本地）
                              │                    │
                              ▼                    ▼
                          远端同步            Scene / Surface 重绘
```

---

## undo / redo 怎么融入数据流

`Undo` 服务（`editor/core/undo.ts`）维护两个栈：

- **state 栈**：记录 ImmutPatch 序列（来自 `YState.getPatches`）
- **client 栈**：记录客户端状态（选择、页面），来自 `MobxUndo`

每次有意义的操作后调 `Undo.track(type, description)`，会把当前累积的 patches 打包成一个 undo entry。

- `Undo.undo()`：回放反向 patch + `Y.UndoManager.undo()`
- `Undo.redo()`：回放正向 patch + `Y.UndoManager.redo()`

撤销本质上也是一次数据写入，所以走的是和正常编辑**完全相同的数据流**（改 YState → patch → Scene → Surface），不需要特殊处理。

---

## 下一站

- 想了解数据本身的形状 → [`05-schema.md`](./05-schema.md)
- 想了解渲染细节 → [`06-render.md`](./06-render.md)
- 想了解协同 → [`07-collaboration.md`](./07-collaboration.md)
