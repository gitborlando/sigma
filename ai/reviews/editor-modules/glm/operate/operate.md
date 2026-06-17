# operate 模块评价

评分：**5.5 / 10** —— 这一层的存在是合理的（属性面板编辑服务），但实现上 fill/stroke/shadow 近乎复制粘贴，且夹着旧的 `immui`/`class-autobind-decorator` 残骸，是 editor 里工程债最重的一层。

涉及文件：`fill.ts`(90) / `stroke.ts`(100) / `shadow.ts`(100) / `text.ts`(121) / `align.ts`(144) / `geometry.ts`(221) / `points.ts`(30, 空壳)

---

## 1. 意图

这一层是 **「右键/属性面板编辑」的服务层**。它要解决的问题是：当用户在属性面板里改填充、描边、阴影、文字样式、对齐、几何尺寸时，怎么把「面板上的本地草稿状态」和「YState 里多选节点的实际状态」双向同步，并把编辑提交成可撤销的事务。

它和 `handle`（节点结构操作）的区别是粒度：operate 是**属性级**，面向「属性面板 / 右键菜单」这类细粒度编辑入口。

---

## 2. 架构画像

这一层的文件高度同构，可以分成两组：

**A 组（属性样式编辑，样板严重）：`fill` / `stroke` / `shadow`**

- 每个服务都持有一份本地副本（`fills/strokes/shadows: S.xxx[]`）；
- `setupXxx()`：选区变化时，把选中节点的该属性拷到本地副本（处理多选「相同/不同」的 isMulti 标志）；
- `setXxx/toggleXxx/changeXxx`：修改本地副本 → applyChangeToYState；
- `applyChangeToYState`：把本地副本写回所有选中节点的 YState；
- `initHook`：订阅 `HandleSelect.afterSelect` + `YState.subscribe(patches)` 重建本地副本；
- stroke/shadow 还额外 hook `UIPickerCopy.onChange` 接收 picker 的 patch。

**B 组（其他）：`text` / `align` / `geometry`**

- `text`：文字样式多选合并（同 fill 思路）+ textStyle 草稿；
- `align`：6 种对齐，每种算 shift 后写 YState；
- `geometry`：几何尺寸面板（x/y/w/h/rotation/radius/sides 等），支持 delta/absolute，处理多选 MULTI_VALUE；
- `points`：**空壳**（`class DesignPointsService {}` 空类）。

---

## 3. 成立的部分

### 3.1 「本地副本 + 多选合并 + apply 回写」的模型本身是对的

属性面板编辑有个本质矛盾：面板显示一份值，但选区可能是多个节点、各自的值不同。operate 的解法是：

- 单选：副本 = 该节点的属性；
- 多选且全相同：副本 = 第一个节点的属性；
- 多选且有差异：`isMultiXxx = true`，面板显示「多种值」占位（MULTI_VALUE）。

这是 Figma/Sketch 这类工具的标准做法，模型选对了。`setupTextStyle` 里「逐字段比对，不同则标 multi」的逻辑也是对的。

### 3.2 `fill.ts` 用 immer `produceWithPatches` 是这一层最干净的写法

```ts
setFills(setter) {
  const [fills, patches] = produceWithPatches(this.fills, setter)
  this.fills = fills
  this.applyChangeToYState(patches)
}
applyChangeToYState(patches) {
  YState.transact(() => {
    nodes.forEach((node) => YState.applyImmerPatches(patches, `${node.id}.fills`))
  })
}
```

这是 operate 层该有的样子：**用 immer 草稿改本地副本，拿到 patch，把 patch 通过 `YState.applyImmerPatches` 批量 apply 到所有选中节点**。patch 复用意味着多选时「改一个 fill 的 color」对 N 个节点只产生 N 次 apply 但同一个 patch 语义。

可惜只有 fill 这么写，stroke/shadow 还在用坏的 immui（见 4.1）。

### 3.3 `geometry.ts` 的 delta/absolute 双模式 + MRect 联动，数学上扎实

`DesignGeometry` 支持 `isDelta`（增量）和 absolute（绝对值）两种输入，对每个 changing key 区分「OBB 类（x/y/w/h/rotation，走 MRect）」和「形状参数类（radius/sides/pointCount/innerRate，直接改字段 + 重算 points）」。`onStartSetGeometries` 缓存每个节点初始几何，`onEndSetGeometries` 清缓存，是一次完整拖拽的生命周期。

对 polygon/star，改 sides/pointCount 会 `createRegularPolygon/createStarPolygon` 重算 points，保证形状参数和顶点数据一致。

### 3.4 `align.ts` 用 Signal + hook 驱动「点击对齐按钮 → 自动对齐」

