# schema 模块评价

评分：**7.0 / 10** —— creator/helper/migration 三件套分工清晰，是 editor 里少有的「职责单一」模块；主要债在 traverse 有两套并存、creator 既当工厂又当遍历工具。

涉及文件：`creator.ts`(327) / `helper.ts`(224) / `migration.ts`(107)

---

## 1. 意图

这一层是**数据形状的权威定义点**：负责「schema 长什么样、怎么造一个合法的、怎么遍历它、怎么把旧版本升到新版本」。它本身不持有运行时状态（不存 schema），只提供**纯函数/工厂**给 `y-state`、`handle`、`operate`、`render` 调用。

作者把它从 `y-state`（运行时容器）里剥出来，是一个有意识的分层：**「形状定义」和「状态容器」分离**。

---

## 2. 架构画像

- **`creator.ts`**：`SchemaCreatorService`，是所有 schema 节点的工厂（`page/frame/rect/ellipse/polygon/star/line/text/irregular/image` + fill/stroke/shadow/outline 等子结构）。还提供 `clone`、`addToSchema`、`addChild`、`createNodeName`（带去重计数）。
- **`helper.ts`**：`SchemaHelper`（静态类），提供 schema 的**纯查询/遍历**：类型判断（`is/isById/isNode/isNodeParent`）、祖先/父子查询（`findAncestor/findParent/getChildren/getSceneMatrix/getForwardAccumulatedMatrix`）、以及两套遍历器工厂 `createTraverse` / `createTraverse2`。
- **`migration.ts`**：`migrationSchema(schema)`，按 `meta.version` 切片执行 `migrationList`，每个 migration 是 `{version, desc, transform(ctx)}`，通过 `createTraverse2` 遍历整棵树应用变换。

---

## 3. 成立的部分

### 3.1 「工厂集中 + 遍历集中 + 迁移集中」的三件套，分工是对的

这三件事本质上是同一类「schema 形状知识」，集中在一起合理：

- 造节点要知道字段默认值（creator）；
- 查询/遍历要知道树结构（helper）；
- 升级要知道历史字段差异（migration）。

而且它们都是**纯函数/无状态**，不持有 schema 实例，调用方（主要是 `YState`/`HandleNode`）负责持有。这让 schema 模块可以被单测、可以在 mock 里复用（`editor/mock/*` 就是直接调 creator 造测试 schema）。

### 3.2 `migrationList` 用 `satisfies Migration[]` + version 序号，方向专业

```ts
const migrationList = [
  { version: 0, desc: '...新增 matrix...', transform: (ctx) => {...} },
  { version: 1, desc: '...rect...', transform: ... },
  { version: 2, desc: '...flip...', transform: ... },
] satisfies Migration[]
```

`migrationSchema` 用 `migrationList.slice(version)` 取「从当前版本之后的所有迁移」，依次 apply，最后把 `meta.version` 设为 `migrationList.length`。这是标准的「线性版本迁移」模型，比「if version===0 ... else if ...」干净得多，新增迁移只要往数组末尾加一项。

`transform(ctx)` 收到的是 `SchemaTraverseContext`（item/parent/ancestors/schema），能在遍历中拿到父子关系，这对「migration 要同时改 node 和它的 childIds 引用」这类需求是必要的。

### 3.3 creator 的默认值用 `defuOverrideArray` 处理「覆盖但数组要替换不合并」

`text()` 里用 `defuOverrideArray(option, defaults)`，这是项目自己写的 defu 变体——默认值合并，但**数组整体替换而非深合并**。对 fills/strokes 这种「用户传了就整个替换」的语义是正确的（普通 deepmerge 会把数组按下标合并，导致脏数据）。

### 3.4 `createNodeName` 带去重计数，避免重名

```ts
private nodeNameCache = createCache<string, number>()
createNodeName(type) {
  const index = this.nodeNameCache.getSet(type, () => 0)
  this.nodeNameCache.set(type, index + 1)
  return `${t(type)} ${index + 1}`
}
```

让「矩形 1 / 矩形 2」不重名，是个小但贴心的细节。不过见 4.4，它有共享状态隐患。

---

## 4. 问题与风险

### 4.1 `createTraverse` 和 `createTraverse2` 两套并存，是明显的债 ⚠️

`helper.ts` 里有两套遍历器：

- **`createTraverse({callback, bubbleCallback, getNode})`**：闭包共享一个 `abort` controller，ctx 是 `SchemaUtilTraverseData`（`id/node/index/depth/childIds/parent/ancestors/abort/forwardRef/[key: string]: any`）。被 `handle/node.ts`（delete/paste）、`stage/interact/select.ts` 用。
- **`createTraverse2<ExtendCtx>({schema, enter, leave})`**：显式传 schema，ctx 是 `SchemaTraverseContext`（`schema/item/index/depth/forwardCtx/parent/ancestors/stopped/stopPropagation` + ExtendCtx）。被 `migration.ts`、`stage/interact/select.ts`（marquee）用。

两者的 ctx 类型不同、终止机制不同（`abort.signal` vs `stopPropagation` + `stopped` 标志）、回调形状不同（`callback/bubbleCallback` vs `enter/leave`）、`getNode` 来源不同（默认 `YState.find` vs 显式 `schema[id]`）。

这是典型的「第二套是为了修第一套的某个痛点（比如要纯函数、不依赖 YState），但第一套没下线」。结果：

- 读代码的人不知道新代码该用哪套；
- `select.ts` 一个文件里**同时用了两套**（`onMarqueeSelect` 用 traverse2，其他地方隐式依赖）；
- 两套的 `ancestors` 语义还不一样（traverse1 是 `forwardRef.ancestors + forwardRef.id`，traverse2 是 `forwardCtx.ancestors` 然后 push parent）。

