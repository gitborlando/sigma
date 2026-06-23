# YPlain 使用说明

`YPlain` 是一个围绕 `Y.Map` 的轻量状态层，用来把 Yjs 的 `Y.Map` / `Y.Array` 转成普通 JSON 状态，并提供类型安全的路径读写能力。

它适合这种场景：

- 数据的权威源在 `Y.Doc` 里。
- 业务代码希望用普通对象读取状态。
- 状态变化需要输出简单的 `add` / `remove` / `replace` patch。
- 写入时希望继续落到 Yjs，方便协同、undo 或远端同步。

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

`observe()` 负责监听 Yjs 变化，并把变化投影到 `plain.state`。

`subscribe()` 只注册本地回调，不会自动启动 Yjs 监听，所以通常需要和 `observe()` 一起使用。

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

这两个都会返回当前普通 JSON 镜像。

读取具体路径：

```ts
const title = plain.get(['title'])
const firstNodeName = plain.get(['nodes', 0, 'name'])
```

路径用数组表达：

- object key 使用 `string`
- array index 使用 `number`

如果给 `YPlain` 传了泛型，路径和值类型会跟着状态类型推导。

## 写入状态

### set

`set(path, value)` 用于新增或覆盖对象字段，也可以替换数组里的已有元素。

```ts
plain.set(['title'], 'New title')
plain.set(['nodes', 0, 'name'], 'Header')
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
})
```

如果路径指向数组本身，就追加到末尾：

```ts
plain.insert(['nodes'], {
  id: 'node-2',
  name: 'Footer',
})
```

数组下标必须是非负整数。大于数组长度时会按末尾处理。

### delete

`delete(path)` 删除对象字段或数组元素。

```ts
plain.delete(['title'])
plain.delete(['nodes', 0])
```

## 监听变化

监听回调收到的是 `YPlainChange`：

```ts
plain.subscribe(({ state, patches, transaction }) => {
  patches.forEach((patch) => {
    if (patch.type === 'add') {
      console.log('add', patch.keys, patch.value)
    }

    if (patch.type === 'remove') {
      console.log('remove', patch.keys, patch.oldValue)
    }

    if (patch.type === 'replace') {
      console.log('replace', patch.keys, patch.oldValue, patch.value)
    }
  })

  console.log(transaction.origin)
  console.log(state)
})
```

patch 的 `keys` 同样是路径数组。

如果需要展示成字符串，可以用：

```ts
import { joinYPlainPath } from '@gitborlando/y-plain'

joinYPlainPath(['nodes', 0, 'name'])
```

结果是：

```txt
nodes.0.name
```

## 访问原始 Yjs 值

`getY(path)` 可以拿到路径对应的原始 Yjs 值。

```ts
const yNodes = plain.getY(['nodes'])

if (yNodes instanceof Y.Array) {
  console.log(yNodes.length)
}
```

一般业务优先用 `set` / `replace` / `insert` / `delete`。只有需要调用 Yjs 原生 API 时才用 `getY`。

## 初始化语义

```ts
new YPlain(yMap)
```

不传 `initialState` 时，初始镜像来自 `yMap.toJSON()`。

```ts
new YPlain(yMap, initialState)
```

传入 `initialState` 时，会先把它写入 `yMap`，再生成普通 JSON 镜像。

如果 `initialState` 里包含不能序列化到 Yjs 的值，会抛出错误。

## 可序列化限制

当前支持：

- object
- array
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

`undefined` 在 object / array 转换时会被跳过，不能作为持久化值保存。

## 返回值约定

写入类 API 会返回 `boolean`：

- `true` 表示写入已进入 Yjs。
- `false` 表示路径不合法、目标类型不匹配，或值无法序列化。

常见失败情况：

```ts
plain.insert(['title'], 'x') // title 不是数组
plain.replace(['nodes', 100], node) // 下标不存在
plain.set(['nodes', 0, 'createdAt'], new Date()) // Date 不可序列化
```

## 使用建议

- 生命周期里只需要调用一次 `observe()`，多个订阅者用 `subscribe()` 即可。
- 写数组新增用 `insert()`，写对象字段或替换已有值用 `set()` / `replace()`。
- 业务层尽量读 `plain.state` 或 `plain.get()`，不要混用普通对象修改和 Yjs 原生修改。
- 需要协同 origin 时，把写入包在 `doc.transact(() => {}, origin)` 里，订阅回调可以从 `change.origin` 里拿到。