```ts
initHook() {
  HandleSelect.afterSelect.hook(this.setupAlign)
  this.currentAlign.hook(this.autoAlign)   // 点按钮 dispatch currentAlign → 自动执行
}
```

把「UI 点击」抽象成 `currentAlign` Signal，effect 里自动执行对齐并 track。这让 UI 层只需 `OperateAlign.currentAlign.dispatch('alignLeft')`，不用关心怎么算。方向对。

---

## 4. 问题与风险

### 4.1 `stroke.ts` / `shadow.ts` 用坏的 `immui` 占位，是明确的 bug 残骸 ⚠️（最严重）

```ts
// stroke.ts / shadow.ts
import autobind from 'class-autobind-decorator'
class OperateStrokeService {
  private immui = new (class {})() // ← 空对象
  addStroke() {
    this.immui.add(this.strokes, [strokesLength], stroke) // ← 空对象没有 add 方法，TypeError
    this.applyChangeToYState()
  }
}
```

和 `handle/picker.ts` 完全一样的问题：`immui = new (class {})()` 是空对象，调 `this.immui.add/reset/delete/applyPatches/next` **全部会 TypeError**。这意味着：

- 任何「加描边/加阴影/改描边/改阴影」的操作**当前都是坏的**；
- 只有 fill（用 immer）和 text（直接改）是能工作的。

这要么是「immui 是个待实现的状态管理工具，作者还没写完就切到了 immer（fill.ts）」，要么是「immui 曾经存在但被删了，stroke/shadow 没跟着迁移」。无论哪种，**当前 stroke/shadow 的编辑路径是死的**。

而且 `class-autobind-decorator` 这个包和项目其他地方用的 `auto-bind` 是两套不同的 autobind 库，风格不统一。

> 必须做：把 stroke/shadow 迁移到 fill.ts 的 immer 写法（`produceWithPatches` + `applyImmerPatches`），删掉 immui 引用。这能同时修 bug + 消除三份重复。

### 4.2 fill/stroke/shadow 三份代码 90% 重复，是没抽象的样板 ⚠️

把三个文件并排看，结构几乎一字不差：

| 步骤                  | fill                    | stroke                                | shadow                                |
| --------------------- | ----------------------- | ------------------------------------- | ------------------------------------- |
| 本地副本              | `fills`                 | `strokes`                             | `shadows`                             |
| setup                 | `setupFills`            | `setupStrokes`                        | `setupShadows`                        |
| isMulti               | `isMultiFills`          | `isMultiStrokes`                      | `isMultiShadows`                      |
| isSame                | `isSameFills`           | `isSameStrokes`                       | `isSameShadows`                       |
| add/delete/set/change | `setFills/setFill`      | `addStroke/deleteStroke/setStroke...` | `addShadow/deleteShadow/setShadow...` |
| applyChangeToYState   | immer patches           | immui（坏）                           | immui（坏）                           |
| initHook              | afterSelect + subscribe | 同 + onUiPicker                       | 同 + onUiPicker                       |

这三份本应是一个泛型 `StyleListService<T extends {fills|strokes|shadows}>`，配置「字段名、creator 工厂、picker 来源」即可。现在的写法是典型的「复制粘贴改名字」，任何一处修 bug 都要改三遍（事实上 fill 已经迁移 immer，stroke/shadow 没跟上，正是这种维护方式的后果）。

> 方向：抽 `createStyleListOperator({ key, createDefault, pickerFrom? })`，fill/stroke/shadow 各自只剩几十行配置。这一步做完，4.1 自动解决。

### 4.3 `text.ts` 的 textStyle 多选合并逻辑里有大段 `@ts-ignore`，类型逃逸

```ts
private setupTextStyle() {
  const newTextStyle = <IBaseStyle>{}
  textStyleKeys.forEach((key) => {
    let firstNodeStyleValue = this.textNodes[0].style[key]
    this.textNodes.forEach(({ style }) => {
      if (style[key] === firstNodeStyleValue) {
        //@ts-ignore
        newTextStyle[key] = firstNodeStyleValue
      } else {
        //@ts-ignore
        newTextStyle[key] = typeof style[key] === 'number' ? -1 : 'multi'
      }
    })
  })
}
```

`@ts-ignore` 连续出现，是因为 `newTextStyle[key]` 的赋值类型系统推不准。根因是 `IBaseStyle` 和 `ITextStyle` 的 key 集合不同（baseStyle 是子集），且「multi」这种联合类型被注释掉了（文件顶部那段注释掉的 `IMulti` 类型）。

正确的解法是把「多选合并值」显式建模成 `ITextStyle | { _multi: true }` 或 `Record<key, value | MULTI_VALUE>`，用一个独立的 `MultiValueMap` 类型，而不是靠 `@ts-ignore` + 运行时塞 -1/'multi' 字符串。

