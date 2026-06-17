# handle 模块评价

评分：**6.5 / 10** —— 作为「领域操作」层方向对，把用户意图翻译成 YState 事务的思路清晰；但 `Undo.track/untrack` 散落 + `HandleSelect` 混进 ClientUndo，让这层不纯。

涉及文件：`node.ts`(180) / `page.ts`(65) / `select.ts`(62) / `picker.ts`(53)

---

## 1. 意图

这一层是 **「用户意图 → 数据事务」的翻译层**。它不关心 UI 怎么触发，也不关心怎么渲染，只负责把「复制这几个节点」「把选中的包进 frame」「切到第 N 页」这种**领域语义**翻译成对 `YState` 的一组原子操作，并决定这条操作该不该进 undo 历史。

它和 `operate`（属性编辑）的区别在于粒度：handle 是「节点级/页面级/选区级」的结构操作，operate 是「属性级」的细粒度编辑。

---

## 2. 架构画像

- **`HandleNodeService`**（`node.ts`）：节点结构操作。增删（addNodes/removeNodes/deleteChild）、挂载（insertChildAt/removeChild）、层级（reHierarchy）、批量领域动作（deleteSelectedNodes/copySelectedNodes/pasteNodes/wrapInFrame/reHierarchySelectedNode）、几何派生（getMRect/getNodesMergedOBB/getNodeCenterXY）、选区基准（getDatum）。
- **`HandlePageService`**（`page.ts`）：页面级操作（addPage/removePage）+ 每页 sceneMatrix 记忆。
- **`HandleSelectService`**（`select.ts`）：选区状态（selectIdMap/selectPageId）+ select/unselect/clearSelect/selectPage。
- **`UIPickerService`**（`picker.ts`）：颜色/渐变/图片填充选择器的临时状态。

---

## 3. 成立的部分

### 3.1 「领域动作 = transact + track」的范式是统一的

`HandleNode` 的所有批量动作都遵循同一个范式：

```ts
deleteSelectedNodes() {
  YState.transact(() => {
    // 一组对 YState 的原子操作
    traverse(...)
    HandleSelect.clearSelect()
  })
  Undo.track('all', t('delete nodes'))   // 提交一个历史单元
}
```

这个范式的好处是：**「事务边界」和「历史边界」是同构的**。一个领域动作 = 一个 YState transact = 一个 Undo entry。读代码的人看到 `transact( ... )` + `track(...)` 就知道这是一个完整的可撤销单元。

`undo-redo-architecture.md` 把这个模型叫「track-as-commit」，并判断「方向对（track 已是轻量 command）」，我同意。

### 3.2 `untrack` 处理「不该单独成历史的中间步骤」是一个有意识的设计

```ts
pasteNodes() {
  YState.transact(() => { /* 造新节点 */ })
  Undo.untrack(() => {
    HandleSelect.clearSelect()
    newSelectIds.forEach((id) => HandleSelect.select(id))   // 切选区，但不单独成历史
  })
  Undo.track('all', `${t('paste nodes')}: ${newSelectIds.length}`)
}
```

粘贴时「先清旧选区再选新节点」是中间过程，不该在 undo 栈里留两条 selection 记录。`untrack(cb)` 临时关闭 track，最后由 `track('all')` 把「造节点 + 切选区」打包成一个单元。这等价于一个**过程式的 transaction scope**，`selection-replay-source.md` 也确认了它的必要性。

### 3.3 `getMRect` 用 createCache + deps，避免重复构造

```ts
private mrectCache = createCache<ID, MRect>()
getMRect(node) {
  return this.mrectCache.getSet(node.id, () => MRect.of(node), [node.width, node.height, node.matrix])
}
```

节点的 MRect 是高频查询（transformer/align/geometry 都用），按 deps 缓存是对的。

### 3.4 `wrapInFrame` 的几何处理是对的

算选中节点合并 OBB → 造 frame → 插入到原父级同位置 → 把选中节点摘下挂到 frame。OBB→rect 的转换用 `frameOBB`（x/y/w/h/rotation），保证 frame 的旋转和子节点集合的旋转一致。

---

## 4. 问题与风险

