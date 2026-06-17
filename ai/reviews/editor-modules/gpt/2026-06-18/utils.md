# utils 模块 review

范围：`apps/web/src/editor/utils`

## 模块意图

`utils` 提供 editor 内部的小工具：

- `get.ts`：读取当前选择、当前 page、跨 client selection、选中节点。
- `misc.ts`：snap、半像素、循环数组、扩展刻度、数字近似相等。

这些工具当前主要服务 stage、operate、handle。

## 架构评价

### 优点

- `get.ts` 把常用 selection 查询集中起来，减少各模块重复写 `HandleSelect + YState`。
- `getSelectIdList()` 会过滤掉已经不存在于 `YState.state` 的 id，能减少删除节点后的悬挂选区问题。
- `misc.ts` 小函数都比较直接，适合作为编辑器内部工具。
- `snapGridRoundXY()` 统一读取 editor setting，调用方不用关心 snapToGrid 开关。

### 主要问题

#### 1. `get.ts` 是全局 selector，不是纯 utils

`get.ts` 直接依赖：

- `HandleSelect`
- `YClients`
- `YState`

所以它其实是 runtime selector。命名为 utils 容易让依赖方向变得不明显。

建议改名或移动概念位置，例如：

- `editor/selectors`
- `editor/query`
- `handle/selectors`

至少在文档里标明它依赖全局运行时状态。

#### 2. `getAllSelectIdMap()` 每次 reduce 都创建新对象

```ts
Object.values(YClients.others).reduce((acc, client) => {
  return { ...acc, ...client.selectIdMap }
}, {})
```

client 数量少时无所谓，但这个写法是 O(n \* mapSize) 的对象复制。可以改为一个 mutable accumulator，更直接。

#### 3. `getSelectedNodes()` 没有二次过滤 undefined

`getSelectIdList()` 已经过滤 `YState.state[id]`，正常够用。但协同/patch 过程中如果 state 变化，`YState.find()` 仍可能返回 undefined。作为底层 selector，可以更稳一点过滤 `SchemaHelper.isNode`。

#### 4. `snapGridRound()` 的命名和行为偏窄

当前 snap grid 只是 `Math.round(value)`，也就是按 1 scene unit 对齐。未来如果 grid step 可配置，这个函数签名需要扩展。

建议现在就改成接受 step 或读取 setting 里的 gridSize。

#### 5. `expandOneStep()` 用 bitwise 截断，对负数小数不稳定

```ts
const n = (number / step) | 0
```

`| 0` 是向 0 截断，不是 floor。对于负坐标会和预期网格扩展不一致。

例子：`-0.2 | 0` 得到 `0`，但向左扩展通常希望落到 `-1`。

建议改成：

- left 用 `Math.floor(number / step) - 1`
- right 用 `Math.ceil(number / step) + 1`

#### 6. `arrayLoopGet()` 只处理越界一步

如果 index 是 `arr.length + 5` 或 `-5`，当前只会回到 0 或最后一个，不是真正 modulo。若调用方只会传相邻 index，可以接受；否则建议改成标准 modulo。

## 文件级评价

### `get.ts`

使用价值高，但命名上不应被看作普通 utils。它是 editor runtime selectors。建议未来统一和 `SchemaHelper` 的查询能力边界。

### `misc.ts`

小工具清楚，但 `expandOneStep()` 对负数是实际风险。grid/ruler 会经常在负坐标下工作，建议优先修。

## 建议优先级

1. 修 `expandOneStep()` 负数行为。
2. 把 `get.ts` 定位为 selectors/query，而不是纯 utils。
3. 为 snap grid 预留 grid size。
4. 简化 `getAllSelectIdMap()` 的对象合并。
