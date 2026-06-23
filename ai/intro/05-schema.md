# 05 · 数据模型 Schema

这一篇讲清楚 Sigma 的数据「长什么样」。Schema 是整个编辑器的唯一真相源，理解它是理解一切的前提。

---

## 总体结构

一个 Sigma 设计文件就是一棵 **Schema 树**，扁平地存在一个对象里：

```ts
type Schema = {
  meta: Meta // 文件元信息
  [id: string]: SchemaItem // 所有节点，按 id 索引
}
```

**关键设计：扁平字典 + parentId/childIds 双向引用**，而不是嵌套树。例如：

```jsonc
{
  "meta": {
    "type": "meta", "id": "meta",
    "fileId": "abc", "name": "我的设计",
    "pageIds": ["page_a"], "version": 3
  },
  "page_a": {
    "type": "page", "id": "page_a",
    "name": "Page 1",
    "childIds": ["frame_b"]
  },
  "frame_b": {
    "type": "frame", "id": "frame_b",
    "parentId": "page_a",
    "childIds": ["rect_c"],
    "width": 400, "height": 300, "matrix": {...},
    "radius": 0, "fills": [...], "strokes": [], "shadows": []
  },
  "rect_c": {
    "type": "rect", "id": "rect_c",
    "parentId": "frame_b",
    "width": 100, "height": 100, "matrix": {...},
    "fills": [{ "type": "color", "color": "#ff0000", "visible": true, "alpha": 1 }],
    "strokes": [], "shadows": []
  }
}
```

为什么用扁平字典而不是嵌套树？

- **Yjs 友好**：CRDT 按路径同步，扁平结构改动局部、冲突小。
- **O(1) 查找**：知道 id 直接 `schema[id]`，不用遍历。
- **移动层级简单**：只改 `parentId` 和两个 `childIds` 数组，不用搬整棵子树。

---

## 节点类型层级

类型定义在 `types/schema/schema-v2.d.ts`（`S2` 命名空间），通过 `types/schema/schema.d.ts` 重新导出为 `S`。

```
SchemaItem
├── Meta                      // 文件元信息（特殊，不算节点）
├── Page                      // 页面（容器）
└── Node                      // ★ 所有可视节点
    ├── NodeParent            // 可包含子节点的
    │   ├── Frame             // 画板（有圆角、可裁剪）
    │   └── Group             // 编组
    └── Vector / Text         // 叶子节点
        ├── Rectangle         // 矩形（rect）
        ├── Ellipse           // 椭圆（可扇形、可环）
        ├── Polygon           // 正多边形
        ├── Star              // 星形
        ├── Line              // 直线
        ├── Path              // 自由路径（irregular）
        └── Text              // 文字
```

注意：

- **`type` 字段是判别联合的 tag**。比如 Rectangle 的 `type: 'rect'`，Ellipse 是 `type: 'ellipse'`。代码里到处用 `node.type === 'rect'` 做分支。
- **Page 不是 Node**（没有 `__isNode`，没有几何属性），它是顶层容器。
- **Frame 和 Group 可以有子节点**（`NodeParentBase.childIds`），其他节点都是叶子。

---

## 节点的属性组成

一个典型可视节点（Node）由这几部分属性组合而成：

```ts
type NodeBase = NodeMeta & NodeEffect & MRect & S1.OBBInfo
```

拆开看：

### 1. `NodeMeta` —— 元信息

```ts
{
  id: string
  name: string // 图层名
  lock: boolean // 锁定
  visible: boolean // 隐藏
  parentId: string // 父节点 id
  __isNode: true // 类型守卫标记
}
```

### 2. `NodeEffect` —— 视觉效果

```ts
{
  opacity: number                  // 不透明度 0~1
  flip: 0 | 1 | 2 | 3              // 翻转：0无/1水平/2垂直/3双向
  fills: Fill[]                    // 填充（可多个叠加）
  strokes: Stroke[]                // 描边
  blurs: any[]                     // 模糊
  shadows: Shadow[]                // 阴影
  outline?: Outline                // 轮廓（选中时显示）
}
```

### 3. `MRect` —— 几何（核心）

```ts
{
  width: number
  height: number
  matrix: IMatrix // { a, b, c, d, tx, ty }  2D 仿射矩阵
}
```

**Sigma 用 `width/height + matrix` 表示节点的几何，而不是 `x/y/rotation/scale`**。这是关键设计：

