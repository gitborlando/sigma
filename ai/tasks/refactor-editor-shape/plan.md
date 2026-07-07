# Refactor Editor Shape Plan

## 0. 文档目的

这份 plan 记录编辑器 shape 系统的完整重构方向。

核心判断：

```txt
编辑器 core 不应该原生收藏大量图形。
core 只保留少量基础图元和通用编辑协议。
复杂 shape、参数化 shape、领域图形能力应通过插件提供。
```

这份文档不是一次提交内要完成的任务清单，而是一条可分阶段执行的长期路线。后续任何涉及 schema、geometry panel、shape 创建、render/hit-test、插件能力的改动，都应该优先参考这里的方向。

相关背景记录：

- `ai/tasks/refactor-editor-shape/projection.md`

## 1. 总目标

把当前编辑器 shape 系统从：

```txt
core schema 内置多种参数化图形
  -> geometry service 按 node.type 分支处理
  -> render / hit-test / transform / panel / export 全部感知这些类型
```

重构为：

```txt
editor core:
  少量基础节点
  通用 transform / selection / render / undo / export 协议
  path 作为复杂图形的稳定落点

shape plugin:
  star / polygon / arrow / bubble / flowchart shape
  创建 UI
  参数面板
  参数到 path 的生成逻辑
  可选的 plugin node 兼容逻辑

domain plugin:
  diagram / chart / geo / whiteboard 等更高语义对象
```

最终希望做到：

- core schema 小而稳定。
- core geometry 面板只处理通用几何能力。
- 新增 shape 不再要求修改 core 多个模块。
- 低频装饰性 shape 创建后默认降级为 path。
- 高频语义 shape 可以作为插件节点存在，但必须显式声明能力和降级策略。
- 旧文件可以兼容读取，迁移有路径，不一次性破坏数据。

## 2. 当前问题

### 2.1 schema 承担了过多 shape 类型

当前 schema 里存在 `polygon`、`star`、`ellipse` 等参数化 shape。它们进入 schema 后，会自然扩散到这些系统：

- schema 类型定义
- schema creator
- migration
- stage create
- render drawer
- hit-test
- transform
- right panel geometry
- export/import
- undo/redo patch
- mixed selection

每一个 shape 成为一等节点，都会永久增加维护面。

### 2.2 参数字段和 points 双重真相

以 polygon/star 为例，节点同时拥有：

- `width`
- `height`
- `matrix`
- `points`
- `sides` / `pointCount` / `innerRate`

这会导致一个根本问题：

```txt
到底 points 是真相，还是参数字段是真相？
```

如果 transform 改了 width/height，但没有同步 points，渲染和选框可能不同步。
如果参数字段改了，但没有重新生成 points，参数和图形会不同步。

这个问题不应该靠在每个操作路径里补 patch 解决，而应该从模型上避免。

### 2.3 geometry panel 被 shape-specific 字段污染

通用几何面板适合处理：

- `x`
- `y`
- `width`
- `height`
- `rotation`
- 可能包括基础圆角 `radius`

但当前面板还暴露：

- `sides`
- `pointCount`
- `innerRate`
- `startAngle`
- `endAngle`

这些字段不是通用几何能力，而是具体 shape 的参数。它们放在全局 geometry panel 里，会导致 mixed selection、类型分支、字段支持判断全部变复杂。

### 2.4 mixed selection 行为难以定义

当用户同时选中 rect + polygon + star 时：

- 面板应该显示哪些字段？
- 修改 `sides` 是否只影响 polygon？
- 修改 `innerRate` 对 ellipse 和 star 是否同义？
- 不支持该字段的节点是否忽略？

如果字段是全局并集，容易污染节点。
如果字段是交集，又会让 shape-specific 编辑能力在 mixed selection 中消失。

这说明 shape-specific 参数不适合放在 core 全局面板里。

### 2.5 core 扩展成本过高

如果未来要加 arrow、bubble、flowchart diamond、donut、arc、bracket，每个 shape 都要改 core。长期看，这会把 editor core 变成 shape 大合集，而不是稳定编辑内核。

## 3. 设计原则

### 3.1 core 只保留高频基础能力

