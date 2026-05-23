# Monorepo 迁移补充方案：公共 Math 包与独立 SDK

本文覆盖 `monorepo.md` 中关于 `@sigma/editor-math` 和后续 engine 拆包的部分。

新的核心判断是：`sigma` 里的 math 不应只迁成 `@sigma/editor-math`。其中一部分未来要进入独立公共包 `@gitborlando/math`，并服务一个和 Sigma 无关的第三方 SPK / SDK；Sigma 编辑器的核心引擎也可能作为 headless SDK 独立发布。因此迁移要同时保护两件事：

- 公共 math 包必须项目无关、无浏览器依赖、无 schema 依赖。
- Sigma engine SDK 必须把模型、操作、协同、渲染、React UI 拆清楚，不能把当前 web app 的运行时单例直接打包出去。

> 说明：用户提到 `@gitborlasndo/math`，当前仓库依赖命名是 `@gitborlando/*`。下文按 `@gitborlando/math` 写，如果确实要使用另一个 scope，迁移步骤不变。

## 调整后的目标结构

`monorepo.md` 中的 `@sigma/editor-math` 不再作为长期目标，而是拆成三层：

```txt
external/
  @gitborlando/math          # 独立公共 math 包，建议单独仓库或已有 @gitborlando monorepo

packages/
  sigma-math-compat/         # Sigma 兼容层，短期保留 Matrix/MRect 等旧命名和旧行为
  schema-core/               # Sigma schema 类型、迁移、纯查询、节点创建
  sdk-core/                  # Headless Sigma engine，不依赖 React/Canvas/DOM
  sdk-yjs/                   # 可选：Yjs 协同适配器
  canvas-renderer/           # 可选：Canvas 渲染器
  react-bindings/            # 可选：React hooks / UI 绑定

apps/
  web/                       # 现有产品壳：路由、页面、资产、Supabase、COS、UI 编排
```

长期依赖方向：

```txt
apps/web
  -> @sigma/react-bindings
  -> @sigma/canvas-renderer
  -> @sigma/sdk-yjs
  -> @sigma/sdk-core

@sigma/react-bindings
  -> @sigma/sdk-core

@sigma/canvas-renderer
  -> @sigma/sdk-core
  -> @gitborlando/math

@sigma/sdk-yjs
  -> @sigma/sdk-core
  -> yjs

@sigma/sdk-core
  -> @sigma/schema-core
  -> @gitborlando/math

@sigma/schema-core
  -> @gitborlando/math
```

禁止方向：

- `@gitborlando/math` 不允许 import `src/*`、`S.*`、`YState`、`COLOR`、`Assets`、`t()`、React、MobX、DOM。
- `@sigma/sdk-core` 不允许依赖 Canvas、React、浏览器事件、文件服务、Supabase、COS、路由、UI 组件。
- `apps/web` 可以依赖所有 SDK 包，但 SDK 包不能反向依赖 `apps/web`。

## 当前 math 代码分级

### A 类：适合进入 `@gitborlando/math`

这些代码是通用几何 / 数学能力，适合抽到公共包，但要先去掉 auto-import 和项目 alias：

- `apps/web/src/editor/math/matrix.ts`
  - 2D affine matrix，适合公共化。
  - 当前隐式依赖 `XY`、`Angle`，显式依赖 `@gitborlando/geo` 的 `AABB`。
  - 迁移时必须改成显式 import 或改用公共包自己的 `PointLike` / `AabbLike`。

- `apps/web/src/editor/math/mrect.ts`
  - Matrix Rect 是通用变换矩形，可公共化。
  - 建议公共 API 命名为 `MatrixRect`，Sigma 内兼容层继续导出 `MRect`。

- `apps/web/src/editor/math/bezier/points-of-bezier.ts`
  - 曲线打点、RDP 简化是通用能力，可直接公共化。
  - 需要补测试和明确 tolerance / distance 的语义。