- `matrix` 是一个 2D 仿射矩阵（6 个数），能表达「平移 + 旋转 + 缩放 + 倾斜」任意组合。
- 节点的本地坐标系原点在左上角，`width × height` 是未变换的尺寸。
- 渲染时 `globalMatrix = parent.globalMatrix × node.matrix`（递归相乘），得到世界坐标。

> 类型 `IMatrix` 来自 `editor/geometry/matrix.ts`，`MRect` 类提供 `.xy`、`.rotation`、`.center`、`.vertices`、`.aabb` 等派生量的缓存计算。

### 4. 类型特有属性

每种节点还有自己的专属字段：

| 节点      | type          | 特有字段                                                                  |
| --------- | ------------- | ------------------------------------------------------------------------- |
| Frame     | `'frame'`     | `radius`（圆角）+ `childIds`                                              |
| Group     | `'group'`     | `childIds`                                                                |
| Rectangle | `'rect'`      | `radius` + `points`（路径点）                                             |
| Ellipse   | `'ellipse'`   | `innerRate`（内径，做环形）、`startAngle`、`endAngle`（做扇形）+ `points` |
| Polygon   | `'polygon'`   | `sides`（边数）、`radius` + `points`                                      |
| Star      | `'star'`      | `pointCount`（角数）、`radius`、`innerRate` + `points`                    |
| Line      | `'line'`      | `points`                                                                  |
| Path      | `'irregular'` | `points`（自由编辑的点）                                                  |
| Text      | `'text'`      | `content`、`style`（字体/字号/行高/对齐...）                              |

### 5. `points` —— 路径点（Vector 类节点）

矩形、椭圆、多边形等「矢量」节点除了 `width/height/matrix`，还维护一个 `points` 数组：

```ts
type Point = {
  id: string
  type: 'point'
  symmetric: 'angle' | 'complete' | 'none' // 控制点对称方式
  x: number
  y: number // 在节点本地坐标系的位置
  radius: number
  in?: IXY // 入控制点（贝塞尔）
  out?: IXY // 出控制点（贝塞尔）
  isStart?: boolean
  isEnd?: boolean
}
```

这些点描述了节点的「形状路径」，可用于自由变形（用钢笔工具拖拽点）。注意 `points` 本身也作为 SchemaItem 存在扁平字典里。

---

## 样式子结构

### Fill（填充）

三种填充类型，判别联合：

```ts
type Fill =
  | { type: 'color', color: string, visible, alpha }                        // 纯色
  | { type: 'linearGradient', start: IXY, end: IXY, stops: [...], visible, alpha }  // 线性渐变
  | { type: 'image', url: string, matrix: number[], visible, alpha }        // 图片
```

一个节点可以有**多个 Fill 叠加**（`fills: Fill[]`），按顺序绘制。

### Stroke（描边）

```ts
{
  visible, width,
  fill: Fill,                    // 描边本身的填充（也可是渐变/图片）
  align: 'inner' | 'center' | 'outer',
  cap: 'butt' | 'round' | 'square',
  join: 'miter' | 'bevel' | 'round'
}
```

### Shadow（阴影）

```ts
{ visible, offsetX, offsetY, blur, spread, fill: Fill }
```

### Text style

```ts
{
  align: 'left' | 'center' | 'right',
  fontFamily: string | string[],
  fontSize, fontStyle, fontWeight,
  letterSpacing, lineHeight,
  decoration?: { style: 'none' | 'underline', width, color }
}
```

---

## Meta（文件元信息）

```ts
type Meta = {
  type: 'meta'
  id: 'meta'
  fileId: string
  name: string // 文件名
  pageIds: string[] // 所有页面 id
  userId: string
  version: number // ★ Schema 版本号（驱动迁移）
}
```

`meta.version` 非常重要：它记录这份文件使用的 Schema 版本，加载时会据此跑迁移（见下文）。

---

## Client（协同用户状态）

```ts
type Client = {
  userId
  userName
  userAvatar
  selectIdMap: Record<string, boolean> // 该用户选中的节点
  selectPageId: string
  cursor: IXY // 光标位置
  color: string // 该用户的光标颜色
  sceneMatrix: Matrix // 视口矩阵（跟随视角用）
}
```

Client 数据**不放在 Schema 里**，而是通过 Yjs 的 **Awareness** 协议同步（轻量、不进 CRDT 历史、断线即清）。见 [`07-collaboration.md`](./07-collaboration.md)。

---

## 版本与迁移机制

Schema 会演进。Sigma 用**版本号 + 迁移函数列表**管理：

`editor/schema/migration.ts`：

