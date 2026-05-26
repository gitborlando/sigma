# Y.Doc 作为唯一运行时源的会话纪要

## 背景

当前项目状态层大致是：

```txt
业务代码 -> Immut 普通对象 -> patch -> Y.Map/Y.Array -> observeDeep -> 回写 Immut
```

这个模式能让业务层主要操作普通对象，同时保留 Yjs 协同能力。但它存在双源问题：`immut.state` 和 `Y.Doc` 都像状态源，容易出现初始化抢写、订阅残留、undo 边界不清晰、局部更新回环等问题。

数据库和 mock 当前都是 JSON 格式。这不阻碍让 `Y.Doc` 成为运行时唯一源，因为 JSON 可以继续作为导入、导出和持久化格式。

## 核心结论

推荐把职责改成：

```txt
JSON/mock/database snapshot -> import once into Y.Doc
Y.Doc -> observeDeep event -> Immut projection -> render subscribers
业务操作 -> YState.set/insert/delete -> directly write Y.Doc
保存 -> Y.Doc.toJSON() -> JSON 入库
```

也就是说：

- `Y.Doc` 是编辑器运行时唯一权威源。
- `Immut` 仍然存在，但只作为渲染所需的不可变投影缓存。
- JSON 仍然存在，但只作为持久化、导入导出、mock 的格式。
- 不需要每次 `Y.Doc.toJSON()` 驱动渲染。
- 不需要做全量 JSON diff 来生成新的 model。

## 为什么不需要 JSON diff

Yjs 没有通用的 “JSON A diff JSON B” API。Yjs 的 diff 是 CRDT update 层面的：

```ts
const update = Y.encodeStateAsUpdate(doc)
Y.applyUpdate(otherDoc, update)

const stateVector = Y.encodeStateVector(remoteDoc)
const diffUpdate = Y.encodeStateAsUpdate(localDoc, stateVector)
```

这解决的是：

```txt
Y.Doc A 和 Y.Doc B 之间差哪些 CRDT updates
```

不是：

```txt
JSON A 和 JSON B 差哪些字段
```

但运行时不可变渲染也不该依赖 JSON diff。真正的增量来源应该是 Yjs event：

```txt
Y.Map event.changes.keys
Y.Array event.changes.delta
event.path
```

这些 event 就是 `Y.Doc -> Immut projection` 的 diff 来源。

## 推荐架构

### 初始化

```txt
new Y.Doc
连接 provider，等待远端同步完成
如果远端 schemaMap 为空，才把数据库/mock JSON import 到 Y.Doc
如果远端 schemaMap 不为空，以远端 Y.Doc 为准
从 Y.Doc 初始化 Immut projection
observeDeep 后续更新
```

伪代码：

```ts
class YStateService {
  doc!: Y.Doc
  schemaMap!: Y.Map<any>
  immut = new Immut(<S.Schema>{})

  async initSchema(fileId: string, jsonSchema?: S.Schema) {
    this.dispose()

    this.doc = new Y.Doc()
    this.schemaMap = this.doc.getMap('schema')

    // 如果启用协作，应先连接并等待远端同步完成。
    // await YSync.init(fileId, this.doc)

    if (this.schemaMap.size === 0 && jsonSchema) {
      this.doc.transact(() => {
        importJsonToYMap(this.schemaMap, jsonSchema)
      }, 'import-json')
    }

    this.immut.state = this.schemaMap.toJSON() as S.Schema
    this.unSub = observeYToImmut(this.schemaMap, this.immut)

    YUndo.initStateUndo(this.schemaMap)
  }

  get state() {
    return this.immut.state
  }

  saveJson() {
    return this.schemaMap.toJSON() as S.Schema
  }
}
```

### 写入

业务层不再直接写 `immut`，而是通过 `YState` 直接写 `Y.Doc`：