- `apps/web/src/editor/render/elem.ts` 里的 `HitTest`
  - 目前放在 render 文件里，但逻辑基本是纯几何。
  - 建议迁到公共包的 `hit-test.ts`，Canvas/Elem 只调用它。

- `apps/web/src/editor/math/base.ts` 中少量函数
  - `pow2`、`pow3`、`divide` 可以公共化。
  - 不建议把 `sqrt/min/max/floor` 这类 `Math` 别名作为公共 API，收益低且污染导出面。

### B 类：只提取算法，不直接进入公共包

- `apps/web/src/editor/math/point.ts`
  - 当前函数返回 `S.Point`，还生成 `id`、设置 `isStart/isEnd`，这是 Sigma schema 语义，不是通用 math。
  - 应拆成两层：
    - `@gitborlando/math`: `regularPolygonPoints`、`starPolygonPoints`、`linePoints`，只返回 `{ x, y }[]`。
    - `@sigma/schema-core`: `createRegularPolygonPoints`、`createStarPolygonPoints`，把通用点包装成 `S.Point`，补 `id/type/symmetric/isStart/isEnd`。

- `apps/web/src/editor/math/bezier/bezier.ts`
  - 当前引用 `../xy`，但当前仓库 `editor/math` 下没有看到 `xy.ts`。
  - 迁移前先确认是否废弃代码；若无人使用，先不要纳入公共 API。
  - 如果要保留，需要先修正 `bezierMidpoint` 中疑似参数错误：调用 `bezierParametricEquation(p1x, p1x, ...)` 很可能应为 `p1x, p1y`。

### C 类：留在 Sigma SDK 或产品层

- `SchemaCreator` 的 node factory
  - 包含 `COLOR`、`Assets`、`themeColor()`、`t()`、默认中文文本等产品语义。
  - 不能直接进公共 math，也不能原样进 headless SDK。

- `StageViewport`
  - 同时依赖 `window`、鼠标滚轮、MobX、StageSurface、选区、dev setting。
  - 可拆出纯 viewport math，但服务类本身属于 renderer / app runtime。

- `Elem` / `StageSurface` / `ElemDrawer`
  - Canvas、Path2D、OffscreenCanvas、DOM event 都是 renderer 层。
  - 不属于 `sdk-core`，可以后续成为 `@sigma/canvas-renderer`。

## `@gitborlando/math` 的推荐 API

公共包应该小而稳，优先暴露稳定底层能力：

```ts
export type PointLike = { x: number; y: number }
export type MatrixLike = {
  a: number
  b: number
  c: number
  d: number
  tx: number
  ty: number
}
export type MatrixTuple = [number, number, number, number, number, number]

export class Matrix2D {}
export class MatrixRect {}

export function regularPolygonPoints(options: {
  width: number
  height: number
  sides: number
}): PointLike[]

export function starPolygonPoints(options: {
  width: number
  height: number
  points: number
  innerRate: number
}): PointLike[]

export function pointsOnBezierCurves(
  points: readonly PointLike[],
  tolerance?: number,
  distance?: number,
): PointLike[]

export function simplifyPolyline(
  points: readonly PointLike[],
  epsilon: number,
): PointLike[]

export const hitTest = {
  roundRect,
  polygon,
  polyline,
  ellipse,
  point,
}
```

兼容策略：

- 公共包里可以叫 `Matrix2D` / `MatrixRect`。
- Sigma 兼容层导出旧名字：

```ts
export { Matrix2D as Matrix, MatrixRect as MRect } from '@gitborlando/math'
export type { MatrixLike as IMatrix } from '@gitborlando/math'
```

- `apps/web/src/editor/math/index.ts` 迁移期继续 re-export 兼容层，避免一次性改完所有 import。

## 公共 math 包的发布约束

`@gitborlando/math` 必须满足：

- TypeScript 编写。
- ESM first，明确 `exports`。
- `sideEffects: false`。
- 不依赖 Sigma schema 类型。
- 不使用 auto-import，全量显式 import。
- 不读取 `window`、`document`、`devicePixelRatio`、`process.env`。
- 不返回带业务字段的对象，例如 `id/type/symmetric/isStart/isEnd`。
- 所有函数输入输出都是 plain data，方便第三方 SPK / SDK 复用。
- 公共 API 一旦发布按 semver 管理，破坏性命名调整必须进 major。