core 节点必须满足至少一个条件：

- 高频使用。
- 语义稳定。
- 很难用 path 替代。
- 对编辑器基础交互有关键意义。
- 值得承担完整生命周期成本。

### 3.2 低频 shape 默认降级为 path

star、polygon、arrow、bubble 这类 shape，默认作为创建工具或插件 preset：

```txt
plugin preset parameters
  -> generate points
  -> create path node
```

创建完成后，它就是普通 path。

### 3.3 参数化 shape 必须证明自己值得存在

只有满足这些条件，才允许以参数化节点存在：

- 用户会频繁修改参数，而不是只创建一次。
- 参数化编辑显著优于 path 编辑。
- 图形有稳定语义。
- 有明确的 export/import 策略。
- 有明确的 path fallback。
- 插件愿意维护对应的 render、hit-test、panel、migration 逻辑。

### 3.4 core 不理解插件私有参数

core 可以知道：

- 节点如何被选择。
- 节点如何变换。
- 节点如何渲染为路径或元素。
- 节点如何被导出。

core 不应该知道：

- star 的 `pointCount` 是什么。
- polygon 的 `sides` 是什么。
- arrow 的 `headWidth` 是什么。
- diagram node 的业务字段是什么。

这些应由插件声明并处理。

### 3.5 path 是稳定交换格式

无论插件内部多复杂，都应该能降级成 path：

```txt
plugin node / preset params -> path
```

path 是：

- core 渲染能理解的基础图形。
- export 的稳定中间形态。
- plugin 缺失时的兜底显示方式。
- legacy shape 迁移的落点。

### 3.6 兼容优先，删除滞后

不应该第一步删除旧 shape。

更合理的是：

```txt
先停止产生新的 core polygon/star
再让新创建走 path/plugin
再兼容读取旧 polygon/star
最后决定是否 migration 删除旧类型
```

## 4. 目标架构

### 4.1 editor core

core 负责最小稳定能力：

- schema 基础节点
- selection
- transform
- layer tree
- undo/redo
- render pipeline
- hit-test pipeline
- export/import 基础协议
- path editing
- plugin extension points

建议 core 原生节点：

- `page`
- `frame`
- `group`
- `rect`
- `ellipse`
- `text`
- `image`
- `line`
- `path`

说明：

- `group` 是结构节点，不是绘制 shape，但应保留为 core 组织能力。
- 当前项目里的 `S.Path` 类型名对应 `type: 'irregular'`，后续可以单独计划是否统一命名为 `path`。
- `image` 当前可能通过 rect + image fill 表达，长期可以评估是否成为独立节点；这个问题不阻塞 shape 收敛。

### 4.2 shape preset plugin

shape preset plugin 负责低频图形的创建能力：

- star
- polygon
- arrow
- bubble
- bracket
- callout
- flowchart basic shapes

典型流程：

```txt
用户选择 star preset
  -> 插件展示创建工具 / 参数 UI
  -> 用户拖拽创建
  -> 插件根据参数生成 path points
  -> core 插入 path node
```

创建后默认不保留参数化状态。

如果用户需要后续调参，插件可以选择提供临时编辑态：

```txt
选中刚创建的 path
  -> 如果 path 带有 pluginPresetMeta
  -> 插件可以识别并重开参数编辑
  -> 编辑结束后重新生成 path
```

但这个 meta 不应成为 core 必须理解的字段。

### 4.3 parameterized shape plugin

对于确实需要长期保留参数的 shape，可以由插件提供参数化节点。

示例：

```ts
type PluginShapeNode = {
  type: 'plugin-shape'
  pluginId: string
  shapeType: string
  width: number
  height: number
  matrix: S.Matrix
  props: Record<string, unknown>
  fallback?: {
    type: 'path'
    points: S.Point[]
  }
}
```

core 不解释 `props`，只通过插件协议调用：

- render
- hit-test
- getBounds / getMRect
- applyTransform
- getPropertyPanel
- export
- toPath fallback

短期不一定马上实现 `plugin-shape`，但目标架构要为它留位置。

### 4.4 domain plugin

更高语义对象不应挤进 shape 系统。

