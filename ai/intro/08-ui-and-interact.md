# 08 · UI 层与交互系统

这一篇讲 `view/`（React UI 层）和 `editor/stage/interact/`（交互状态机）。回答两个问题：① 界面是怎么搭起来的；② 用户的鼠标键盘操作怎么变成编辑行为。

---

## UI 层的整体结构

编辑器界面是经典的设计工具布局：

```
┌──────────────────────────────────────────────────────┐
│                    Header（顶栏）                       │  view/editor/header/
├──────────┬───────────────────────────────┬───────────┤
│          │                               │           │
│ LeftPanel│           Stage               │ RightPanel│
│ （图层）  │         （画布）                │ （属性）   │
│          │                               │           │
│          │                               │           │
└──────────┴───────────────────────────────┴───────────┘
```

入口 `view/editor/index.tsx`：

```tsx
export const EditorComp = withSuspense(
  ({}) => {
    const { fileId } = useParams()
    useMemo(() => Editor.init(), [])
    suspend(() => YState.initSchema(fileId!), [fileId])
    suspend(() => StageSurface.initTextBreaker(), ['initTextBreaker'])
    useClean(() => {
      Editor.dispose()
      clear([fileId])
    })

    return (
      <G vertical='auto 1fr'>
        <HeaderComp />
        <G horizontal='auto 1fr auto'>
          <LeftPanelComp />
          <StageComp />
          <RightPanelComp />
        </G>
      </G>
    )
  },
  <Loading />,
)
```

注意 `<G>` 是布局主力组件（见 [03-getting-started](./03-getting-started.md)）。`G vertical='auto 1fr'` 是上下两行 grid，`G horizontal='auto 1fr auto'` 是左中右三列 grid。

---

## 四大区域的职责

### Header（`view/editor/header/`）

顶栏，包含：

| 组件               | 作用                                           |
| ------------------ | ---------------------------------------------- |
| `cooperate.tsx`    | 协作者头像列表、跟随视角                       |
| `history.tsx`      | 撤销 / 重做按钮（订阅 `Undo.canUndo/canRedo`） |
| `zoom.tsx`         | 缩放控制（订阅 `StageViewport.zoom`）          |
| `setting.tsx`      | 设置（devMode 开关等）                         |
| `dev-snapshot.tsx` | 开发用的状态快照（仅 devMode）                 |

### LeftPanel（`view/editor/left-panel/`）

左侧图层面板，分两块：

- **页面列表**（`panels/page/`）：所有页面，可新建 / 切换 / 重命名 / 删除
- **节点树**（`panels/node/`）：当前页面的节点层级，支持展开收起、多选、拖拽重排层级

节点树的状态来自 `LayerPanelNodeTree`（editor 服务），它用 `createSchemaTraverse` 遍历当前页面构建一个扁平的 `nodeInfoList`（含 indent 层级），UI 用 `@tanstack/react-virtual` 做虚拟滚动。

### RightPanel（`view/editor/right-panel/`）

右侧属性面板，只有选中节点时显示。核心是 `operate/index.tsx`：

```tsx
<Scrollbars>
  <AlignComp /> {/* 对齐分布 */}
  <EditorRightOperateGeo /> {/* 几何（x/y/w/h/旋转） */}
  <EditorRPOperateFillComp />
  {/* 填充列表 */}
  <FillPickerComp x-if={isShowPicker} /> {/* 颜色选择器 */}
</Scrollbars>
```

- **`operate/` 是 React 组件**，但它们读写的是 **`editor/operate/` 的服务**（`OperateAlign`、`OperateFill`）。
- `OperateFill` 维护一个 `fills` 状态，多选时智能合并（相同填充显示，不同显示「多值」）。详见 [04-data-flow](./04-data-flow.md) 的例子。

### Stage（`view/editor/stage/`）

画布区，包含：