## Sigma Engine SDK 边界

SDK 不应等于当前 `EditorService`。当前 `EditorService` 做了这些事：

- 文件加载：`FileService`、zip、Supabase/COS 相关。
- schema 迁移。
- Yjs 初始化。
- scene/render/stage 订阅。
- hooks / command / operate 初始化。
- viewport 初始化。

这些职责必须拆开。推荐 SDK 分层：

### `@sigma/sdk-core`

Headless，适合 Node、Web Worker、浏览器纯逻辑环境。

职责：

- schema 类型。
- schema migration。
- document store。
- patch / history。
- node/page 创建。
- 层级操作：insert、delete、reorder、clone、wrap。
- 几何操作：set x/y/width/height/rotation、polygon sides、star points。
- 查询：traverse、getSceneMatrix、getChildren、getAncestors、getNodeBounds。

不得包含：

- Canvas / Path2D / OffscreenCanvas。
- React / hooks / MobX 组件绑定。
- DOM event / mouse / wheel。
- Supabase / COS / file URL。
- i18n 文案。
- `Assets` 默认图片。

建议入口：

```ts
const engine = createSigmaEngine({
  schema,
  idFactory,
  defaults,
})

engine.dispatch(createNode({ type: 'rect', parentId }))
engine.dispatch(setGeometry({ id, x, y, width, height }))
engine.undo()
engine.redo()
engine.getNode(id)
engine.subscribe(listener)
```

### `@sigma/sdk-yjs`

可选协同层。

职责：

- 把 `sdk-core` 的 document store 和 Yjs map 互相绑定。
- 提供 awareness client 状态同步。
- 提供 undo manager 适配。

不得包含：

- 鼠标监听。
- 用户服务。
- UI 文案。
- StageViewport。

当前 `YClients` 里的 `UserService`、`listen('mousemove')`、`StageViewport.sceneMatrix` 都需要由 app 注入。

### `@sigma/canvas-renderer`

可选渲染层。

职责：

- Elem 树。
- Canvas surface。
- dirty rect / sliced render。
- text breaker。
- hit test 调用。

不得包含：

- 文件服务。
- React 面板。
- 产品路由。

### `@sigma/react-bindings`

职责：

- `useSchema`、`useSelectNodes`、Signal/MobX 到 React 的桥接。
- 编辑器 UI 可选绑定。

不得包含核心算法。React 包只能调用 SDK，不拥有模型规则。

## SDK 抽取前必须先做的解耦

1. 去掉 `SchemaCreator` 的产品默认值耦合
   - `t('special.untitled')` 改为由 `defaults.nameFactory` 注入。
   - `COLOR` 改为由 `defaults.colors` 注入。
   - `Assets.editor...defaultImage` 改为由 app 层传入。
   - `themeColor()` 改为由 app 层传入。

2. 把全局单例改成可实例化服务
   - 当前 `YState`、`YClients`、`YUndo`、`Schema`、`StageViewport` 都是全局单例。
   - SDK 应支持多个 engine instance，不应只有一个全局文档。

3. 把命令文案和行为拆开
   - core 只返回 command id / operation type。
   - web app 再把 id 映射成 `t()` 文案。

4. 把 selection 从 Yjs client 中抽象出来
   - `selectIdMap`、`selectPageId` 是 core client state。
   - awareness 同步只是一个 adapter，不是 selection 的唯一存储方式。

5. 把 viewport 拆成纯数据与浏览器事件
   - core 可保存 viewport matrix。
   - wheel、resize、clientXY 转换属于 renderer/app adapter。

## 推荐迁移 PR 顺序

### PR 1：math 行为基线

- 给 `Matrix`、`MRect`、`pointsOnBezierCurves`、polygon/star points 补最小测试。
- 暂不移动代码。
- 验收：测试能固定当前行为，后续迁移只允许等价变化。

