# render 模块 review

范围：`apps/web/src/editor/render`

## 模块意图

`render` 是编辑器自建 canvas 渲染内核，主要包含：

- `Elem`：渲染树节点、局部事件、命中测试。
- `StageScene`：把 schema/YState patch 映射成 Elem tree。
- `StageSurface`：canvas 管理、渲染调度、脏矩形、事件分发。
- `ElemDrawer`：按 schema node 绘制形状、文字、填充、描边、阴影。
- `react/reconciler`：让 React 可以渲染 widget Elem。
- `text-break`：文本换行、字素边界、Unicode line break。

这是整个 editor 里最核心、也最有长期价值的模块之一。

## 架构评价

### 优点

- 自建 `Elem` tree 是合理选择。编辑器的 scene node 和 overlay widget 都需要自己的层级、命中测试和绘制生命周期。
- `StageSurface` 分 main canvas 和 top canvas，符合主内容与控件 overlay 分离的设计。
- 脏矩形、平移复用旧 canvas、分片 full render 这些方向都很专业，说明你在考虑大画布性能。
- `text-break` 没有简单依赖 `split('')` 或按空格断行，而是接了 grapheme break 和 line break，方向非常好。
- React reconciler 让 overlay widget 可以继续用 React 写，这是很好的折中。

### 主要问题

#### 1. `StageScene` page switch 时没有清理 elements cache

`firstRenderPage()` 里：

```ts
StageSurface.clearSurface()
this.sceneRoot.children = []
```

但没有清理 `this.elements`。切换页面后，旧页面 elem 仍可能留在 cache 中，`findElem(oldId)` 还会返回旧 elem。

这会影响：

- 选区和 hover 查找。
- StageTransformer 读取 elem。
- 后续新页面如果有相同 id 或旧 id 残留，行为不可预期。

建议切 page 时清理 scene elem cache，至少移除旧 page 的所有 scene elems，只保留 root/widget。

#### 2. `StageScene.updateNode()` 假设 elem 一定存在

```ts
const elem = this.findElem(node.id)
elem.node = clone(node)
```

如果 patch 顺序导致属性 patch 先于 add patch，或 page switch 后 cache 状态不一致，这里会直接报错。

建议：

- `updateNode()` 找不到 elem 时，尝试 mount。
- 或在 patch 层保证 add 后才会 update，并加 dev assert。

#### 3. reparent / childIds remove 没有完整维护 Elem tree

`hookPatchRender()` 遇到 `keys[1] === 'childIds'` 调 `reHierarchy()`。但 `reHierarchy()` 只处理 `type === 'add'`，对 `remove` 不处理。

同 parent reorder 时，delete 后 add 也许还能靠 add 分支纠正；但跨 parent reparent 时，旧 parent 的 children 可能残留旧 elem，然后新 parent 又插入同一 elem，产生树关系不一致。

建议把 childIds patch 分成：

- add child id：插入到新 parent，并从旧 parent detach。
- remove child id：从该 parent detach，但不 destroy node。
- remove node：destroy subtree。

这需要和 `HandleNode.removeChild/deleteChild` 的语义配套。

#### 4. `ElemDrawer` 计算了 dirtyRects 但没有交给 StageSurface

`ElemDrawerService` 里有 `dirtyRects`，绘制 stroke、shadow、text 时会 push 扩展区域。但当前 `Elem.getDirtyRect()` 只返回 `this.aabb`，没有使用 drawer 的扩展 dirty rect。

结果是：

- shadow、outer stroke、文本行高超出节点 aabb 时，局部重绘可能清不干净旧像素。
- `draw.ts` 里的 dirtyRects 成了无效复杂度。

建议让 Elem 或 Drawer 暴露视觉 dirty rect，例如：

```ts
elem.visualAABB = drawer.getVisualAABB(node)
```

或者在 `getDirtyRect()` 中统一考虑 stroke/shadow/text decoration。

#### 5. `StageSurface` 和 `StageScene` 互相 import，形成核心循环依赖

`StageSurface` import `StageScene`，`StageScene` import `StageSurface`。这两个模块确实关系密切，但作为核心底座，循环依赖会让初始化顺序更脆。

建议不一定马上拆，但可以把事件/渲染调度方向改成：

