# 源码级复用与 SDK 取舍讨论

这次讨论的核心问题是：Sigma 后续是否真的需要抽成正式 SDK。

结论是，如果主要使用场景是作者自己在新项目里复用，并且新项目大概率需要魔改，那么不应该优先做 SDK。更合适的方向是把 Sigma 里的能力拆成可迁移、可复制、可修改的内部源码包。

## 为什么不优先做 SDK

SDK 更适合给第三方稳定调用。它需要稳定 API、semver、文档、兼容层、插件点和长期兼容承诺。

但当前更真实的需求不是给别人集成 Sigma，而是后续自己做新项目时，能复用 Sigma 中已经沉淀出来的能力。如果未来项目需要大量魔改，正式 SDK 反而可能变成负担，因为很多设计会被提前固定。

因此目标不应是：

```txt
做一个完整、稳定、对外发布的 Sigma SDK
```

而应是：

```txt
把 Sigma 中可复用的能力拆成内部源码包，方便新项目直接引用或复制后魔改
```

这些包可以先保持 `private: true`，不承诺外部 API 稳定。

## 更合适的拆分方式

可以先按内部包理解：

```txt
packages/
  math/
  schema-core/
  editor-core/

apps/
  web/
  new-project/
```

其中：

`math` 是真正通用的几何和数学能力，比如矩阵、包围盒、命中检测、贝塞尔、折线简化、多边形点生成。

`schema-core` 是 Sigma 编辑器自己的数据结构能力，比如 schema 类型、migration、traverse、节点创建 helper。

`editor-core` 是编辑行为能力，比如插入、删除、移动、缩放、层级调整、selection、undo/redo。但它不需要设计成正式 SDK，只是内部共享源码包。

重点是：抽包是为了降低复制和迁移成本，不是为了做稳定产品。

## 白板项目如何复用

如果以后做一个白板项目，复用方式不是把完整 Sigma 编辑器嵌进去，而是复用底层能力：

```txt
apps/whiteboard/
  使用 packages/math
  使用 packages/schema-core 的部分能力
  使用 packages/editor-core 的编辑操作
```

白板自己的 UI、工具栏、快捷键、素材库、协同、登录和产品逻辑仍然自己写。

例如：

```ts
import { hitTest } from '@sigma/math'
import { createRectNode } from '@sigma/schema-core'
import { insertNode, moveNode } from '@sigma/editor-core'

editor.dispatch(
  insertNode({
    parentId: 'page-1',
    node: createRectNode({
      x: 100,
      y: 100,
      width: 240,
      height: 120,
    }),
  }),
)

editor.dispatch(
  moveNode({
    id: 'rect-1',
    dx: 20,
    dy: 10,
  }),
)
```

白板项目复用的是数据结构、几何算法和编辑操作，不复用 Sigma 的页面、面板、路由、素材库和产品壳。

## WebGL 地图项目如何复用

如果目标是 WebGL 地图项目，Sigma 的 schema 和 editor-core 不一定适合整包复用。

地图项目通常有自己的核心模型：

```txt
map
layer
source
feature
geometry
lng/lat
style
```

这和 Sigma 的 page、node、rect、text、image、group 不是同一套模型。

因此 WebGL 地图更适合复用：

```txt
packages/math
operation/history 的设计思路
```

而不是复用完整 Sigma schema 或完整编辑器核心。

例如地图点击 polygon 时，可以把经纬度投影成屏幕坐标后，再使用通用命中检测：

```ts
const screenPoints = polygon.points.map((point) =>
  map.project([point.lng, point.lat]),
)

const hit = hitTest.polygon({
  point: { x: mouseX, y: mouseY },
  points: screenPoints,
})
```

这里地图项目自己负责 `lng/lat`、投影、瓦片、WebGL 渲染；`math` 只处理普通 `{ x, y }` 几何计算。

## operation/history 思路是什么意思

Sigma 中最值得沉淀的另一部分，不一定是具体代码，而是编辑行为的组织方式。

Sigma 里的操作包括：

```txt
insertNode
deleteNode
moveNode
resizeNode
setStyle
undo
redo
```

地图项目也有类似操作：

```txt
insertFeature
deleteFeature
moveMarker
updatePolygonVertex
setLayerStyle
undo
redo
```

对象不同，但模式类似：

```txt
用户动作
  -> 生成 operation
  -> apply 到 document
  -> 记录 history
  -> 支持 undo/redo
```

所以可以考虑沉淀一个更底层的内部包：

```txt
packages/operation-core/
```

它不关心 Sigma 还是地图，只负责 operation、patch、transaction、history、undo/redo 这些通用机制。

Sigma 自己定义 Sigma 的 operation，地图项目自己定义地图的 operation。

## 调整后的方向

后续迁移可以从“做 SDK”调整为“沉淀内部源码包”：

```txt
第一优先级：
  packages/math

第二优先级：
  packages/operation-core

Sigma 自己：
  packages/sigma-schema-core
  packages/sigma-editor-core

其他项目：
  根据业务建立自己的 schema-core / editor-core
  复用 math 和 operation-core
```

这样白板可以复用更多 Sigma 编辑器能力；WebGL 地图则主要复用 math 和 operation/history 模式。

最终目标是让 Sigma 里的好东西能被新项目带走，而不是提前把它包装成一个稳定、沉重、难以魔改的 SDK。