示例：

- diagram node
- connector
- chart
- geo polygon
- whiteboard sticky note
- progress indicator

这些对象可能看起来是 shape，但实际有业务语义。它们应该作为 domain plugin，而不是 core shape。

## 5. schema 策略

### 5.1 短期 schema

短期保留旧类型，避免立即破坏：

- `polygon`
- `star`
- 当前 `irregular` path

但新增逻辑不再依赖这些类型扩展。

短期目标：

```txt
legacy readable
new data simplified
```

也就是说：

- 老文件里的 `polygon/star` 继续能显示、编辑基础 transform。
- 新创建的 polygon/star preset 默认创建为 path。
- core geometry panel 不再为 polygon/star 新增 shape-specific 字段。

### 5.2 中期 schema

引入更明确的 path 节点语义：

```ts
type PathNode = S.NodeBase & {
  type: 'path'
  points: S.Point[]
}
```

如果不想立即改现有 `type: 'irregular'`，可以先做别名和 helper：

```ts
SchemaHelper.isPath(node)
SchemaCreator.path(...)
```

让业务代码不再直接依赖 `irregular` 这个历史命名。

### 5.3 长期 schema

长期目标：

```ts
type CoreNode =
  | S.Frame
  | S.Group
  | S.Rectangle
  | S.Ellipse
  | S.Text
  | S.Image
  | S.Line
  | S.Path
  | S.PluginNode
```

`polygon/star` 不再作为 core node 新增写入。

legacy migration 可选：

```txt
polygon -> path
star -> path
```

如果需要永久兼容旧文件，可以保留 legacy reader，但不在新 schema 里继续产生这些类型。

## 6. 插件能力设计

### 6.1 插件注册入口

建议插件以 manifest + runtime module 的形式注册：

```ts
type EditorPlugin = {
  id: string
  name: string
  contributes?: {
    shapePresets?: ShapePresetContribution[]
    nodeRenderers?: NodeRendererContribution[]
    propertyPanels?: PropertyPanelContribution[]
    exporters?: ExportContribution[]
    migrations?: MigrationContribution[]
  }
}
```

短期可以不做完整动态加载，先用静态注册表模拟：

```ts
const editorPlugins = [coreShapePresetPlugin, flowchartShapePlugin]
```

### 6.2 shape preset contribution

用于创建后落到 core path 的图形：

```ts
type ShapePresetContribution = {
  id: string
  label: string
  icon: ReactNode
  defaultParams: Record<string, unknown>
  createPath: (ctx: ShapeCreateContext) => S.Path
  getCreatePanel?: () => ReactNode
}
```

其中 `createPath` 是关键边界：

```txt
插件负责参数到 points。
core 只负责插入 path。
```

### 6.3 plugin node contribution

用于长期保留参数化状态的节点：

```ts
type PluginNodeContribution<TProps = unknown> = {
  pluginId: string
  nodeType: string
  create: (ctx: PluginNodeCreateContext<TProps>) => S.PluginNode<TProps>
  render: (node: S.PluginNode<TProps>, ctx: RenderContext) => void
  hitTest: (node: S.PluginNode<TProps>, xy: IXY) => boolean
  toPath: (node: S.PluginNode<TProps>) => S.Path
  getPropertyPanel?: (node: S.PluginNode<TProps>) => ReactNode
  applyTransform?: (
    node: S.PluginNode<TProps>,
    transform: TransformChange,
  ) => Patch[]
}
```

约束：

- `toPath` 必须存在。
- 没有插件时，core 使用 fallback path。
- 插件私有 props 不进入 core geometry panel。

### 6.4 property panel contribution

shape-specific 参数面板由插件贡献：

```ts
type PropertyPanelContribution = {
  supports: (node: S.Node) => boolean
  render: (ctx: PropertyPanelContext) => ReactNode
}
```

core 负责组合面板区域：

```txt
Core Geometry Panel
Core Appearance Panel
Plugin Panels
```

插件面板只在支持的节点上显示。

### 6.5 command contribution

插件如果需要自定义命令，可以贡献 command：

```ts
type CommandContribution = {
  id: string
  label: string
  run: (ctx: EditorCommandContext) => void
}
```