- `StageScene` 只维护 tree。
- `StageSurface` 接收 rootElems 渲染。
- 上层 runtime 把 scene 注册到 surface。

或者抽一个很薄的 `RenderScheduler`。

#### 6. `StageSurface.initTextBreaker()` 没有在本模块生命周期中保证调用

`StageSurface` 有 `textBreaker!: TextBreaker`，但 `subscribe()` 没有调用 `initTextBreaker()`。如果 text node 在 textBreaker ready 前绘制，`ElemDrawer.breakText()` 会失败。

建议：

- `StageSurface.subscribe()` 或 editor bootstrap 里明确 await text breaker。
- 给 draw text 加 fallback：breaker 未 ready 时跳过文字并 requestRender。

#### 7. OffscreenCanvas 和 `ctx.letterSpacing` 需要兼容策略

`TextBreaker` 和 `StageSurface` 使用 `OffscreenCanvas`，`ElemDrawer` 设置 `ctx.letterSpacing`。这些能力不是所有浏览器都稳。

建议：

- 封装 canvas creation，必要时 fallback 到 document canvas。
- 对 `letterSpacing` 做能力检测，至少不要让它成为渲染失败点。

#### 8. React reconciler host config 有不少未实现方法

`react/reconciler.ts` 里多个 HostConfig 方法直接 throw。只要 React 在某些场景调用到这些方法，就会崩。

另外 `prepareUpdate()` 里直接 apply props，但 React reconciler 通常期望 `prepareUpdate` 返回 payload，`commitUpdate` 再执行 mutation。现在能不能稳定工作取决于 reconciler 版本和调用路径。

建议：

- 补齐当前 React 版本必需的 host methods。
- 把 mutation 放到 `commitUpdate`。
- 给 `renderElem()` 做最小 mount/update/unmount 测试。

#### 9. `text-break` 对编辑器文本语义有损

`breakText()` 一开始执行：

```ts
text = (text || '').trim().replace(MULTIPLE_SPACE_REGEX, SPACE)
```

这会丢失前后空格，并折叠多个空格。对普通文本展示可能没问题，但对设计工具文本编辑不一定能接受。

建议根据文本节点属性决定是否 preserve whitespace，而不是换行器默认 trim。

#### 10. vendored Unicode 数据缺少来源和版本说明

`grapheme-break`、`line-break`、`unicodeData.ts`、`classes.trie` 看起来是引入或生成的 Unicode 数据。建议补来源、版本、license、生成脚本说明。否则后续升级 Unicode 或处理许可会很难。

## 文件级评价

### `elem.ts`

自建 tree 和事件模型方向正确。建议关注：

- stopPropagation 是否应中断同层后续 handler。
- hitTest cache 依赖是否足够稳定。
- visible cache 依赖里混入对象引用的可靠性。
- dirty rect 应升级到 visual bounds。

### `scene.ts`

是 schema patch 到 render tree 的桥。当前最大风险是 page switch cache 和 reparent childIds 处理。建议优先修。

### `surface.ts`

性能意识很强，是很有价值的模块。建议补 textBreaker 初始化、provider lifecycle 式 dispose、DPR 更新、OffscreenCanvas fallback，以及脏矩形空集/扩展区域处理。

### `draw.ts`

绘制能力已经覆盖 rect/frame/ellipse/path/text/fill/stroke/shadow/image。建议继续完善：

- gradient/image stroke。
- fill.image 的 matrix 支持。
- shadow/stroke dirty rect 生效。
- text preserve whitespace。
- image load error。

### `react/reconciler.ts`

方向好，但属于高风险基础设施。建议把 HostConfig 合约补完整，并加最小测试。

### `text-break/*`

基础能力强，适合保留为独立模块。需要补来源/license/版本/生成方式，以及文本语义是否 preserve whitespace 的产品决策。

## 建议优先级

1. 修 `StageScene` page switch cache 和 childIds reparent。
2. 让 dirty rect 真正覆盖 stroke/shadow/text 超出区域。
3. 明确并保证 textBreaker 初始化。
4. 补 React reconciler 的 HostConfig 合约。
5. 给 text-break 补来源、版本、许可和 whitespace 策略。