| 组件            | 作用                                              |
| --------------- | ------------------------------------------------- |
| `surface.tsx`   | 挂载实际的 `<canvas>` 元素，初始化 `StageSurface` |
| `ruler.tsx`     | 标尺                                              |
| `cursor.tsx`    | 他人协同光标（widgetElem）                        |
| `transform.tsx` | 变换手柄（8 个控制点）                            |
| `outline.tsx`   | 选中描边                                          |
| `marquee.tsx`   | 框选矩形                                          |
| `grid.tsx`      | 网格开关                                          |
| `fps.tsx`       | 帧率显示（devMode）                               |

`transform`、`outline`、`marquee`、`cursor` 这几个不是普通 DOM，它们通过自定义 React Reconciler 渲染成 widgetElem（见 [06-render](./06-render.md) 的 widgetRoot 部分）。

---

## 通用 UI 组件（`view/component/`）

一组跨页面复用的小组件：

- `btn.tsx`：`Btn` 按钮，三种 variant（`solid` / `outline` / `ghost`），多种 size（24/28/30/32/36）
- `grid.tsx`：`G` / `Grid` 布局组件（最常用）
- `input-num.tsx`：数字输入框（带拖拽改值）
- `popover-card.tsx`：气泡卡片
- `segments.tsx`：分段控件
- `menu.tsx` / `context-menu.tsx`：菜单和右键菜单
- `uploader.tsx`：文件上传
- `kbd.tsx`：快捷键提示徽标
- `loading.tsx`：加载态
- `drag-panel.tsx`：可拖拽面板
- `switch-bar.tsx`：切换栏
- `divider.tsx`：分隔线
- `lucide.tsx`：lucide 图标封装

这些组件遵循 [ai/instructions/ui.md](../instructions/ui.md) 的设计规范：极简、专业、白灰中性、细边框、紧凑。

---

## 样式方案：Linaria（不是 Tailwind）

按 [AGENTS.md](../../AGENTS.md) 约定，**不用 Tailwind 写组件样式**，而是用 **Linaria**（`@linaria/core`）。

Linaria 是编译期 CSS-in-JS：你在组件里写 `css\`...\``，构建时会被提取成真实 CSS 文件，运行时零开销。

典型写法：

```tsx
const cls = classes(css`
  &-cooperate-observing-border {
    position: absolute;
    top: 0; left: 0;
    border: 2px solid var(--color);
  }
`)

// 使用
<G className={cls('cooperate-observing-border')} style={{ '--color': client.color }} />
```

- `css\`...\`` 生成一个带 hash 的类名工厂
- `classes()` 把它包装成支持 `cls('子类名')` 的函数
- `cx()` 用于合并多个类名（类似 classnames）
- `classNameSlug: () => miniId(5)`（vite.config）让类名简短

> 项目里**装了 Tailwind**（`@tailwindcss/vite`），但只是作为 utility 补充（比如 reset），主力样式还是 Linaria。新代码请遵循 AGENTS.md 用 Linaria。

---

## 交互状态机：StageInteract

这是编辑器交互的核心抽象。整个画布的鼠标行为，由一个**交互状态机**统一管理。

`editor/stage/interact/interact.ts`：

```ts
type IStageInteraction = 'select' | 'move' | 'create'

class StageInteractService {
  @observable interaction: IStageInteraction = 'select'

  private onInteract() {
    return autorun(() => {
      this.offInteract?.()
      const interact = matchCase(this.interaction, {
        select: () => StageSelect.startInteract(),
        move: () => StageMove.startInteract(),
        create: () => StageCreate.startInteract(),
      })
      this.offInteract = interact // 切换模式时先释放上一个
    })
  }
}
```

**三种交互模式**：

### 1. `select`（选择，默认）

`StageSelect.startInteract()` 绑定画布的 pointer 事件：

- 点击空白 → 框选（marquee）
- 点击节点 → 选中（命中测试走 `StageScene.elemsFromPoint`）
- shift+点击 → 加选 / 减选
- 拖动选中节点 → 切到 move 模式

### 2. `move`（移动 / 变换）

