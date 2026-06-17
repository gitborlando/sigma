# editor 模块总体架构 review

范围：只评价 `apps/web/src/editor` 内的模块。为了理解意图，少量查看了 schema 类型和 view 对 editor 的引用，但不评价其他 packages 或 view 层实现。

## 总体意图判断

这个目录不是普通表单业务层，而是在实现一个偏 Figma / 白板 / 矢量画布的编辑器内核。它的核心意图大致是：

- 用 `schema` 表达文档树与节点属性。
- 用 `y-state` 承接本地状态、协同状态、undo 状态。
- 用 `render` 自建 canvas 渲染树、命中测试、脏矩形和分片渲染。
- 用 `stage` 承接视口、工具模式、选择、创建、移动、变换等画布交互。
- 用 `handle` 和 `operate` 表达对选区、页面、节点和属性面板的领域操作。
- 用 `math` 作为几何变换、矩形、曲线和图形点生成的基础设施。

这个方向是对的：编辑器类产品如果想长期扩展，确实需要把“文档模型、状态同步、渲染、交互、属性操作”拆开，而不是把所有逻辑塞进 React 组件。

## 当前架构的主要优点

1. 模块切分方向基本正确。`schema / y-state / render / stage / operate / handle / math` 对应的是编辑器内核里天然存在的层。
2. `Matrix + MRect` 的抽象方向正确。当前 schema v2 试图把局部变换收敛到 `matrix`，这是支持嵌套、旋转、缩放和多选变换的合理地基。
3. `StageSurface + Elem + StageScene` 自建渲染树是有价值的。它让 canvas 渲染、事件分发、脏矩形、widget overlay 可以从 React DOM 中独立出来。
4. `YState` 封装 Yjs 是正确方向。调用方不直接操作 Y.Map / Y.Array，可以降低协同实现对业务模块的侵入。
5. `ClientUndo + Undo` 尝试把本地 UI 状态和文档状态合成一套 undo 栈，这个目标非常符合编辑器实际需求。

## 当前架构的核心风险

### 1. schema 几何模型没有真正收敛

当前 v2 类型已经以 `MRect + matrix` 为核心，但部分模块仍在使用旧的 `x / y / rotation / OBB` 思维：

- `operate/align.ts` 写 `node.x` / `node.y`。
- `handle/node.ts` 用 `OBB.fromRect(node, node.rotation)`。
- `schema/creator.ts` 创建节点时仍写入 `x / y / rotation`，并且缺少 v2 里很关键的 `__isNode / flip`。
- `SchemaCreator.line()` 把 rotation 传给 `createLine()`，但 `createLine()` 实际不接收 rotation。

这不是单点 bug，而是架构上“几何事实来源”还没有统一。只要这个问题存在，后续任何对齐、变换、嵌套 frame、多选 resize、复制到新 parent 的逻辑都会变得脆弱。

建议优先级：最高。先确定 schema v2 的唯一几何模型：节点局部几何是否只由 `width / height / matrix / flip` 表达。如果是，就应该系统性移除业务操作里对 `x / y / rotation` 的写入依赖。

### 2. 单例服务过多，依赖方向被全局 auto-import 隐藏

这个目录几乎所有模块都导出全局单例：`Editor / YState / HandleSelect / StageSurface / StageViewport / StageScene / StageInteract / OperateFill` 等。配合 `unplugin-auto-import`，很多真实依赖不会出现在 import 列表里。

这让使用很方便，但会带来三个问题：

- 很难看出模块之间的真实依赖方向。
- 生命周期容易重复注册或泄漏，例如 hotkeys、reaction、Signal hook。
- 测试很难构造隔离环境，因为状态散落在全局单例里。

建议方向不是立刻改成复杂 DI，而是先给每个服务统一生命周期约定：`init/subscribe/dispose` 必须返回 disposer；所有 hook / reaction / DOM listener / hotkey 绑定都必须被同一个 disposer 接住。

### 3. `y-state` 同时承接了太多状态事实

当前状态事实至少有四套：

- `Immut.state`：本地读模型和 patch 来源。
- `Y.Doc`：协同写模型。
- `Y.UndoManager`：文档 undo。
- `ClientUndo`：本地 UI 状态 undo。
- `Awareness`：多人临时状态。

封装目标是对的，但事务边界和回放顺序必须非常清晰，否则协同、undo、选择状态会出现难复现的问题。当前 `Undo.track('all')` 同时归档 client state 和 Yjs undo 的做法方向正确，但缺少更强的领域事务抽象。

建议引入更明确的“编辑事务”概念：一次用户操作产生文档 patch、client patch、描述、是否可合并、是否协同广播，而不是每个模块自己决定何时 `YState.transact()` 和 `Undo.track()`。

### 4. render / stage / schema 强耦合是合理的，但缺少边界稳定层

编辑器里 render 与 stage 天然会耦合；问题不在耦合本身，而在耦合点分散：

- `stage/interact/select.ts` 直接遍历 schema、读 elem、写 HandleSelect。
- `stage/tools/transformer.ts` 同时理解 scene matrix、parent matrix、schema matrix、YState patch。
- `render/scene.ts` 根据 YState patch 直接维护 Elem 树。
- `operate/align.ts` 通过 StageScene 的渲染结果反推布局操作。

更稳的方向是建立少量稳定的中间接口，例如：

- `DocumentQuery`：查询当前页、节点、祖先、scene matrix、children。
- `DocumentCommand`：添加/删除/移动/变换节点。
- `HitTestService`：从 stage 坐标拿命中节点。
- `SelectionService`：选择状态与 undo 统一入口。

不一定要大重构，但应该逐步减少“任何模块都直接找任何单例”的模式。

### 5. 有明显的半成品模块，需要标记状态

以下模块看起来是占位或半迁移状态：

- `handle/picker.ts`
- `operate/stroke.ts`
- `operate/shadow.ts`
- `operate/text.ts`
- `operate/points.ts`
- `stage/tools/guide.ts`
- `stage/tools/ruler.ts`
- `math/bezier/bezier.ts`

半成品不是问题，但如果被正式路径引用，就会制造不确定性。建议用文件头注释或目录级 README 标出状态：`experimental / unused / legacy / active`。

## 建议的架构演进顺序

1. 先收敛 schema v2 几何模型，修正所有还在写旧 `x/y/rotation` 的操作。
2. 再统一生命周期管理，把所有 hook / reaction / listener / hotkeys 纳入 disposer。
3. 然后为 `YState + Undo` 建立领域事务入口，减少各模块散落的 `Undo.track()`。
4. 接着整理 render 和 stage 的边界，优先处理 `StageScene` 的 page switch、Elem tree 缓存、dirty rect 扩展。
5. 最后清理半成品模块和 mock/test 入口，避免实验代码混入正式初始化路径。

## 总体评价

这是一个方向正确、野心不小、已经有内核雏形的编辑器实现。最值得肯定的是你没有把编辑器写成 React 组件堆，而是已经在建立文档模型、渲染树、交互模式、属性操作和协同状态。

但当前最大问题也很明确：模型迁移尚未完成，导致一部分代码在 `matrix` 世界里，另一部分还在 `x/y/rotation/OBB` 世界里。这个问题如果不先解决，后续继续堆功能会越来越像“靠经验调到能跑”，而不是可推导、可维护的编辑器内核。