> 应该统一到 traverse2（纯函数、显式 schema、enter/leave 更标准），把 traverse1 的调用点改过来下线。abort 机制可以用 traverse2 的 `stopPropagation` + 在外层 throw/flag 替代。

### 4.2 `SchemaHelper.isById` 强依赖 `YState`，破坏了「helper 是纯函数」的定位

```ts
static isById(id, type) {
  if (type === 'nodeParent') return ['page','frame','group'].includes(YState.find(id).type)
  return YState.find(id).type === type
}
```

helper 大部分方法是纯的（`is/isNode/isNodeParent` 只看对象形状），但 `isById/isFirstLayerFrame/getChildren/findAncestor/findParent/getSceneMatrix/getForwardAccumulatedMatrix/getPageChildIds` 都直接调 `YState.find`。这让 helper **没法在不持有 YState 的上下文里复用**（比如 migration 用的是 `schema[id]` 而不是 YState，所以 migration 用的 traverse2 传了显式 getNode）。

这正是 4.1 两套 traverse 并存的根因：traverse1 默认 `getNode = YState.find`，traverse2 显式 `schema[id]`。如果 helper 全部改成「显式传 schema 或 getNode」，两套就能合并。

### 4.3 `creator.ts` 的 `addToSchema/addChild/clone` 混进了「树操作」，越界了

`SchemaCreator` 顾名思义应该是「造节点」，但它还有：

- `addToSchema(schema, item)`：往 schema 对象塞一项；
- `addChild(parent, child)`：push childIds + 设 parentId；
- `clone(item, option)`：深拷贝 + 换 id + 换名 + 清 childIds。

这些是**树/集合操作**，不是「造单个节点」。它们和 `HandleNode.insertChildAt/removeChild` 的职责重叠（一个改裸 schema 对象，一个走 YState）。结果就是 mock 代码（`mock/transfrom.ts`）用 `addToSchema + addChild` 直接拼 schema，而运行时代码用 `HandleNode.addNodes + insertChildAt` 走 YState——**两条路径构造树，行为不一致**（mock 不经过 normalize/normalizeInsertPath，YState 会）。

> 树操作应该归到一个 `SchemaTreeOps`（纯函数，操作裸 schema），creator 只管「造单个节点」。或者更彻底：mock 也走 creator + tree ops，不要有「直接 push childIds」的第三条路。

### 4.4 `createNodeName` 的计数器是 creator 单例上的可变状态，跨 schema 不隔离

`nodeNameCache` 是 `SchemaCreatorService` 实例成员，而 `SchemaCreator` 是全局单例。这意味着：

- 第一次打开文件 A，造了「矩形 1/2/3」，计数到 3；
- 关闭 A 打开文件 B，再造矩形，会得到「矩形 4」而不是「矩形 1」。

对单文件编辑器问题不大，但一旦做多文件/多 tab，名字会越来越离谱。计数应该按 schema 实例（或按 fileId）隔离，而不是挂在全局单例上。

### 4.5 migration 的 `version` 字段冗余且 `slice` 用法依赖数组下标对齐

```ts
const version = schema?.meta?.version // 例如 1
const migrations = migrationList.slice(version) // 取 version=1 之后
```

这里 `migrationList[i].version` 必须严格等于 `i`（数组下标），否则 slice 会错位。当前的 `satisfies Migration[]` 没法在类型层保证这一点。而且 `version` 字段是冗余的（数组下标已经是 version）。更稳的写法是去掉 `version` 字段，纯靠数组下标，并在 `migrationSchema` 开头 `assert(migrationList.length === expectedMaxVersion)`。

### 4.6 `creator.image()` 的返回类型标注是 `S.Rectangle` 但语义是图片

```ts
image(option?: Partial<S.Rectangle>): S.Rectangle {
  const rect = this.rect(option)
  rect.fills.push(this.fillImage(''))
  return rect
}
```

图片在 schema 里没有独立类型，是「rect + image fill」。这个设计本身可以接受（Figma 也是 image fill），但类型签名 `S.Rectangle` 会让调用方以为它是个普通矩形。建议要么返回 `S.Image`（如果有），要么至少改签名让「这是带图填充的 rect」显式。

---

## 5. 方向建议

1. **合并两套 traverse**：以 traverse2（纯函数 + 显式 schema + enter/leave + stopPropagation）为准，把 traverse1 的调用点（`handle/node.ts` delete/paste、select 部分）改写过来，下线 traverse1。
2. **helper 去掉对 YState 的硬依赖**：所有 `isById/getChildren/findAncestor/getSceneMatrix` 改成显式接收 `schema` 或 `getNode`。这一步做完，4.1 自然成立。
3. **拆分 creator 的职责**：`addToSchema/addChild/clone` 移到独立的 `SchemaTreeOps`（纯函数），creator 只造单节点。
4. **`createNodeName` 计数按 schema 隔离**，不要挂在全局单例。
5. **migration 去掉冗余 version 字段**，靠数组下标，并在入口 assert 长度。
6. **补 migration 单测**：每个 migration 至少一个「旧 schema → 新 schema」的快照测试，防止改 migration 时回归。

---

## 小结

这一层是 editor 里**职责最纯粹、最接近「做对了」的模块**：形状知识集中、迁移模型专业、工厂默认值处理细致。它的债几乎全部集中在「traverse 两套并存」这一个历史决策上，而这个决策的根因又是「helper 偷偷依赖 YState 导致没法纯函数复用」。把 YState 依赖拿掉、traverse 合并，这一层会非常干净。