`StageMove.startInteract()`：

- 拖动节点本体 → 平移（改 `node.matrix` 的 tx/ty）
- 拖动 8 个手柄 → 缩放 / 旋转
- 实时更新 `YState.set(`${id}.matrix`, ...)`

### 3. `create`（创建）

`StageCreate.startInteract()`：

- 点击工具栏的矩形/椭圆/文字等图标 → 切到 create 模式
- 在画布上拖出一个区域 → 创建对应节点（`SchemaCreator.rect()` 等）
- 创建完切回 select

`create.ts` 维护一个 `createTypes` 列表（frame/rect/ellipse/line/polygon/star/text）。

### 模式切换的副作用管理

`autorun` 里观察 `interaction`，变化时：

1. 调上一个模式的 `offInteract()`（解绑事件）
2. 调新模式的 `startInteract()`（绑新事件），返回新的 disposer

这样保证任何时刻只有一种交互模式活跃，且切换时干净释放。

---

## 命令系统：EditorCommand

快捷键和右键菜单统一走命令系统。`editor/core/command.ts`：

```ts
class EditorCommandManager {
  get copyPasteGroup(): Command[] {
    return [
      { name: t('copy'), shortcut: 'ctrl+c',
        when: () => !!getSelectIdList().length,
        callback: () => HandleNode.copySelectedNodes() },
      { name: t('paste'), shortcut: 'ctrl+v', ... },
    ]
  }
  get undoRedoGroup(): Command[] { ... }
  get nodeGroup(): Command[] { ... }
  get nodeReHierarchyGroup(): Command[] { ... }
  get pageGroup(): Command[] { ... }

  subscribe() {
    return this.bindHotkeys()   // 用 hotkeys-js 绑定所有快捷键
  }
}
```

- 命令按 group 组织（复制粘贴组、撤销重做组、节点组、层级组、页面组）
- 每个 command 有 `name`（i18n）、`shortcut`、`when`（可用条件）、`callback`
- `subscribe` 时用 `hotkeys-js` 注册所有快捷键
- 右键菜单也复用这些 command（`view/component/context-menu.tsx`）

devMode 下会额外注入 `print schema`、`print element` 等调试命令。

---

## 视口：StageViewport

`editor/stage/viewport.ts` 管理画布的缩放和平移：

```ts
class StageViewportService {
  @observable.ref sceneMatrix = Matrix.identity()   // 场景矩阵（缩放+平移）
  @observable bound = {...}                          // 画布在屏幕上的边界
  @observable zoom = 1                               // 缩放比例
  @observable offset = XY.$(0, 0)                    // 偏移
  sceneAABB = new AABB(...)                          // 当前视口在场景坐标的 AABB

  toCanvasXY(xy)   // 场景坐标 → 屏幕坐标
  toStageXY(xy)    // 屏幕坐标 → 场景坐标
}
```

- 鼠标滚轮缩放、空格拖拽平移都改 `sceneMatrix`
- `sceneAABB` 是视口剔除的关键（Elem.visible 用它判断）
- 缩放变化触发 Surface 的 `nextFullRender`

辅助工具（`editor/stage/tools/`）订阅视口变化重绘：

- `StageToolGrid`：zoom < 10.96 时不画网格（太密）
- `StageToolRuler`：标尺刻度跟随 zoom
- `StageToolGuide`：参考线

---

## 选择状态：HandleSelect

`editor/handle/select.ts` 是被频繁使用的服务：

```ts
class HandleSelectService {
  @observable.ref selectIdMap: Record<string, boolean> = {}
  @observable selectPageId: ID | '' = ''
  afterSelect = Signal.create<void>() // 选择变化通知

  select(id) // 选中
  unselect(id) // 取消选中
  clearSelect() // 清空
  selectPage(id) // 切换页面
}
```

特点：

