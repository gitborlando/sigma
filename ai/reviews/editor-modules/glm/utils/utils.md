# utils 模块评价

评分：**6.0 / 10** —— 太薄，更像随手放的杂项目录，没有承担起「editor 内部领域纯函数」该有的角色。

涉及文件：`get.ts`(38) / `misc.ts`(38)

---

## 1. 意图

这个目录看名字像「editor 内部工具函数」，实际只有两个文件、76 行代码。它的隐含意图应该是：**放那些「不属于某个 service、但被多处复用的 editor 领域纯函数」**——主要是选区派生（get）和画布吸附/像素对齐（misc）。

---

## 2. 架构画像

- **`get.ts`**：选区派生函数。`getSelectIdMap/getSelectIdList/getSelectPageId/getAllSelectIdMap/getSelectedNodes`——全部是 `HandleSelect` + `YState` 的组合查询。
- **`misc.ts`**：画布小工具。`snapGridRound/snapGridRoundXY`（网格吸附）、`snapHalfPixel`（像素对齐）、`arrayLoopGet`（环形索引）、`expandOneStep`（按 step 扩展到网格边界）、`isNumberEqual`（浮点近似相等）、`TRBL` 类型。

---

## 3. 成立的部分

### 3.1 `get.ts` 把「选区派生查询」集中，避免散落

`getSelectIdList` 在 handle/operate/stage/command 几十处被调用。如果每个调用方都写 `HandleSelect.selectIdList.filter(id => YState.state[id])`，会有大量重复。集中成一个函数是对的：

```ts
export function getSelectIdList() {
  return HandleSelect.selectIdList.filter((id) => YState.state[id])
}
```

注意它还过滤了「已不存在的 id」，处理了「选区里有 id 但 schema 已删」的边界——这是一个有价值的派生语义（比直接暴露 selectIdList 更安全）。

### 3.2 `misc.ts` 的 `snapHalfPixel` 和 `expandOneStep` 是画布渲染的标准小工具

`snapHalfPixel`（`Math.round(n - 0.5) + 0.5`）让线条画在像素边界，避免 1px 线 anti-alias 模糊，是 Canvas 绘制的经典技巧。`grid.ts` 用它画网格线，正确。

`expandOneStep` 把任意坐标按 step 对齐到网格边界（`(n/step | 0 ± 1) * step`），用于 grid 计算「视口内可见的网格起点/终点」，方向对。

### 3.3 `isNumberEqual` 提供浮点近似比较

```ts
export function isNumberEqual(a, b, precision = 0.00001) {
  return Math.abs(a - b) < precision
}
```

对几何计算（matrix 变换后的坐标比较）是必要的。虽然全文搜索当前调用不多，但作为基础设施存在是合理的。

---

## 4. 问题与风险

### 4.1 这个目录「名不副实」，既不够通用也不够领域化 ⚠️

`utils` 这个名字在项目里已经有歧义：

- `app/web/src/utils/`（全局 utils：color/common/defu/disposer/global/misc/nick-name/signal-react/immut）
- `packages/sigma-utils/`（`@sigma/utils`：common/defu/index/storage/zod）
- `app/web/src/editor/utils/`（本目录：get/misc）

三个 utils 目录，职责边界不清。`editor/utils` 既不是「全局通用工具」（那是 `src/utils`），也不是「跨包工具」（那是 `packages/sigma-utils`），它更像是「editor 内部、但又不想放进某个 service 的东西」。

问题在于：**它太薄（76 行 2 文件），不足以称为一个「模块」**。`get.ts` 本质是 HandleSelect 的派生查询，更应该归到 `handle/select.ts` 作为它的 getter，或归到一个 `select-queries.ts`。`misc.ts` 的内容（吸附、像素对齐、环形索引）互相之间没有内聚性，是真正的「杂项」。

### 4.2 `get.ts` 强依赖 HandleSelect + YState 单例，不可测试

```ts
import { HandleSelect } from 'src/editor/handle/select'
import { YState } from 'src/editor/y-state/y-state'

export function getSelectIdList() {
  return HandleSelect.selectIdList.filter((id) => YState.state[id])
}
```

这些函数直接 import 全局单例，没法在不启动整个编辑器的情况下测试。如果想给 `getSelectIdList` 写单测（「选区有 3 个 id，其中 1 个不在 schema 里，应该返回 2 个」），必须先 mock HandleSelect 和 YState 两个单例。