而且 `OperateText` 也用了 `class-autobind-decorator` + 一个空的 `immui = new (class {})()`，`setTextStyle` 里 `this.immui.reset(this.textStyle, [key], value)` 同样会炸——**文字样式编辑当前也是坏的**，只是因为 `applyChangeToYState` 紧接着直接 `this.immui.next(this.textStyle)[0]`，如果 immui 真是空对象，`this.textStyle` 根本没被更新（但下一行又重新赋值 `this.textStyle = this.immui.next(...)`，所以表面看 textStyle 变了其实是 immui.next 抛错被吞？需要确认，但至少类型和实现都是坏的）。

### 4.4 `align.ts` 引用了未导入的符号，且用动态 `this[currentAlign.value]()` 调用

```ts
private autoAlign() {
  YState.transact(() => {
    this[this.currentAlign.value]()   // ← 动态按方法名调用
  })
}
```

`currentAlign.value` 是 `'alignLeft'|'alignCenter'|...`，`this[...]()` 靠 TS 的索引签名兜过去。这种「方法名当数据」的写法，新增一个对齐类型时要同时改 `alignTypes` 数组 + 加私有方法 + 确保命名严格匹配，三处一致性靠人记。

另外 `align.ts` 顶部注释掉的旧实现和 `gpt5.5-comment.md` 提到的「align.ts 引用 SchemaUtil 但没导入」可能相关——当前文件用的是 `SchemaHelper`，看起来已经迁移过了，这点是好的。

### 4.5 `geometry.ts` 的 `currentGeometries` 是单一对象承载所有几何字段，扩展性差

```ts
currentGeometries = createDesignGeoInfos() // {x,y,w,h,rotation,radius,sides,pointCount,...}
currentKeys = createActiveKeys(new Set()) // 当前激活的字段
```

所有几何字段塞在一个扁平对象里，再用 `currentKeys` Set 标记「当前节点类型支持哪些字段」。这意味着：

- 加一个新形状参数（比如「圆角矩形的每个角不同 radius」）要改 `createDesignGeoInfos` + `setupGeometries` 的 type 判断 + `applyChangeToNode` 的分支；
- `MULTI_VALUE` 用全局常量塞进 number 字段，类型上是 number 但语义是「无效占位」。

更稳的是 `currentGeometries: Partial<Record<GeomKey, number | typeof MULTI_VALUE>>`，按 key 显式区分。

### 4.6 `points.ts` 是空壳，应删除

```ts
class DesignPointsService {}
export const DesignPoints = autoBind(makeObservable(new DesignPointsService()))
```

完全空的类，连 `makeObservable` 都没必要。要么删，要么标 TODO 说明它要做什么（路径编辑？）。当前状态是噪音。

### 4.7 几乎所有 operate 服务都是全局单例 + initHook 模式，与 lifecycle effect 方向冲突

每个服务都是 `export const OperateXxx = new XxxService()`，在 `editor.ts` 的 `initHooks` 里手动调 `init()`/`initHook()`。这把「服务的副作用注册」和「服务的实例化」耦合：模块一 import 就构造，但副作用要等 `initHooks` 才挂。中间窗口里（已构造未 init），属性订阅没建立，如果此时有 patch 进来会漏。

这和 `editor-lifecycle-effects.md` 推的「effect 负责 wiring，session 负责 lifecycle」直接冲突。

---

## 5. 方向建议

1. **统一 fill/stroke/shadow 为一个泛型 operator**（最高优先级）。这一步同时解决 4.1（修 bug）和 4.2（消重）。配置驱动：`createStyleListOperator({ schemaKey, factory, pickerFrom? })`。
2. **迁移 text 到 immer 写法**，去掉 `@ts-ignore` 和空 immui。多选合并值显式建模。
3. **删 `points.ts` 空壳**，或补 TODO。
4. **`align.ts` 的方法名分发改成 switch/lookup table**，避免动态 `this[name]()`。
5. **`geometry.ts` 的字段模型改 `Partial<Record>`**，去掉扁平对象 + Set 的组合。
6. **统一 autobind 库**：全用 `auto-bind`，去掉 `class-autobind-decorator`。
7. **operate 服务从单例 + initHook 改成 effect 模式**，配合 editor lifecycle 的 session 重构。

---

## 小结

这一层是 editor 里**实现质量最低**的一层：模型是对的（本地副本 + 多选合并 + apply 回写），但实现上三份重复、夹着坏的 immui 残骸、text 还在用 `@ts-ignore`。它的核心问题不是「想错了」，而是 **「fill 已经演进到 immer，但 stroke/shadow/text 没跟上」+「没有抽出公共 operator」**。把三份合并成一个泛型 operator、迁移到 immer，这一层会从「最差」变成「最规范」。
