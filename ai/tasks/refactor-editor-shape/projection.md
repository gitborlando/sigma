# Editor Shape Model Scope Task

## 背景

当前编辑器把 `polygon`、`star`、`ellipse` 等参数化图形作为 schema 级节点处理，并在几何面板中暴露对应字段，例如：

- `sides`
- `pointCount`
- `innerRate`
- `startAngle`
- `endAngle`
- `radius`

这让 `geometry` 相关逻辑承担了很多额外复杂度：

- 创建、渲染、hit-test、transform、右侧面板编辑都要识别不同图形类型。
- 参数化字段和 `points` 同时存在，容易出现两个真相不同步。
- 混合选择时，不同节点支持的字段不同，面板状态和实际写入容易互相污染。
- 每增加一种图形，都需要补 schema、migration、render、export/import、undo/redo 和 property panel 逻辑。

这份 task 记录一个更激进的方向：编辑器没有必要原生支持大量几何图形。原生节点应该服务高频语义，而不是收藏图形种类。

## 核心判断

不建议把大量装饰性或低频几何图形作为 schema 级一等节点。

更合理的原则是：

```txt
schema 只保留少数高频、稳定、有产品语义的原生节点。
复杂图形默认作为创建 preset，创建后降级为普通 path。
```

也就是说，用户插入一个五角星、多边形、箭头或气泡时，可以由工具生成 path points；但生成后它就是普通 vector/path，不需要继续保留 `pointCount`、`sides` 这类参数化字段。

只有当某类图形被证明有高频、持续的参数编辑需求时，再考虑把它提升为参数化 shape。

## 建议的原生节点范围

优先保留这些基础节点：

- `frame`
- `rect`
- `ellipse`
- `text`
- `image`
- `line`
- `path`

其中 `frame`、`text`、`image` 不是单纯几何图形，而是明确的产品能力；`rect`、`ellipse`、`line`、`path` 是基础绘制和 UI 表达所需的最小集合。

可以考虑移出 schema 级一等节点的类型：

- `polygon`
- `star`
- 纯装饰性的特殊 shape
- 未来可能出现的 arrow、bubble、bracket 等低频参数化图形

这些类型更适合作为 creation preset：

```ts
createPolygonPath(...)
createStarPath(...)
createArrowPath(...)
createBubblePath(...)
```

创建完成后统一落到：

```ts
type PathNode = {
  type: 'path'
  points: S.Point[]
}
```

## 仍然可能需要特殊图形的场景

特殊图形不是完全没有价值，但很多时候它们应该属于更上层的语义对象，而不是通用 geometry 基础能力。

可能有价值的场景：

- 白板 / 流程图：菱形、箭头、气泡、泳道。
- 演示 / 文档：星形、标注框、圆角多边形。
- 图表 / 仪表盘：pie、donut、arc、progress ring。
- UI 设计：头像 mask、圆形 badge、简单图标骨架。
- 地图 / 空间类应用：多边形区域、路径、测量线。

但这些场景里，真正重要的通常是语义：

- 流程图 diamond 更像 diagram node。
- donut 更像 chart / indicator。
- 地图 polygon 更像 geo object。
- arrow 更像 connector。

它们不一定应该混入通用 shape / geometry 系统。

## 推荐架构方向

长期方向：

```txt
基础编辑器：
  frame / rect / ellipse / text / image / line / path

创建工具：
  preset -> path

领域能力：
  diagram node / connector / chart / geo object 等语义组件
```

几何面板只处理基础字段：

- `x`
- `y`
- `width`
- `height`
- `rotation`
- 必要时支持 `radius`

参数化图形字段不要默认进入全局 geometry panel。比如 `sides`、`pointCount`、`innerRate`、`startAngle`、`endAngle` 应该属于具体工具、具体 preset 或具体语义组件，而不是所有节点共享的一套几何面板状态。

## 迁移建议

可以分阶段做，不需要一次性重写。

### 第一阶段：停止扩大原生 shape

- 暂时不要新增 schema 级 shape 类型。
- 新图形需求优先实现为 path preset。
- 不再把更多参数字段塞进 `DesignGeometryService`。

### 第二阶段：收敛 geometry panel

- 几何面板只保留基础 transform 字段。
- shape-specific 字段移到对应创建工具或局部编辑器中。
- 混合选择时不再使用字段并集直接写入所有节点。

### 第三阶段：降级 polygon / star

- 新创建的 polygon / star 直接生成 path。
- 旧数据通过 migration 或兼容读取转换为 path。
- 如果需要保留旧文件兼容，可以先在 render 层继续支持旧节点，但新数据不再产生这些类型。

### 第四阶段：重新定义参数化 shape 的准入标准

只有满足这些条件时，才考虑新增一等节点：

- 用户高频修改该图形的参数，而不只是创建一次。
- 参数化表达比 path 编辑明显更强。
- 该图形有稳定语义，不只是装饰。
- 愿意承担 schema、render、hit-test、transform、export、import、migration、undo/redo 的完整成本。

## 非目标

这份 task 不要求立即删除现有 `polygon` / `star`。

当前目标只是记录方向：

- 不继续扩大原生图形范围。
- 后续几何系统重构时，把“少量基础节点 + path preset + 语义组件”作为优先方案。
- 避免继续围绕低频参数化 shape 增加全局复杂度。

## 一句话结论

编辑器原生能力应该服务高频语义，不应该收藏几何图形。