例如：

- Convert to path
- Reset shape params
- Edit preset params
- Expand shape

## 7. geometry 系统重构

### 7.1 core geometry panel 收敛

core geometry panel 只负责通用字段：

- `x`
- `y`
- `width`
- `height`
- `rotation`
- 基础 `radius` 可单独评估

不再默认包含：

- `sides`
- `pointCount`
- `innerRate`
- `startAngle`
- `endAngle`

这些字段移动到插件 property panel 或 shape-specific editor。

### 7.2 geometry projection

面板状态应从选区派生，而不是 service 里维护可变全局状态。

建议建立纯 projection：

```ts
type GeometryPanelProjection = {
  fields: GeometryPanelField[]
}

type GeometryPanelField = {
  key: CoreGeometryKey
  value: number | typeof MULTI_VALUE
  enabled: boolean
  unit?: 'px' | 'deg'
  min?: number
  max?: number
}
```

输入：

```txt
selected nodes
editor coordinate context
```

输出：

```txt
可显示字段和值
```

projection 不写状态、不触发 yState、不记录 undo。

### 7.3 geometry command

用户修改面板时，UI 发 command：

```ts
type GeometryCommand =
  | { type: 'set-field'; key: CoreGeometryKey; value: number }
  | { type: 'nudge-field'; key: CoreGeometryKey; delta: number }
  | { type: 'transform'; change: TransformChange }
```

command 层负责：

- 读取 selected nodes。
- 基于 snapshot 计算 next。
- 产出 patches。
- `yState.transact`。
- undo track。

这样可以替代当前 `isDelta`、`changingKeys`、`currentGeometries` 混合状态。

### 7.4 transform engine 统一

移动、缩放、旋转、右侧面板输入，本质上都在改几何。

长期应统一走：

```ts
applyMRectChange(node, change, context) => Patch[]
```

其中 context 包括：

```ts
type GeometryChangeContext = {
  mode: 'absolute' | 'delta'
  coordinateSpace: 'world' | 'parent' | 'local'
  snapshot: Map<ID, GeometrySnapshot>
}
```

这能减少 stage transformer 和 property panel 各写一套几何逻辑。

### 7.5 shape-specific geometry 下放

如果插件节点需要 `pointCount`、`sides` 等字段，它自己实现：

```ts
plugin.applyPropertyChange(node, key, value)
```

core 只提供：

- transact
- patch helper
- undo boundary
- selection context

## 8. render / hit-test / export 策略

### 8.1 core render

core render 只内置基础节点：

- rect
- ellipse
- text
- image
- line
- path
- frame/group composition

legacy polygon/star 可以短期保留 render 分支，但标记为 legacy。

### 8.2 plugin render

如果节点是 plugin node：

```txt
core 查找 plugin renderer
  -> 找到：交给插件渲染
  -> 找不到：使用 fallback path
```

插件 render 不应破坏 core render pipeline 的缓存和 dirty rect 机制。必要时 plugin contribution 需要声明：

- bounds 计算
- dirty strategy
- hit-test shape

### 8.3 hit-test

core hit-test 顺序：

```txt
core node hit-test
plugin node hit-test
fallback path hit-test
```

插件缺失时，fallback path 保证对象仍可被选择。

### 8.4 export

export 分三层：

```txt
core node export
plugin node custom export
plugin node -> path fallback export
```

对于 SVG/canvas/image export，path fallback 应该足够稳定。

对于保留编辑信息的 native export，可以保留 plugin props，但必须带 plugin id 和版本。

## 9. 迁移路线

### Phase 0: 盘点和约束

目标：弄清现有 shape 分布，停止继续扩大复杂度。

任务：

- 盘点所有 `polygon` / `star` / `ellipse` / `innerRate` / `sides` / `pointCount` 调用点。
- 标记哪些是 core 必需，哪些是 shape-specific。
- 记录当前创建、渲染、hit-test、transform、panel、export 的路径。
- 决定是否把 `ellipse` 继续保留为 core 基础节点。
- 约定新 shape 不再直接进入 core schema。

产出：