```ts
set(path: string, value: unknown) {
  this.doc.transact(() => {
    const { parent, key } = getYParent(this.schemaMap, path)

    if (parent instanceof Y.Map) {
      parent.set(String(key), toYValue(value))
      return
    }

    if (parent instanceof Y.Array) {
      const index = Number(key)
      parent.delete(index, 1)
      parent.insert(index, [toYValue(value)])
    }
  }, 'local-edit')
}
```

本地编辑也通过 `observeDeep` 回写 `immut`，保证所有 model 更新只有一条路径：

```txt
Y.Doc observeDeep -> ImmutPatch -> Immut.next() -> render
```

### 投影

当前 `apps/web/src/utils/immut/immut-y.ts` 里的 `subscribeY` 已经接近需要的投影器。后续可以把它抽成：

```txt
y-to-immut.ts
json-to-y.ts
```

`Y.Map` 事件转 Immut：

```ts
event.changes.keys.forEach((change, key) => {
  const path = event.path.concat(key).join('.')

  if (change.action === 'delete') {
    immut.delete(path)
    return
  }

  const value = toJSON(parentYMap.get(key))
  immut.set(path, value)
})
```

`Y.Array` 事件转 Immut：

```ts
let retain = 0

event.changes.delta.forEach((item) => {
  if (item.retain) retain += item.retain

  if (item.delete) {
    immut.delete(path.concat(retain).join('.'))
  }

  if (item.insert) {
    item.insert.forEach((value, index) => {
      immut.insert(path.concat(retain + index).join('.'), toJSON(value))
    })
    retain += item.insert.length
  }
})
```

注意：这里的 `toJSON` 是对变更的局部 Yjs 值做转换，不是对整个 `Y.Doc` 做全量 `toJSON()`。

## 当前实现里优先修的点

1. `bind()` 返回的 disposer 需要保存并在切换文件时释放。
2. 初始化时不能在远端 Y.Doc 已有内容的情况下强行灌本地 JSON。
3. 去掉或禁用 `Immut -> Yjs` 的订阅链路，让写入统一走 `YState.set/insert/delete`。
4. 修正数组插入时没有 `toYValue` 的问题。
5. 修正 `toYValue` 对数组过滤 `null` 导致下标语义变化的问题。
6. 高频拖拽不要每帧提交大对象；只更新局部字段，必要时 preview 走临时状态或 awareness。
7. 收敛 `YState.next()` 和 `YUndo.track()` 的调用顺序，最终封装成 `YState.transact()`。

## 迁移顺序建议

第一步，小修：

- 保存并释放 `bind()` disposer。
- 修 `Y.Array.insert` 时没有走 `toYValue`。
- 修数组 import 时过滤 `null` 的行为。

第二步，拆绑定逻辑：

- 把 `immut-y.ts` 拆成 `json-to-y.ts` 和 `y-to-immut.ts`。
- 保留 `Y.Doc -> Immut`。
- 去掉 `Immut -> Y.Doc`。

第三步，改写入口：

- `YState.set`
- `YState.insert`
- `YState.delete`
- `YState.applyImmerPatches`

这些方法直接写 `Y.Doc`，不直接写 `immut`。

第四步，收敛事务：

```ts
YState.transact({ undo: 'state', description }, () => {
  YState.set(...)
  YState.insert(...)
})
```

内部统一处理：

- `doc.transact`
- Yjs 写入
- observe 回写 Immut
- undo capture
- patch flush

第五步，保存：

```ts
const schema = YState.saveJson()
```

短期仍然保存 JSON。中长期可以同时保存：

- JSON snapshot，用于兼容、导出、索引。
- Yjs update binary，用于协作恢复和增量同步。

## 最终目标

最终状态应当是：

```txt
Y.Doc: runtime source of truth
Immut: immutable render projection
JSON: import/export/persistence snapshot
Awareness: cursor/selection/preview collaboration state
Y.UndoManager: document undo source
```

这样既保留当前不可变驱动渲染的优势，也避免 `immut.state` 和 `Y.Doc` 双源同步带来的复杂度。