### PR 2：拆 `point.ts`

- 新增纯函数：
  - `regularPolygonPoints`
  - `starPolygonPoints`
  - `linePoints`
- 让 Sigma 的 `createRegularPolygon` / `createStarPolygon` 只负责包装 `S.Point`。
- 验收：schema 里的点结构不变。

### PR 3：创建 `@gitborlando/math`

- 在外部包或独立目录中实现公共 math API。
- 先只迁 A 类内容。
- 补单元测试和 README。
- 不接入 Sigma 产品代码。

### PR 4：创建 `@sigma/sigma-math-compat`

- 依赖 `@gitborlando/math`。
- 导出 Sigma 旧 API 名称：`Matrix`、`MRect`、`IMatrix`、`IMRect`。
- 保留旧路径 shim：

```ts
export * from '@sigma/sigma-math-compat'
```

- 验收：`apps/web` build 通过，业务 import 可以稍后慢慢切。

### PR 5：逐步替换 Sigma import

- 普通 import 从 `src/editor/math` 分批换到 `@sigma/sigma-math-compat`。
- auto-import 最后改。
- 每批只改一个子域：schema、operate、render、stage。

### PR 6：抽 `@sigma/schema-core`

- 迁 schema 类型、migration、纯 traverse/helper。
- `SchemaCreator` 先拆 product defaults 后再迁。
- `point.ts` 的 Sigma 包装函数迁入这里。

### PR 7：建立 `@sigma/sdk-core`

- 不迁 Canvas、不迁 React、不迁文件服务。
- 先提供 headless document store、operation、history。
- 迁 `Immut` 或替换为更稳定的 patch store，但不要和 UI 迁移混在一起。

### PR 8：Yjs adapter

- 把 `immut-y.ts` 和 Yjs bind 逻辑迁到 `@sigma/sdk-yjs`。
- `UserService`、鼠标位置、viewport 由 app 传入。

### PR 9：Canvas renderer

- 迁 Elem / StageScene / StageSurface / ElemDrawer。
- HitTest 已经来自 `@gitborlando/math`。
- 保持 renderer 只接收 engine state 和 viewport adapter。

### PR 10：Web app 收口

- `apps/web` 只保留产品壳：页面、路由、UI、资源、Supabase/COS、部署脚本。
- 编辑器核心调用 SDK。

## 关键风险

| 风险                                | 处理                                                               |
| ----------------------------------- | ------------------------------------------------------------------ |
| 公共 math API 被 Sigma schema 污染  | `@gitborlando/math` 只接受 plain data，不返回 `S.Point`            |
| 迁移后第三方 SPK 依赖 Sigma         | 禁止 `@gitborlando/math` 和 `sdk-core` import `apps/web` / `src/*` |
| SDK 抽成单例，无法复用多个文档      | 所有 core service 改成 factory / class instance                    |
| Yjs、UI、renderer 被打进 core SDK   | Yjs、Canvas、React 都做独立 adapter 包                             |
| auto-import 让依赖边界失真          | 新包内禁止 auto-import，web 的 auto-import 最后再改                |
| 旧 `src/editor/math/obb` 引用缺文件 | 抽 math 前先确认来源；如果确实缺失，先补齐或删除死引用             |
| `bezier.ts` 可能存在旧 bug          | 无使用就不发布；要发布先补测试并修参数问题                         |

## 对 `monorepo.md` 的覆盖结论

- `@sigma/editor-math` 不作为长期包名；改成 `@gitborlando/math` + `@sigma/sigma-math-compat`。
- `editor-runtime` 不应一次性迁移；先拆出 `sdk-core`，再拆 `sdk-yjs`、`canvas-renderer`、`react-bindings`。
- `schema-core` 的优先级提高，因为 SDK core 依赖它。
- UI 仍然最后迁移。
- 任何公共包和 SDK 包都必须先过“无 app、无 DOM、无产品资源、无 i18n”的边界检查。