### 4.1 `Undo.track` 散落在 47 个调用点，是「靠纪律维持的隐式契约」⚠️（与 undo 笔记一致）

整个 editor 里 track 调用点遍布 handle/operate/stage/view。`undo-redo-architecture.md` 已经指出：

> track 是隐式 commit，无结构强制。47 个调用点靠纪律维护。漏 track 的改动会「漏进」下一条 transaction（Yjs 不 stopCapturing、travels 不 archive），边界错乱且难查。

从 handle 这层看，这个问题的具体表现是：**每个领域动作的最后一行 `Undo.track(...)` 是手写的，漏写就出错**。比如 `HandleNode.insertChildAt/removeChild/reHierarchy` 这些**底层操作没有 track**（它们期望被上层 transact 包裹），而 `deleteSelectedNodes` 等高层动作有 track。这个「哪些该 track 哪些不该」的边界，完全靠开发者记住「底层不 track、高层 track」，没有任何结构保证。

> 方向（与笔记一致）：让 track 成为某个 scope 的自动 commit，而不是靠调用方自觉。比如 `YState.transact(desc, cb)` 内部自动 `track('state', desc)`，业务只管 transact，track 隐式发生。

### 4.2 `HandleSelect` 把「选区状态」和「ClientUndo slice」绑死，让它不再是纯领域服务 ⚠️

```ts
class HandleSelectService {
  @observable.ref selectIdMap = {}
  @observable selectPageId = ''
  private selectUndo = ClientUndo.register<...>('select', this, ['selectIdMap', 'selectPageId'])
  constructor() {
    this.selectUndo.subscribe(() => this.afterSelect.dispatch())
  }
}
```

`HandleSelect` 在构造时就 `ClientUndo.register` 把自己注册成一个 undo slice。这带来几个问题：

1. **「选区是 client state」这个架构决策被硬编码进 HandleSelect**。`selection-replay-source.md` 说「当前 selection 是独立 client state，不在 YState 内」——但这个决策的实现细节（用 travels、register slice、archive 时机）应该和「选区的领域语义」分开。现在它们混在一个类里。
2. **`ClientUndo.register` 要求「无历史时才能注册」**（`assertCanRegister`）。这意味着 HandleSelect 必须在 ClientUndo 还没有任何历史时被构造。由于 HandleSelect 是全局单例（模块加载即构造），这把「模块加载顺序」变成了正确性依赖。
3. **select/unselect/clearSelect 每次都调 `selectUndo.set`**，但 set 只是「打 patch」，不直接成历史（要等 stage 层调 `track('client')` 才 archive）。这个「set 不成历史、track 才成历史」的二阶段语义，是 `undo-redo-architecture.md` 说的「selection patch 在 travels 累积，只有 stage/interact/select.ts 调 track('client') 时才 archive」。

也就是说，HandleSelect 表面上是个「选区领域服务」，实际上它**同时承担了选区状态、ClientUndo slice 注册、patch 累积**三件事。这让它的单元测试几乎不可能（依赖 ClientUndo 单例）。

> 方向：把「选区状态存储」和「选区如何参与 undo」分开。HandleSelect 只管 selectIdMap/selectPageId 状态，是否进 undo 由调用方（或一个 select-effect）决定。

### 4.3 `node.ts` 的 `getDatum` 用魔法值（''）表达「无基准」

```ts
datumId = ''
// ...
if (selectIds.length === 0) this.datumId = ''
if (parentIds.size > 1) this.datumId = ''
```

用空字符串当「无基准」哨兵，调用方要 `if (datum && !SchemaHelper.isPageById(datum.id))` 这样判。这种 stringly-typed 哨兵在 `selectPageId = ID | ''`、`datumId = ''` 里反复出现。更稳的是 `datumId: ID | null`，类型层强制处理 null。

### 4.4 `picker.ts` 是明显的旧代码残骸，和 operate 层的 immui 一样 ⚠️

```ts
import autobind from 'class-autobind-decorator'
// ...
class UIPickerService {
  fill!: S.Fill
  private immui = new (class {})() // ← 空对象当 immui 占位
  setFill(keys, value) {
    this.immui.reset([this.fill], [0, ...keys], value)
  } // ← 运行必炸
}
```

