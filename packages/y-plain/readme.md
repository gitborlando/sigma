# YPlain 使用说明

`YPlain` 是一个围绕 `Y.Map` 的轻量状态层，用来把 Yjs 中的 `Y.Map` / `Y.Array` 投影成普通 plain state，并提供类型安全的路径读写、事务合并通知和简单 patch 输出。

它适合这种场景：

- 数据的权威源在 `Y.Doc` 里。
- 业务代码希望读取普通对象，而不是到处操作 Yjs 类型。
- 写入仍然要落到 Yjs，方便协同、undo 或远端同步。
- 状态变化需要输出简单的 `add` / `remove` / `replace` patch。

## 安装

`yjs` 是 peer dependency，使用方需要自行安装：

```bash
pnpm add @gitborlando/y-plain yjs
```

## 基本用法

```ts
import * as Y from 'yjs'
import { YPlain } from '@gitborlando/y-plain'

type State = {
  title: string
  nodes: {
    id: string
    name: string
    flags: string[]
  }[]
}

const doc = new Y.Doc()
const yMap = doc.getMap('state')

const plain = new YPlain<State>(yMap, {
  title: 'Untitled',
  nodes: [],
})

const disposeObserve = plain.observe()
const disposeSubscribe = plain.subscribe(({ state, patches, origin }) => {
  console.log(state)
  console.log(patches)
  console.log(origin)
})
```

`subscribe()` 注册 plain change 回调。通过 `YPlain` 自己的 `set` / `replace` / `insert` / `delete` / `setState` 写入时，会自动通知订阅者。

`observe()` 负责监听外部 Yjs 变化，并把这些变化投影到 `plain.state`。如果你的代码会直接操作 `yMap`、`Y.Array`，或者会收到远端协同更新，通常需要调用一次 `observe()`。

组件或 service 销毁时要释放：

```ts
disposeSubscribe()
disposeObserve()
```

## 读取状态

```ts
plain.state
plain.getState()
```

这两个都会先 flush 本地 pending projection，然后返回当前 plain state 镜像。返回值不是 deep clone，不要直接 mutate：

```ts
// 不推荐
plain.state.title = 'Changed outside YPlain'

// 推荐
plain.set(['title'], 'Changed through YPlain')
```

读取具体路径：

```ts
const title = plain.get(['title'])
const firstNodeName = plain.get(['nodes', 0, 'name'])
```

路径用数组表达：

- object key 使用 `string`
- array index 使用非负整数 `number`
- `__proto__` / `prototype` / `constructor` 会被视为非法 key

如果给 `YPlain` 传了泛型，路径和值类型会跟着状态类型推导。

## 写入状态

### set

`set(path, value)` 用于新增或覆盖对象字段，也可以替换数组里的已有元素。

```ts
plain.set(['title'], 'New title')
plain.set(['nodes', 0, 'name'], 'Header')
plain.set(['nodes', 0, 'flags'], ['selected'])
```

当 `value` 是 `undefined` 时，`set` 会退化成删除：

```ts
plain.set(['title'], undefined)
```

### replace

`replace(path, value)` 只替换已经存在的位置。

```ts
plain.replace(['nodes', 0, 'name'], 'Footer')
```

如果目标字段或数组下标不存在，会返回 `false`。

传入 `undefined` 时会删除已存在的值：

```ts
plain.replace(['nodes', 0], undefined)
```

### insert

`insert(path, value)` 只用于数组。

如果路径最后一段是数字，就插入到指定下标：

```ts
plain.insert(['nodes', 0], {
  id: 'node-1',
  name: 'Header',
  flags: [],
})
```

如果路径指向数组本身，就追加到末尾：

```ts
plain.insert(['nodes'], {
  id: 'node-2',
  name: 'Footer',
  flags: [],
})
```

数组下标必须是非负整数。大于数组长度时会按末尾处理。

### delete

`delete(path)` 删除对象字段或数组元素。

```ts
plain.delete(['title'])
plain.delete(['nodes', 0])
```

### setState

`setState(state)` 用一个新的根对象替换当前 `Y.Map` 内容，并返回 `boolean`。

```ts
plain.setState({
  title: 'Imported',
  nodes: [{ id: 'node-1', name: 'Header', flags: [] }],
})
```

`setState` 产生的 patch 是根对象下的 top-level diff。也就是说，嵌套对象变化会表现为对应顶层 key 的 `replace`，不会递归拆成每个深层字段的 patch。

### transact

`transact(fn)` 或 `transact(origin, fn)` 用于把多次写入合并到同一个 Yjs transaction 和同一次通知里，适合一次业务动作拆到多个函数里执行的场景。

```ts
plain.transact('user-action', () => {
  plain.set(['title'], 'New title')
  plain.insert(['nodes'], {
    id: 'node-1',
    name: 'Header',
    flags: [],
  })
})
```

