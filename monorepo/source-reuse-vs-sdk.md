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

## 后续修正：不是所有能力都适合源码复制

继续讨论后，判断变得更细：不应该在 SDK 和源码复制之间二选一，而应该按“魔改概率”和“通用程度”分层。

如果某段能力大概率原样复用，适合做 package。

如果某段能力有复用价值，但不同项目大概率要改，适合做 shadcn 式源码级复用。

如果某段能力只服务 Sigma 产品，就留在 app 或 Sigma 内部包里。

可以按这个规则判断：

```txt
新项目大概率只是用，不改：
  package

新项目大概率要改：
  registry source copy

只服务当前产品：
  app / Sigma private package
```

## shadcn 式源码级复用

这里的 shadcn 模式不是安装 SDK，而是把可复用源码作为 registry item 管理。项目需要什么，就把对应源码复制到本地，之后由项目自己拥有和魔改。

例如：

```bash
pnpm sigma add editor/history
pnpm sigma add editor/selection
pnpm sigma add geometry/hit-test
```

生成到项目里：

```txt
src/sigma/
  editor/
    history.ts
    selection.ts
  geometry/
    hit-test.ts
```

这种模式适合 selection、schema node、transform、command、工具状态机这类“能复用但很可能要改”的代码。

它的更新方式不是 `pnpm update`，而是源码 diff / patch / 三方合并。项目中需要记录一个 manifest，例如：

```json
{
  "items": {
    "editor/history": {
      "version": "0.1.0",
      "hash": "5f2a9c",
      "files": ["src/sigma/editor/history.ts"]
    }
  }
}
```

推荐命令形态：

```bash
pnpm sigma list
pnpm sigma check
pnpm sigma diff editor/history
pnpm sigma update editor/history
pnpm sigma eject editor/history
```

默认策略应该是先 diff，不自动覆盖；只有本地没有改过时才自动 update。

## 对 math 的判断收敛

一开始认为 `math` 最值得优先拆，但后续判断是：暂时不优先拆独立 math 包。

原因是 `matrix` / `mrect` 看起来通用，但真实跨项目复用概率可能不高。不要因为代码“看起来通用”就抽包，应该等第二个真实项目需要时再抽。

当前更合理的路线是：

```txt
不优先创建 @gitborlando/math
matrix / mrect 暂留 Sigma 内部
hit-test / polyline 等如果被新项目真实需要，可以先做 registry item
多项目稳定复用后，再考虑升成 package
```

也就是：

```txt
源码级复用优先
真实复用后再抽包
多项目稳定复用后再发 package
```

## 以当前项目看，哪些更适合通用 package

结合当前代码状态，真正更像通用底座的不是 `matrix/mrect`，而是这些：

```txt
Immut / patch store
Immut <-> Yjs plain object binding
tree traverser
browser text layout
viewport-core 的纯逻辑
hit-test，如果第二个项目真实需要
```

其中 `StageViewport` 的判断需要特别说明：视口逻辑值得复用，但当前 `StageViewportService` 不适合原样做 SDK。

当前 `StageViewport` 混合了：

```txt
纯视口数学：
  zoom / offset / sceneMatrix / 坐标转换 / zoomToFit

浏览器事件：
  window resize / wheel / ctrl wheel zoom

Sigma renderer：
  StageSurface / StageScene

Sigma 协同客户端：
  YClients.client.sceneMatrix / selectPageId

产品设置：
  EditorSetting / dev.sceneMatrix

运行时机制：
  MobX observable / reaction / autorun / 全局单例
```

所以更好的拆法是：

```txt
viewport-core:
  只保留 bound、matrix、zoom、pan、坐标转换、zoomToFit
  可作为通用 package

viewport-browser-adapter:
  处理 wheel / resize / DOM event
  可选

sigma-viewport-runtime:
  绑定 StageSurface、StageScene、YClients、EditorSetting
  Sigma 专属，不做通用 SDK
```

## 目录分层

为了避免通用包和 Sigma 包混在一起，可以按所有权和体量分目录。

最终倾向的结构是：

```txt
nano/
  data/
    tree-traverser/
  object/
    path-accessor/
    object-patch/
  lifecycle/
    disposable/
  event/
    emitter/

toolkit/
  state/
    patch-store/
    yjs-object-bind/
    history/
  spatial/
    viewport-core/
    viewport-browser-adapter/
  text/
    browser-text-layout/

packages/
  sigma-schema-core/
  sigma-editor-core/
  sigma-renderer/
  sigma-viewport-runtime/

registry/
  items/

apps/
  web/
```

这里的含义是：

```txt
nano:
  极小工具，单点能力，最好零依赖

toolkit:
  成套能力，有状态、有生命周期、有较完整 API

packages/sigma-*:
  Sigma 专属内部模块

registry:
  shadcn 式源码复制模板

apps:
  产品应用
```

依赖方向：

```txt
nano
  -> 外部极少依赖，最好零依赖

toolkit
  -> nano
  -> 外部依赖

packages/sigma-*
  -> toolkit
  -> nano

apps/web
  -> packages/sigma-*
  -> toolkit
  -> nano
```

`traverser` 这类更 tiny / nano，适合放在 `nano/data/tree-traverser`。

`viewport-core` 是一组状态和空间能力，不是单点小工具，适合放在 `toolkit/spatial/viewport-core`。

## 发包 scope

如果要发包，通用能力使用个人 scope，Sigma 专属能力使用 Sigma scope。

```txt
通用 package：
  @gitborlando/*

Sigma 专属 package：
  @sigma/*
```

例如：

```txt
nano/data/tree-traverser
  -> @gitborlando/tree-traverser

toolkit/state/patch-store
  -> @gitborlando/patch-store

toolkit/state/yjs-object-bind
  -> @gitborlando/yjs-object-bind

toolkit/spatial/viewport-core
  -> @gitborlando/viewport-core

toolkit/text/browser-text-layout
  -> @gitborlando/browser-text-layout

packages/sigma-schema-core
  -> @sigma/schema-core

packages/sigma-editor-core
  -> @sigma/editor-core
```

判断标准：

```txt
完全不认识 Sigma，只处理 plain data / generic types：
  @gitborlando/*

出现 S.*、Sigma schema、Sigma 节点类型、Sigma 产品概念：
  @sigma/*
```

但继续讨论后，`@sigma/*` 其实大概率没必要发布。它们更适合做 monorepo 内部 private workspace package。

```json
{
  "name": "@sigma/editor-core",
  "private": true
}
```

因此最终发布策略是：

```txt
@gitborlando/*:
  可以考虑发布
  因为它们是通用工具

@sigma/*:
  先不发布
  只是 monorepo 内部包

registry/items:
  用于源码级复用和魔改
```

这样能把三件事分清：

```txt
发包只发真正通用的
Sigma 拆包只是为了工程结构
registry 是为了魔改复制
```