- **选择状态可撤销**：通过 `MobxUndo.register` 注册，所以「选中 A → 选中 B」可以 undo 回 A
- `afterSelect` Signal 通知依赖选择的服务（如 `OperateFill.setupFills`、`HandleNode.getDatum`）
- UI 通过 `observer` 订阅 `selectIdMap` 自动响应

> 📝 选择回放的精确语义见 [`ai/notes/selection-replay-source.md`](../notes/selection-replay-source.md)。

---

## UI 与内核的通信约定

总结 view 层和 editor 层的交互模式：

```
view（React）                          editor（Service）
   │                                       │
   │  ① 读状态（observer 订阅）              │
   │←─────────────────────────────────────│  @observable 状态
   │                                       │
   │  ② 调方法（触发编辑）                   │
   │──────────────────────────────────────→│  Handle/Operate 方法
   │                                       │  → 改 YState → patch → 重绘
   │                                       │
   │  ③ 读派生状态（computed / getter）      │
   │←─────────────────────────────────────│  getSelectIdList() / getZoom()
```

**三条铁律**：

1. **view 不持有业务状态**，只读 editor 的 observable。
2. **view 不直接改 editor 的状态字段**，只调方法（方法内部走 YState）。
3. **view 用 `observer` 包裹**需要响应状态的组件。

示例（属性面板的填充）：

```tsx
// view 读
const EditorRPOperateFillComp = observer(() => {
  const fills = OperateFill.fills        // ① 读 observable
  return fills.map(fill => <FillItemComp fill={fill} />)
})

// view 写
<FillItemComp onChange={(color) => {
  OperateFill.setFills(draft => { draft[0].color = color })  // ② 调方法
}} />
```

---

## 一个完整的交互闭环

用户从工具栏点「矩形」然后在画布拖一个：

```
1. 用户点击工具栏「矩形」
   → StageInteract.interaction = 'create'
   → autorun 触发 → StageCreate.startInteract() 绑定画布事件

2. 用户在画布按下鼠标拖动
   → StageCreate 捕获 pointerdown
   → 实时画一个预览矩形（widgetElem）

3. 用户松开鼠标
   → StageCreate.createNode():
     ├─ SchemaCreator.rect({ width, height, matrix })   ← 创建 Schema 节点
     ├─ HandleNode.insertChildAt(page, node)            ← 挂到页面
     │   └─ YState.set / insert                         ← 写数据
     └─ Undo.track('all', 'create rect')

4. YState 写入 → patch 派发
   → Scene.render('add', [node.id]) → 创建 Elem
   → Surface.collectDirty → rAF 重绘
   → 画布出现矩形

5. StageInteract.interaction = 'select'   ← 切回选择模式
   → HandleSelect.select(node.id)         ← 自动选中刚创建的
   → RightPanel 显示属性，StageTransform 显示手柄
```

---

## 全文档回顾

到这里，8 篇文档构成了完整的认知链：

1. [01-overview](./01-overview.md) —— Sigma 是什么
2. [02-architecture](./02-architecture.md) —— 五层架构 + Service 模式
3. [03-getting-started](./03-getting-started.md) —— 怎么跑 + 目录结构
4. [04-data-flow](./04-data-flow.md) —— ⭐ 数据怎么流动
5. [05-schema](./05-schema.md) —— 数据长什么样
6. [06-render](./06-render.md) —— 怎么画到屏幕
7. [07-collaboration](./07-collaboration.md) —— 怎么协同
8. [08-ui-and-interact](./08-ui-and-interact.md) —— 界面和交互（本篇）

读完这 8 篇，你应该能：

- 说清 Sigma 的整体架构和每一层的职责
- 知道一次编辑操作从鼠标点击到画布更新的完整路径
- 找到任何功能对应的代码位置
- 理解为什么某些设计是这样（双层状态、扁平 Schema、脏矩形、自定义 reconciler）
- 在改动前知道要注意哪些不变量（YState 写入语义、事务、track undo）

后续深入特定问题时，配合 `ai/notes/` 下的深度笔记和源码阅读即可。

欢迎来到 Sigma。🎨