- shape 调用点清单。
- legacy shape 风险清单。
- core shape 准入标准。

验收：

- 团队明确不再新增 core shape。
- 新需求默认走 preset/plugin/path。

### Phase 1: 收敛 geometry panel

目标：先把全局几何面板从 shape-specific 复杂度里解放出来。

任务：

- 从 core geometry panel 移除或隐藏 `sides`、`pointCount`、`innerRate`、`startAngle`、`endAngle`。
- 保留基础字段：`x/y/width/height/rotation`。
- 评估 `radius` 是否只对 rect/frame 显示，还是移动到 appearance/shape panel。
- 修复 mixed selection 字段并集写入问题。
- 将 `DesignGeometryService` 拆成 projection + command 的方向。
- 删除未使用的 `nodeGeoInfoCache` 或完整接入 snapshot 机制。

产出：

- core geometry panel 只处理通用字段。
- shape-specific 字段不再污染 mixed selection。

验收：

- rect + polygon/star 混选时，修改基础字段不会写入不支持的 shape-specific 字段。
- 手动输入和拖拽修改走同一套 command 语义。
- 无新增 shape-specific 分支进入 core geometry service。

### Phase 2: path preset 化 polygon/star

目标：新创建的 polygon/star 不再生成 core 参数化节点。

任务：

- 新增 path creation helper：
  - `createPolygonPath`
  - `createStarPath`
  - 后续 `createArrowPath`
- stage create 中 polygon/star 工具改为创建 path。
- 保留旧 `createRegularPolygon` / `createStarPolygon` 作为点生成工具，但命名和归属调整为 preset helper。
- 新建的 path 可以带非必需 meta：

```ts
pluginPreset?: {
  pluginId: string
  presetId: string
  version: number
  params: Record<string, unknown>
}
```

约束：

- core 不依赖 `pluginPreset`。
- 删除 meta 不影响渲染和编辑。
- meta 只用于插件尝试恢复参数编辑。

产出：

- 新 polygon/star 工具产出 path。
- 旧 polygon/star 类型不再由新创建路径产生。

验收：

- 新建 star/polygon 后，节点类型是 path。
- path 可以正常 selection、transform、render、hit-test。
- 删除 preset meta 后仍可正常显示。

### Phase 3: legacy polygon/star 兼容

目标：旧文件不破，新文件不再依赖旧类型。

任务：

- 为 legacy polygon/star 建立 adapter：

```ts
legacyShapeToPath(node) => S.Path
```

- render 层可继续直接支持 legacy，也可以先转换为 path render。
- transform 后如果 legacy points/params 可能不同步，优先转换为 path 或统一由 adapter 生成 path。
- 增加 `Convert to path` 命令，用于显式展开 legacy shape。
- migration 策略先设计，不急着默认执行。

产出：

- legacy shape 可读可显示。
- 用户可以显式转换为 path。

验收：

- 打开旧文件不丢图形。
- legacy star/polygon 可以被选中、移动、缩放、导出。
- 转换为 path 后视觉基本一致。

### Phase 4: 插件注册系统雏形

目标：把 shape preset 从 core 功能变为插件贡献。

任务：

- 建立静态插件注册表。
- 定义 `ShapePresetContribution`。
- 把 star/polygon preset 移到内置插件，例如：

```txt
plugins/builtin-shapes
```

- 创建工具栏从 plugin registry 读取 shape preset。
- preset 创建结果仍然是 core path。

产出：

- core 不直接枚举 star/polygon 工具。
- shape 工具由 plugin contribution 提供。

验收：

- 移除 builtin shape plugin 后，core 仍可运行，只是少了对应创建工具。
- 新增一个 preset 不需要修改 core creator/render/geometry panel。

### Phase 5: plugin property panel

目标：shape-specific 参数编辑回到插件面板，而不是 core geometry panel。

任务：

- 定义 `PropertyPanelContribution`。
- 右侧面板支持 core panel + plugin panel 组合。
- builtin shape plugin 可以识别带 `pluginPreset` 的 path，并提供有限参数重编辑。
- 参数重编辑的结果是重新生成 path points。

产出：

- shape 参数编辑能力以插件形式恢复。
- core geometry panel 保持通用。