`origin` 会透传到订阅回调里的 `change.origin`。如果传入 `YPlain` 的 `Y.Map` 没有绑定到 `Y.Doc`，`transact()` 会直接执行回调，但仍会合并 YPlain 自己的通知。

## 监听变化

监听回调收到的是 `YPlainChange`：

```ts
plain.subscribe(({ state, patches, origin, transaction }) => {
  patches.forEach((patch) => {
    if (patch.type === 'add') {
      console.log('add', patch.keys, patch.value)
      return
    }

    if (patch.type === 'remove') {
      console.log('remove', patch.keys, patch.oldValue)
      return
    }

    console.log('replace', patch.keys, patch.oldValue, patch.value)
  })

  console.log(origin)
  console.log(transaction?.origin)
  console.log(state)
})
```

patch 的 `keys` 同样是路径数组。`add` patch 不带 `oldValue`，`remove` patch 不带 `value`，`replace` patch 同时带 `oldValue` 和 `value`。

如果需要展示成字符串，可以用：

```ts
import { joinYPlainPath } from '@gitborlando/y-plain'

joinYPlainPath(['nodes', 0, 'name'])
```

结果是：

```txt
nodes.0.name
```

如果某个 listener 抛错，YPlain 会继续调用同一轮通知里的其他 listener，并在最后重新抛出错误。事务相关的内部 pending 状态会在 `finally` 中清理。

## 访问原始 Yjs 值

`getY(path)` 可以拿到路径对应的原始 Yjs 值。

```ts
const yNodes = plain.getY(['nodes'])

if (yNodes instanceof Y.Array) {
  console.log(yNodes.length)
}
```

一般业务优先用 `set` / `replace` / `insert` / `delete`。只有需要调用 Yjs 原生 API 时才用 `getY`。

外部直接修改 `Y.Map` / `Y.Array` 时，确保已经调用 `observe()`，这样变化才会投影到 `plain.state` 并通知订阅者。

```ts
const yNodes = plain.getY(['nodes'])

if (yNodes instanceof Y.Array) {
  doc.transact(() => {
    yNodes.insert(0, [{ id: 'node-1', name: 'Remote', flags: [] }])
  }, 'remote')
}
```

## 初始化语义

```ts
new YPlain(yMap)
```

不传 `initialState` 时，初始镜像来自当前 `yMap` 内容。`yMap` 内部只能包含 `Y.Map` / `Y.Array` / primitive；如果包含 `Y.Text` 等其他 `Y.AbstractType`，会抛出不可序列化错误。

```ts
new YPlain(yMap, initialState)
```

传入 `initialState` 时，会先把它写入 `yMap`，再生成 plain state 镜像。

如果 `initialState` 不是 plain object，或里面包含不能序列化到 Yjs 的值，会抛出错误。

## 可序列化限制

当前支持：

- plain object
- dense array
- string
- number
- boolean
- null

当前不支持：

- function
- Date
- RegExp
- Map
- Set
- symbol
- bigint
- undefined 作为实际值
- sparse array
- class instance / 非 plain object
- `Y.Text` 等非 `Y.Map` / `Y.Array` 的 `Y.AbstractType`

对象 key 不能是：

- `__proto__`
- `prototype`
- `constructor`

注意：`undefined` 只在 `set(path, undefined)` 或 `replace(path, undefined)` 中表示删除。作为 object 字段值或 array 元素值时，写入会失败。

## 返回值约定

写入类 API 会返回 `boolean`：

- `true` 表示写入已进入 Yjs。
- `false` 表示路径不合法、目标类型不匹配，或值无法序列化。

常见失败情况：

```ts
plain.insert(['title'], 'x') // title 不是数组
plain.replace(['nodes', 100], node) // 下标不存在
plain.set(['nodes', 0, 'createdAt'], new Date()) // Date 不可序列化
plain.set(['nodes'], [, node] as any) // sparse array 不可序列化
plain.set(['__proto__'] as any, 'x') // unsafe key 不可写入
```

## Playground

仓库内有一个更完整的示例：

```bash
pnpm --filter @gitborlando/y-plain playground
```

示例覆盖嵌套对象、id-keyed records、数组插入、深层 replace、事务合并通知、外部 Yjs mutation 和非法写入返回值。

## 使用建议

- 生命周期里通常只需要调用一次 `observe()`，多个订阅者用 `subscribe()` 即可。
- 写数组新增用 `insert()`，写对象字段或替换已有值用 `set()` / `replace()`。
- 业务层尽量读 `plain.state` 或 `plain.get()`，不要直接 mutate 返回的 plain object。
- 需要协同 origin 或合并多次写入时，把写入包在 `plain.transact(origin, () => {})` 里，订阅回调可以从 `change.origin` 里拿到。
