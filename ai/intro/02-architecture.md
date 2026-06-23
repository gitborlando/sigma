# 02 · 整体架构与分层

这一篇建立「地图」。读完你会知道：代码分成哪几层、每层职责是什么、层与层之间怎么通信。

---

## 顶层视角：两层切分

整个应用代码都在 `apps/web/src` 下，严格切成两层：

```
┌─────────────────────────────────────────────┐
│                  view/                        │   ← React UI 层
│   （组件、页面、样式、用户交互入口）           │
└──────────────────┬──────────────────────────┘
                   │ 订阅状态 / 调用方法
                   ▼
┌─────────────────────────────────────────────┐
│                 editor/                       │   ← 编辑器内核
│   （数据、几何、渲染、协同、交互逻辑）         │
└─────────────────────────────────────────────┘
```

- **`view/` 不持有业务状态**，它只做两件事：① 把 editor 的状态「读」出来渲染成 DOM；② 把用户操作「转发」成对 editor 方法的调用。
- **`editor/` 不依赖 React**（除一个用于把 widget 挂到 Canvas 上的自定义 reconciler）。它是纯逻辑内核。

这个切分让内核可以被独立测试、甚至换一套 UI 壳。

---

## editor 内核的五层模型

进入 `editor/` 内部，可以再分成五个职责层。这是本项目最核心的心智模型：

```
┌──────────────────────────────────────────────────────────────┐
│  ① Schema 层（types/schema/*.d.ts + editor/schema/）           │
│     唯一数据真相源：设计文件的 JSON 结构定义、创建、迁移、遍历    │
├──────────────────────────────────────────────────────────────┤
│  ② YState 层（editor/y-state/ + utils/immut/）                 │
│     数据管理：Y.Doc（协同权威）↔ Immut（本地镜像）双层同步       │
├──────────────────────────────────────────────────────────────┤
│  ③ Scene 层（editor/render/scene.ts + elem.ts + draw.ts）      │
│     渲染数据：把 Schema 节点翻译成 Elem 树（带缓存）            │
├──────────────────────────────────────────────────────────────┤
│  ④ Surface 层（editor/render/surface.ts）                      │
│     画布管理：Canvas、脏矩形、requestAnimationFrame 调度绘制    │
├──────────────────────────────────────────────────────────────┤
│  ⑤ Handle / Operate / Stage 层（编辑能力）                     │
│     用户操作：选中、创建、移动、对齐、填充、视口、交互状态机      │
└──────────────────────────────────────────────────────────────┘
```

下面逐层解释。

### ① Schema 层 ——「数据长什么样」

**位置**：`types/schema/`（类型）+ `apps/web/src/editor/schema/`（操作）

- `types/schema/schema.d.ts`：对外暴露的 `S` 命名空间
- `types/schema/schema-v1.d.ts`（`S1`）：旧版本数据结构，**仅供迁移用**
- `types/schema/schema-v2.d.ts`（`S2`）：当前数据结构
- `editor/schema/creator.ts`：`SchemaCreator` —— 创建各种节点的工厂方法
- `editor/schema/migration.ts`：`migrationSchema` —— 把旧版本数据升级到最新
- `editor/schema/helper.ts`：`SchemaHelper` —— 类型判断静态方法（`isNode`、`isPageById`…）
- `editor/schema/traverse.ts`：`createSchemaTraverse` —— 通用的树遍历器

详见 [`05-schema.md`](./05-schema.md)。

### ② YState 层 ——「数据由谁管理」

**位置**：`apps/web/src/editor/y-state/` + `apps/web/src/utils/immut/`

- `y-state.ts`：`YState` 服务。读 / 写 Schema 的唯一入口（`find` / `set` / `insert` / `delete` / `transact`）。
- `y-sync.ts`：`YSync` —— Hocuspocus WebSocket provider + Awareness（光标）。
- `y-clients.ts`：`YClients` —— 协同用户状态（自己 + 他人）。
- `utils/immut/immut.ts`：`Immut` —— 一个能记录变更 patch 的可变状态包装器。
- `utils/immut/immut-y.ts`：`bind()` —— 把 Immut 和 Y.Map 双向绑定。

**关键认知**：YState 维护**两层状态**，详见 [`07-collaboration.md`](./07-collaboration.md)：

- `Y.Doc`（CRDT）：协同的权威源，多人编辑时自动合并
- `Immut`（普通对象）：本地渲染订阅用的镜像

### ③ Scene 层 ——「数据怎么变成可绘制的东西」

**位置**：`apps/web/src/editor/render/`

- `scene.ts`：`StageScene` —— 维护一棵 **Elem 树**（`sceneRoot` 主树 + `widgetRoot` 装饰树）。监听 Schema patch，增删改对应的 Elem。
- `elem.ts`：`Elem` 类 —— 渲染节点，缓存了 `mrect`（矩阵矩形）、`aabb`（包围盒）、`globalMatrix`（世界矩阵）、`visible`（视口剔除）等派生量。
- `draw.ts`：`ElemDrawer` —— 把一个 Elem 真正画到 Canvas 上（路径、填充、描边、阴影、文字）。

**关键认知**：Schema 是「逻辑节点」，Elem 是「渲染节点」。一个 Elem 对应一个 Schema 节点，但额外缓存了几何派生量用于高效绘制和命中测试。