验收：

- 选中带 preset meta 的 star path 时，可由插件显示 star 参数面板。
- 修改参数会更新 path points。
- 没有插件时，该节点仍作为普通 path 工作。

### Phase 6: plugin node 预留或实现

目标：为真正需要长期参数化状态的对象提供机制。

任务：

- 决定是否引入 `plugin-shape` 或更通用 `plugin-node`。
- 定义 plugin node schema。
- 定义 fallback path。
- 定义 plugin renderer / hit-test / export / property panel 协议。
- 建立 plugin missing fallback 行为。

产出：

- 参数化语义对象不需要进入 core node union。
- 插件可维护自己的 props。

验收：

- plugin node 在插件存在时正常编辑。
- 插件缺失时可用 fallback path 显示和选择。
- export 可以使用 fallback path。

### Phase 7: schema migration 和 legacy 清理

目标：根据产品成熟度决定是否移除 legacy core shape。

任务：

- 统计旧文件中 polygon/star 使用量。
- 决定 migration 是否自动执行：
  - 打开时临时转换。
  - 保存时转换。
  - 显式用户命令转换。
  - 版本 migration 一次性转换。
- 如果自动转换，确保视觉一致性和 undo 行为清楚。
- 删除 core 新建 polygon/star 的剩余入口。
- legacy 类型从 active schema 文档中移到 archived/compat 区域。

产出：

- schema 更小。
- legacy shape 只作为兼容读存在。

验收：

- 新文件不会产生 core polygon/star。
- 旧文件有明确兼容策略。
- core geometry/render 代码不再围绕 polygon/star 继续增长。

## 10. 实施顺序建议

推荐顺序：

```txt
1. 先收敛 geometry panel
2. 再让新创建 shape 变成 path
3. 再做 legacy adapter
4. 再抽 shape preset plugin
5. 再做 plugin property panel
6. 最后考虑 plugin node 和 schema migration
```

原因：

- geometry panel 是当前复杂度最高、风险最明显的地方。
- path preset 化可以立刻阻止新数据继续复杂化。
- plugin runtime 可以晚一点，不影响先把 core 数据模型收敛。
- plugin node 是最重的能力，应该等 preset 插件跑通后再做。

## 11. 关键设计决策

### 11.1 polygon/star 是否立即删除

不立即删除。

先停止新建，再兼容旧数据。

### 11.2 ellipse 是否保留

倾向保留。

理由：

- ellipse 是基础图元。
- UI 设计中非常高频。
- 用 path 替代会降低常见编辑体验。

但 `startAngle/endAngle/innerRate` 这类 pie/donut 能力不一定属于 core ellipse。可以考虑：

```txt
core ellipse:
  普通椭圆

plugin preset / plugin node:
  pie / donut / arc
```

### 11.3 radius 放哪里

`radius` 对 rect/frame 是高频基础属性，可以保留。

但它不一定属于 geometry panel，也可以属于 shape/appearance panel。短期保留在 geometry panel 可接受，但必须只作用于支持它的节点。

### 11.4 path meta 是否允许存在

允许，但 core 不依赖。

原则：

```txt
meta 是插件恢复编辑体验的 hint，不是渲染真相。
points 才是 path 的真相。
```

### 11.5 插件缺失怎么办

必须能显示。

策略：

- preset path：天然可显示。
- plugin node：必须有 fallback path。

## 12. 风险与应对

### 12.1 用户失去参数化编辑能力

风险：

- 创建 star 后不能再改角数。

应对：

- 短期接受，因为这是低频能力。
- 中期通过 preset meta + plugin panel 恢复有限参数编辑。
- 高频需求再升级为 plugin node。

### 12.2 旧文件视觉变化

风险：

- polygon/star 转 path 后点位或缩放表现略变。

应对：

- legacy adapter 先只用于显式转换。
- 自动 migration 前做视觉对比。
- 保留 fallback render 直到确认稳定。

### 12.3 插件 API 过早复杂化

风险：

- 还没抽干 core，就先做了很大的插件系统。

应对：

- 先做静态 registry。
- 先支持 shape preset。
- plugin node 晚于 preset。