更纯的写法是 `getSelectIdList(selectIdList, schema)`，但这又会让调用方变啰嗦。这是「便利 vs 纯净」的取舍——当前选了便利，代价是不可测。

### 4.3 `get.ts` 的 `getAllSelectIdMap` 用 reduce 拼对象，性能和可读性都差

```ts
export function getAllSelectIdMap() {
  return {
    ...HandleSelect.selectIdMap,
    ...Object.values(YClients.others).reduce((acc, client) => {
      return { ...acc, ...client.selectIdMap }
    }, {}),
  }
}
```

每调用一次就 spread 拼接所有 client 的选区，对「N 个协作者各选 M 个节点」是 O(N·M) 的对象创建。而且这个函数全文搜索**没有调用方**（可能是预留给「显示他人选区」的 UI），属于死代码。

### 4.4 `misc.ts` 的 `arrayLoopGet` 命名不直观且无调用

```ts
export function arrayLoopGet(arr, index) {
  const loopIndex = index < 0 ? arr.length - 1 : index >= arr.length ? 0 : index
  return arr[loopIndex]
}
```

「环形数组取值」叫 `arrayLoopGet` 不够直觉（更常见的命名是 `modIndex` / `wrapIndex` / `atMod`），而且只处理 ±1 越界，不支持 `index = arr.length + 5` 这种任意环绕。全文搜索也**没有调用方**，是死代码。

### 4.5 `snapGridRound` 直接读 `getEditorSetting()` 全局，把吸附耦合进纯函数

```ts
export function snapGridRound(value: number) {
  if (getEditorSetting().snapToGrid) return Math.round(value)
  return value
}
```

一个叫 `snapGridRound` 的纯函数，内部偷偷读全局 setting 决定要不要吸附。这让它的行为不可预测——调用方传 `snapGridRound(3.7)` 可能返回 4 也可能返回 3.7，取决于一个全局开关。更纯的写法是 `snapGridRound(value, enabled)`，由调用方传入是否启用，或在更高层（transformer/create）统一判断。

而且吸附用 `Math.round`（四舍五入到整数像素），没有「按 gridStep 吸附」（比如每 8px 一格），功能很弱。

### 4.6 `isNumberEqual` 全文几乎无调用，`snapGridRound` 的实现也太简单，说明这一层「有计划但没做完」

综合看，`misc.ts` 里有几个函数要么无调用（arrayLoopGet）、要么全局耦合（snapGridRound）、要么太简单（isNumberEqual）。这暗示**这个目录是「想到啥放啥」的临时堆放点**，而不是经过设计的领域工具集。

---

## 5. 方向建议

1. **重新定位这个目录**：要么提升成真正的「editor domain functions」（选区查询、吸附、坐标对齐、几何小工具），给它一个更有意义的名字（如 `editor/queries` + `editor/geometry-helpers`）；要么干脆解散——`get.ts` 的内容并入 `handle/select.ts`，`misc.ts` 的内容按主题分散到 `math/`（isNumberEqual）、`stage/`（snap）、`render/`（snapHalfPixel）。
2. **`get.ts` 改成可测的纯函数签名**：`getSelectIdList(selectIdList, schema)`，或在 HandleSelect 上提供 `get validSelectIdList()` getter（因为它本质是 select 的派生）。
3. **删死代码**：`getAllSelectIdMap`、`arrayLoopGet` 如无调用方直接删。
4. **`snapGridRound` 去全局耦合**：改成 `snapToGrid(value, gridStep, enabled)`，支持按 gridStep 吸附。
5. **和 `src/utils`、`packages/sigma-utils` 划清边界**：在 README 或目录注释里说明「editor/utils 只放 editor 内部领域函数，通用工具去 src/utils」。

---

## 小结

这一层严格说不算一个「模块」，更像是「editor 里放不下的小函数的抽屉」。它的内容（选区查询、吸附、像素对齐）都是有价值的，但因为太薄、命名含糊（utils）、函数风格不一（有的纯、有的读全局）、还混着死代码，它没有承担起「editor 领域纯函数集」的角色。要么把它做实（命名 + 纯化 + 补全），要么把它解散（内容归位到各自主模块）。当前状态是「有用但无组织」。