`immui = new (class {})()` 创建一个空对象，然后调 `this.immui.reset(...)`——空对象没有 `reset` 方法，**任何调用 `UIPickerCopy.setFill` 的路径都会 TypeError**。而 `operate/stroke.ts` 和 `operate/shadow.ts` 的 `onUiPickerSetStroke/onUiPickerSetShadow` 正好 hook 了 `UIPickerCopy.onChange`。

这说明：**UIPicker 当前的实现是坏的/废弃的**，但 stroke/shadow 还在订阅它的 onChange。要么 picker 是待重写的占位（那 subscribe 关系该断开），要么它是真在用（那 immui 占位是 bug）。无论哪种，当前状态是「读代码的人不知道该信哪条」。

而且 `UIPickerCopy` 命名带 `Copy`，暗示有一个「正版」UIPicker 在别处（可能在 view 层），这里只是个残留副本。

### 4.5 `HandleNode.deleteSelectedNodes` 的 traverse 用 bubbleCallback 删子再删父，但没有处理「孤儿节点」

```ts
const traverse = SchemaHelper.createTraverse({
  bubbleCallback: ({ node, parent }) => this.deleteChild(parent, node),
})
```

bubbleCallback 是「先访问子，再访问自己」，所以删除顺序是「叶子先删，父后删」，能保证父删之前子已删。但 `deleteChild` 只删 `parent.childIds` 里的引用和 node 本身，如果一个节点被多个 parent 引用（schema 不变量应该不允许，但没人 assert），会有残留。这是 schema 不变量「childIds 单一归属」的隐性依赖。

### 4.6 `HandlePage` 的 `pageSceneMatrix` 缓存用 reaction 写，但读用 getSet，两条路

```ts
private memoPageSceneMatrix() {
  return reaction(() => StageViewport.sceneMatrix, (matrix) => {
    this.pageSceneMatrix.set(getSelectPageId(), Matrix.of(matrix))
  })
}
```

写入靠 reaction（监听 viewport 变化时写当前页），但读 `pageSceneMatrix.getSet(pageId, getMatrix)` 时如果没有缓存会调 getMatrix 现算。这两条路（reaction 主动写 vs getSet 懒算）可能不一致：如果用户在 page A 调整 viewport 后切到 page B，reaction 写的是 A 的矩阵；但 B 的矩阵可能是很久以前 reaction 写的旧值，未必等于「切回 B 时该恢复的值」。当前 `viewport.ts` 的 `onCurrentPageChange` 用 getSet 读，逻辑上能对上，但两条写路径并存还是增加心智负担。

---

## 5. 方向建议

1. **track 自动化**：让 `YState.transact(desc, cb)` 内部自动 track，业务层不再手写 `Undo.track`。这同时解决 4.1 和散落问题。`untrack` 改成 `YState.transact(cb, { track: false })` 选项。
2. **拆 HandleSelect**：选区状态归 HandleSelect（纯 observable），undo 参与归一个 `selectUndoSlice` effect。去掉构造时 register 的硬编码。
3. **处理 picker.ts**：要么删掉（如果 view 层有正版），要么修好 immui 占位。当前「坏代码 + 仍被订阅」是最差状态。
4. **哨兵值改 null**：`datumId/selectPageId` 等 `ID | ''` 改 `ID | null`。
5. **`HandleNode.deleteSelectedNodes` 等 schema 不变量加 assert**：删除前 assert node.parentId 唯一指向 parent。
6. **`HandlePage.pageSceneMatrix` 统一写入路径**：要么全 reaction 主动写，要么全 getSet 懒算，不要混。

---

## 小结

这一层的「领域动作 = transact + track」范式是漂亮的，也是 Sigma 把「用户意图」和「数据事务」对齐的正确方式。它的债不在范式，而在 **track 是手写的隐式 commit**（47 处靠纪律）+ **HandleSelect 把选区状态和 ClientUndo slice 绑死**。把 track 自动化、把 select 的 undo 参与抽成 effect，这一层会变得既清晰又可测。