```ts
export const migrationList = [
  { version: 0, desc: '...新增 matrix 属性、__isNode', transform: (ctx) => {...} },
  { version: 1, desc: '...rect 节点也加 matrix',       transform: (ctx) => {...} },
  { version: 2, desc: '...hFlip/vFlip 改为 flip:0|1|2|3', transform: (ctx) => {...} },
] satisfies Migration[]

export function migrationSchema(schema: any) {
  const version = schema?.meta?.version          // 文件当前版本
  const newSchema = clone(schema)
  const migrations = migrationList.slice(version) // 取出需要跑的迁移
  // 用 createSchemaTraverse 遍历每个节点，依次应用所有迁移
  traverse(...)
  newSchema.meta.version = migrationList.length   // 更新到最新版本
  return newSchema
}
```

**加载文件时**（`YState.initSchema`）：

```ts
schema = migrationSchema(schema) // 先迁移到最新版本再使用
```

**写新文件时**（`SchemaCreator.meta`）：

```ts
meta.version = getLatestVersion() // = migrationList.length
```

### 为什么有 S1 / S2 两个命名空间

`types/schema/` 下三个文件：

- `schema-v1.d.ts`（`S1`）：**旧版本**类型定义，仅供迁移函数里做 `T<S1.OldNode>(node)` 类型断言用，让你读旧字段时不报错。
- `schema-v2.d.ts`（`S2`）：**当前版本**类型定义。
- `schema.d.ts`（`S`）：对外门面，把 `S2` 重新导出为 `S`。

所以日常代码里看到的 `S.Node`、`S.Frame` 都是当前版本。只有 `migration.ts` 里会用到 `S1`。

`updates.md` 记录每个版本改了什么。

---

## Schema 的操作工具

### SchemaCreator（创建）

`editor/schema/creator.ts` 是节点工厂。创建任何节点都走它：

```ts
SchemaCreator.schema()      // 创建一个空文件（含一个空页面）
SchemaCreator.page()
SchemaCreator.frame(opt?)
SchemaCreator.rect(opt?)
SchemaCreator.fillColor(color, alpha)
// ...
```

每个工厂方法会用 `defuOverrideArray`（来自 `@sigma/utils`）合并默认值和传入选项。

### SchemaHelper（判断）

`editor/schema/helper.ts` 是静态工具类：

```ts
SchemaHelper.isNode(item) // 是否是 Node（有 __isNode）
SchemaHelper.is(item, 'rect') // 类型判断（带类型收窄）
SchemaHelper.isById(id, 'frame')
SchemaHelper.isPageById(id) // id 以 'page_' 开头
SchemaHelper.isNodeParent(item) // 是否能含子节点（page/frame/group）
```

### createSchemaTraverse（遍历）

`editor/schema/traverse.ts` 提供通用树遍历：

```ts
const traverse = createSchemaTraverse({
  schema,
  enter: (ctx) => {
    /* 进入节点 */
  },
  leave: (ctx) => {
    /* 离开节点 */
  },
})
traverse(['page_a']) // 从某些根 id 开始
```

ctx 里有 `item`、`parent`、`ancestors`、`depth`、`index`、`stopPropagation()` 等。删除、对齐、图层面板构建都靠它。

---

## 一个完整节点的例子

一个带渐变填充的旋转矩形：

```jsonc
{
  "id": "abc123",
  "type": "rect",
  "name": "矩形 1",
  "parentId": "page_a",
  "__isNode": true,
  "lock": false,
  "visible": true,

  "width": 200,
  "height": 120,
  "matrix": { "a": 0.866, "b": 0.5, "c": -0.5, "d": 0.866, "tx": 100, "ty": 50 },

  "opacity": 1,
  "flip": 0,
  "radius": 8,
  "fills": [
    {
      "type": "linearGradient",
      "start": { "x": 0, "y": 0 },
      "end": { "x": 200, "y": 120 },
      "stops": [
        { "offset": 0, "color": "#ff0000" },
        { "offset": 1, "color": "#0000ff" },
      ],
      "visible": true,
      "alpha": 1,
    },
  ],
  "strokes": [
    {
      "visible": true,
      "width": 2,
      "fill": { "type": "color", "color": "#000", "visible": true, "alpha": 1 },
      "align": "inner",
      "cap": "butt",
      "join": "miter",
    },
  ],
  "shadows": [],

  "points": [
    /* 路径点 */
  ],
}
```

---

## 下一站

→ [`06-render.md`](./06-render.md) 看 Schema 怎么变成画布上的像素。