### ④ Surface 层 ——「画布怎么画」

**位置**：`apps/web/src/editor/render/surface.ts`

- `StageSurface` —— 管理 3 块 Canvas（mainCanvas 主图层 / topCanvas 顶层装饰 / bufferCanvas 离屏缓冲）。
- 维护**脏矩形（dirty rect）**系统：只有变化区域才重绘，而非整屏重绘。
- 用 `requestAnimationFrame` 调度绘制。
- 提供 `ctxSaveRestore`、`setTransform`、`collectDirty` 等工具。

详见 [`06-render.md`](./06-render.md)。

### ⑤ Handle / Operate / Stage 层 ——「用户能做什么」

这一层最厚，是「编辑能力」的集合：

| 目录                     | 服务                                                  | 职责                                           |
| ------------------------ | ----------------------------------------------------- | ---------------------------------------------- |
| `editor/handle/`         | `HandleSelect` / `HandleNode` / `HandlePage`          | 选择状态、节点增删改、页面管理                 |
| `editor/operate/`        | `OperateAlign` / `OperateFill`                        | 高层业务操作（对齐、填充编辑）                 |
| `editor/stage/interact/` | `StageSelect` / `StageMove` / `StageCreate`           | **交互状态机**：当前是「选 / 移 / 建」哪种模式 |
| `editor/stage/`          | `StageViewport` / `StageCursor`                       | 视口（缩放平移）、光标样式                     |
| `editor/stage/tools/`    | `StageToolGrid` / `StageToolRuler` / `StageToolGuide` | 辅助工具（网格、标尺、参考线）                 |
| `editor/core/`           | `EditorCommand` / `EditorSetting` / `Undo`            | 命令（快捷键）、全局设置、撤销重做             |
| `editor/geometry/`       | `Matrix` / `MRect` / `HitTest` / `bezier`             | 几何计算                                       |
| `editor/workbench/`      | `LayerPanel` / `LayerPanelNodeTree`                   | 图层面板状态                                   |

详见 [`08-ui-and-interact.md`](./08-ui-and-interact.md)。

---

## Service 模式：内核的统一组织方式

editor 内核里几乎所有东西都是一个「Service 类」，遵循同一个模式：

```ts
class XxxService {
  // 1. 内部状态（用 MobX @observable 让其可响应）
  @observable someState = 0

  // 2. subscribe()：注册所有副作用，返回一个 disposer
  subscribe() {
    return Disposer.combine(
      this.listenDomEvents(),
      this.hookSignals(),
      this.observeYjs(),
    )
  }

  // 3. 业务方法
  doSomething() { ... }
}

// 4. 导出一个 autoBind 的单例
export const Xxx = autoBind(makeObservable(new XxxService()))
```

特点：

- **单例**：每个 Service 在全局只有一个实例，通过 `import { StageSurface } from '...'` 直接使用。
- **`autoBind`**：方法自动绑定 `this`，回调里可以直接传函数引用。
- **`subscribe()` 返回 disposer**：所有副作用（DOM 监听、Signal 订阅、Yjs observe、MobX reaction）都打包成 disposer，方便销毁。
- **`Disposer.combine(...)`**：把多个 disposer 合并成一个。

### 顶层装配：`Editor`

`apps/web/src/editor/index.ts` 的 `EditorService` 是所有 Service 的「总装车间」：

```ts
class EditorService {
  init = async () => {
    this.disposer.add(this.subscribe())
  }
  dispose() {
    this.disposer.dispose() // 一次性释放所有副作用
  }
  private subscribe() {
    return Disposer.combine(
      EditorSetting.subscribe(),
      EditorCommand.subscribe(),
      HandleNode.subscribe(),
      HandlePage.subscribe(),
      StageSurface.subscribe(),
      StageScene.subscribe(),
      // ... 所有核心 Service
    )
  }
}
export const Editor = autoBind(new EditorService())
```

React 的 `EditorComp` 在挂载时调 `Editor.init()`，卸载时调 `Editor.dispose()`。这样所有副作用的生命周期就和编辑器会话绑定。

> 📝 详见 [`ai/notes/editor-lifecycle-effects.md`](../notes/editor-lifecycle-effects.md)，那里讨论了这个模式的演进方向（service / effect / session 三分）。

---

## 数据如何跨层流动（预告）

一张极简的「一次编辑」数据流图，先建立印象，[`04-data-flow.md`](./04-data-flow.md) 会完整展开：

```
用户拖鼠标
   │
   ▼
StageCreate / StageMove （交互层捕获）
   │  调用
   ▼
HandleNode.insertChildAt()  （业务层）
   │  调用
   ▼
YState.set('xxx.childIds.0', id)  （数据层写入）
   │
   ├──→ 写入 Y.Doc  （协同权威源，触发远端同步）
   └──→ 更新 Immut  （本地镜像，产生 patch）
              │
              ▼
         YState.flushPatch$ 派发 patch
              │
              ▼
StageScene 收到 patch → 增删改 Elem 树
              │
              ▼
StageSurface 收集脏矩形 → rAF 重绘
              │
              ▼
         Canvas 上出现新图形
```

---

## 下一站

- 想跑起来看实物 → [`03-getting-started.md`](./03-getting-started.md)
- 想深入数据流 → [`04-data-flow.md`](./04-data-flow.md)