### 12.4 core 和 plugin 边界不清

风险：

- 插件继续把私有字段塞进 core panel 或 core schema。

应对：

- 规定 core 不解释 plugin props。
- shape-specific panel 必须由插件贡献。
- core 只认 path fallback 和通用 transform。

### 12.5 export/import 断裂

风险：

- plugin node 无法导出。

应对：

- 所有 plugin node 必须实现 `toPath`。
- 缺失插件时使用 fallback path export。
- native export 可以保留 plugin props，但普通 export 不依赖它。

## 13. 验收标准总表

### core 收敛

- core 不再新增 shape-specific 字段。
- geometry panel 只处理通用字段。
- mixed selection 不污染不支持的节点。

### path preset

- 新建 polygon/star 生成 path。
- path 可以正常 render/hit-test/transform/export。
- 删除 preset meta 后仍然可用。

### legacy 兼容

- 旧 polygon/star 文件能打开。
- legacy shape 能显示、选择、移动、缩放。
- 可以显式转换为 path。

### 插件化

- shape preset 来自 plugin registry。
- 移除某个 shape plugin 不影响 core 启动。
- 新增 shape preset 不需要修改 core schema/render/geometry panel。

### plugin node

- plugin node 有 fallback path。
- 插件缺失时不丢视觉。
- export 不依赖插件私有渲染。

## 14. 建议目录结构

短期：

```txt
apps/web/src/editor/
  shape/
    path-presets/
      polygon.ts
      star.ts
      arrow.ts
    legacy/
      polygon.ts
      star.ts

  geometry/
    projection.ts
    command.ts
    transform.ts

  plugin/
    registry.ts
    types.ts

  plugins/
    builtin-shapes/
      index.ts
      presets/
        polygon.ts
        star.ts
      panels/
        star-panel.tsx
```

长期如果 core 抽包：

```txt
packages/editor-core/
  schema
  geometry
  render
  plugin-api

packages/editor-plugin-builtin-shapes/
  presets
  property-panels

apps/web/
  plugin registration
  app shell
```

## 15. 第一批可执行任务

如果要从现在开始动，建议第一批任务只做收敛，不做大插件系统。

### Task 1: 梳理 shape 调用点

输出一份清单：

- `polygon`
- `star`
- `sides`
- `pointCount`
- `innerRate`
- `startAngle`
- `endAngle`
- `createRegularPolygon`
- `createStarPolygon`

### Task 2: 修正 geometry panel 的字段模型

目标：

- 字段必须有 `supports(node)`。
- mixed selection 不再用并集盲写。
- shape-specific 字段先隐藏或下放。

### Task 3: 建立 path preset helper

目标：

- star/polygon 点生成逻辑从 core node creator 中抽离。
- 输出 path node，而不是 star/polygon node。

### Task 4: 修改新建流程

目标：

- 新建 star/polygon 生成 path。
- 旧 star/polygon creator 只保留 legacy 兼容或测试用途。

### Task 5: legacy 转 path 命令

目标：

- 选中 legacy polygon/star，可以显式转换为 path。
- 转换前后视觉尽量一致。

### Task 6: 静态 shape preset registry

目标：

- 用 registry 管理 shape preset。
- 先不做动态插件加载。
- 为后续真正插件化留下接口。

## 16. 暂不做的事情

短期不做：

- 完整动态插件加载。
- 一次性删除 polygon/star schema。
- 大规模 migration 所有旧文件。
- 为每个 shape 做复杂参数编辑器。
- 把 diagram/chart/geo 一起纳入本次重构。

这些都应该在 core shape 收敛后再评估。

## 17. 最终状态

理想最终状态：

```txt
core 很薄：
  frame / group / rect / ellipse / text / image / line / path
  selection / transform / render / undo / export
  plugin API

shape 能力在插件：
  star / polygon / arrow / bubble
  preset -> path
  可选参数面板

语义能力在领域插件：
  diagram / chart / geo / whiteboard
  plugin node + fallback path
```

一句话：

```txt
编辑器 core 提供稳定编辑内核，shape plugin 提供图形能力，path 负责兜底和交换。
```
